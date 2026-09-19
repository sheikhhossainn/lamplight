import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getVocabularyEligibility } from '@/db/repositories/savedWords';

// Flashcards are always reachable from the Notebook tab — this is only about
// when the app volunteers a review. Gate is deliberately quiet: a deck worth
// reviewing (5+ words), at least one word old enough that recalling it means
// something (saved before today), and never twice in a day.
export const MIN_REVIEW_WORDS = 5;
export const MIN_DECK_SIZE = MIN_REVIEW_WORDS;
const DAILY_CHECKPOINT_KEY = 'vocabulary.daily_review_checkpoint';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Local midnight, not UTC — "saved before today" has to mean the reader's day.
export async function checkVocabReviewPrompt(): Promise<{ shouldPrompt: boolean; wordCount: number }> {
  const today = todayKey();
  const [dismissed, checkpointRaw, eligibility] = await Promise.all([
    getSetting(`vocabulary.review_prompt_dismissed.${today}`),
    getSetting(DAILY_CHECKPOINT_KEY),
    getVocabularyEligibility(),
  ]);
  let completedToday = false;
  try {
    completedToday = JSON.parse(checkpointRaw ?? 'null')?.date === today;
  } catch {
    // Corrupt legacy settings should not stop a future review prompt.
  }
  return {
    shouldPrompt:
      dismissed !== '1' &&
      !completedToday &&
      eligibility.totalSaved >= MIN_REVIEW_WORDS &&
      eligibility.dueCount > 0 &&
      eligibility.reviewableBeforeTodayCount > 0,
    wordCount: eligibility.totalSaved,
  };
}

// A dismissal is local-day scoped; accepting leaves completion as the thing
// that suppresses future prompts for the day.
export async function markVocabReviewPrompted(): Promise<void> {
  await setSetting(`vocabulary.review_prompt_dismissed.${todayKey()}`, '1');
}
