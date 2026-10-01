import type { BookRow } from '@/db/repositories/books';

export type WeeklyDigest = {
  weekLabel: string;
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: number;
  hasActivity: boolean;

  // Free Tier Digest (FULLAPP.md 11.3)
  readingMinutes: number;
  readingDays: number;
  pagesRead: number;
  currentBook: {
    bookId: string;
    title: string;
    author: string;
    percentComplete: number;
    pagesReadThisWeek: number;
    minutesReadThisWeek: number;
  } | null;
  wordsSaved: number;
  wordsReviewed: number;

  // Premium Digest (FULLAPP.md 11.3)
  speedTrend: {
    pagesPerHour: number;
    previousPagesPerHour: number;
    percentageChange: number;
    trendLabel: string;
  };
  vocabularyGrowth: {
    wordsSavedThisWeek: number;
    wordsSavedLastWeek: number;
    diff: number;
    growthLabel: string;
  };
  completionForecast: {
    estimatedDaysRemaining: number | null;
    estimatedCompletionDate: string | null;
    forecastLabel: string;
  } | null;
  mostProductiveTime: {
    period: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night';
    timeRange: string;
    minutesRead: number;
  } | null;
  adaptiveNextWeekGoal: {
    suggestedDays: number;
    suggestedDailyMinutes: number;
    rationale: string;
  };
};

