import { getTodayUsageCount, incrementTodayUsage } from '@/db/repositories/translationUsage';

// Free-tier daily cap. Premium bypasses this entirely — see index.ts.
export const FREE_DAILY_TRANSLATION_LIMIT = 20;

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
