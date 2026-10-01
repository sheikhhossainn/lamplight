import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_VOCABULARY_PER_BOOK,
  FREE_VOCABULARY_PER_BOOK,
  GUEST_QUOTES_PER_BOOK,
  FREE_QUOTES_PER_BOOK,
  GUEST_DAILY_TRANSLATION_LIMIT,
  FREE_DAILY_TRANSLATION_LIMIT,
  getBookLimit,
  getTierLimits,
} from '../src/features/subscription/bookLimits.ts';
import { checkTranslationCap, checkCachedTranslationCap } from '../src/features/translation/capPolicy.ts';

test('GUEST-01 tier constants meet product specifications', () => {
  assert.equal(GUEST_DAILY_TRANSLATION_LIMIT, 20, 'Guest lookups must be 20 per day');
  assert.equal(FREE_DAILY_TRANSLATION_LIMIT, 50, 'Free lookups must be 50 per day');
  assert.equal(GUEST_VOCABULARY_PER_BOOK, 15, 'Guest vocab must be 15 per book');
  assert.equal(FREE_VOCABULARY_PER_BOOK, 30, 'Free vocab must be 30 per book');
  assert.equal(GUEST_QUOTES_PER_BOOK, 5, 'Guest quotes must be 5 per book');
  assert.equal(FREE_QUOTES_PER_BOOK, 15, 'Free quotes must be 15 per book');
});

test('GUEST-02 getBookLimit returns Infinity for premium accounts', async () => {
  const vocabCheck = await getBookLimit('vocabulary', true);
  assert.equal(vocabCheck.limit, Infinity);
  assert.equal(vocabCheck.isPremium, true);
  assert.equal(vocabCheck.isGuest, false);

  const quoteCheck = await getBookLimit('quotes', true);
  assert.equal(quoteCheck.limit, Infinity);
  assert.equal(quoteCheck.isPremium, true);
  assert.equal(quoteCheck.isGuest, false);
});

test('GUEST-03 getTierLimits returns unlimited snapshot for premium', async () => {
  const limits = await getTierLimits(true);
  assert.equal(limits.vocabularyPerBook, Infinity);
  assert.equal(limits.quotesPerBook, Infinity);
  assert.equal(limits.translationsPerDay, Infinity);
  assert.equal(limits.weeklyQuizAllowed, true);
  assert.equal(limits.isGuest, false);
  assert.equal(limits.isPremium, true);
});

test('GUEST-04 checkTranslationCap respects guest override and daily caps', async () => {
  // Premium
  const premCap = await checkTranslationCap(true);
  assert.equal(premCap.allowed, true);
  assert.equal(premCap.limit, Infinity);
  assert.equal(premCap.isGuest, false);

  // Guest override = true (20 translations/day)
  const guestCap = await checkTranslationCap(false, true);
  assert.equal(guestCap.limit, 20);
  assert.equal(guestCap.isGuest, true);
  assert.equal(guestCap.allowed, guestCap.remaining > 0);

  // Free override = false (50 translations/day)
  const freeCap = await checkTranslationCap(false, false);
  assert.equal(freeCap.limit, 50);
  assert.equal(freeCap.isGuest, false);
  assert.equal(freeCap.allowed, freeCap.remaining > 0);
});

test('GUEST-05 checkCachedTranslationCap returns matching limits', async () => {
  const premCached = await checkCachedTranslationCap(true);
  assert.equal(premCached?.limit, Infinity);
  assert.equal(premCached?.isGuest, false);

  const guestCached = await checkCachedTranslationCap(false, true);
  assert.equal(guestCached?.limit, 20);
  assert.equal(guestCached?.isGuest, true);

  const freeCached = await checkCachedTranslationCap(false, false);
  assert.equal(freeCached?.limit, 50);
  assert.equal(freeCached?.isGuest, false);
});
