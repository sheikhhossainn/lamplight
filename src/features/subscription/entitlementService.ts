import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getSession } from '@/lib/supabaseAuth';
import {
  computeLocalTamperSignature,
  verifyLocalTamperSignature,
} from './entitlementCrypto';
import type { CustomerInfo } from 'react-native-purchases';

export type PremiumFeature =
  | 'unlimited_learning'
  | 'advanced_quiz'
  | 'context_translation'
  | 'reading_insights'
  | 'cloud_sync'
  | 'full_ambience'
  | 'premium_quote_cards'
  | 'ai_companion';

export type EntitlementStatus = 'free' | 'trial' | 'premium' | 'grace' | 'expired' | 'unknown';
export type EntitlementSource = 'subscription' | 'store_trial' | 'promo' | 'beta' | 'support' | 'none';

export type EntitlementSnapshot = {
  status: EntitlementStatus;
  features: Record<PremiumFeature, boolean>;
  source: EntitlementSource;
  startsAt: number | null;
  expiresAt: number | null;
  lastVerifiedAt: number | null;
  userId?: string | null;
  signature?: string | null;
  localHash?: string | null;
  clockTampered?: boolean;
};

const KEY_ENTITLEMENT_SNAPSHOT = 'entitlement_snapshot';
const KEY_LAST_KNOWN_SERVER_TIME = 'last_known_server_time';
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours
const CLOCK_DRIFT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

let lastKnownServerTime = 0;
let isClockTampered = false;

const ALL_FEATURES_OFF: Record<PremiumFeature, boolean> = {
  unlimited_learning: false,
  advanced_quiz: false,
  context_translation: false,
  reading_insights: false,
  cloud_sync: false,
  full_ambience: false,
  premium_quote_cards: false,
  ai_companion: false,
};

const ALL_FEATURES_ON: Record<PremiumFeature, boolean> = {
  unlimited_learning: true,
  advanced_quiz: true,
  context_translation: true,
  reading_insights: true,
  cloud_sync: true,
  full_ambience: true,
  premium_quote_cards: true,
  ai_companion: true,
};

export const DEFAULT_FREE_SNAPSHOT: EntitlementSnapshot = {
  status: 'free',
  features: ALL_FEATURES_OFF,
  source: 'none',
  startsAt: null,
  expiresAt: null,
  lastVerifiedAt: null,
  userId: null,
  signature: null,
  localHash: null,
  clockTampered: false,
};

let currentSnapshot: EntitlementSnapshot = DEFAULT_FREE_SNAPSHOT;
let isHydrated = false;
const listeners = new Set<(snapshot: EntitlementSnapshot) => void>();

/**
 * Monotonic clock defense: records authoritative server time whenever
 * the app communicates with Supabase.
 */
export async function recordServerTime(serverTimestampMs: number): Promise<void> {
  if (typeof serverTimestampMs !== 'number' || isNaN(serverTimestampMs) || serverTimestampMs <= 0) return;
  if (serverTimestampMs > lastKnownServerTime) {
    lastKnownServerTime = serverTimestampMs;
    await setSetting(KEY_LAST_KNOWN_SERVER_TIME, String(lastKnownServerTime)).catch(() => {});
  }
  checkClockIntegrity();
}

/**
 * Evaluates whether the device clock has rolled backwards.
 * If Date.now() < last_known_server_time - 5 minutes, flags clock_tampered: true.
 */
export function checkClockIntegrity(): boolean {
  if (lastKnownServerTime > 0) {
    const now = Date.now();
    if (now < lastKnownServerTime - CLOCK_DRIFT_TOLERANCE_MS) {
      if (!isClockTampered) {
        console.warn('[EntitlementService] Clock rollback detected! Suspending trial/promo features.');
        isClockTampered = true;
        updateSnapshot({
          ...currentSnapshot,
          clockTampered: true,
        });
      }
      return false;
    }
  }

  if (isClockTampered) {
    isClockTampered = false;
    updateSnapshot({
      ...currentSnapshot,
      clockTampered: false,
    });
  }
  return true;
}

function evaluateSnapshotWithGrace(snapshot: EntitlementSnapshot): EntitlementSnapshot {
  // If clock was rolled backwards by > 5 minutes, suspend active trial/promo features
  if (isClockTampered || snapshot.clockTampered) {
    if (snapshot.source === 'promo' || snapshot.source === 'store_trial' || snapshot.status === 'trial') {
      return {
        ...snapshot,
        status: 'free',
        features: ALL_FEATURES_OFF,
        clockTampered: true,
      };
    }
  }

  if (snapshot.status === 'free' || !snapshot.expiresAt) {
    return snapshot;
  }

  const now = Date.now();
  if (now <= snapshot.expiresAt) {
    return snapshot;
  }

  // If expired, check for 72h offline grace on paid subscriptions
  if (snapshot.source === 'subscription' && now <= snapshot.expiresAt + GRACE_PERIOD_MS) {
    return {
      ...snapshot,
      status: 'grace',
      features: ALL_FEATURES_ON,
    };
  }

  return {
    ...snapshot,
    status: 'expired',
    features: ALL_FEATURES_OFF,
  };
}

