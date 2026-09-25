import { getSetting, setSetting } from './appSettings';

export type ReadingGoal = {
  bookId: string;
  targetDays: number;
  targetCompletionDate: number; // timestamp in ms
  dailyMinutes: number;
  preferredHour: number; // 0-23, e.g. 20 for 8 PM
  preferredMinute: number; // 0-59, e.g. 30 for 8:30 PM
  notificationsEnabled: boolean;
  isAdaptive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CadencePacing = {
  daysRemaining: number;
  daysTotal: number;
  daysCompleted: number;
  chaptersRemaining: number;
  chaptersCompleted: number;
  totalChapters: number;
  requiredChaptersToday: number;
  estimatedMinutesToday: number;
  status: 'ahead' | 'on_track' | 'behind';
  formattedCompletionDate: string;
};

const STORAGE_PREFIX = 'reading_goal_';
const ACTIVE_GOAL_KEY = 'active_reading_goal_book_id';

export async function getActiveReadingGoalBookId(): Promise<string | null> {
  try {
    const raw = await getSetting(ACTIVE_GOAL_KEY);
    return raw || null;
  } catch {
    return null;
  }
}

/**
 * Retrieve a reading goal for a specific book.
 */
export async function getReadingGoal(bookId: string): Promise<ReadingGoal | null> {
  try {
    const raw = await getSetting(`${STORAGE_PREFIX}${bookId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingGoal;
  } catch (err) {
    console.warn('[ReadingGoals] Failed to parse goal for book:', bookId, err);
    return null;
  }
}

/**
 * Save or update a reading goal for a book.
 */
export async function saveReadingGoal(
  goal: Omit<ReadingGoal, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<ReadingGoal> {
  const now = Date.now();
  const existing = await getReadingGoal(goal.bookId);

  const fullGoal: ReadingGoal = {
    ...goal,
    createdAt: existing?.createdAt ?? goal.createdAt ?? now,
    updatedAt: now,
  };

  await Promise.all([
    setSetting(`${STORAGE_PREFIX}${goal.bookId}`, JSON.stringify(fullGoal)),
    setSetting(ACTIVE_GOAL_KEY, goal.bookId),
  ]);

  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation({ entityType: 'reading_goal', entityId: goal.bookId, operation: 'upsert', payload: fullGoal });
  } catch { /* sync enqueue non-fatal */ }

  return fullGoal;
}

/**
 * Delete a reading goal for a book.
 */
export async function deleteReadingGoal(bookId: string): Promise<void> {
  await setSetting(`${STORAGE_PREFIX}${bookId}`, '');
  const activeBookId = await getSetting(ACTIVE_GOAL_KEY);
  if (activeBookId === bookId) {
    await setSetting(ACTIVE_GOAL_KEY, '');
  }
  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation({ entityType: 'reading_goal', entityId: bookId, operation: 'delete', payload: { bookId } });
  } catch { /* sync enqueue non-fatal */ }
}

/**
 * Calculates current pacing metrics given current reading position.
 */
export function calculateCadencePacing(params: {
  goal: ReadingGoal;
  totalChapters: number;
  currentChapterIndex: number; // 0-based
}): CadencePacing {
  const { goal, totalChapters, currentChapterIndex } = params;
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const msRemaining = Math.max(0, goal.targetCompletionDate - now);
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / MS_PER_DAY));
  const daysTotal = Math.max(1, goal.targetDays);
  const daysCompleted = Math.max(0, Math.min(daysTotal, daysTotal - daysRemaining));

  const chaptersCompleted = Math.min(totalChapters, currentChapterIndex);
  const chaptersRemaining = Math.max(0, totalChapters - chaptersCompleted);

  // How many chapters per day are needed
  const rawChaptersNeeded = chaptersRemaining / daysRemaining;
  const requiredChaptersToday = Math.max(1, Math.round(rawChaptersNeeded * 10) / 10);

  // Expected progress benchmark: (daysCompleted / daysTotal) * totalChapters
  const expectedChaptersByNow = (daysCompleted / daysTotal) * totalChapters;
  const diff = chaptersCompleted - expectedChaptersByNow;

  let status: 'ahead' | 'on_track' | 'behind' = 'on_track';
  if (diff >= 1) {
    status = 'ahead';
  } else if (diff < -1.5) {
    status = 'behind';
  }

  // Estimated minutes: based on user's daily budget, smoothed by pace
  const minutesPerChapter = Math.max(8, goal.dailyMinutes / Math.max(1, totalChapters / daysTotal));
  const estimatedMinutesToday = Math.round(requiredChaptersToday * minutesPerChapter);

  const targetDateObj = new Date(goal.targetCompletionDate);
  const formattedCompletionDate = targetDateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return {
    daysRemaining,
    daysTotal,
    daysCompleted,
    chaptersRemaining,
    chaptersCompleted,
    totalChapters,
    requiredChaptersToday,
    estimatedMinutesToday,
    status,
    formattedCompletionDate,
  };
}
