import { isAuthenticatedAccount } from '@/lib/supabaseAuth';
import {
  GUEST_DAILY_TRANSLATION_LIMIT,
  FREE_DAILY_TRANSLATION_LIMIT,
} from '@/features/subscription/bookLimits';
import {
  getCachedTodayUsageCount,
  getTodayUsageCount,
  incrementTodayUsage,
} from './translationUsageApi';

export { GUEST_DAILY_TRANSLATION_LIMIT, FREE_DAILY_TRANSLATION_LIMIT };

export type CapCheck = {
  allowed: boolean;
  remaining: number;
  isGuest: boolean;
  limit: number;
};

type UsageSnapshot = {
  date: string;
  used: number;
};

let usageSnapshot: UsageSnapshot | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function capFromUsed(used: number, limit: number, isGuest: boolean): CapCheck {
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, remaining, isGuest, limit };
}

// Only the word-tap / quote-translate call sites may consult this. Reading,
// highlighting, and vocabulary viewing must never call into it — reading is
// never blocked, only the translation feature caps out.
export async function checkTranslationCap(
  isPremium: boolean,
  isGuestOverride?: boolean,
): Promise<CapCheck> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity, isGuest: false, limit: Infinity };
  }

  const isGuest = isGuestOverride !== undefined ? isGuestOverride : !(await isAuthenticatedAccount());
  const limit = isGuest ? GUEST_DAILY_TRANSLATION_LIMIT : FREE_DAILY_TRANSLATION_LIMIT;

  const date = todayKey();
  // Once loaded, normal word taps never need another database/network read.
  // Recheck at the boundary so a stale snapshot cannot overrun the daily cap.
  if (usageSnapshot?.date === date && usageSnapshot.used < limit - 3) {
    return capFromUsed(usageSnapshot.used, limit, isGuest);
  }

  const used = await getTodayUsageCount();
  usageSnapshot = { date, used };
  return capFromUsed(used, limit, isGuest);
}

// Display-only: prefer the in-memory snapshot, then fall back to the persisted
// cache without a network request. Returns null when neither knows today's use.
export async function checkCachedTranslationCap(
  isPremium: boolean,
  isGuestOverride?: boolean,
): Promise<CapCheck | null> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity, isGuest: false, limit: Infinity };
  }

  const isGuest = isGuestOverride !== undefined ? isGuestOverride : !(await isAuthenticatedAccount());
  const limit = isGuest ? GUEST_DAILY_TRANSLATION_LIMIT : FREE_DAILY_TRANSLATION_LIMIT;

  if (usageSnapshot?.date === todayKey()) {
    return capFromUsed(usageSnapshot.used, limit, isGuest);
  }
  const used = await getCachedTodayUsageCount();
  return capFromUsed(used ?? 0, limit, isGuest);
}

export async function recordTranslationUsage(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await incrementTodayUsage();
  const date = todayKey();
  if (usageSnapshot?.date === date) {
    usageSnapshot = { date, used: usageSnapshot.used + 1 };
  }
}

