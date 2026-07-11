import { getTodayUsageCount, incrementTodayUsage } from '@/db/repositories/translationUsage';

// Free-tier daily cap. Premium bypasses this entirely — see index.ts. Must
// match supabase/schema.sql's plans.translations_per_day for the free plan.
export const FREE_DAILY_TRANSLATION_LIMIT = 100;

export type CapCheck = {
  allowed: boolean;
  remaining: number;
};

// TESTING ONLY — cap disabled so the 10-15 friend beta isn't tripped up by it
// while you're testing. Delete this early-return to restore the real cap
// before this matters for real (it still calls getTodayUsageCount below so
// `used`/`remaining` stay accurate for whenever it's re-enabled).
const DISABLE_CAP_FOR_TESTING = true;

// Only the word-tap / quote-translate call sites may consult this. Reading,
// highlighting, and vocabulary viewing must never call into it — reading is
// never blocked, only the translation feature caps out.
export async function checkTranslationCap(isPremium: boolean): Promise<CapCheck> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity };
  }
  const used = await getTodayUsageCount();
  const remaining = Math.max(0, FREE_DAILY_TRANSLATION_LIMIT - used);
  if (DISABLE_CAP_FOR_TESTING) {
    return { allowed: true, remaining };
  }
  return { allowed: remaining > 0, remaining };
}

export async function recordTranslationUsage(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await incrementTodayUsage();
}
