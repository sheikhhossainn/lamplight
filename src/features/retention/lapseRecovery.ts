import { logEvent } from '@/features/analytics/analytics';

export type LapseStage = 'three_days' | 'seven_days' | 'fourteen_days';

export type LapseActionType = 'current_book' | 'due_review' | 'recommended_book' | 'library';

export type LapseAction = {
  type: LapseActionType;
  label: string;
  bookId?: string;
  route: string;
};

export type LapsePrompt = {
  id: string;
  stage: LapseStage;
  daysSinceLastRead: number;
  title: string;
  subtitle: string;
  message: string;
  primaryAction: LapseAction;
};

export type LapseEvaluationContext = {
  now?: number;
  lastSessionTimestamp: number | null;
  lastDismissedTimestamp?: number | null;
  lapseRecoveryEnabled?: boolean;
  notificationsPaused?: boolean;
  currentBook?: { id: string; title: string; author: string } | null;
  dueWordCount?: number;
  recommendedBook?: { id: string; title: string; author: string } | null;
};

export const SETTING_LAPSE_RECOVERY_ENABLED = 'lapse_recovery_enabled';
export const SETTING_LAPSE_DISMISSED_TIME = 'lapse_recovery_dismissed_time';
export const SETTING_NOTIFICATIONS_PAUSED = 'reading_notifications_paused';

/**
 * Pure evaluation function for lapse recovery state.
 * Never implies guilt, streak loss, or shame.
 */
export function evaluateLapseState(ctx: LapseEvaluationContext): LapsePrompt | null {
  if (ctx.lapseRecoveryEnabled === false) {
    return null;
  }

  if (ctx.notificationsPaused === true) {
    return null;
  }

  if (ctx.lastSessionTimestamp == null) {
    return null;
  }

  const now = ctx.now ?? Date.now();
  const diffMs = now - ctx.lastSessionTimestamp;
  if (diffMs < 0) {
    return null;
  }

  const daysSinceLastRead = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (daysSinceLastRead < 3) {
    return null;
  }

  // Dismissal cooldown: do not re-prompt if dismissed within the last 24 hours
  if (ctx.lastDismissedTimestamp != null) {
    const dismissedDiffMs = now - ctx.lastDismissedTimestamp;
    if (dismissedDiffMs >= 0) {
      const dismissedDays = Math.floor(dismissedDiffMs / (24 * 60 * 60 * 1000));
      if (dismissedDays < 1) {
        return null;
      }
    }
  }

  let stage: LapseStage;
  if (daysSinceLastRead >= 14) {
    stage = 'fourteen_days';
  } else if (daysSinceLastRead >= 7) {
    stage = 'seven_days';
  } else {
    stage = 'three_days';
  }

  // Choose at most one relevant return action:
  // 1. Current book (if exists and valid)
  // 2. Due review (if due words exist)
  // 3. Recommended starter book
  // 4. Library
  let primaryAction: LapseAction;
  if (ctx.currentBook && ctx.currentBook.id) {
    primaryAction = {
      type: 'current_book',
      label: 'Resume Reading',
      bookId: ctx.currentBook.id,
      route: `/reader/${ctx.currentBook.id}`,
    };
  } else if (ctx.dueWordCount && ctx.dueWordCount > 0) {
    primaryAction = {
      type: 'due_review',
      label: `Review ${ctx.dueWordCount} Word${ctx.dueWordCount === 1 ? '' : 's'}`,
      route: '/(tabs)/vocabulary?tab=flashcards',
    };
  } else if (ctx.recommendedBook && ctx.recommendedBook.id) {
    primaryAction = {
      type: 'recommended_book',
      label: 'Start Reading',
      bookId: ctx.recommendedBook.id,
      route: `/book/${ctx.recommendedBook.id}`,
    };
  } else {
    primaryAction = {
      type: 'library',
      label: 'Explore Library',
      route: '/(tabs)/library',
    };
  }

  let title = 'A quiet moment awaits';
  let subtitle = 'Books wait patiently';
  let message = 'Pick up wherever feels restful today.';

  if (stage === 'three_days') {
    title = 'A quiet moment awaits';
    subtitle = 'Books wait patiently';
    if (primaryAction.type === 'current_book' && ctx.currentBook) {
      message = `Your place in ${ctx.currentBook.title} is kept right where you left it.`;
    } else if (primaryAction.type === 'due_review') {
      message = `A gentle refresher on ${ctx.dueWordCount} saved words whenever you have a minute.`;
    } else {
      message = 'Pick up wherever feels restful today.';
    }
  } else if (stage === 'seven_days') {
    title = 'Welcome back';
    subtitle = 'Always at your own pace';
    if (primaryAction.type === 'current_book' && ctx.currentBook) {
      message = `Whenever you're ready, ease back into ${ctx.currentBook.title} with a quiet chapter.`;
    } else if (primaryAction.type === 'due_review') {
      message = `${ctx.dueWordCount} saved words are waiting for a calm review.`;
    } else {
      message = 'Ease back into reading with a few quiet pages.';
    }
  } else {
    title = 'Reading is a retreat';
    subtitle = 'Not an obligation';
    if (primaryAction.type === 'current_book' && ctx.currentBook) {
      message = `${ctx.currentBook.title} is always here whenever you'd like to return.`;
    } else if (primaryAction.type === 'due_review') {
      message = 'Your vocabulary notes and saved words are right where you left them.';
    } else {
      message = 'A quiet world is always here whenever you need a pause.';
    }
  }

  return {
    id: `lapse_${stage}`,
    stage,
    daysSinceLastRead,
    title,
    subtitle,
    message,
    primaryAction,
  };
}

