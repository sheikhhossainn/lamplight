import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { isAuthenticatedAccount } from '@/lib/supabaseAuth';

export const GUEST_DAILY_COMPANION_LIMIT = 5;
export const FREE_DAILY_COMPANION_LIMIT = 10;
export const PREMIUM_DAILY_COMPANION_LIMIT = 60;

export type CompanionQuotaStatus = {
  allowed: boolean;
  remaining: number;
  limit: number;
  isPremium: boolean;
  isGuest: boolean;
};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns today's quota snapshot for the AI reading companion.
 */
export async function getCompanionQuota(): Promise<CompanionQuotaStatus> {
  const isPremium = isPremiumUser();
  if (isPremium) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: PREMIUM_DAILY_COMPANION_LIMIT,
      isPremium: true,
      isGuest: false,
    };
  }

  const isAuth = await isAuthenticatedAccount().catch(() => false);
  const isGuest = !isAuth;
  const limit = isGuest ? GUEST_DAILY_COMPANION_LIMIT : FREE_DAILY_COMPANION_LIMIT;

  const today = getTodayKey();
  const key = `companion_usage_${today}`;
  const raw = await getSetting(key).catch(() => null);
  const used = raw ? parseInt(raw, 10) || 0 : 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    isPremium: false,
    isGuest,
  };
}

/**
 * Increments today's companion usage counter.
 */
export async function incrementCompanionQuota(): Promise<number> {
  if (isPremiumUser()) return Infinity;

  const today = getTodayKey();
  const key = `companion_usage_${today}`;
  const raw = await getSetting(key).catch(() => null);
  const used = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
  await setSetting(key, String(used)).catch(() => {});
  return used;
}
