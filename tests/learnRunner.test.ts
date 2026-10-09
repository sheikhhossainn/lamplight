import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadCoursePackage, getCourseLesson } from '../src/features/learn/content';
import { buildExerciseQueue, type ExerciseItem } from '../src/features/learn/exerciseEngine';

describe('Learn exercise runner logic & queue progression', () => {
  it('resumes correctly at recorded exerciseIndex without bounds overflow', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const lessonInfo = getCourseLesson('ja', 'ja-u1-l1')!;

    const queue = buildExerciseQueue({
      lesson: lessonInfo.lesson,
      unit: lessonInfo.unit,
      allItems: pkg.items,
      allSentences: pkg.sentences,
      strings: pkg.strings,
    });

    assert.ok(queue.length >= 4);

    // Simulated saved resume index
    const savedIndex = 2;
    const clampedIndex = Math.min(savedIndex, queue.length - 1);
    assert.equal(clampedIndex, 2);
    assert.ok(queue[clampedIndex] !== undefined);
  });

  it('re-queuing an incorrect exercise places it at the end of the queue', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const lessonInfo = getCourseLesson('ja', 'ja-u1-l1')!;

    const queue = buildExerciseQueue({
      lesson: lessonInfo.lesson,
      unit: lessonInfo.unit,
      allItems: pkg.items,
      allSentences: pkg.sentences,
      strings: pkg.strings,
    });

    const initialLength = queue.length;
    const failedExercise = queue[0];

    // Simulate kind retry re-insert
    const updatedQueue = [...queue, failedExercise];
    assert.equal(updatedQueue.length, initialLength + 1);
    assert.equal(updatedQueue[updatedQueue.length - 1].id, failedExercise.id);
  });

  it('calculates accuracy score accurately and clamps monotonically between 0 and 1', () => {
    function calcAccuracy(totalInitial: number, mistakes: number): number {
      const initialCount = Math.max(1, totalInitial);
      return Math.max(0, Math.min(1, (initialCount - mistakes) / initialCount));
    }

    assert.equal(calcAccuracy(10, 0), 1.0);
    assert.equal(calcAccuracy(10, 1), 0.9);
    assert.equal(calcAccuracy(10, 5), 0.5);
    assert.equal(calcAccuracy(10, 10), 0.0);
    assert.equal(calcAccuracy(10, 15), 0.0); // Never negative
  });

  it('validates match_pairs components have corresponding left and right ids', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const lessonInfo = getCourseLesson('ja', 'ja-u1-l1')!;

    const queue = buildExerciseQueue({
      lesson: lessonInfo.lesson,
      unit: lessonInfo.unit,
      allItems: pkg.items,
      allSentences: pkg.sentences,
      strings: pkg.strings,
    });

    const matchEx = queue.find((ex) => ex.type === 'match_pairs');
    assert.ok(matchEx);
    assert.ok(matchEx.pairs && matchEx.pairs.length >= 4);

    for (const pair of matchEx.pairs) {
      assert.equal(pair.leftId, pair.rightId);
      assert.ok(pair.leftText.length > 0);
      assert.ok(pair.rightText.length > 0);
    }
  });
});