export async function hydrateEntitlements(): Promise<void> {
  if (isHydrated) return;
  try {
    // 1. Hydrate monotonic clock defense timestamp
    const rawServerTime = await getSetting(KEY_LAST_KNOWN_SERVER_TIME);
    if (rawServerTime) {
      const parsedTime = Number(rawServerTime);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        lastKnownServerTime = parsedTime;
      }
    }

    if (lastKnownServerTime > 0 && Date.now() < lastKnownServerTime - CLOCK_DRIFT_TOLERANCE_MS) {
      console.warn('[EntitlementService] Clock rolled backward on launch. Flagging clock_tampered.');
      isClockTampered = true;
    }

    // 2. Hydrate entitlement snapshot with cryptographic verification
    const raw = await getSetting(KEY_ENTITLEMENT_SNAPSHOT);
    if (raw) {
      const parsed = JSON.parse(raw) as EntitlementSnapshot;

      // Anti-tamper verification:
      // If SQLite row indicates premium access, verify local tamper signature
      if (parsed.status !== 'free') {
        const isValid = verifyLocalTamperSignature(
          parsed.userId,
          parsed.status,
          parsed.expiresAt,
          parsed.localHash || parsed.signature,
        );

        if (!isValid) {
          console.warn('[EntitlementService] Tampered SQLite entitlement row detected! Falling back to free.');
          currentSnapshot = DEFAULT_FREE_SNAPSHOT;
          setSetting(KEY_ENTITLEMENT_SNAPSHOT, JSON.stringify(DEFAULT_FREE_SNAPSHOT)).catch(() => {});
          return;
        }
      }

      currentSnapshot = evaluateSnapshotWithGrace(parsed);
    }
  } catch (err) {
    console.warn('[EntitlementService] Error hydrating snapshot:', err);
    currentSnapshot = DEFAULT_FREE_SNAPSHOT;
  } finally {
    isHydrated = true;
  }
}

export function getEntitlementSnapshot(): EntitlementSnapshot {
  return evaluateSnapshotWithGrace(currentSnapshot);
}

