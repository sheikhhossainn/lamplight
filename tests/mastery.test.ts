import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { SavedWord } from '../src/db/repositories/savedWords';
import {
  getWordMasteryInfo,
  filterWordsByMastery,
  getMasteryFilterCounts,
} from '../src/features/vocabulary/mastery';

function mockWord(overrides: Partial<SavedWord>): SavedWord {
  return {
    id: 'word-1',
    bookId: 'book-1',
    sourceWord: 'ineffable',
    sourceLang: 'en',
    targetLang: 'bn',
    translation: 'অবর্ণনীয়',
    contextSentence: 'The beauty of the dawn was ineffable.',
    chapterIndex: 0,
    pageIndex: 1,
    paragraphIndex: 0,
    createdAt: 100000,
    srsStage: 0,
    srsIntervalDays: 0,
    srsEaseFactor: 2.5,
    srsDueDate: 0,
    srsReps: 0,
    srsLapses: 0,
    phonetic: null,
    ...overrides,
  };
}

describe('LEARN-02 Vocabulary mastery clarity and filters', () => {
  const now = 1700000000000;

  it('correctly identifies a brand new word', () => {
    const word = mockWord({ srsReps: 0, srsLapses: 0, srsStage: 0, srsIntervalDays: 0 });
    const info = getWordMasteryInfo(word, now);
    assert.equal(info.primaryStage, 'new');
    assert.equal(info.stageLabel, 'New');
    assert.equal(info.isDifficult, false);
    assert.match(info.stageDescription, /awaiting first active review/i);
  });

  it('identifies an active learning word', () => {
    const word = mockWord({
      srsReps: 1,
      srsLapses: 0,
      srsStage: 1,
      srsIntervalDays: 1,
      srsDueDate: now + 86400000,
    });
    const info = getWordMasteryInfo(word, now);
    assert.equal(info.primaryStage, 'learning');
    assert.equal(info.stageLabel, 'Learning');
    assert.equal(info.isDue, false);
    assert.equal(info.dueLabel, 'Due tomorrow');
  });

  it('identifies reviewing and mastered words by interval', () => {
    const reviewingWord = mockWord({
      srsReps: 3,
      srsStage: 2,
      srsIntervalDays: 7,
      srsDueDate: now - 3600000, // 1 hour ago
    });
    const revInfo = getWordMasteryInfo(reviewingWord, now);
    assert.equal(revInfo.primaryStage, 'reviewing');
    assert.equal(revInfo.isDue, true);
    assert.equal(revInfo.dueLabel, 'Due for review');

    const masteredWord = mockWord({
      srsReps: 5,
      srsStage: 3,
      srsIntervalDays: 28,
      srsDueDate: now + 86400000 * 10,
    });
    const mastInfo = getWordMasteryInfo(masteredWord, now);
    assert.equal(mastInfo.primaryStage, 'mastered');
    assert.equal(mastInfo.stageLabel, 'Mastered');
    assert.equal(mastInfo.isDue, false);
    assert.match(mastInfo.dueLabel, /Due in 10 days/i);
  });

  it('detects difficult words when recall lapses occur', () => {
    const lapsedWord = mockWord({
      srsReps: 4,
      srsLapses: 2,
      srsEaseFactor: 1.8,
      srsStage: 1,
      srsIntervalDays: 1,
    });
    const info = getWordMasteryInfo(lapsedWord, now);
    assert.equal(info.isDifficult, true);
  });

  it('filters words properly across all criteria', () => {
    const wNew = mockWord({ id: 'w1', srsReps: 0, srsDueDate: 0 });
    const wDue = mockWord({ id: 'w2', srsReps: 1, srsDueDate: now - 1000, srsStage: 1 });
    const wMast = mockWord({ id: 'w3', srsReps: 6, srsIntervalDays: 30, srsStage: 3, srsDueDate: now + 500000 });
    const wDiff = mockWord({ id: 'w4', srsReps: 2, srsLapses: 3, srsStage: 1, srsDueDate: now + 500000 });

    const all = [wNew, wDue, wMast, wDiff];

    const dueFiltered = filterWordsByMastery(all, 'due', now);
    assert.deepEqual(dueFiltered.map((w) => w.id), ['w2']);

    const newFiltered = filterWordsByMastery(all, 'new', now);
    assert.deepEqual(newFiltered.map((w) => w.id), ['w1']);

    const mastFiltered = filterWordsByMastery(all, 'mastered', now);
    assert.deepEqual(mastFiltered.map((w) => w.id), ['w3']);

    const diffFiltered = filterWordsByMastery(all, 'difficult', now);
    assert.deepEqual(diffFiltered.map((w) => w.id), ['w4']);

    const counts = getMasteryFilterCounts(all, now);
    assert.equal(counts.all, 4);
    assert.equal(counts.new, 1);
    assert.equal(counts.due, 1);
    assert.equal(counts.mastered, 1);
    assert.equal(counts.difficult, 1);
  });
});
