import type { SavedWord } from '@/db/repositories/savedWords';

export type PrimaryMasteryStage = 'new' | 'learning' | 'reviewing' | 'mastered';

export type MasteryFilter = 'all' | 'due' | 'learning' | 'mastered' | 'difficult' | 'new';

export type WordMasteryInfo = {
  primaryStage: PrimaryMasteryStage;
  stageLabel: string;
  stageDescription: string;
  isDue: boolean;
  isDifficult: boolean;
  dueLabel: string;
};

/**
 * Derives plain-language mastery status from stored SRS fields.
 * Follows FULLAPP.md Section 10.2:
 * - Transparent explanation from stored fields.
 * - Never implies scientifically exact memory probability when heuristic SRS state is used.
 */
export function getWordMasteryInfo(word: SavedWord, nowMs: number = Date.now()): WordMasteryInfo {
  const reps = word.srsReps ?? 0;
  const lapses = word.srsLapses ?? 0;
  const interval = word.srsIntervalDays ?? 0;
  const stage = word.srsStage ?? 0;
  const ease = word.srsEaseFactor ?? 2.5;
  const dueDate = word.srsDueDate ?? 0;

  const isDue = dueDate > 0 && dueDate <= nowMs;
  const isDifficult = lapses > 0 || (reps > 0 && ease < 2.0);

  let primaryStage: PrimaryMasteryStage;
  let stageLabel: string;
  let stageDescription: string;

  if (stage === 3 || interval >= 21) {
    primaryStage = 'mastered';
    stageLabel = 'Mastered';
    stageDescription = 'Retained in long-term memory with review intervals of 21+ days.';
  } else if (stage === 2 || (interval >= 3 && interval < 21)) {
    primaryStage = 'reviewing';
    stageLabel = 'Reviewing';
    stageDescription = 'Memory pathways strengthening with multi-day intervals.';
  } else if (stage === 1 || (reps > 0 && interval < 3)) {
    primaryStage = 'learning';
    stageLabel = 'Learning';
    stageDescription = 'Active initial recall building with short intervals.';
  } else {
    primaryStage = 'new';
    stageLabel = 'New';
    stageDescription = 'Recently saved from reading; awaiting first active review.';
  }

  let dueLabel: string;
  if (!dueDate || dueDate === 0) {
    dueLabel = 'Unscheduled';
  } else if (isDue) {
    const hoursOverdue = Math.max(0, Math.floor((nowMs - dueDate) / (1000 * 60 * 60)));
    dueLabel = hoursOverdue > 24 ? 'Overdue' : 'Due for review';
  } else {
    const daysUntil = Math.ceil((dueDate - nowMs) / (1000 * 60 * 60 * 24));
    dueLabel = daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;
  }

  return {
    primaryStage,
    stageLabel,
    stageDescription,
    isDue,
    isDifficult,
    dueLabel,
  };
}

/**
 * Filters a list of saved words by mastery criteria.
 */
export function filterWordsByMastery(
  words: SavedWord[],
  filter: MasteryFilter,
  nowMs: number = Date.now(),
): SavedWord[] {
  if (filter === 'all') return words;

  return words.filter((word) => {
    const info = getWordMasteryInfo(word, nowMs);
    switch (filter) {
      case 'due':
        return info.isDue;
      case 'learning':
        return info.primaryStage === 'learning' || info.primaryStage === 'reviewing';
      case 'mastered':
        return info.primaryStage === 'mastered';
      case 'difficult':
        return info.isDifficult;
      case 'new':
        return info.primaryStage === 'new';
      default:
        return true;
    }
  });
}

/**
 * Computes counts for each mastery filter chip.
 */
export function getMasteryFilterCounts(
  words: SavedWord[],
  nowMs: number = Date.now(),
): Record<MasteryFilter, number> {
  const counts: Record<MasteryFilter, number> = {
    all: words.length,
    due: 0,
    learning: 0,
    mastered: 0,
    difficult: 0,
    new: 0,
  };

  for (const word of words) {
    const info = getWordMasteryInfo(word, nowMs);
    if (info.isDue) counts.due++;
    if (info.primaryStage === 'learning' || info.primaryStage === 'reviewing') counts.learning++;
    if (info.primaryStage === 'mastered') counts.mastered++;
    if (info.isDifficult) counts.difficult++;
    if (info.primaryStage === 'new') counts.new++;
  }

  return counts;
}
