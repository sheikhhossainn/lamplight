import { getReadingGoal, type ReadingGoal, type CadencePacing } from '@/db/repositories/readingGoals';
import { canUse } from '@/features/subscription/entitlementService';

export type CadenceReminderMessage = {
  title: string;
  body: string;
  preferredTimeLabel: string;
};

/**
 * Builds literary notification copy tailored to Lamplight's 1890s candlelit aesthetic.
 * Uses default OS notification sound.
 */
export function buildCadenceNotificationCopy(params: {
  bookTitle: string;
  currentChapter: number;
  totalChapters: number;
  pacing: CadencePacing;
  isAdaptive?: boolean;
}): CadenceReminderMessage {
  const { bookTitle, currentChapter, totalChapters, pacing } = params;
  const isPremium = canUse('reading_insights');
  const targetChapter = Math.min(totalChapters, currentChapter + 1);

  let title = 'The Lamp is Lit';
  let body = `A quiet chapter waits in ${bookTitle}. Tonight's goal: Chapter ${targetChapter} (~${pacing.estimatedMinutesToday} mins).`;

  if (pacing.status === 'behind' && isPremium) {
    // Adaptive anti-guilt message for Premium users
    title = 'A Quiet Evening for Reading';
    body = `No hurry — your pace for ${bookTitle} has been smoothed. Just ~${pacing.estimatedMinutesToday} mins tonight keeps you on track.`;
  } else if (pacing.daysRemaining <= 2) {
    title = 'The Final Chapters Wait';
    body = `You are close to completing ${bookTitle}. Kindle your lamp for Chapter ${targetChapter}.`;
  } else if (pacing.status === 'ahead') {
    title = 'Smooth Waters in Your Reading';
    body = `You are ahead of schedule on ${bookTitle}! Enjoy a relaxed reading session tonight.`;
  }

  return {
    title,
    body,
    preferredTimeLabel: `${String(12).padStart(2, '0')}:00 PM`,
  };
}

/**
 * Formats a 24-hour hour and minute into a friendly string (e.g. 8:30 PM).
 */
export function formatHourMinute(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = String(minute).padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}
