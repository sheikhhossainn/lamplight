import { logEvent } from '@/features/analytics/analytics';

export type MilestoneType =
  | 'first_saved_word'
  | 'first_imported_book'
  | 'first_completed_review'
  | 'first_completed_book'
  | 'seven_reading_days'
  | 'first_thirty_reading_minutes';

export type MilestoneConfig = {
  type: MilestoneType;
  title: string;
  description: string;
  icon: string;
  isOwnershipMilestone: boolean;
  offersFeedbackPrompt: boolean;
};

export const MILESTONES: Record<MilestoneType, MilestoneConfig> = {
  first_saved_word: {
    type: 'first_saved_word',
    title: 'First Word Saved',
    description: 'You’ve begun cultivating your personal vocabulary sanctuary.',
    icon: '📖',
    isOwnershipMilestone: true,
    offersFeedbackPrompt: false,
  },
  first_imported_book: {
    type: 'first_imported_book',
    title: 'Personal Book Added',
    description: 'Your library now holds your personal reading collection.',
    icon: '✨',
    isOwnershipMilestone: true,
    offersFeedbackPrompt: false,
  },
  first_completed_review: {
    type: 'first_completed_review',
    title: 'First Review Session',
    description: 'Spaced repetition practice solidifies your literary memory.',
    icon: '🧠',
    isOwnershipMilestone: false,
    offersFeedbackPrompt: false,
  },
  first_completed_book: {
    type: 'first_completed_book',
    title: 'Book Completed',
    description: 'You’ve journeyed through every page of this literary work.',
    icon: '🏆',
    isOwnershipMilestone: true,
    offersFeedbackPrompt: true,
  },
  seven_reading_days: {
    type: 'seven_reading_days',
    title: 'Seven Days of Reading',
    description: 'A quiet, consistent habit is taking root in your daily rhythm.',
    icon: '🌱',
    isOwnershipMilestone: false,
    offersFeedbackPrompt: true,
  },
  first_thirty_reading_minutes: {
    type: 'first_thirty_reading_minutes',
    title: '30 Minutes of Immersion',
    description: 'Half an hour of calm, focused reading amidst a noisy world.',
    icon: '⏳',
    isOwnershipMilestone: false,
    offersFeedbackPrompt: false,
  },
};

const KEY_PREFIX = 'milestone_achieved_';

async function getSettingsModule() {
  return await import('@/db/repositories/appSettings');
}

/**
 * Checks if a milestone has already been achieved.
 */
export async function isMilestoneAchieved(type: MilestoneType): Promise<boolean> {
  try {
    const { getSetting } = await getSettingsModule();
    const val = await getSetting(`${KEY_PREFIX}${type}`);
    return val !== null && val !== undefined && val !== '';
  } catch {
    return false;
  }
}

/**
 * Records that a milestone has been achieved. Idempotent.
 */
export async function recordMilestoneAchieved(type: MilestoneType, nowMs: number = Date.now()): Promise<void> {
  try {
    const { setSetting } = await getSettingsModule();
    await setSetting(`${KEY_PREFIX}${type}`, String(nowMs));
    logEvent('milestone_achieved', { milestone_type: type, achieved_at: nowMs });
  } catch (err) {
    console.warn('[MilestoneService] Failed to record milestone:', err);
  }
}

/**
 * Pure evaluation logic for determining which milestone should trigger given current state and history.
 */
export function evaluateMilestoneTrigger(params: {
  candidateType: MilestoneType;
  alreadyAchieved: boolean;
}): MilestoneConfig | null {
  if (params.alreadyAchieved) {
    return null;
  }
  return MILESTONES[params.candidateType] ?? null;
}

/**
 * Evaluates session stats and returns any newly achieved reading milestones.
 */
export function evaluateReadingStatsMilestonesPure(params: {
  cumulativeReadingMinutes: number;
  distinctReadingDays: number;
  isBookCompleted?: boolean;
  achievedMilestones: Set<MilestoneType>;
}): MilestoneConfig | null {
  // Check book completion milestone
  if (params.isBookCompleted && !params.achievedMilestones.has('first_completed_book')) {
    return MILESTONES.first_completed_book;
  }

  // Check 7 reading days milestone
  if (params.distinctReadingDays >= 7 && !params.achievedMilestones.has('seven_reading_days')) {
    return MILESTONES.seven_reading_days;
  }

  // Check 30 reading minutes milestone
  if (params.cumulativeReadingMinutes >= 30 && !params.achievedMilestones.has('first_thirty_reading_minutes')) {
    return MILESTONES.first_thirty_reading_minutes;
  }

  return null;
}

/**
 * Checks if a milestone should be triggered right now with local persistence.
 * Returns the MilestoneConfig if it is newly achieved, or null if already celebrated.
 */
export async function checkAndTriggerMilestone(
  type: MilestoneType,
  nowMs: number = Date.now(),
): Promise<MilestoneConfig | null> {
  const alreadyAchieved = await isMilestoneAchieved(type);
  const milestone = evaluateMilestoneTrigger({ candidateType: type, alreadyAchieved });

  if (milestone) {
    await recordMilestoneAchieved(type, nowMs);
  }

  return milestone;
}

/**
 * Evaluates session stats against stored milestones and records the first new achievement.
 */
export async function evaluateReadingStatsMilestones(params: {
  cumulativeReadingMinutes: number;
  distinctReadingDays: number;
  isBookCompleted?: boolean;
}): Promise<MilestoneConfig | null> {
  const achieved = new Set<MilestoneType>();
  for (const type of ['first_completed_book', 'seven_reading_days', 'first_thirty_reading_minutes'] as MilestoneType[]) {
    if (await isMilestoneAchieved(type)) {
      achieved.add(type);
    }
  }

  const triggered = evaluateReadingStatsMilestonesPure({
    ...params,
    achievedMilestones: achieved,
  });

  if (triggered) {
    await recordMilestoneAchieved(triggered.type);
  }

  return triggered;
}
