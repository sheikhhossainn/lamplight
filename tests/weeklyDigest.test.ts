import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateWeeklyDigestFromData,
  type RawDigestInput,
} from '../src/features/analytics/weeklyDigest.ts';

test('RET-03 Weekly reading digest computation', async (t) => {
  const fixedNow = new Date('2026-09-25T12:00:00Z').getTime();

  await t.test('honest empty state when no activity exists', () => {
    const emptyInput: RawDigestInput = {
      currentWeekSessions: [],
      previousWeekSessions: [],
      currentWeekWordsSaved: 0,
      previousWeekWordsSaved: 0,
      currentWeekWordsReviewed: 0,
      activeBook: null,
      nowMs: fixedNow,
    };

    const digest = calculateWeeklyDigestFromData(emptyInput);

    assert.equal(digest.hasActivity, false);
    assert.equal(digest.readingMinutes, 0);
    assert.equal(digest.readingDays, 0);
    assert.equal(digest.pagesRead, 0);
    assert.equal(digest.wordsSaved, 0);
    assert.equal(digest.wordsReviewed, 0);
    assert.equal(digest.currentBook, null);
    assert.equal(digest.mostProductiveTime, null);
    assert.equal(digest.adaptiveNextWeekGoal.suggestedDays, 2);
    assert.equal(digest.adaptiveNextWeekGoal.suggestedDailyMinutes, 15);
  });

  await t.test('accurately aggregates free tier digest metrics', () => {
    const oneDayMs = 86400000;
    const input: RawDigestInput = {
      currentWeekSessions: [
        // Day 1: 1800s (30m), 15 pages
        {
          bookId: 'pride-and-prejudice',
          startedAt: fixedNow - 1 * oneDayMs,
          durationSeconds: 1800,
          pagesRead: 15,
        },
        // Day 2: 1200s (20m), 10 pages
        {
          bookId: 'pride-and-prejudice',
          startedAt: fixedNow - 2 * oneDayMs,
          durationSeconds: 1200,
          pagesRead: 10,
        },
        // Day 3 (different book): 900s (15m), 8 pages
        {
          bookId: 'moby-dick',
          startedAt: fixedNow - 3 * oneDayMs,
          durationSeconds: 900,
          pagesRead: 8,
        },
      ],
      previousWeekSessions: [
        // Previous week: 1800s (30m), 12 pages
        {
          durationSeconds: 1800,
          pagesRead: 12,
        },
      ],
      currentWeekWordsSaved: 5,
      previousWeekWordsSaved: 3,
      currentWeekWordsReviewed: 12,
      activeBook: {
        id: 'pride-and-prejudice',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        percentComplete: 0.45,
      },
      nowMs: fixedNow,
    };

    const digest = calculateWeeklyDigestFromData(input);

    assert.equal(digest.hasActivity, true);
    // 1800 + 1200 + 900 = 3900 seconds = 65 minutes
    assert.equal(digest.readingMinutes, 65);
    // 3 distinct days
    assert.equal(digest.readingDays, 3);
    // 15 + 10 + 8 = 33 pages
    assert.equal(digest.pagesRead, 33);
    assert.equal(digest.wordsSaved, 5);
    assert.equal(digest.wordsReviewed, 12);

    // Current Book verification
    assert.ok(digest.currentBook);
    assert.equal(digest.currentBook?.bookId, 'pride-and-prejudice');
    assert.equal(digest.currentBook?.percentComplete, 0.45);
    assert.equal(digest.currentBook?.pagesReadThisWeek, 25);
    assert.equal(digest.currentBook?.minutesReadThisWeek, 50);
  });

  await t.test('computes premium speed trend, vocabulary growth, and completion forecast', () => {
    const oneDayMs = 86400000;
    const input: RawDigestInput = {
      currentWeekSessions: [
        {
          bookId: 'book-1',
          startedAt: new Date(2026, 8, 24, 20, 0, 0).getTime(), // Evening (8 PM local)
          durationSeconds: 3600, // 1 hour
          pagesRead: 30, // 30 pgs/hr
        },
      ],
      previousWeekSessions: [
        {
          durationSeconds: 3600, // 1 hour
          pagesRead: 20, // 20 pgs/hr
        },
      ],
      currentWeekWordsSaved: 8,
      previousWeekWordsSaved: 4,
      currentWeekWordsReviewed: 10,
      activeBook: {
        id: 'book-1',
        title: 'Great Expectations',
        author: 'Charles Dickens',
        percentComplete: 0.50,
      },
      nowMs: fixedNow,
    };

    const digest = calculateWeeklyDigestFromData(input);

    // Speed trend: 30 pgs/hr vs 20 pgs/hr = +50%
    assert.equal(digest.speedTrend.pagesPerHour, 30);
    assert.equal(digest.speedTrend.previousPagesPerHour, 20);
    assert.equal(digest.speedTrend.percentageChange, 50);
    assert.equal(digest.speedTrend.trendLabel.includes('+50%'), true);

    // Vocabulary growth: 8 vs 4 = +4 (+100%)
    assert.equal(digest.vocabularyGrowth.wordsSavedThisWeek, 8);
    assert.equal(digest.vocabularyGrowth.wordsSavedLastWeek, 4);
    assert.equal(digest.vocabularyGrowth.diff, 4);
    assert.equal(digest.vocabularyGrowth.growthLabel.includes('+4 words'), true);

    // Most productive time: session was at 8 PM (Evening)
    assert.ok(digest.mostProductiveTime);
    assert.equal(digest.mostProductiveTime?.period, 'Evening');

    // Completion forecast: 50% remaining, 30 pgs read in 1 day
    assert.ok(digest.completionForecast);
    assert.equal(typeof digest.completionForecast?.estimatedDaysRemaining, 'number');
    assert.equal(digest.completionForecast?.estimatedDaysRemaining! > 0, true);

    // Adaptive Goal: 1 day read -> recommends 2 days
    assert.equal(digest.adaptiveNextWeekGoal.suggestedDays, 2);
  });
});