/**
 * Queries SQLite repositories and returns the active lapse prompt if any.
 * Dynamically loads DB repositories to remain test-runner compatible.
 */
export async function getLapseRecoveryPrompt(): Promise<LapsePrompt | null> {
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    const { getRecentSessions } = await import('@/db/repositories/readingSessions');
    const { listActiveReadingPositions } = await import('@/db/repositories/readingPosition');
    const { getBook } = await import('@/db/repositories/books');
    const { getVocabularyEligibility } = await import('@/db/repositories/savedWords');

    const [enabledVal, pausedVal, dismissedVal, recentSessions, positions, eligibility] = await Promise.all([
      getSetting(SETTING_LAPSE_RECOVERY_ENABLED).catch(() => 'true'),
      getSetting(SETTING_NOTIFICATIONS_PAUSED).catch(() => 'false'),
      getSetting(SETTING_LAPSE_DISMISSED_TIME).catch(() => null),
      getRecentSessions(1).catch(() => []),
      listActiveReadingPositions().catch(() => []),
      getVocabularyEligibility().catch(() => null),
    ]);

    const lapseRecoveryEnabled = enabledVal !== 'false';
    const notificationsPaused = pausedVal === 'true';
    const lastDismissedTimestamp = dismissedVal ? parseInt(dismissedVal, 10) : null;
    const lastSession = recentSessions[0];
    const lastSessionTimestamp = lastSession ? lastSession.startedAt : null;

    let currentBook: { id: string; title: string; author: string } | null = null;
    if (positions.length > 0 && positions[0].bookId) {
      const book = await getBook(positions[0].bookId).catch(() => null);
      if (book) {
        currentBook = {
          id: book.id,
          title: book.title,
          author: book.author,
        };
      }
    }

    const dueWordCount = eligibility?.dueCount ?? 0;

    return evaluateLapseState({
      now: Date.now(),
      lastSessionTimestamp,
      lastDismissedTimestamp,
      lapseRecoveryEnabled,
      notificationsPaused,
      currentBook,
      dueWordCount,
    });
  } catch (err) {
    console.warn('[LapseRecovery] Failed to compute lapse recovery prompt:', err);
    return null;
  }
}

/**
 * Record user dismissal of lapse prompt with cooldown.
 */
export async function dismissLapseRecovery(prompt: LapsePrompt): Promise<void> {
  try {
    const { setSetting } = await import('@/db/repositories/appSettings');
    await setSetting(SETTING_LAPSE_DISMISSED_TIME, String(Date.now()));
  } catch {
    // Ignore setting persistence errors
  }
  logEvent('lapse_recovery_dismissed', {
    stage: prompt.stage,
    days_since_last_read: prompt.daysSinceLastRead,
  });
}

/**
 * Record user action on lapse prompt.
 */
export async function recordLapseRecoveryAction(prompt: LapsePrompt): Promise<void> {
  try {
    const { setSetting } = await import('@/db/repositories/appSettings');
    await setSetting(SETTING_LAPSE_DISMISSED_TIME, String(Date.now()));
  } catch {
    // Ignore setting persistence errors
  }
  logEvent('lapse_recovery_opened', {
    stage: prompt.stage,
    action_type: prompt.primaryAction.type,
    days_since_last_read: prompt.daysSinceLastRead,
  });
}

/**
 * Check whether lapse recovery is enabled.
 */
export async function isLapseRecoveryEnabled(): Promise<boolean> {
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    const val = await getSetting(SETTING_LAPSE_RECOVERY_ENABLED);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Toggle lapse recovery setting.
 */
export async function setLapseRecoveryEnabled(enabled: boolean): Promise<void> {
  try {
    const { setSetting } = await import('@/db/repositories/appSettings');
    await setSetting(SETTING_LAPSE_RECOVERY_ENABLED, enabled ? 'true' : 'false');
  } catch {
    // Ignore setting persistence errors
  }
  logEvent('lapse_recovery_preference_changed', { enabled });
}
