import { getTodayUsageCount, incrementTodayUsage } from '@/db/repositories/translationUsage';

// Free-tier daily cap. Premium bypasses this entirely — see index.ts. Must
// match supabase/schema.sql's plans.translations_per_day for the free plan.
//
// Sized so it never bites mid-session: an engaged reader tapping ~3-5% of words
// on a ~280-word page runs 8-14 translations a page, so a long sitting can clear
// 200. 100 walled exactly the readers we most want to keep reading.
//
// This is enforced on-device against local SQLite, which makes it a monetization
// gate, not a security boundary — clearing app data or moving the device clock
// resets it. Enforcing it for real means moving the check server-side against
// public.translation_usage / auth.uid() (the schema already has both).
export const FREE_DAILY_TRANSLATION_LIMIT = 300;

export type CapCheck = {
  allowed: boolean;
  remaining: number;
};

// Only the word-tap / quote-translate call sites may consult this. Reading,
// highlighting, and vocabulary viewing must never call into it — reading is
// never blocked, only the translation feature caps out.
export async function checkTranslationCap(isPremium: boolean): Promise<CapCheck> {
  if (isPremium) {
    return { allowed: true, remaining: Infinity };
  }
  const used = await getTodayUsageCount();
  const remaining = Math.max(0, FREE_DAILY_TRANSLATION_LIMIT - used);
  return { allowed: remaining > 0, remaining };
}

export async function recordTranslationUsage(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await incrementTodayUsage();
}
