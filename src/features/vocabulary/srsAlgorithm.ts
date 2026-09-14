/**
 * SuperMemo SM-2 Spaced Repetition Engine for Lamplight Vocabulary.
 * Computes optimal review intervals, ease factor adjustments, and mastery stages.
 */

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export type SrsStage = 0 | 1 | 2 | 3; // 0: New, 1: Learning, 2: Review, 3: Mastered

export type SrsCardState = {
  stage: SrsStage;
  intervalDays: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  dueDate: number; // Unix timestamp in ms
  lastReviewedAt?: number;
};

export type SrsNextPreview = {
  rating: SrsRating;
  label: string;
  intervalDisplay: string;
  nextIntervalDays: number;
};

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

export function initialSrsState(): SrsCardState {
  return {
    stage: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    reps: 0,
    lapses: 0,
    dueDate: Date.now(),
  };
}

/**
 * Calculates the next SRS state given the user's recall rating.
 */
export function calculateNextSrsState(
  current: SrsCardState,
  rating: SrsRating,
  nowMs: number = Date.now(),
): SrsCardState {
  let { stage, intervalDays, easeFactor, reps, lapses } = current;
  let nextDueDate: number;

  switch (rating) {
    case 'again': {
      // Failed recall: reset streak, reduce ease factor
      lapses += 1;
      reps = 0;
      intervalDays = 0;
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
      stage = 1; // back to learning
      nextDueDate = nowMs + TEN_MINUTES_MS; // due in 10 minutes
      break;
    }
    case 'hard': {
      // Recalled with significant difficulty
      if (reps === 0) {
        intervalDays = 1;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      }
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
      reps += 1;
      stage = intervalDays >= 21 ? 3 : 2;
      nextDueDate = nowMs + intervalDays * MS_PER_DAY;
      break;
    }
    case 'good': {
      // Standard successful recall
      if (reps === 0) {
        intervalDays = 1;
      } else if (reps === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      reps += 1;
      stage = intervalDays >= 21 ? 3 : 2;
      nextDueDate = nowMs + intervalDays * MS_PER_DAY;
      break;
    }
    case 'easy': {
      // Instant, effortless recall: bonus interval and ease boost
      if (reps === 0) {
        intervalDays = 3;
      } else if (reps === 1) {
        intervalDays = 7;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      }
      easeFactor = Math.min(3.5, easeFactor + 0.15);
      reps += 1;
      stage = intervalDays >= 21 ? 3 : 2;
      nextDueDate = nowMs + intervalDays * MS_PER_DAY;
      break;
    }
  }

  return {
    stage,
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    reps,
    lapses,
    dueDate: nextDueDate,
    lastReviewedAt: nowMs,
  };
}

/**
 * Returns user-facing preview labels for the 4 grading buttons (e.g. "<10m", "1d", "3d", "7d")
 */
export function getSrsPreviews(current: SrsCardState, nowMs: number = Date.now()): SrsNextPreview[] {
  const ratings: { rating: SrsRating; label: string }[] = [
    { rating: 'again', label: 'Again' },
    { rating: 'hard', label: 'Hard' },
    { rating: 'good', label: 'Good' },
    { rating: 'easy', label: 'Easy' },
  ];

  return ratings.map(({ rating, label }) => {
    const next = calculateNextSrsState(current, rating, nowMs);
    let intervalDisplay = '<10m';
    if (next.intervalDays >= 30) {
      intervalDisplay = `${Math.round(next.intervalDays / 30)}mo`;
    } else if (next.intervalDays >= 1) {
      intervalDisplay = `${next.intervalDays}d`;
    }
    return {
      rating,
      label,
      intervalDisplay,
      nextIntervalDays: next.intervalDays,
    };
  });
}

/**
 * Stage labels for vocabulary metrics.
 */
export function getStageLabel(stage: SrsStage): string {
  switch (stage) {
    case 0:
      return 'New';
    case 1:
      return 'Learning';
    case 2:
      return 'Reviewing';
    case 3:
      return 'Mastered';
  }
}
