import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractContextSentence,
  type ContextEnrichment,
} from '../src/features/translation/contextTranslation';

test('LEARN-04 Context sentence extraction from multi-sentence paragraph', () => {
  const paragraph =
    'The morning light filtered softly through the library windows. ' +
    'Elizabeth looked upon the ancient manuscript with profound reverence. ' +
    'Outside, the rain tapped gently against the dark glass.';

  const sentence = extractContextSentence(paragraph, 'reverence');
  assert.equal(
    sentence,
    'Elizabeth looked upon the ancient manuscript with profound reverence.',
  );
});

test('LEARN-04 Context sentence extraction with charOffset targeting', () => {
  const paragraph =
    'First sentence is calm. ' +
    'Second sentence contains light and clarity. ' +
    'Third sentence brings darkness.';

  // Offset inside the second sentence
  const secondSentenceStart = paragraph.indexOf('Second sentence');
  const sentence = extractContextSentence(paragraph, 'light', secondSentenceStart + 5);

  assert.equal(sentence, 'Second sentence contains light and clarity.');
});

test('LEARN-04 Context sentence handles abbreviations without premature split', () => {
  const paragraph =
    'Mr. Darcy observed her with keen interest. ' +
    'He had never seen a reader so immersed in philosophy.';

  const sentence = extractContextSentence(paragraph, 'observed');
  assert.equal(sentence, 'Mr. Darcy observed her with keen interest.');
});

test('LEARN-04 Context sentence handles Bengali dari punctuation', () => {
  const paragraph =
    'সন্ধ্যা নেমে এলো চারপাশের নিস্তব্ধতায়। ' +
    'প্রদীপের মৃদু আলোয় তিনি একটি প্রাচীন গ্রন্থ পড়ছিলেন। ' +
    'বাইরে বাতাসের মৃদু গুঞ্জন শোনা যাচ্ছিল।';

  const sentence = extractContextSentence(paragraph, 'প্রাচীন');
  assert.equal(
    sentence,
    'প্রদীপের মৃদু আলোয় তিনি একটি প্রাচীন গ্রন্থ পড়ছিলেন।',
  );
});

test('LEARN-04 Graceful fallbacks for single sentence or missing word', () => {
  const single = 'A solitary candle burned on the writing desk.';
  assert.equal(extractContextSentence(single, 'candle'), single);

  // Missing word returns first sentence
  const multi = 'First sentence here. Second sentence follows.';
  assert.equal(extractContextSentence(multi, 'nonexistent'), 'First sentence here.');

  // Empty string
  assert.equal(extractContextSentence('', 'word'), '');
});

test('LEARN-04 ContextEnrichment type structure conforms to FULLAPP §10.4', () => {
  const enrichment: ContextEnrichment = {
    contextualTranslation: 'শ্রদ্ধা ও ভক্তি',
    definition: 'গভীর শ্রদ্ধা ও সম্ভ্রমপূর্ণ অনুভূতি',
    partOfSpeech: 'noun',
    contextFit: 'এখানে পাণ্ডুলিপির ঐতিহাসিক মাহাত্ম্য বোঝাতে শব্দটি ব্যবহৃত হয়েছে।',
    synonyms: [{ word: 'veneration', meaning: 'শ্রদ্ধা' }],
    antonyms: [{ word: 'disdain', meaning: 'অবজ্ঞা' }],
    grammarNote: 'Archaic formal register common in 19th-century prose.',
    version: 'v1-groq-literary',
  };

  assert.equal(enrichment.partOfSpeech, 'noun');
  assert.equal(enrichment.synonyms.length, 1);
  assert.equal(enrichment.antonyms.length, 1);
  assert.equal(enrichment.version, 'v1-groq-literary');
});
