import assert from 'node:assert/strict';
import test from 'node:test';

import {
  drawEmpatheticDeck,
  drawTableDeck,
  TABLE_TRADITIONS,
} from '../src/features/scripture-verses/empatheticMatcher';
import { CURATED_COMFORT_VERSES } from '../src/features/scripture-verses/curatedComfortVerses';
import {
  getScriptureLabels,
  type MotherTongueCode,
} from '../src/features/settings/motherTongue';

test('SCRIPTURE-02 drawEmpatheticDeck generates valid comforted cards for emotional signals', () => {
  const emotions = ['anxiety and panic', 'exhausted burnout', 'grief and tears', 'seeking peace', 'hope'];

  for (const emotion of emotions) {
    const deck = drawEmpatheticDeck(emotion);
    assert.ok(Array.isArray(deck), `Deck should be an array for emotion: ${emotion}`);
    assert.ok(deck.length >= 4 && deck.length <= 7, `Deck length should be between 4 and 7, got: ${deck.length}`);

    for (const card of deck) {
      assert.ok(typeof card.id === 'string' && card.id.length > 0, 'Card must have an id');
      assert.ok(typeof card.tradition === 'string' && card.tradition.length > 0, 'Card must have a tradition');
      assert.ok(typeof card.book === 'string' && card.book.length > 0, 'Card must have a book');
      assert.ok(typeof card.chapter === 'number' && card.chapter > 0, 'Card must have a valid chapter');
      assert.ok(typeof card.verseNumber === 'number' && card.verseNumber > 0, 'Card must have a valid verse number');
      assert.ok(
        (card.translation && card.translation.length > 0) || (card.originalText && card.originalText.length > 0),
        'Card must have readable text',
      );
      assert.ok(typeof card.reflectionHint === 'string' && card.reflectionHint.length > 0, 'Card must have a reflection hint');
    }
  }
});

test('SCRIPTURE-02 drawEmpatheticDeck handles edge cases without throwing', () => {
  const edgeCases = ['', '   ', '???!!!', 'asdkfjhasdfkjhasdf', '🌟✨💖', 'mixed CASE with 12345'];

  for (const input of edgeCases) {
    const deck = drawEmpatheticDeck(input);
    assert.ok(Array.isArray(deck), 'Should always return an array');
    assert.ok(deck.length > 0, 'Should return fallback comforting cards even for empty or unrecognized input');
  }
});

test('SCRIPTURE-02 drawTableDeck returns exactly 5 cards representing the 5 Sacred Table traditions', () => {
  const inputs = ['I am feeling anxious', 'grief and sorrow', '', 'peace'];

  for (const input of inputs) {
    const tableDeck = drawTableDeck(input);
    assert.equal(tableDeck.length, 5, `Table deck must contain exactly 5 cards, got ${tableDeck.length}`);

    const traditionsInDeck = tableDeck.map((c) => c.tradition);
    for (const expectedTradition of TABLE_TRADITIONS) {
      assert.ok(
        traditionsInDeck.includes(expectedTradition),
        `Table deck must include tradition "${expectedTradition}". Found: ${traditionsInDeck.join(', ')}`,
      );
    }
  }
});

test('SCRIPTURE-02 getScriptureLabels provides distinct reflect and ask labels across all mother tongues', () => {
  const tongues: MotherTongueCode[] = ['bn', 'ja', 'ko', 'ar', 'en'];

  for (const code of tongues) {
    const labels = getScriptureLabels(code);
    assert.ok(labels, `Labels must exist for tongue: ${code}`);
    assert.ok(labels.sectionTitle.length > 0, `sectionTitle must be non-empty for ${code}`);
    assert.ok(labels.askLabel.length > 0, `askLabel must be non-empty for ${code}`);
    assert.ok(labels.reflectLabel.length > 0, `reflectLabel must be non-empty for ${code}`);
    assert.ok(labels.tableLabel.length > 0, `tableLabel must be non-empty for ${code}`);

    // Critical decoupling constraint: askLabel and reflectLabel must be distinct
    assert.notEqual(
      labels.askLabel,
      labels.reflectLabel,
      `askLabel and reflectLabel must be distinctly different in ${code}`,
    );
  }
});

test('SCRIPTURE-02 curated comfort verses database integrity', () => {
  assert.ok(CURATED_COMFORT_VERSES.length > 50, 'Curated comfort pool must contain sufficient breadth');

  const validTraditions = new Set(['quran', 'bible-ot', 'bible-nt', 'torah', 'vedas']);

  for (const verse of CURATED_COMFORT_VERSES) {
    assert.ok(verse.id, 'Every verse must have an ID');
    assert.ok(validTraditions.has(verse.tradition), `Invalid tradition: ${verse.tradition}`);
    assert.ok(verse.situations.length > 0, `Verse ${verse.id} must have situations tags`);
    assert.ok(verse.comfortDimension, `Verse ${verse.id} must have a comfortDimension`);
    assert.ok(verse.reflectionHint, `Verse ${verse.id} must have a reflectionHint`);
  }
});