export function subscribeToEntitlements(listener: (snapshot: EntitlementSnapshot) => void): () => void {
  listeners.add(listener);
  listener(getEntitlementSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

function updateSnapshot(newSnapshot: EntitlementSnapshot) {
  currentSnapshot = evaluateSnapshotWithGrace(newSnapshot);
  setSetting(KEY_ENTITLEMENT_SNAPSHOT, JSON.stringify(currentSnapshot)).catch(() => {});
  for (const listener of listeners) {
    try {
      listener(currentSnapshot);
    } catch (err) {
      console.warn('[EntitlementService] Error notifying listener:', err);
    }
  }
}

export function resetEntitlementsToFree(): void {
  updateSnapshot(DEFAULT_FREE_SNAPSHOT);
}

export function canUse(feature: PremiumFeature): boolean {
  const snapshot = getEntitlementSnapshot();
  return Boolean(snapshot.features[feature]);
}

export function requireFeature(
  feature: PremiumFeature,
  context?: string,
): { allowed: boolean; reason?: string } {
  const allowed = canUse(feature);
  if (allowed) return { allowed: true };

  const reasons: Record<PremiumFeature, string> = {
    unlimited_learning: 'Unlimited learning requires Lamplight Premium.',
    advanced_quiz: 'Advanced quizzes with new sentences and synonyms require Premium.',
    context_translation: 'Sentence-aware context translation requires Premium.',
    reading_insights: 'Comprehensive reading insights require Premium.',
    cloud_sync: 'Automatic multi-device library sync requires Premium.',
    full_ambience: 'Full ambient soundscapes require Premium.',
    premium_quote_cards: 'Custom themes and high-definition quote cards require Premium.',
    ai_companion: 'The AI Reading Companion requires Premium.',
  };

  return {
    allowed: false,
    reason: context ?? reasons[feature] ?? 'This feature requires Lamplight Premium.',
  };
}

/**
 * Applies RevenueCat CustomerInfo to the local entitlement view so a
 * successful store purchase updates the UI immediately. Server-side Premium
 * operations remain authoritative through the Supabase entitlement path.
 */
export async function applyRevenueCatEntitlement(info: CustomerInfo): Promise<EntitlementSnapshot> {
  const existing = getEntitlementSnapshot();
  if (!info.entitlements.active.premium && existing.source !== 'subscription') {
    return existing;
  }

  try {
    const session = await getSession();
    const entitlement = info.entitlements.active.premium;
    const now = Date.now();
    const expiresAt = entitlement?.expirationDate ? new Date(entitlement.expirationDate).getTime() : null;
    const status: EntitlementStatus = entitlement?.periodType === 'TRIAL' ? 'trial' : entitlement ? 'premium' : 'free';
    const snapshot: EntitlementSnapshot = {
      status,
      features: entitlement ? ALL_FEATURES_ON : ALL_FEATURES_OFF,
      source: entitlement ? 'subscription' : 'none',
      startsAt: entitlement?.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate).getTime() : now,
      expiresAt,
      lastVerifiedAt: now,
      userId: session.userId,
      signature: null,
      localHash: computeLocalTamperSignature(session.userId, status, expiresAt),
      clockTampered: isClockTampered,
    };
    updateSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    console.warn('[EntitlementService] Could not apply RevenueCat entitlement:', error);
    return existing;
  }
}

/**
 * Authoritatively refreshes cryptographically signed entitlements from Supabase server.
 */
export async function refreshEntitlements(reason: string = 'manual'): Promise<EntitlementSnapshot> {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return getEntitlementSnapshot();
  }

  try {
    const session = await getSession();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_verified_entitlement`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    // Record server timestamp from response header
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      recordServerTime(new Date(dateHeader).getTime()).catch(() => {});
    }

    if (res.ok) {
      const data = (await res.json()) as {
        status: EntitlementStatus;
        source: EntitlementSource;
        expires_at: number | null;
        signature: string | null;
        server_time: number | null;
      };

      if (data.server_time) {
        recordServerTime(Number(data.server_time)).catch(() => {});
      }

      const now = Date.now();
      const status = data.status || 'free';
      const isPremiumTier = status === 'premium' || status === 'trial';
      const expiresAt = data.expires_at ? Number(data.expires_at) : null;

      // Authoritative server signature and local cache integrity hash
      const signature = data.signature || null;
      const localHash = isPremiumTier ? computeLocalTamperSignature(session.userId, status, expiresAt) : null;

      const snapshot: EntitlementSnapshot = {
        status,
        features: isPremiumTier ? ALL_FEATURES_ON : ALL_FEATURES_OFF,
        source: data.source || 'none',
        startsAt: currentSnapshot.startsAt || now,
        expiresAt,
        lastVerifiedAt: now,
        userId: session.userId,
        signature,
        localHash,
        clockTampered: isClockTampered,
      };

      updateSnapshot(snapshot);
      return snapshot;
    }

    return getEntitlementSnapshot();
  } catch (err) {
    console.warn(`[EntitlementService] Refresh failed (${reason}), falling back to cached snapshot:`, err);
    return getEntitlementSnapshot();
  }
}

/**
 * Network ping to revalidate device clock against Supabase server.
 * Restores trial/promo privileges if device time is back within monotonic bounds.
 */
export async function pingServerToRevalidateClock(): Promise<{
  clockValid: boolean;
  serverTime: number | null;
}> {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { clockValid: !isClockTampered, serverTime: null };
  }

  try {
    const session = await getSession();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_verified_entitlement`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      await recordServerTime(new Date(dateHeader).getTime());
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.server_time) {
        await recordServerTime(Number(data.server_time));
      }
      await refreshEntitlements('clock_revalidation');
    }

    return { clockValid: !isClockTampered, serverTime: lastKnownServerTime || null };
  } catch (err) {
    console.warn('[EntitlementService] Revalidation ping failed:', err);
    return { clockValid: !isClockTampered, serverTime: null };
  }
}

/**
 * Calls server RPC `redeem_promo` to redeem a promo code.
 */
export async function redeemPromoCode(
  code: string,
): Promise<{ success: boolean; message: string; snapshot?: EntitlementSnapshot }> {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Server configuration not available.' };
  }

  try {
    const session = await getSession();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redeem_promo`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_code: code.trim() }),
    });

    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      recordServerTime(new Date(dateHeader).getTime()).catch(() => {});
    }

    const data = await res.json();
    if (res.ok && data?.success) {
      const now = Date.now();
      const endsAt = data.ends_at ? new Date(data.ends_at).getTime() : now + 30 * 24 * 60 * 60 * 1000;
      const localHash = computeLocalTamperSignature(session.userId, 'premium', endsAt);

      const snapshot: EntitlementSnapshot = {
        status: 'premium',
        features: ALL_FEATURES_ON,
        source: 'promo',
        startsAt: now,
        expiresAt: endsAt,
        lastVerifiedAt: now,
        userId: session.userId,
        signature: null,
        localHash,
        clockTampered: isClockTampered,
      };
      updateSnapshot(snapshot);
      refreshEntitlements('promo_redemption').catch(() => {});
      return { success: true, message: data.message || 'Promo code redeemed successfully!', snapshot };
    } else {
      return { success: false, message: data?.message || data?.error || 'Invalid or expired promo code.' };
    }
  } catch (err: unknown) {
    return { success: false, message: (err as Error)?.message || 'Failed to connect to redemption server.' };
  }
}
