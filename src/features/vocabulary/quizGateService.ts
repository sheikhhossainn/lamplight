import { canUse } from '@/features/subscription/entitlementService';
import { getAppFlag } from '@/features/config/appConfig';

export type QuizMode = 'normal' | 'fresh' | 'synonyms';

export type QuizGateStatus =
  | 'allowed'
  | 'subscription_required'
  | 'offline_unavailable'
  | 'service_disabled';

export type QuizGateResult = {
  status: QuizGateStatus;
  allowed: boolean;
  source?: 'free_mode' | 'premium' | 'weekly_sample';
  reason?: string;
  trigger?: 'advanced_quiz_sample_used' | 'advanced_quiz_locked';
  mode: QuizMode;
};

export const ADVANCED_QUIZ_SAMPLE_PREFIX = 'vocabulary.advanced_quiz_sample';

/**
 * Returns the ISO week key (Monday-aligned) for sample tracking.
 */
export function getQuizWeekKey(nowMs: number = Date.now()): string {
  const date = new Date(nowMs);
  const day = (date.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  date.setDate(date.getDate() - day);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${d}`;
}

export function getWeeklySampleStorageKey(nowMs: number = Date.now()): string {
  return `${ADVANCED_QUIZ_SAMPLE_PREFIX}.${getQuizWeekKey(nowMs)}`;
}

export async function hasUsedWeeklyQuizSample(
  nowMs: number = Date.now(),
  getSettingFn?: (key: string) => Promise<string | null>,
): Promise<boolean> {
  const key = getWeeklySampleStorageKey(nowMs);
  try {
    if (getSettingFn) {
      const val = await getSettingFn(key);
      return Boolean(val);
    }
    const { getSetting } = await import('@/db/repositories/appSettings');
    const val = await getSetting(key);
    return Boolean(val);
  } catch {
    return false;
  }
}

export async function recordWeeklyQuizSampleUsed(
  nowMs: number = Date.now(),
  setSettingFn?: (key: string, val: string) => Promise<void>,
): Promise<void> {
  const key = getWeeklySampleStorageKey(nowMs);
  try {
    if (setSettingFn) {
      await setSettingFn(key, '1');
      return;
    }
    const { setSetting } = await import('@/db/repositories/appSettings');
    await setSetting(key, '1');
  } catch {
    // Non-fatal
  }
}

export type QuizGateEvaluationOptions = {
  isPremium?: boolean;
  isServiceEnabled?: boolean;
  isOnline?: boolean;
  hasCachedData?: boolean;
  hasUsedSample?: boolean;
  nowMs?: number;
};

/**
 * Evaluates whether a user can access the requested quiz mode (LEARN-01).
 * Pure evaluation logic given user state.
 */
export function evaluateQuizGateSync(
  mode: QuizMode,
  options: QuizGateEvaluationOptions,
): QuizGateResult {
  // 1. Normal mode is always 100% free, unlimited, and offline-compatible
  if (mode === 'normal') {
    return {
      status: 'allowed',
      allowed: true,
      source: 'free_mode',
      mode,
    };
  }

  // 2. Emergency kill switch check
  if (options.isServiceEnabled === false) {
    return {
      status: 'service_disabled',
      allowed: false,
      reason:
        'Vocabulary quizzes are temporarily paused for service maintenance. Flashcard review remains fully available.',
      mode,
    };
  }

  // 3. Premium entitlement check
  if (options.isPremium) {
    // Check offline availability if required
    if (options.isOnline === false && options.hasCachedData === false) {
      return {
        status: 'offline_unavailable',
        allowed: false,
        reason:
          'This quiz mode requires an internet connection to generate fresh questions. Try From the book while offline.',
        mode,
      };
    }

    return {
      status: 'allowed',
      allowed: true,
      source: 'premium',
      mode,
    };
  }

  // 4. Free user logic
  // Offline check for free user attempting advanced mode without cached data
  if (options.isOnline === false && options.hasCachedData === false) {
    return {
      status: 'offline_unavailable',
      allowed: false,
      reason:
        'This quiz mode requires an internet connection to generate fresh questions. Try From the book while offline.',
      mode,
    };
  }

  // Check if weekly sample has already been consumed
  if (options.hasUsedSample) {
    return {
      status: 'subscription_required',
      allowed: false,
      reason:
        'You have used your free advanced quiz session for this week. Upgrade to Premium for unlimited quizzes.',
      trigger: 'advanced_quiz_sample_used',
      mode,
    };
  }

  // Free user with sample available
  return {
    status: 'allowed',
    allowed: true,
    source: 'weekly_sample',
    mode,
  };
}

/**
 * Asynchronously evaluates access to a quiz mode using device SQLite settings and entitlement state.
 */
export async function evaluateQuizGate(
  mode: QuizMode,
  options?: {
    isOnline?: boolean;
    hasCachedData?: boolean;
    nowMs?: number;
  },
): Promise<QuizGateResult> {
  const isPremium = canUse('advanced_quiz');
  const isServiceEnabled = getAppFlag('weekly_quiz_enabled');
  const nowMs = options?.nowMs ?? Date.now();

  let hasUsedSample = false;
  if (!isPremium && mode !== 'normal') {
    hasUsedSample = await hasUsedWeeklyQuizSample(nowMs);
  }

  return evaluateQuizGateSync(mode, {
    isPremium,
    isServiceEnabled,
    isOnline: options?.isOnline ?? true,
    hasCachedData: options?.hasCachedData ?? true,
    hasUsedSample,
    nowMs,
  });
}