export type RawDigestInput = {
  currentWeekSessions: Array<{
    bookId: string;
    startedAt: number;
    durationSeconds: number;
    pagesRead: number;
  }>;
  previousWeekSessions: Array<{
    durationSeconds: number;
    pagesRead: number;
  }>;
  currentWeekWordsSaved: number;
  previousWeekWordsSaved: number;
  currentWeekWordsReviewed: number;
  activeBook?: {
    id: string;
    title: string;
    author: string;
    percentComplete: number;
  } | null;
  nowMs?: number;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatShortDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadDb() {
  const { getDb } = await import('@/db/client');
  return getDb();
}

/**
 * Pure calculation logic for the weekly digest. Fully decoupled from SQLite for fast unit testing.
 */
export function calculateWeeklyDigestFromData(input: RawDigestInput): WeeklyDigest {
  const nowMs = input.nowMs ?? Date.now();
  const endDate = new Date(nowMs);
  const startDate = new Date(nowMs - 7 * 86400000);

  const weekStartDate = formatDateStr(startDate);
  const weekEndDate = formatDateStr(endDate);
  const weekLabel = `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;

  // 1. Current Week Sessions Aggregation
  let totalCurrentSeconds = 0;
  let totalCurrentPages = 0;
  const activeDaysSet = new Set<string>();
  const bookSessionMap = new Map<string, { seconds: number; pages: number }>();
  const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const s of input.currentWeekSessions) {
    const sec = Math.max(0, s.durationSeconds || 0);
    totalCurrentSeconds += sec;
    totalCurrentPages += s.pagesRead || 0;

    const d = new Date(s.startedAt);
    const dateStr = formatDateStr(d);
    activeDaysSet.add(dateStr);

    const prev = bookSessionMap.get(s.bookId) ?? { seconds: 0, pages: 0 };
    bookSessionMap.set(s.bookId, {
      seconds: prev.seconds + sec,
      pages: prev.pages + (s.pagesRead || 0),
    });

    const hour = d.getHours();
    if (hour >= 5 && hour < 12) timeBuckets.morning += sec;
    else if (hour >= 12 && hour < 17) timeBuckets.afternoon += sec;
    else if (hour >= 17 && hour < 22) timeBuckets.evening += sec;
    else timeBuckets.night += sec;
  }

  const readingMinutes = Math.round(totalCurrentSeconds / 60);
  const readingDays = activeDaysSet.size;
  const pagesRead = totalCurrentPages;
  const hasActivity = totalCurrentSeconds > 0 || pagesRead > 0 || input.currentWeekWordsSaved > 0;

  // 2. Determine Current Book Details
  let currentBook: WeeklyDigest['currentBook'] = null;
  if (input.activeBook) {
    const bookStats = bookSessionMap.get(input.activeBook.id);
    currentBook = {
      bookId: input.activeBook.id,
      title: input.activeBook.title,
      author: input.activeBook.author,
      percentComplete: input.activeBook.percentComplete,
      pagesReadThisWeek: bookStats?.pages ?? 0,
      minutesReadThisWeek: Math.round((bookStats?.seconds ?? 0) / 60),
    };
  }

  // 3. Previous Week Aggregation (for week-over-week trends)
  let totalPrevSeconds = 0;
  let totalPrevPages = 0;
  for (const s of input.previousWeekSessions) {
    totalPrevSeconds += Math.max(0, s.durationSeconds || 0);
    totalPrevPages += s.pagesRead || 0;
  }

  // 4. Speed Trend
  const currentHours = totalCurrentSeconds / 3600;
  const prevHours = totalPrevSeconds / 3600;
  const pagesPerHour = currentHours > 0 ? Math.round(totalCurrentPages / currentHours) : 0;
  const previousPagesPerHour = prevHours > 0 ? Math.round(totalPrevPages / prevHours) : 0;

  let percentageChange = 0;
  let trendLabel = 'Pace will appear after your next session';
  if (previousPagesPerHour > 0 && pagesPerHour > 0) {
    percentageChange = Math.round(((pagesPerHour - previousPagesPerHour) / previousPagesPerHour) * 100);
    if (percentageChange > 0) {
      trendLabel = `+${percentageChange}% faster than last week`;
    } else if (percentageChange < 0) {
      trendLabel = `${Math.abs(percentageChange)}% slower than last week`;
    } else {
      trendLabel = `Steady at ~${pagesPerHour} pgs/hr`;
    }
  } else if (pagesPerHour > 0) {
    trendLabel = `~${pagesPerHour} pages per hour`;
  }

  // 5. Vocabulary Growth
  const wordsSavedThisWeek = input.currentWeekWordsSaved;
  const wordsSavedLastWeek = input.previousWeekWordsSaved;
  const diff = wordsSavedThisWeek - wordsSavedLastWeek;
  let growthLabel = `${wordsSavedThisWeek} words saved this week`;
  if (wordsSavedLastWeek > 0) {
    const growthPct = Math.round((diff / wordsSavedLastWeek) * 100);
    growthLabel = diff >= 0
      ? `+${diff} words (${growthPct >= 0 ? '+' : ''}${growthPct}% vs last week)`
      : `${diff} words vs last week`;
  }

  // 6. Completion Forecast
  let completionForecast: WeeklyDigest['completionForecast'] = null;
  if (currentBook && currentBook.percentComplete < 0.98 && currentBook.percentComplete > 0.02) {
    const dailyPace = pagesRead > 0 && readingDays > 0 ? pagesRead / readingDays : 0;
    if (dailyPace > 0) {
      // Estimate total pages from reading position and pages read
      const estimatedTotalPages = Math.max(120, Math.round(pagesRead / Math.max(0.1, currentBook.percentComplete)));
      const remainingPages = Math.round(estimatedTotalPages * (1 - currentBook.percentComplete));
      const estimatedDaysRemaining = Math.max(1, Math.ceil(remainingPages / dailyPace));
      const estDate = new Date(nowMs + estimatedDaysRemaining * 86400000);
      completionForecast = {
        estimatedDaysRemaining,
        estimatedCompletionDate: `${MONTH_NAMES[estDate.getMonth()]} ${estDate.getDate()}`,
        forecastLabel: `~${estimatedDaysRemaining} ${estimatedDaysRemaining === 1 ? 'day' : 'days'} remaining at current pace`,
      };
    } else {
      completionForecast = {
        estimatedDaysRemaining: null,
        estimatedCompletionDate: null,
        forecastLabel: 'Read consistently this week to unlock completion forecasts',
      };
    }
  }

  // 7. Most Productive Time of Day
  let mostProductiveTime: WeeklyDigest['mostProductiveTime'] = null;
  if (totalCurrentSeconds > 0) {
    let bestPeriod: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night' = 'Evening';
    let maxSec = timeBuckets.evening;
    let timeRange = '5 PM – 10 PM';

    if (timeBuckets.morning > maxSec) {
      bestPeriod = 'Morning';
      maxSec = timeBuckets.morning;
      timeRange = '5 AM – 12 PM';
    }
    if (timeBuckets.afternoon > maxSec) {
      bestPeriod = 'Afternoon';
      maxSec = timeBuckets.afternoon;
      timeRange = '12 PM – 5 PM';
    }
    if (timeBuckets.night > maxSec) {
      bestPeriod = 'Late Night';
      maxSec = timeBuckets.night;
      timeRange = '10 PM – 5 AM';
    }

    mostProductiveTime = {
      period: bestPeriod,
      timeRange,
      minutesRead: Math.round(maxSec / 60),
    };
  }

  // 8. Adaptive Next-Week Goal (Anti-Guilt Philosophy)
  let suggestedDays = 2;
  let suggestedDailyMinutes = 15;
  let rationale = 'Kindle your lamp with a short 15-minute sitting.';

  if (readingDays >= 5) {
    suggestedDays = Math.min(6, readingDays);
    suggestedDailyMinutes = Math.max(20, Math.round(readingMinutes / readingDays));
    rationale = 'Maintain your dedicated reading rhythm without fatigue.';
  } else if (readingDays >= 2) {
    suggestedDays = readingDays + 1;
    suggestedDailyMinutes = Math.max(15, Math.round(readingMinutes / readingDays));
    rationale = 'Build consistency by adding one peaceful reading day.';
  } else if (readingDays === 1) {
    suggestedDays = 2;
    suggestedDailyMinutes = Math.max(15, Math.round(readingMinutes));
    rationale = 'A gentle second reading day this coming week.';
  }

  return {
    weekLabel,
    weekStartDate,
    weekEndDate,
    generatedAt: nowMs,
    hasActivity,
    readingMinutes,
    readingDays,
    pagesRead,
    currentBook,
    wordsSaved: wordsSavedThisWeek,
    wordsReviewed: input.currentWeekWordsReviewed,
    speedTrend: {
      pagesPerHour,
      previousPagesPerHour,
      percentageChange,
      trendLabel,
    },
    vocabularyGrowth: {
      wordsSavedThisWeek,
      wordsSavedLastWeek,
      diff,
      growthLabel,
    },
    completionForecast,
    mostProductiveTime,
    adaptiveNextWeekGoal: {
      suggestedDays,
      suggestedDailyMinutes,
      rationale,
    },
  };
}

/**
 * Computes the authoritative weekly digest from SQLite.
 */
export async function computeWeeklyDigest(nowMs: number = Date.now()): Promise<WeeklyDigest> {
  const db = await loadDb();

  const startOfCurrentWeek = nowMs - 7 * 86400000;
  const startOfPreviousWeek = nowMs - 14 * 86400000;

  // 1. Fetch reading sessions for last 14 days
  const sessionRows = await db.getAllAsync<{
    book_id: string;
    started_at: number;
    duration_seconds: number;
    pages_read: number;
  }>(
    'SELECT book_id, started_at, duration_seconds, pages_read FROM reading_sessions WHERE started_at >= ? ORDER BY started_at ASC',
    [startOfPreviousWeek],
  );

  const currentWeekSessions: RawDigestInput['currentWeekSessions'] = [];
  const previousWeekSessions: RawDigestInput['previousWeekSessions'] = [];

  for (const row of sessionRows) {
    if (row.started_at >= startOfCurrentWeek) {
      currentWeekSessions.push({
        bookId: row.book_id,
        startedAt: row.started_at,
        durationSeconds: row.duration_seconds,
        pagesRead: row.pages_read,
      });
    } else {
      previousWeekSessions.push({
        durationSeconds: row.duration_seconds,
        pagesRead: row.pages_read,
      });
    }
  }

  // 2. Fetch saved words created in last 14 days
  const savedWordRows = await db.getAllAsync<{ created_at: number }>(
    'SELECT created_at FROM saved_words WHERE created_at >= ?',
    [startOfPreviousWeek],
  );

  let currentWeekWordsSaved = 0;
  let previousWeekWordsSaved = 0;
  for (const w of savedWordRows) {
    if (w.created_at >= startOfCurrentWeek) {
      currentWeekWordsSaved++;
    } else {
      previousWeekWordsSaved++;
    }
  }

  // 3. Fetch review events in current week
  const reviewCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM review_events WHERE reviewed_at >= ?',
    [startOfCurrentWeek],
  );
  const currentWeekWordsReviewed = reviewCountRow?.count ?? 0;

  // 4. Fetch most active or latest reading position
  const positionRows = await db.getAllAsync<{
    book_id: string;
    percent_complete: number;
    updated_at: number;
  }>('SELECT book_id, percent_complete, updated_at FROM reading_positions ORDER BY updated_at DESC');

  // Determine active book: prefer the book read most this week, else latest position
  let activeBookId: string | null = null;
  const bookDurationMap = new Map<string, number>();
  for (const s of currentWeekSessions) {
    bookDurationMap.set(s.bookId, (bookDurationMap.get(s.bookId) ?? 0) + s.durationSeconds);
  }

  const sortedThisWeekBooks = Array.from(bookDurationMap.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedThisWeekBooks.length > 0) {
    activeBookId = sortedThisWeekBooks[0][0];
  } else if (positionRows.length > 0) {
    activeBookId = positionRows[0].book_id;
  }

  let activeBook: RawDigestInput['activeBook'] = null;
  if (activeBookId) {
    const { getBook } = await import('@/db/repositories/books');
    const bookRow = await getBook(activeBookId);
    const pos = positionRows.find((p) => p.book_id === activeBookId);
    activeBook = {
      id: activeBookId,
      title: bookRow?.title ?? activeBookId.replace(/-/g, ' '),
      author: bookRow?.author ?? 'Classic Author',
      percentComplete: pos?.percent_complete ?? 0,
    };
  }

  const digest = calculateWeeklyDigestFromData({
    currentWeekSessions,
    previousWeekSessions,
    currentWeekWordsSaved,
    previousWeekWordsSaved,
    currentWeekWordsReviewed,
    activeBook,
    nowMs,
  });

  // Record generated report metadata
  try {
    const { setSetting } = await import('@/db/repositories/appSettings');
    await setSetting('weekly_digest_last_generated_at', String(nowMs));
  } catch {}

  return digest;
}
