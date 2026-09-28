import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { hmacSha256 } from '@/lib/crypto';
import { getSession } from '@/lib/supabaseAuth';

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
  signature?: string;
  verificationState?: 'verified' | 'offline_verified' | 'tampered' | 'clock_rollback' | 'expired';
  failureReason?: string;
};

const KEY_ENTITLEMENT_SNAPSHOT = 'entitlement_snapshot';
const KEY_LAST_MONOTONIC_TIME = 'entitlement_last_monotonic_time';
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours
const CLOCK_ROLLBACK_TOLERANCE_MS = 3 * 60 * 1000; // 3 minutes allowance for slight NTP sync drifts
const ENTITLEMENT_SIGNING_SALT = 'lamplight-entitlement-integrity-v1-flame';

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
  verificationState: 'verified',
};

let currentSnapshot: EntitlementSnapshot = DEFAULT_FREE_SNAPSHOT;
let isHydrated = false;
let lastKnownMonotonicTime = 0;
const listeners = new Set<(snapshot: EntitlementSnapshot) => void>();

/**
 * Computes deterministic HMAC-SHA256 signature for an entitlement payload.
 */
export function computeSnapshotSignature(
  snapshot: Pick<EntitlementSnapshot, 'status' | 'source' | 'startsAt' | 'expiresAt' | 'lastVerifiedAt' | 'features'>,
): string {
  const featureList = Object.entries(snapshot.features)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');

  const payload = [
    snapshot.status,
    snapshot.source,
    snapshot.startsAt ?? 'null',
    snapshot.expiresAt ?? 'null',
    snapshot.lastVerifiedAt ?? 'null',
    featureList,
  ].join('|');

  return hmacSha256(payload, ENTITLEMENT_SIGNING_SALT);
}

/**
 * Cryptographically signs an authoritative entitlement snapshot before storing.
 */
export function signSnapshot(snapshot: EntitlementSnapshot): EntitlementSnapshot {
  const signature = computeSnapshotSignature(snapshot);
  return {
    ...snapshot,
    signature,
    verificationState: 'verified',
    failureReason: undefined,
  };
}

/**
 * Validates the device clock to protect against backwards clock tampering.
 */
export function checkClockRollbackSync(now: number): { valid: boolean; reason?: string } {
  if (lastKnownMonotonicTime > 0 && now < lastKnownMonotonicTime - CLOCK_ROLLBACK_TOLERANCE_MS) {
    return {
      valid: false,
      reason: 'Your device clock appears out of sync. Please verify system date & time.',
    };
  }

  if (now > lastKnownMonotonicTime) {
    lastKnownMonotonicTime = now;
    void setSetting(KEY_LAST_MONOTONIC_TIME, String(now));
  }

  return { valid: true };
}

/**
 * Evaluates snapshot integrity, signature validation, anti-clock rollback, and expiration.
 * Fails closed to DEFAULT_FREE_SNAPSHOT if any validation check fails.
 */
function validateAndEvaluateSnapshot(snapshot: EntitlementSnapshot): EntitlementSnapshot {
  // Free tier is always safe and permitted
  if (snapshot.status === 'free') {
    return {
      ...DEFAULT_FREE_SNAPSHOT,
      verificationState: 'verified',
    };
  }

  const now = Date.now();

  // 1. Anti-Clock Rollback Check: Detect if user rolled system time backwards
  const clockCheck = checkClockRollbackSync(now);
  if (!clockCheck.valid) {
    console.warn('[EntitlementService] Clock rollback detected! Failing closed to free.');
    return {
      ...DEFAULT_FREE_SNAPSHOT,
      verificationState: 'clock_rollback',
      failureReason: clockCheck.reason,
    };
  }

  // 2. Cryptographic Signature Validation
  if (!snapshot.signature) {
    console.warn('[EntitlementService] Missing cryptographic signature on premium snapshot. Failing closed.');
    return {
      ...DEFAULT_FREE_SNAPSHOT,
      verificationState: 'tampered',
      failureReason: 'Cryptographic signature missing.',
    };
  }

  const expectedSignature = computeSnapshotSignature(snapshot);
  if (snapshot.signature !== expectedSignature) {
    console.warn('[EntitlementService] Invalid signature or tampered snapshot. Failing closed to free.');
    return {
      ...DEFAULT_FREE_SNAPSHOT,
      verificationState: 'tampered',
      failureReason: 'Cryptographic verification failed.',
    };
  }

  // 3. Expiration & Grace Period Evaluation
  if (snapshot.expiresAt && now > snapshot.expiresAt) {
    // If expired, check for 72h offline grace on paid subscriptions
    if (snapshot.source === 'subscription' && now <= snapshot.expiresAt + GRACE_PERIOD_MS) {
      return {
        ...snapshot,
        status: 'grace',
        features: ALL_FEATURES_ON,
        verificationState: 'offline_verified',
      };
    }

    return {
      ...snapshot,
      status: 'expired',
      features: ALL_FEATURES_OFF,
      verificationState: 'expired',
    };
  }

  return {
    ...snapshot,
    verificationState: snapshot.verificationState ?? 'offline_verified',
  };
}

