import { getSetting, setSetting } from '@/db/repositories/appSettings';
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
};

const KEY_ENTITLEMENT_SNAPSHOT = 'entitlement_snapshot';
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours

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
};

let currentSnapshot: EntitlementSnapshot = DEFAULT_FREE_SNAPSHOT;
let isHydrated = false;
const listeners = new Set<(snapshot: EntitlementSnapshot) => void>();

function evaluateSnapshotWithGrace(snapshot: EntitlementSnapshot): EntitlementSnapshot {
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
    const raw = await getSetting(KEY_ENTITLEMENT_SNAPSHOT);
    if (raw) {
      const parsed = JSON.parse(raw) as EntitlementSnapshot;
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
 * Authoritatively refreshes entitlements from Supabase server.
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
    if (isPlanPremium) {
      const snapshot: EntitlementSnapshot = {
        status: 'premium',
        features: ALL_FEATURES_ON,
        source: 'subscription',
        startsAt: now,
        expiresAt: null, // Indefinite or managed by store
        lastVerifiedAt: now,
      };
      updateSnapshot(snapshot);
      return snapshot;
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
      return snapshot;
    } else {
      // If we already hold an unexpired active grant locally, retain it
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
      return snapshot;
    }
  } catch (err) {
    console.warn(`[EntitlementService] Refresh failed (${reason}), falling back to cached snapshot:`, err);
    return getEntitlementSnapshot();
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
