import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getReviewStats } from '@/db/repositories/savedWords';

// Flashcards are always reachable from the Notebook tab — this is only about
// when the app volunteers a review. Gate is deliberately quiet: a deck worth
// reviewing (5+ words), at least one word old enough that recalling it means
// something (saved before today), and never twice in a day.
export const MIN_DECK_SIZE = 5;
const LAST_SHOWN_KEY = 'vocab_review_prompt_last_shown';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Local midnight, not UTC — "saved before today" has to mean the reader's day.
function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// wordCount is the whole deck (what the prompt offers to review), not just the
// day-old subset that made it eligible.
export async function checkVocabReviewPrompt(): Promise<{ shouldPrompt: boolean; wordCount: number }> {
  const lastShown = await getSetting(LAST_SHOWN_KEY);
  const { total, readyToReview } = await getReviewStats(startOfToday());
  const shouldPrompt = lastShown !== todayKey() && total >= MIN_DECK_SIZE && readyToReview > 0;
  return { shouldPrompt, wordCount: total };
}

// Called whether the reader accepts or dismisses — either way they've answered
// the question for today.
export async function markVocabReviewPrompted(): Promise<void> {
  await setSetting(LAST_SHOWN_KEY, todayKey());
}
