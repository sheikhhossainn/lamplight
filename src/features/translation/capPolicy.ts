import {
  getCachedTodayUsageCount,
  getTodayUsageCount,
  incrementTodayUsage,
} from './translationUsageApi';

// Free-tier daily cap. Premium bypasses this entirely — see index.ts. Must
// match supabase/schema.sql's plans.translations_per_day for the free plan.
//
// Sized so it never bites mid-session: an engaged reader tapping ~3-5% of words
// on a ~280-word page runs 8-14 translations a page, so a long sitting can clear
// 200. 100 walled exactly the readers we most want to keep reading.
//
// Enforced server-side (public.translation_usage, keyed on auth.uid()), with
// a local cache (translationUsageApi.ts) so going offline fails closed against
// the last known count instead of resetting to unlimited. Neither survives a
// reinstall: this app's auth is anonymous (see supabaseAuth.ts), so wiping the
// app wipes the session too and mints a brand-new user with a fresh quota —
// that gap needs real accounts, not more counters.
export const FREE_DAILY_TRANSLATION_LIMIT = 300;

export type CapCheck = {
  allowed: boolean;
  remaining: number;
};

type UsageSnapshot = {
  date: string;
  used: number;
};

let usageSnapshot: UsageSnapshot | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function capFromUsed(used: number): CapCheck {
  const remaining = Math.max(0, FREE_DAILY_TRANSLATION_LIMIT - used);
  return { allowed: remaining > 0, remaining };
}

// Only the word-tap / quote-translate call sites may consult this. Reading,
// highlighting, and vocabulary viewing must never call into it — reading is
// never blocked, only the translation feature caps out.
export async function checkTranslationCap(isPremium: boolean): Promise<CapCheck> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity };
  }

  const date = todayKey();
  // Once loaded, normal word taps never need another database/network read.
  // Recheck at the boundary so a stale snapshot cannot overrun the daily cap.
  if (usageSnapshot?.date === date && usageSnapshot.used < FREE_DAILY_TRANSLATION_LIMIT - 3) {
    return capFromUsed(usageSnapshot.used);
  }

  const used = await getTodayUsageCount();
  usageSnapshot = { date, used };
  return capFromUsed(used);
}

// Display-only: prefer the in-memory snapshot, then fall back to the persisted
// cache without a network request. Returns null when neither knows today's use.
export async function checkCachedTranslationCap(isPremium: boolean): Promise<CapCheck | null> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity };
  }
  if (usageSnapshot?.date === todayKey()) {
    return capFromUsed(usageSnapshot.used);
  }
  const used = await getCachedTodayUsageCount();
  return capFromUsed(used ?? 0);
}

export async function recordTranslationUsage(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await incrementTodayUsage();
  const date = todayKey();
  if (usageSnapshot?.date === date) {
    usageSnapshot = { date, used: usageSnapshot.used + 1 };
  }
}
