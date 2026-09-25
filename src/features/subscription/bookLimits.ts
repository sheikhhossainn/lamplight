import { isAuthenticatedAccount } from '@/lib/supabaseAuth';

export const GUEST_VOCABULARY_PER_BOOK = 15;
export const FREE_VOCABULARY_PER_BOOK = 30;

export const GUEST_QUOTES_PER_BOOK = 5;
export const FREE_QUOTES_PER_BOOK = 15;

export const GUEST_DAILY_TRANSLATION_LIMIT = 20;
export const FREE_DAILY_TRANSLATION_LIMIT = 50;

export type BookLimitType = 'vocabulary' | 'quotes';

export interface BookLimitCheck {
  limit: number;
  isGuest: boolean;
  isPremium: boolean;
}

/**
 * Returns the effective per-book limit based on user tier:
 * - Guest (anonymous): 15 words / 5 quotes
 * - Free (authenticated): 30 words / 15 quotes
 * - Premium (subscriber): Infinity
 */
export async function getBookLimit(
  type: BookLimitType,
  isPremium: boolean,
): Promise<BookLimitCheck> {
  if (isPremium) {
    return { limit: Infinity, isGuest: false, isPremium: true };
  }

  const isAuth = await isAuthenticatedAccount();
  const isGuest = !isAuth;

  if (type === 'vocabulary') {
    return {
      limit: isGuest ? GUEST_VOCABULARY_PER_BOOK : FREE_VOCABULARY_PER_BOOK,
      isGuest,
      isPremium: false,
    };
  }

  return {
    limit: isGuest ? GUEST_QUOTES_PER_BOOK : FREE_QUOTES_PER_BOOK,
    isGuest,
    isPremium: false,
  };
}

export interface TierLimitsSnapshot {
  vocabularyPerBook: number;
  quotesPerBook: number;
  translationsPerDay: number;
  weeklyQuizAllowed: boolean;
  isGuest: boolean;
  isPremium: boolean;
}

/**
 * Returns a comprehensive snapshot of tier caps for display and gating.
 */
export async function getTierLimits(isPremium: boolean): Promise<TierLimitsSnapshot> {
  if (isPremium) {
    return {
      vocabularyPerBook: Infinity,
      quotesPerBook: Infinity,
      translationsPerDay: Infinity,
      weeklyQuizAllowed: true,
      isGuest: false,
      isPremium: true,
    };
  }

  const isAuth = await isAuthenticatedAccount();
  const isGuest = !isAuth;

  return {
    vocabularyPerBook: isGuest ? GUEST_VOCABULARY_PER_BOOK : FREE_VOCABULARY_PER_BOOK,
    quotesPerBook: isGuest ? GUEST_QUOTES_PER_BOOK : FREE_QUOTES_PER_BOOK,
    translationsPerDay: isGuest ? GUEST_DAILY_TRANSLATION_LIMIT : FREE_DAILY_TRANSLATION_LIMIT,
    weeklyQuizAllowed: !isGuest,
    isGuest,
    isPremium: false,
  };
}
