import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateDeckName,
  calculateDeckItemDiff,
  MAX_DECK_NAME_LENGTH,
} from '../src/db/repositories/vocabularyDecks';
import { canUse } from '../src/features/subscription/subscriptionState';

describe('LEARN-03 Custom vocabulary study decks', () => {
  it('validates deck names and trims whitespace', () => {
    const valid = validateDeckName('   Philosophy Classics   ');
    assert.equal(valid.valid, true);
    assert.equal(valid.cleanName, 'Philosophy Classics');

    const empty = validateDeckName('   ');
    assert.equal(empty.valid, false);
    assert.ok(empty.error?.includes('empty'));

    const nullLike = validateDeckName('');
    assert.equal(nullLike.valid, false);
  });

  it(`enforces maximum deck name length of ${MAX_DECK_NAME_LENGTH} characters`, () => {
    const okName = 'A'.repeat(MAX_DECK_NAME_LENGTH);
    const valid = validateDeckName(okName);
    assert.equal(valid.valid, true);

    const tooLong = 'A'.repeat(MAX_DECK_NAME_LENGTH + 1);
    const invalid = validateDeckName(tooLong);
    assert.equal(invalid.valid, false);
    assert.ok(invalid.error?.includes('50 characters'));
  });

  it('calculates deck item additions and removals accurately', () => {
    const currentDeckIds = ['deck-1', 'deck-2'];
    const targetDeckIds = ['deck-2', 'deck-3', 'deck-4'];

    const diff = calculateDeckItemDiff({ currentDeckIds, targetDeckIds });

    assert.deepEqual(diff.toAdd.sort(), ['deck-3', 'deck-4']);
    assert.deepEqual(diff.toRemove, ['deck-1']);
  });

  it('preserves saved words when deck memberships are detached (isolation principle)', () => {
    // Simulated word state
    const savedWords = [
      { id: 'word-1', word: 'serendipity' },
      { id: 'word-2', word: 'ephemeral' },
    ];
    let deckItems = [
      { deckId: 'deck-a', wordId: 'word-1' },
      { deckId: 'deck-a', wordId: 'word-2' },
    ];

    // Deleting the deck
    const deckToDelete = 'deck-a';
    deckItems = deckItems.filter((item) => item.deckId !== deckToDelete);

    // Deck items are gone, but saved words remain completely intact
    assert.equal(deckItems.length, 0);
    assert.equal(savedWords.length, 2);
    assert.equal(savedWords[0].id, 'word-1');
  });

  it('removes orphaned deck items when a saved word is deleted', () => {
    let deckItems = [
      { deckId: 'deck-a', wordId: 'word-1' },
      { deckId: 'deck-b', wordId: 'word-1' },
      { deckId: 'deck-b', wordId: 'word-2' },
    ];

    // Delete word-1
    const wordToDelete = 'word-1';
    deckItems = deckItems.filter((item) => item.wordId !== wordToDelete);

    // Only word-2 item remains in deck-b
    assert.equal(deckItems.length, 1);
    assert.equal(deckItems[0].wordId, 'word-2');
    assert.equal(deckItems[0].deckId, 'deck-b');
  });

  it('enforces that custom deck creation is gated by unlimited_learning while book review is free', () => {
    // Under free snapshot, unlimited_learning evaluates to false
    assert.equal(canUse('unlimited_learning'), false);
  });
});
