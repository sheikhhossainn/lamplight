import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getReportDateBounds,
  calculateHabitReportFromData,
  type RawHabitReportInput,
  type HabitReport,
  type TimeDistribution,
} from '../src/features/analytics/habitReports.ts';

test('INSIGHT-02: Reading habit reports & export card', async (t) => {
  await t.test('getReportDateBounds handles monthly boundaries and leap years', () => {
    // September 2026 (30 days)
    const sepBounds = getReportDateBounds('month', 2026, 9);
    assert.equal(sepBounds.periodLabel, 'September 2026');
    assert.equal(sepBounds.dateRangeLabel, 'September 1 – 30, 2026');

    const sepStart = new Date(sepBounds.startMs);
    assert.equal(sepStart.getFullYear(), 2026);
    assert.equal(sepStart.getMonth(), 8); // 0-indexed September
    assert.equal(sepStart.getDate(), 1);
    assert.equal(sepStart.getHours(), 0);
    assert.equal(sepStart.getMinutes(), 0);

    const sepEnd = new Date(sepBounds.endMs);
    assert.equal(sepEnd.getFullYear(), 2026);
    assert.equal(sepEnd.getMonth(), 8);
    assert.equal(sepEnd.getDate(), 30);
    assert.equal(sepEnd.getHours(), 23);
    assert.equal(sepEnd.getMinutes(), 59);

    // February in leap year (2024 has 29 days)
    const febLeap = getReportDateBounds('month', 2024, 2);
    const febEnd = new Date(febLeap.endMs);
    assert.equal(febEnd.getDate(), 29);

    // February in non-leap year (2025 has 28 days)
    const febNormal = getReportDateBounds('month', 2025, 2);
    const febNormalEnd = new Date(febNormal.endMs);
    assert.equal(febNormalEnd.getDate(), 28);
  });

  await t.test('getReportDateBounds handles annual boundaries', () => {
    const annualBounds = getReportDateBounds('year', 2026);
    assert.equal(annualBounds.periodLabel, '2026 Annual Review');
    assert.equal(annualBounds.dateRangeLabel, 'Jan 1 – Dec 31, 2026');

    const start = new Date(annualBounds.startMs);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 0);
    assert.equal(start.getDate(), 1);

    const end = new Date(annualBounds.endMs);
    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 11);
    assert.equal(end.getDate(), 31);
  });

  await t.test('pure aggregation handles empty account with honest zero state (FULLAPP §12.4)', () => {
    const bounds = getReportDateBounds('month', 2026, 9);
    const emptyInput: RawHabitReportInput = {
      bounds,
      sessions: [],
      words: [],
      reviews: [],
      positionMap: new Map(),
      bookMap: new Map(),
      goal: null,
    };

    const report = calculateHabitReportFromData(emptyInput);

    assert.equal(report.hasSufficientData, false);
    assert.equal(report.totalReadingMinutes, 0);
    assert.equal(report.totalSessionsCount, 0);
    assert.equal(report.totalPagesRead, 0);
    assert.equal(report.activeReadingDays, 0);
    assert.equal(report.averageSessionMinutes, 0);
    assert.equal(report.averagePagesPerHour, 0);
    assert.equal(report.timeDistribution.dominantTime, 'Awaiting history');
    assert.equal(report.speedByLanguage.length, 0);
    assert.equal(report.speedByBook.length, 0);
    assert.equal(report.topBooks.length, 0);
    assert.equal(report.goalAdherence.hasActiveGoal, false);
  });

  await t.test('accurately aggregates multi-session, multi-language data and speeds', () => {
    const bounds = getReportDateBounds('month', 2026, 9);
    const bookMap = new Map([
      ['pride-and-prejudice', { id: 'pride-and-prejudice', title: 'Pride and Prejudice', author: 'Jane Austen', sourceLanguage: 'en' }],
      ['shesher-kobita', { id: 'shesher-kobita', title: 'Shesher Kobita', author: 'Rabindranath Tagore', sourceLanguage: 'bn' }],
    ]);
    const positionMap = new Map([
      ['pride-and-prejudice', 0.65],
      ['shesher-kobita', 0.30],
    ]);

    // Construct sessions at distinct hours
    const baseDate = new Date(2026, 8, 10, 8, 0, 0); // 8:00 AM (Morning)
    const session1Time = baseDate.getTime();
    const session2Time = new Date(2026, 8, 10, 14, 0, 0).getTime(); // 2:00 PM (Afternoon)
    const session3Time = new Date(2026, 8, 11, 23, 0, 0).getTime(); // 11:00 PM (Night)

    const input: RawHabitReportInput = {
      bounds,
      sessions: [
        // English book: 3600s (60 mins), 40 pages (morning)
        { bookId: 'pride-and-prejudice', startedAt: session1Time, durationSeconds: 3600, pagesRead: 40 },
        // English book: 1800s (30 mins), 20 pages (afternoon)
        { bookId: 'pride-and-prejudice', startedAt: session2Time, durationSeconds: 1800, pagesRead: 20 },
        // Bengali book: 1800s (30 mins), 15 pages (night)
        { bookId: 'shesher-kobita', startedAt: session3Time, durationSeconds: 1800, pagesRead: 15 },
      ],
      words: [
        { id: 'w1', srs_stage: 5, srs_reps: 4 }, // Mastered
        { id: 'w2', srs_stage: 1, srs_reps: 1 }, // Learning
      ],
      reviews: [
        { grade: 4 },
        { grade: 5 },
        { grade: 2 }, // 2 of 3 passing = 67%
      ],
      positionMap,
      bookMap,
      goal: { dailyMinutes: 30 },
      nowMs: new Date(2026, 8, 12).getTime(),
    };

    const report = calculateHabitReportFromData(input);

    assert.equal(report.hasSufficientData, true);
    assert.equal(report.totalReadingMinutes, 120); // 60 + 30 + 30
    assert.equal(report.totalSessionsCount, 3);
    assert.equal(report.totalPagesRead, 75); // 40 + 20 + 15
    assert.equal(report.activeReadingDays, 2); // Sept 10 and Sept 11
    assert.equal(report.averageSessionMinutes, 40); // 120 / 3
    assert.equal(report.averagePagesPerHour, 38); // 75 pages / 2 hours = 37.5 -> 38

    // Time distribution: 60m morning, 30m afternoon, 0m evening, 30m night
    assert.equal(report.timeDistribution.morningMinutes, 60);
    assert.equal(report.timeDistribution.afternoonMinutes, 30);
    assert.equal(report.timeDistribution.eveningMinutes, 0);
    assert.equal(report.timeDistribution.nightMinutes, 30);
    assert.equal(report.timeDistribution.dominantTime, 'Morning');

    // Language trends: English vs Bengali
    assert.equal(report.speedByLanguage.length, 2);
    const en = report.speedByLanguage.find((l) => l.language === 'en');
    const bn = report.speedByLanguage.find((l) => l.language === 'bn');
    assert.ok(en);
    assert.ok(bn);
    assert.equal(en?.languageLabel, 'English');
    assert.equal(en?.minutesRead, 90);
    assert.equal(en?.pagesRead, 60);
    assert.equal(en?.pagesPerHour, 40); // 60 pages / 1.5 hrs = 40
    assert.equal(bn?.languageLabel, 'Bengali');
    assert.equal(bn?.minutesRead, 30);
    assert.equal(bn?.pagesPerHour, 30); // 15 pages / 0.5 hrs = 30

    // Top books
    assert.equal(report.topBooks.length, 2);
    assert.equal(report.topBooks[0].title, 'Pride and Prejudice');
    assert.equal(report.topBooks[0].percentComplete, 0.65);

    // Vocabulary
    assert.equal(report.vocabularyGrowth.wordsSavedCount, 2);
    assert.equal(report.vocabularyGrowth.wordsMasteredCount, 1);
    assert.equal(report.vocabularyGrowth.reviewAccuracyRate, 67);

    // Goal Adherence: Target 30 mins. Day 10 had 90 mins (met). Day 11 had 30 mins (met).
    assert.equal(report.goalAdherence.hasActiveGoal, true);
    assert.equal(report.goalAdherence.daysGoalMet, 2);
    assert.ok(report.goalAdherence.adherencePercentage > 0);
  });
});