export async function hydrateEntitlements(): Promise<void> {
  if (isHydrated) return;
  try {
    const [raw, storedTime] = await Promise.all([
      getSetting(KEY_ENTITLEMENT_SNAPSHOT),
      getSetting(KEY_LAST_MONOTONIC_TIME),
    ]);

    if (storedTime) {
      lastKnownMonotonicTime = Math.max(lastKnownMonotonicTime, Number(storedTime));
    }

    if (raw) {
      const parsed = JSON.parse(raw) as EntitlementSnapshot;
      currentSnapshot = validateAndEvaluateSnapshot(parsed);
    } else {
      currentSnapshot = DEFAULT_FREE_SNAPSHOT;
    }
  } catch (err) {
    console.warn('[EntitlementService] Error hydrating snapshot, failing closed:', err);
    currentSnapshot = DEFAULT_FREE_SNAPSHOT;
  } finally {
    isHydrated = true;
  }
}

export function getEntitlementSnapshot(): EntitlementSnapshot {
  return validateAndEvaluateSnapshot(currentSnapshot);
}

export function subscribeToEntitlements(listener: (snapshot: EntitlementSnapshot) => void): () => void {
  listeners.add(listener);
  listener(getEntitlementSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

function updateSnapshot(newSnapshot: EntitlementSnapshot) {
  const signed = signSnapshot(newSnapshot);
  currentSnapshot = validateAndEvaluateSnapshot(signed);
  setSetting(KEY_ENTITLEMENT_SNAPSHOT, JSON.stringify(currentSnapshot)).catch(() => {});
  for (const listener of listeners) {
    try {
      listener(currentSnapshot);
    } catch (err) {
      console.warn('[EntitlementService] Error notifying listener:', err);
    }
  }
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

  const snapshot = getEntitlementSnapshot();
  if (snapshot.verificationState === 'clock_rollback') {
    return {
      allowed: false,
      reason: 'Your device clock appears out of sync. Please verify your system date & time to use premium features.',
    };
  }

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
 * Authoritatively refreshes entitlements from Supabase server with full cryptographic signing.
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

    // Fetch profile and active grants in parallel
    const [profileRes, grantsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.userId}&select=plan_key`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
        signal: controller.signal,
      }),
      fetch(
        `${SUPABASE_URL}/rest/v1/entitlement_grants?owner_id=eq.${session.userId}&revoked_at=is.null&ends_at=gt.now()&order=ends_at.desc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.accessToken}`,
          },
          signal: controller.signal,
        },
      ).catch(() => null),
    ]).finally(() => clearTimeout(timeoutId));

    let isPlanPremium = false;
    if (profileRes.ok) {
      const profiles = (await profileRes.json()) as Array<{ plan_key: string }>;
      if (profiles && profiles[0]?.plan_key === 'premium') {
        isPlanPremium = true;
      }
    }

    let activeGrant: { source_type: string; starts_at: string; ends_at: string } | null = null;
    if (grantsRes && grantsRes.ok) {
      const grants = (await grantsRes.json()) as Array<{
        source_type: string;
        starts_at: string;
        ends_at: string;
      }>;
      if (grants && grants.length > 0 && grants[0]) {
        activeGrant = grants[0];
      }
    }

    const now = Date.now();
    // Update monotonic time from server interaction
    lastKnownMonotonicTime = Math.max(lastKnownMonotonicTime, now);
    void setSetting(KEY_LAST_MONOTONIC_TIME, String(now));

    if (isPlanPremium) {
      const snapshot: EntitlementSnapshot = {
        status: 'premium',
        features: ALL_FEATURES_ON,
        source: 'subscription',
        startsAt: now,
        expiresAt: null,
        lastVerifiedAt: now,
      };
      updateSnapshot(snapshot);
      return currentSnapshot;
    } else if (activeGrant) {
      const startsAt = new Date(activeGrant.starts_at).getTime();
      const expiresAt = new Date(activeGrant.ends_at).getTime();
      const snapshot: EntitlementSnapshot = {
        status: activeGrant.source_type === 'store_trial' ? 'trial' : 'premium',
        features: ALL_FEATURES_ON,
        source: (activeGrant.source_type as EntitlementSource) || 'promo',
        startsAt,
        expiresAt,
        lastVerifiedAt: now,
      };
      updateSnapshot(snapshot);
      return currentSnapshot;
    } else {
      // If we already hold an unexpired valid active grant locally, retain it
      if (
        currentSnapshot.status === 'premium' &&
        currentSnapshot.expiresAt &&
        now <= currentSnapshot.expiresAt
      ) {
        return currentSnapshot;
      }
      const snapshot: EntitlementSnapshot = {
        status: 'free',
        features: ALL_FEATURES_OFF,
        source: 'none',
        startsAt: null,
        expiresAt: null,
        lastVerifiedAt: now,
      };
      updateSnapshot(snapshot);
      return currentSnapshot;
    }
  } catch (err) {
    console.warn(`[EntitlementService] Refresh failed (${reason}), failing closed to cached verified state:`, err);
    return getEntitlementSnapshot();
  }
}

export type RestoreResult = {
  success: boolean;
  code: 'restored' | 'no_active_plan' | 'clock_desync' | 'offline' | 'error';
  message: string;
  snapshot: EntitlementSnapshot;
};

/**
 * Restores purchases with non-punitive, clear feedback.
 */
export async function restorePurchases(): Promise<RestoreResult> {
  const clockCheck = checkClockRollbackSync(Date.now());
  if (!clockCheck.valid) {
    const freeSnapshot = {
      ...DEFAULT_FREE_SNAPSHOT,
      verificationState: 'clock_rollback' as const,
      failureReason: clockCheck.reason,
    };
    updateSnapshot(freeSnapshot);
    return {
      success: false,
      code: 'clock_desync',
      message: clockCheck.reason || 'Your device clock appears out of sync. Please verify system date & time.',
      snapshot: freeSnapshot,
    };
  }

  try {
    const refreshed = await refreshEntitlements('restore');
    if (refreshed.status === 'premium' || refreshed.status === 'trial' || refreshed.status === 'grace') {
      return {
        success: true,
        code: 'restored',
        message: 'Welcome back! Your Lamplight Premium access has been restored.',
        snapshot: refreshed,
      };
    } else {
      return {
        success: false,
        code: 'no_active_plan',
        message: 'No active subscription or grant found for this account. If you purchased recently, please ensure you are signed into the correct account.',
        snapshot: refreshed,
      };
    }
  } catch (err) {
    const isNetwork = (err as Error)?.message?.includes('Network') || (err as Error)?.name === 'AbortError';
    return {
      success: false,
      code: isNetwork ? 'offline' : 'error',
      message: isNetwork
        ? 'Please connect to the internet to verify your subscription.'
        : 'Unable to restore purchases at this moment. Please try again.',
      snapshot: getEntitlementSnapshot(),
    };
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

    const data = await res.json();
    if (res.ok && data?.success) {
      const now = Date.now();
      const endsAt = data.ends_at ? new Date(data.ends_at).getTime() : now + 30 * 24 * 60 * 60 * 1000;
      const snapshot: EntitlementSnapshot = {
        status: 'premium',
        features: ALL_FEATURES_ON,
        source: 'promo',
        startsAt: now,
        expiresAt: endsAt,
        lastVerifiedAt: now,
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
