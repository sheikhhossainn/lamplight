import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadCoursePackage, getCourseLesson } from '../src/features/learn/content';
import { buildExerciseQueue, verifySentenceAnswer } from '../src/features/learn/exerciseEngine';

describe('Learn exercise generation engine', () => {
  it('generates exercises for a letter lesson (reading, listening, match pairs)', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const lessonInfo = getCourseLesson('ja', 'ja-u1-l1')!;

    const queue = buildExerciseQueue({
      lesson: lessonInfo.lesson,
      unit: lessonInfo.unit,
      allItems: pkg.items,
      allSentences: pkg.sentences,
      strings: pkg.strings,
    });

    assert.ok(queue.length > 0);

    const hasRead = queue.some((ex) => ex.type === 'letter_read');
    const hasListen = queue.some((ex) => ex.type === 'letter_listen');
    const hasMatch = queue.some((ex) => ex.type === 'match_pairs');

    assert.ok(hasRead, 'Expected letter_read exercises');
    assert.ok(hasListen, 'Expected letter_listen exercises');
    assert.ok(hasMatch, 'Expected match_pairs exercise for >=4 letter items');

    // Check that every multiple-choice exercise has options with exactly 1 correct answer
    for (const ex of queue) {
      if (ex.options) {
        const correctCount = ex.options.filter((o) => o.isCorrect).length;
        assert.equal(correctCount, 1, `Exercise ${ex.id} must have exactly 1 correct option`);
      }
    }
  });

  it('generates sentence building and vocab exercises for unit 3', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const lessonInfo = getCourseLesson('ja', 'ja-u3-l4')!;

    const queue = buildExerciseQueue({
      lesson: lessonInfo.lesson,
      unit: lessonInfo.unit,
      allItems: pkg.items,
      allSentences: pkg.sentences,
      strings: pkg.strings,
    });

    assert.ok(queue.length > 0);
    const buildSentenceEx = queue.find((ex) => ex.type === 'build_sentence');
    assert.ok(buildSentenceEx, 'Expected build_sentence exercise');
    assert.ok(buildSentenceEx.tiles && buildSentenceEx.tiles.length > 0);
    assert.ok(buildSentenceEx.correctSequence && buildSentenceEx.correctSequence.length > 0);
  });

  it('verifies sentence answers against primary and accepted alternative sequences', () => {
    const sentence = {
      id: 's-test',
      unit: 3,
      tokens: [
        { text: 'これ' },
        { text: 'は' },
        { text: 'ねこ' },
        { text: 'です' },
      ],
      accepted: [
        ['これ', 'は', 'ねこ', 'です'],
        ['ねこ', 'です'],
      ],
    };

    assert.equal(verifySentenceAnswer(['これ', 'は', 'ねこ', 'です'], sentence), true);
    assert.equal(verifySentenceAnswer(['ねこ', 'です'], sentence), true);
    assert.equal(verifySentenceAnswer(['これ', 'は', 'いぬ', 'です'], sentence), false);
    assert.equal(verifySentenceAnswer(['これ', 'ねこ', 'は', 'です'], sentence), false);
  });
});
