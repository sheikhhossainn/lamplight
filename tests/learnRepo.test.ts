import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeLessonStatus,
  calculateBestAccuracy,
  type CourseProgressRecord,
} from '../src/db/repositories/courseRepo';

describe('Learn course repository logic & progress transitions', () => {
  const lessonOrder = ['ja-u1-l1', 'ja-u1-l2', 'ja-u1-l3', 'ja-u1-l4'];

  it('first lesson is always open even without prior progress', () => {
    const progressMap = new Map<string, CourseProgressRecord>();
    const status = computeLessonStatus('ja-u1-l1', progressMap, lessonOrder);
    assert.equal(status, 'open');
  });

  it('subsequent lessons are locked until previous lesson is done', () => {
    const progressMap = new Map<string, CourseProgressRecord>();
    assert.equal(computeLessonStatus('ja-u1-l2', progressMap, lessonOrder), 'locked');
    assert.equal(computeLessonStatus('ja-u1-l3', progressMap, lessonOrder), 'locked');

    // Mark l1 as done
    progressMap.set('ja-u1-l1', {
      lang: 'ja',
      lessonId: 'ja-u1-l1',
      status: 'done',
      exerciseIndex: 0,
      bestAccuracy: 0.95,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Now l2 should be open, l3 still locked
    assert.equal(computeLessonStatus('ja-u1-l2', progressMap, lessonOrder), 'open');
    assert.equal(computeLessonStatus('ja-u1-l3', progressMap, lessonOrder), 'locked');
  });

  it('preserves explicitly recorded done and open statuses', () => {
    const progressMap = new Map<string, CourseProgressRecord>([
      [
        'ja-u1-l2',
        {
          lang: 'ja',
          lessonId: 'ja-u1-l2',
          status: 'done',
          exerciseIndex: 0,
          bestAccuracy: 1.0,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    ]);

    assert.equal(computeLessonStatus('ja-u1-l2', progressMap, lessonOrder), 'done');
  });

  it('calculates best accuracy preserving higher score monotonically', () => {
    assert.equal(calculateBestAccuracy(0.8, 0.95), 0.95);
    assert.equal(calculateBestAccuracy(0.95, 0.7), 0.95);
    assert.equal(calculateBestAccuracy(null, 0.85), 0.85);
    assert.equal(calculateBestAccuracy(0.85, null), 0.85);
    assert.equal(calculateBestAccuracy(null, null), null);
  });
});
