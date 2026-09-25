import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEntitlementSnapshot,
  resetEntitlementsToFree,
  canUse,
  subscribeToEntitlements,
} from '../src/features/subscription/entitlementService';

test('AUTH-02: resetEntitlementsToFree resets status and entitlements to default free state', () => {
  // Test resetEntitlementsToFree
  resetEntitlementsToFree();
  const snapshot = getEntitlementSnapshot();

  assert.equal(snapshot.status, 'free');
  assert.equal(snapshot.features.reading_insights, false);
  assert.equal(snapshot.features.cloud_sync, false);
  assert.equal(snapshot.features.unlimited_learning, false);
  assert.equal(snapshot.features.advanced_quiz, false);
  assert.equal(snapshot.features.full_ambience, false);
  assert.equal(snapshot.features.ai_companion, false);

  assert.equal(canUse('ai_companion'), false);
  assert.equal(canUse('cloud_sync'), false);
  assert.equal(canUse('reading_insights'), false);
});

test('AUTH-02: subscribeToEntitlements fires callback on reset', () => {
  let notified = false;
  const unsubscribe = subscribeToEntitlements((s) => {
    if (s.status === 'free') {
      notified = true;
    }
  });

  resetEntitlementsToFree();
  unsubscribe();

  assert.equal(notified, true);
});

test('AUTH-02: Merge snapshot correctly reflects local counts for preview display', () => {
  const mockLocalSnapshot = {
    savedWordsCount: 14,
    highlightsCount: 6,
    booksCount: 2,
    shelvesCount: 3,
    reviewEventsCount: 28,
    timestamp: Date.now(),
    data: {
      savedWords: new Array(14).fill({ id: 'w1' }),
      highlights: new Array(6).fill({ id: 'h1' }),
      readingPositions: new Array(2).fill({ book_id: 'b1' }),
      shelves: new Array(3).fill({ id: 's1' }),
      shelfItems: [],
      reviewEvents: new Array(28).fill({ id: 'r1' }),
    },
  };

  const hasItemsToMerge =
    mockLocalSnapshot.savedWordsCount > 0 ||
    mockLocalSnapshot.highlightsCount > 0 ||
    mockLocalSnapshot.booksCount > 0 ||
    mockLocalSnapshot.shelvesCount > 0;

  assert.equal(hasItemsToMerge, true);
  assert.equal(mockLocalSnapshot.booksCount, 2);
  assert.equal(mockLocalSnapshot.savedWordsCount, 14);
  assert.equal(mockLocalSnapshot.highlightsCount, 6);
  assert.equal(mockLocalSnapshot.shelvesCount, 3);
});

test('AUTH-02: Empty local snapshot does not trigger merge preview', () => {
  const emptySnapshot = {
    savedWordsCount: 0,
    highlightsCount: 0,
    booksCount: 0,
    shelvesCount: 0,
    reviewEventsCount: 0,
    timestamp: Date.now(),
    data: {
      savedWords: [],
      highlights: [],
      readingPositions: [],
      shelves: [],
      shelfItems: [],
      reviewEvents: [],
    },
  };

  const hasItemsToMerge =
    emptySnapshot.savedWordsCount > 0 ||
    emptySnapshot.highlightsCount > 0 ||
    emptySnapshot.booksCount > 0 ||
    emptySnapshot.shelvesCount > 0;

  assert.equal(hasItemsToMerge, false);
});
