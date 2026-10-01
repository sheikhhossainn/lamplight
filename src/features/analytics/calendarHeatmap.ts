/**
 * Calendar Reading Heatmap Calculation Engine (INSIGHT-01 / FULLAPP.md §12.3 & §12.4)
 *
 * Implements pure date aggregation, level calculation, and streak tracking for a
 * GitHub-style annual reading cadence heatmap.
 *
 * Principles:
 * - Pure calculation functions decoupled from UI formatting and native SQLite.
 * - Honest zero states: no fabricated defaults or phantom reading activity.
 * - Local-calendar day boundaries (YYYY-MM-DD) respecting client timezone.
 * - Bounded date-range queries for long-term scalability.
 */

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type HeatmapDay = {
  dateStr: string; // 'YYYY-MM-DD'
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  minutesRead: number;
  pagesRead: number;
  sessionCount: number;
  level: HeatmapLevel;
  isToday: boolean;
  isFuture: boolean;
};

export type HeatmapWeek = {
  weekIndex: number;
  monthLabel: string | null; // e.g. 'Jan', 'Feb', or null
  days: HeatmapDay[];
};

export type CalendarHeatmapData = {
  weeks: HeatmapWeek[];
  totalActiveDays: number;
  totalPeriodMinutes: number;
  totalPeriodPages: number;
  currentStreak: number;
  longestStreak: number;
  peakDay: {
    dateStr: string;
    minutesRead: number;
    pagesRead: number;
  } | null;
  startDateStr: string;
  endDateStr: string;
  hasActivity: boolean;
};

export type RawHeatmapSession = {
  startedAt: number;
  durationSeconds: number;
  pagesRead: number;
};

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Computes the color intensity level (0-4) based on minutes read.
 * 0: 0 mins
 * 1: 1 - 15 mins (light glow)
 * 2: 16 - 30 mins (steady reading)
 * 3: 31 - 60 mins (dedicated chapter)
 * 4: > 60 mins (immersive sanctuary)
 */
export function computeHeatmapLevel(minutesRead: number): HeatmapLevel {
  if (minutesRead <= 0) return 0;
  if (minutesRead <= 15) return 1;
  if (minutesRead <= 30) return 2;
  if (minutesRead <= 60) return 3;
  return 4;
}

/**
 * Formats a Date object to local YYYY-MM-DD string.
 */
export function formatLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD into a local midnight Date.
 */
export function parseLocalDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a duration in minutes into a friendly string (e.g., '45m' or '1h 30m').
 */
export function formatHeatmapDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Formats a dateStr into readable human date (e.g. 'Wednesday, Sep 23, 2026').
 */
export function formatHeatmapDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  const monthName = MONTH_LABELS[date.getMonth()];
  return `${dayName}, ${monthName} ${d}, ${y}`;
}

/**
 * Pure calculation function that transforms reading sessions into a calendar heatmap grid.
 */
