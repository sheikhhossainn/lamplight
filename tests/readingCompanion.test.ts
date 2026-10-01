import test from 'node:test';
import assert from 'node:assert/strict';

import {
  boundExcerpt,
  computeScopeLabel,
  extractPriorText,
} from '../src/features/companion/readingCompanionService';

test('COMPANION-01: Scope label calculation for selected passages', () => {
  const singleWord = computeScopeLabel({
    chapterIndex: 0,
    selectedWords: 1,
  });
  assert.equal(singleWord, 'Selected Passage (1 word)');

  const multiWords = computeScopeLabel({
    chapterIndex: 2,
    selectedWords: 42,
  });
  assert.equal(multiWords, 'Selected Passage (42 words)');
});

test('COMPANION-01: Scope label calculation for chapter reading positions', () => {
  const withPageAndTitle = computeScopeLabel({
    chapterIndex: 2,
    chapterTitle: 'The Gathering Storm',
    pageIndex: 4,
    totalPages: 24,
  });
  assert.equal(
    withPageAndTitle,
    'Chapter 3: The Gathering Storm (Page 5 of 24)',
  );

  const withoutPage = computeScopeLabel({
    chapterIndex: 5,
    chapterTitle: 'Into the Forest',
  });
  assert.equal(
    withoutPage,
    'Chapter 6: Into the Forest (Strictly spoiler-free)',
  );

  const fallbackTitle = computeScopeLabel({
    chapterIndex: 0,
  });
  assert.equal(
    fallbackTitle,
    'Chapter 1 (Strictly spoiler-free)',
  );
});

test('COMPANION-01: Excerpt bounding on sentence and word boundaries', () => {
  const shortText = 'Elizabeth walked briskly through the woods.';
  assert.equal(boundExcerpt(shortText, 100), shortText);

  const multiSentence =
    'First sentence is calm and measured. ' +
    'Second sentence contains the central revelation of the mystery. ' +
    'Third sentence continues far into the night with unresolved questions.';

  // Bound to 80 chars - should cleanly break after second sentence period
  const boundedSentence = boundExcerpt(multiSentence, 110);
  assert.ok(boundedSentence.endsWith('.'));
  assert.ok(boundedSentence.includes('Second sentence contains the central revelation'));
  assert.ok(!boundedSentence.includes('Third sentence'));

  // Fallback to word boundary when no period exists near limit
  const longSentenceWithoutPeriods = 'This is an extraordinarily long sentence with no punctuation marks anywhere in its text which keeps going on and on';
  const boundedWord = boundExcerpt(longSentenceWithoutPeriods, 45);
  assert.ok(boundedWord.endsWith('...'));
  assert.ok(boundedWord.length <= 48);
  assert.ok(!boundedWord.endsWith(' ...'));
});

test('COMPANION-01: Excerpt bounding handles empty/whitespace inputs safely', () => {
  assert.equal(boundExcerpt('', 500), '');
  assert.equal(boundExcerpt('   ', 500), '');
});

test('COMPANION-01: Strict spoiler prevention in character recap text extraction', () => {
  const chapters = [
    'Chapter 1: Elizabeth meets Mr. Darcy at the Meryton ball. Darcy refuses to dance.',
    'Chapter 2: Jane falls ill at Netherfield. Elizabeth walks through the mud to care for her.',
    'Chapter 3: Mr. Collins arrives and proposes marriage to Elizabeth. Elizabeth declines.',
    'Chapter 4: Darcy gives Elizabeth a letter explaining Wickham. Wickham elopes with Lydia. [FUTURE SPOILER]',
    'Chapter 5: Darcy secretly arranges the wedding and pays Wickham debts. [FUTURE SPOILER]',
  ];

  // Reader is currently at Chapter 3 (index 2)
  const currentChapterIndex = 2;
  const priorText = extractPriorText(chapters, currentChapterIndex);

  // Assert current and prior chapters are included
  assert.ok(priorText.includes('Elizabeth meets Mr. Darcy'));
  assert.ok(priorText.includes('Jane falls ill at Netherfield'));
  assert.ok(priorText.includes('Mr. Collins arrives'));

  // Strict assertion: FUTURE chapters must NEVER be included
  assert.ok(!priorText.includes('Chapter 4'));
  assert.ok(!priorText.includes('FUTURE SPOILER'));
  assert.ok(!priorText.includes('Wickham elopes with Lydia'));
  assert.ok(!priorText.includes('Chapter 5'));
  assert.ok(!priorText.includes('pays Wickham debts'));
});

test('COMPANION-01: Character recap text with partial active chapter text', () => {
  const chapters = [
    'Chapter 1 introduction.',
    'Chapter 2 developments.',
    'Chapter 3 full text with spoilers later in chapter.',
  ];

  // Only partial active text up to current reading page should be included
  const activePartial = 'Chapter 3 beginning text only up to page 5.';
  const priorText = extractPriorText(chapters, 2, activePartial);

  assert.ok(priorText.includes('Chapter 1 introduction.'));
  assert.ok(priorText.includes('Chapter 2 developments.'));
  assert.ok(priorText.includes(activePartial));
  assert.ok(!priorText.includes('spoilers later in chapter'));
});

test('COMPANION-01: Extract prior text handles empty or single-chapter book gracefully', () => {
  assert.equal(extractPriorText([], 0), '');
  assert.equal(extractPriorText(['Only chapter'], 0), 'Only chapter');
});
