import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHeatmapLevel,
  buildCalendarHeatmapData,
  formatHeatmapDuration,
  formatHeatmapDateLabel,
  formatLocalDateStr,
  type RawHeatmapSession,
} from '../src/features/analytics/calendarHeatmap';

test('INSIGHT-01 Calendar reading heatmap level calculation', () => {
  assert.equal(computeHeatmapLevel(0), 0);
  assert.equal(computeHeatmapLevel(-5), 0);
  assert.equal(computeHeatmapLevel(1), 1);
  assert.equal(computeHeatmapLevel(15), 1);
  assert.equal(computeHeatmapLevel(16), 2);
  assert.equal(computeHeatmapLevel(30), 2);
  assert.equal(computeHeatmapLevel(31), 3);
  assert.equal(computeHeatmapLevel(60), 3);
  assert.equal(computeHeatmapLevel(61), 4);
  assert.equal(computeHeatmapLevel(180), 4);
});

test('INSIGHT-01 Duration and date label formatters', () => {
  assert.equal(formatHeatmapDuration(0), '0m');
  assert.equal(formatHeatmapDuration(15), '15m');
  assert.equal(formatHeatmapDuration(60), '1h');
  assert.equal(formatHeatmapDuration(75), '1h 15m');
  assert.equal(formatHeatmapDuration(150), '2h 30m');

  const formatted = formatHeatmapDateLabel('2026-09-25');
  assert.match(formatted, /Sep 25, 2026/);
});

test('INSIGHT-01 Honest empty state when no reading sessions exist', () => {
  const fixedDate = new Date(2026, 8, 25); // Sep 25, 2026
  const data = buildCalendarHeatmapData([], { endDate: fixedDate, weeksCount: 52 });

  assert.equal(data.totalActiveDays, 0);
  assert.equal(data.totalPeriodMinutes, 0);
  assert.equal(data.totalPeriodPages, 0);
  assert.equal(data.currentStreak, 0);
  assert.equal(data.longestStreak, 0);
  assert.equal(data.peakDay, null);
  assert.equal(data.hasActivity, false);
  assert.equal(data.weeks.length, 52);

  // Every day should be level 0
  for (const week of data.weeks) {
    assert.equal(week.days.length, 7);
    for (const day of week.days) {
      assert.equal(day.level, 0);
      assert.equal(day.minutesRead, 0);
    }
  }
});

test('INSIGHT-01 Multiple sessions on same day aggregate accurately', () => {
  const fixedDate = new Date(2026, 8, 25); // Sep 25, 2026
  const session1: RawHeatmapSession = {
    startedAt: new Date(2026, 8, 25, 10, 0).getTime(),
    durationSeconds: 15 * 60, // 15 mins
    pagesRead: 12,
  };
  const session2: RawHeatmapSession = {
    startedAt: new Date(2026, 8, 25, 21, 30).getTime(),
    durationSeconds: 25 * 60, // 25 mins
    pagesRead: 20,
  };

  const data = buildCalendarHeatmapData([session1, session2], { endDate: fixedDate, weeksCount: 12 });

  assert.equal(data.totalActiveDays, 1);
  assert.equal(data.totalPeriodMinutes, 40); // 15 + 25
  assert.equal(data.totalPeriodPages, 32); // 12 + 20
  assert.equal(data.hasActivity, true);
  assert.equal(data.currentStreak, 1);
  assert.equal(data.longestStreak, 1);
  assert.notEqual(data.peakDay, null);
  assert.equal(data.peakDay?.minutesRead, 40);
  assert.equal(data.peakDay?.pagesRead, 32);

  // Check the today cell
  const lastWeek = data.weeks[data.weeks.length - 1];
  const todayDay = lastWeek.days.find((d) => d.isToday);
  assert.notEqual(todayDay, undefined);
  assert.equal(todayDay?.minutesRead, 40);
  assert.equal(todayDay?.level, 3); // 31-60 mins is level 3
});

test('INSIGHT-01 Streak calculation across consecutive days', () => {
  const fixedDate = new Date(2026, 8, 25); // Friday Sep 25, 2026
  const sessions: RawHeatmapSession[] = [
    // 4-day streak in earlier week
    { startedAt: new Date(2026, 7, 10, 14, 0).getTime(), durationSeconds: 20 * 60, pagesRead: 10 },
    { startedAt: new Date(2026, 7, 11, 14, 0).getTime(), durationSeconds: 20 * 60, pagesRead: 10 },
    { startedAt: new Date(2026, 7, 12, 14, 0).getTime(), durationSeconds: 20 * 60, pagesRead: 10 },
    { startedAt: new Date(2026, 7, 13, 14, 0).getTime(), durationSeconds: 20 * 60, pagesRead: 10 },

    // 2-day current streak ending today
    { startedAt: new Date(2026, 8, 24, 18, 0).getTime(), durationSeconds: 30 * 60, pagesRead: 15 },
    { startedAt: new Date(2026, 8, 25, 9, 0).getTime(), durationSeconds: 45 * 60, pagesRead: 25 },
  ];

  const data = buildCalendarHeatmapData(sessions, { endDate: fixedDate, weeksCount: 16 });

  assert.equal(data.totalActiveDays, 6);
  assert.equal(data.currentStreak, 2);
  assert.equal(data.longestStreak, 4);
  assert.equal(data.peakDay?.minutesRead, 45);
});

test('INSIGHT-01 Future days in current week are excluded from active days', () => {
  const fixedDate = new Date(2026, 8, 23); // Wednesday Sep 23, 2026
  const data = buildCalendarHeatmapData([], { endDate: fixedDate, weeksCount: 4 });

  const lastWeek = data.weeks[data.weeks.length - 1];
  // Thursday, Friday, Saturday should be isFuture: true
  const thu = lastWeek.days.find((d) => d.dayOfWeek === 4);
  const fri = lastWeek.days.find((d) => d.dayOfWeek === 5);
  const sat = lastWeek.days.find((d) => d.dayOfWeek === 6);

  assert.equal(thu?.isFuture, true);
  assert.equal(fri?.isFuture, true);
  assert.equal(sat?.isFuture, true);
});