export function buildCalendarHeatmapData(
  sessions: RawHeatmapSession[],
  options?: {
    endDate?: Date;
    weeksCount?: number;
  },
): CalendarHeatmapData {
  const weeksCount = Math.max(1, Math.min(52, options?.weeksCount ?? 52));
  const baseEnd = options?.endDate ?? new Date();
  const today = new Date(baseEnd.getFullYear(), baseEnd.getMonth(), baseEnd.getDate());
  const todayStr = formatLocalDateStr(today);

  // Align end to the current week's Saturday (column index weeksCount - 1, day 6)
  const currentSaturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  // Start on Sunday weeksCount weeks ago
  const totalDays = weeksCount * 7;
  const startDate = new Date(currentSaturday.getTime() - (totalDays - 1) * 86400000);
  const startDateStr = formatLocalDateStr(startDate);
  const endDateStr = formatLocalDateStr(today);

  // Aggregate sessions by day
  type DayAccumulator = {
    minutes: number;
    pages: number;
    count: number;
  };
  const dayDataMap = new Map<string, DayAccumulator>();

  for (const s of sessions) {
    if (!s.startedAt) continue;
    const sDate = new Date(s.startedAt);
    const dStr = formatLocalDateStr(sDate);
    const mins = Math.max(0, Math.round((s.durationSeconds || 0) / 60));
    const pages = Math.max(0, s.pagesRead || 0);

    const prev = dayDataMap.get(dStr) ?? { minutes: 0, pages: 0, count: 0 };
    dayDataMap.set(dStr, {
      minutes: prev.minutes + mins,
      pages: prev.pages + pages,
      count: prev.count + 1,
    });
  }

  // Construct weeks and days grid
  const weeks: HeatmapWeek[] = [];
  let totalActiveDays = 0;
  let totalPeriodMinutes = 0;
  let totalPeriodPages = 0;
  let peakDay: CalendarHeatmapData['peakDay'] = null;

  let lastMonthIndex = -1;
  let weeksSinceLastMonthLabel = 99;

  for (let w = 0; w < weeksCount; w++) {
    const days: HeatmapDay[] = [];
    let weekMonthLabel: string | null = null;

    for (let d = 0; d < 7; d++) {
      const dayOffset = w * 7 + d;
      const cellDate = new Date(startDate.getTime() + dayOffset * 86400000);
      const cellDateStr = formatLocalDateStr(cellDate);
      const isToday = cellDateStr === todayStr;
      const isFuture = cellDate.getTime() > today.getTime();

      const acc = dayDataMap.get(cellDateStr) ?? { minutes: 0, pages: 0, count: 0 };
      const minutesRead = isFuture ? 0 : acc.minutes;
      const pagesRead = isFuture ? 0 : acc.pages;
      const sessionCount = isFuture ? 0 : acc.count;
      const level = isFuture ? 0 : computeHeatmapLevel(minutesRead);

      if (!isFuture && minutesRead > 0) {
        totalActiveDays++;
        totalPeriodMinutes += minutesRead;
        totalPeriodPages += pagesRead;

        if (!peakDay || minutesRead > peakDay.minutesRead) {
          peakDay = {
            dateStr: cellDateStr,
            minutesRead,
            pagesRead,
          };
        }
      }

      // Check for month label eligibility (first day of month or first week)
      if (d === 0 && !isFuture) {
        const mIdx = cellDate.getMonth();
        if (mIdx !== lastMonthIndex && weeksSinceLastMonthLabel >= 3) {
          weekMonthLabel = MONTH_LABELS[mIdx];
          lastMonthIndex = mIdx;
          weeksSinceLastMonthLabel = 0;
        }
      }

      days.push({
        dateStr: cellDateStr,
        dayOfWeek: d,
        minutesRead,
        pagesRead,
        sessionCount,
        level,
        isToday,
        isFuture,
      });
    }

    weeksSinceLastMonthLabel++;
    weeks.push({
      weekIndex: w,
      monthLabel: weekMonthLabel,
      days,
    });
  }

  // Calculate Streak in the period
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  // Flatten active status chronologically from startDate up to today
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = formatLocalDateStr(yesterday);

  // Check current streak ending today or yesterday
  const hasReadToday = (dayDataMap.get(todayStr)?.minutes ?? 0) > 0;
  const hasReadYesterday = (dayDataMap.get(yesterdayStr)?.minutes ?? 0) > 0;

  if (hasReadToday || hasReadYesterday) {
    let checkDate = hasReadToday ? today : yesterday;
    while (true) {
      const checkStr = formatLocalDateStr(checkDate);
      const mins = dayDataMap.get(checkStr)?.minutes ?? 0;
      if (mins > 0) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  // Longest streak
  for (let w = 0; w < weeksCount; w++) {
    for (let d = 0; d < 7; d++) {
      const day = weeks[w].days[d];
      if (day.isFuture) continue;
      if (day.minutesRead > 0) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
  }

  return {
    weeks,
    totalActiveDays,
    totalPeriodMinutes,
    totalPeriodPages,
    currentStreak,
    longestStreak,
    peakDay,
    startDateStr,
    endDateStr,
    hasActivity: totalActiveDays > 0,
  };
}

/**
 * Fetches reading sessions from SQLite repository within the bounded date window
 * and builds the calendar heatmap data.
 */
export async function fetchCalendarHeatmapData(
  weeksCount: number = 52,
  options?: { endDate?: Date },
): Promise<CalendarHeatmapData> {
  const weeks = Math.max(1, Math.min(52, weeksCount));
  const baseEnd = options?.endDate ?? new Date();
  const today = new Date(baseEnd.getFullYear(), baseEnd.getMonth(), baseEnd.getDate());
  const currentSaturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  const totalDays = weeks * 7;
  const startDate = new Date(currentSaturday.getTime() - (totalDays - 1) * 86400000);

  const startTimestamp = startDate.getTime();
  const endTimestamp = currentSaturday.getTime() + 86400000 - 1;

  // Dynamic import for headless Node test runner isolation
  const { getSessionsInDateRange } = await import('@/db/repositories/readingSessions');
  const sessions = await getSessionsInDateRange(startTimestamp, endTimestamp);

  return buildCalendarHeatmapData(
    sessions.map((s) => ({
      startedAt: s.startedAt,
      durationSeconds: s.durationSeconds,
      pagesRead: s.pagesRead,
    })),
    { endDate: baseEnd, weeksCount: weeks },
  );
}
