export type HabitPeriod = 'month' | 'year';

export type TimeDistribution = {
  morningMinutes: number;   // 05:00 - 11:59
  afternoonMinutes: number; // 12:00 - 17:59
  eveningMinutes: number;   // 18:00 - 21:59
  nightMinutes: number;     // 22:00 - 04:59
  dominantTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Awaiting history';
};

export type LanguageSpeedTrend = {
  language: string;
  languageLabel: string;
  pagesPerHour: number;
  minutesRead: number;
  pagesRead: number;
  bookCount: number;
};

export type BookSpeedTrend = {
  bookId: string;
  title: string;
  author: string;
  pagesPerHour: number;
  minutesRead: number;
  pagesRead: number;
  percentComplete: number;
};

export type GoalAdherenceMetrics = {
  hasActiveGoal: boolean;
  targetDailyMinutes: number;
  daysGoalMet: number;
  adherencePercentage: number;
  pacingStatus: 'ahead' | 'on_track' | 'behind' | 'none';
  pacingNote: string;
};

export type HabitReport = {
  period: HabitPeriod;
  periodLabel: string;
  year: number;
  month?: number; // 1-12
  dateRangeLabel: string;
  startTimestamp: number;
  endTimestamp: number;

  totalReadingMinutes: number;
  totalSessionsCount: number;
  totalPagesRead: number;
  activeReadingDays: number;
  averageSessionMinutes: number;
  averagePagesPerHour: number;

  timeDistribution: TimeDistribution;
  speedByLanguage: LanguageSpeedTrend[];
  speedByBook: BookSpeedTrend[];
  vocabularyGrowth: {
    wordsSavedCount: number;
    wordsMasteredCount: number;
    reviewAccuracyRate: number; // 0-100%
  };
  goalAdherence: GoalAdherenceMetrics;
  topBooks: Array<{
    bookId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    minutesRead: number;
    pagesRead: number;
    percentComplete: number;
  }>;
  hasSufficientData: boolean;
  generatedAt: number;
};

export type RawHabitReportInput = {
  bounds: {
    startMs: number;
    endMs: number;
    period: HabitPeriod;
    periodLabel: string;
    dateRangeLabel: string;
    validYear: number;
    validMonth?: number;
  };
  sessions: Array<{
    bookId: string;
    startedAt: number;
    durationSeconds: number;
    pagesRead: number;
  }>;
  words: Array<{
    id: string;
    srs_stage: number | null;
    srs_reps: number | null;
  }>;
  reviews: Array<{
    grade: number;
  }>;
  positionMap: Map<string, number>;
  bookMap: Map<string, { id: string; title: string; author: string; sourceLanguage: string; coverUrl?: string | null }>;
  goal?: {
    dailyMinutes: number;
  } | null;
  nowMs?: number;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  bn: 'Bengali',
  ar: 'Arabic',
  ja: 'Japanese',
  ko: 'Korean',
  sa: 'Sanskrit',
  he: 'Hebrew',
  el: 'Greek',
  la: 'Latin',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
};

// In-memory cache keyed by period parameters + invalidation signature
type CachedReportEntry = {
  signature: string;
  report: HabitReport;
};

const reportCache = new Map<string, CachedReportEntry>();

/**
 * Returns date boundary timestamps [startMs, endMs] for a specified month or year.
 * Handles local device timezone boundaries deterministically (FULLAPP §12.4 item 3).
 */
export function getReportDateBounds(
  period: HabitPeriod,
  year?: number,
  month?: number,
): { startMs: number; endMs: number; period: HabitPeriod; periodLabel: string; dateRangeLabel: string; validYear: number; validMonth?: number } {
  const now = new Date();
  const currentYear = year ?? now.getFullYear();

  if (period === 'month') {
    const currentMonth = month ?? (now.getMonth() + 1); // 1-indexed
    const startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    // Passing day 0 of next month returns the last day of target month
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const monthName = MONTH_NAMES[currentMonth - 1] ?? 'Month';
    const periodLabel = `${monthName} ${currentYear}`;
    const dateRangeLabel = `${monthName} 1 – ${endDate.getDate()}, ${currentYear}`;

    return {
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      period: 'month',
      periodLabel,
      dateRangeLabel,
      validYear: currentYear,
      validMonth: currentMonth,
    };
  }

  // Annual
  const startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  const periodLabel = `${currentYear} Annual Review`;
  const dateRangeLabel = `Jan 1 – Dec 31, ${currentYear}`;

  return {
    startMs: startDate.getTime(),
    endMs: endDate.getTime(),
    period: 'year',
    periodLabel,
    dateRangeLabel,
    validYear: currentYear,
  };
}

/**
 * Pure aggregation function for habit report (FULLAPP §12.4 item 1).
 * Completely free of database or React Native dependencies for testability and performance.
 */
export function calculateHabitReportFromData(input: RawHabitReportInput): HabitReport {
  const { bounds, sessions, words, reviews, positionMap, bookMap, goal, nowMs } = input;

  let totalReadingSeconds = 0;
  let totalPagesRead = 0;
  const activeDaysSet = new Set<string>();
  const dayMinutesMap = new Map<string, number>();

  const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const bookStatsMap = new Map<string, { seconds: number; pages: number }>();
  const langStatsMap = new Map<string, { seconds: number; pages: number; books: Set<string> }>();

  for (const s of sessions) {
    const sec = Math.max(0, s.durationSeconds || 0);
    const pages = Math.max(0, s.pagesRead || 0);
    totalReadingSeconds += sec;
    totalPagesRead += pages;

    // Day grouping
    const d = new Date(s.startedAt);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(dateStr);
    dayMinutesMap.set(dateStr, (dayMinutesMap.get(dateStr) ?? 0) + Math.round(sec / 60));

    // Time of day bucketing
    const hour = d.getHours();
    if (hour >= 5 && hour < 12) timeBuckets.morning += sec;
    else if (hour >= 12 && hour < 18) timeBuckets.afternoon += sec;
    else if (hour >= 18 && hour < 22) timeBuckets.evening += sec;
    else timeBuckets.night += sec;

    // Book accumulation
    const currentBook = bookStatsMap.get(s.bookId) ?? { seconds: 0, pages: 0 };
    bookStatsMap.set(s.bookId, {
      seconds: currentBook.seconds + sec,
      pages: currentBook.pages + pages,
    });

    // Language accumulation
    const bookRow = bookMap.get(s.bookId);
    const lang = bookRow?.sourceLanguage ?? 'en';
    const currentLang = langStatsMap.get(lang) ?? { seconds: 0, pages: 0, books: new Set<string>() };
    currentLang.seconds += sec;
    currentLang.pages += pages;
    currentLang.books.add(s.bookId);
    langStatsMap.set(lang, currentLang);
  }

  const totalReadingMinutes = Math.round(totalReadingSeconds / 60);
  const totalSessionsCount = sessions.length;
  const activeReadingDays = activeDaysSet.size;
  const averageSessionMinutes = totalSessionsCount > 0 ? Math.round(totalReadingMinutes / totalSessionsCount) : 0;
  const totalHours = totalReadingSeconds / 3600;
  const averagePagesPerHour = totalHours > 0 ? Math.round(totalPagesRead / totalHours) : 0;

  // Time distribution
  let dominantTime: TimeDistribution['dominantTime'] = 'Awaiting history';
  if (totalReadingSeconds > 0) {
    let maxSec = timeBuckets.night;
    dominantTime = 'Night';
    if (timeBuckets.morning > maxSec) {
      dominantTime = 'Morning';
      maxSec = timeBuckets.morning;
    }
    if (timeBuckets.afternoon > maxSec) {
      dominantTime = 'Afternoon';
      maxSec = timeBuckets.afternoon;
    }
    if (timeBuckets.evening > maxSec) {
      dominantTime = 'Evening';
    }
  }

  const timeDistribution: TimeDistribution = {
    morningMinutes: Math.round(timeBuckets.morning / 60),
    afternoonMinutes: Math.round(timeBuckets.afternoon / 60),
    eveningMinutes: Math.round(timeBuckets.evening / 60),
    nightMinutes: Math.round(timeBuckets.night / 60),
    dominantTime,
  };

  // Speed by language
  const speedByLanguage: LanguageSpeedTrend[] = [];
  for (const [lang, data] of langStatsMap.entries()) {
    const hours = data.seconds / 3600;
    const pph = hours > 0 ? Math.round(data.pages / hours) : 0;
    speedByLanguage.push({
      language: lang,
      languageLabel: LANGUAGE_LABELS[lang] ?? lang.toUpperCase(),
      pagesPerHour: pph,
      minutesRead: Math.round(data.seconds / 60),
      pagesRead: data.pages,
      bookCount: data.books.size,
    });
  }
  speedByLanguage.sort((a, b) => b.minutesRead - a.minutesRead);

  // Speed by book & Top books
  const speedByBook: BookSpeedTrend[] = [];
  const topBooks: HabitReport['topBooks'] = [];

  const sortedBookEntries = Array.from(bookStatsMap.entries()).sort((a, b) => b[1].seconds - a[1].seconds);

  for (const [bId, data] of sortedBookEntries) {
    const bookRow = bookMap.get(bId);
    const title = bookRow?.title ?? formatFallbackBookTitle(bId);
    const author = bookRow?.author ?? 'Classic Author';
    const pct = positionMap.get(bId) ?? 0;
    const hours = data.seconds / 3600;
    const pph = hours > 0 ? Math.round(data.pages / hours) : 0;
    const minutes = Math.round(data.seconds / 60);

    speedByBook.push({
      bookId: bId,
      title,
      author,
      pagesPerHour: pph,
      minutesRead: minutes,
      pagesRead: data.pages,
      percentComplete: pct,
    });

    if (topBooks.length < 5) {
      topBooks.push({
        bookId: bId,
        title,
        author,
        coverUrl: bookRow?.coverUrl ?? null,
        minutesRead: minutes,
        pagesRead: data.pages,
        percentComplete: pct,
      });
    }
  }

  // Vocabulary growth & review accuracy
  const wordsSavedCount = words.length;
  const wordsMasteredCount = words.filter(
    (w) => (w.srs_stage ?? 0) >= 4 || (w.srs_reps ?? 0) >= 3,
  ).length;

  let reviewAccuracyRate = 0;
  if (reviews.length > 0) {
    const passingCount = reviews.filter((r) => r.grade >= 3).length;
    reviewAccuracyRate = Math.round((passingCount / reviews.length) * 100);
  }

  // Goal adherence (FULLAPP §12.3 item 7)
  let goalAdherence: GoalAdherenceMetrics = {
    hasActiveGoal: false,
    targetDailyMinutes: 20,
    daysGoalMet: 0,
    adherencePercentage: 0,
    pacingStatus: 'none',
    pacingNote: 'Set a reading goal to track daily adherence.',
  };

  if (goal && goal.dailyMinutes > 0) {
    let daysMet = 0;
    for (const mins of dayMinutesMap.values()) {
      if (mins >= goal.dailyMinutes) {
        daysMet++;
      }
    }

    const totalDaysInPeriod = Math.max(1, Math.round((bounds.endMs - bounds.startMs) / 86400000));
    const effectiveNow = nowMs ?? Date.now();
    const elapsedDays = Math.max(1, Math.min(totalDaysInPeriod, Math.ceil((effectiveNow - bounds.startMs) / 86400000)));

    const adherencePct = Math.min(100, Math.round((daysMet / elapsedDays) * 100));

    let pacingStatus: GoalAdherenceMetrics['pacingStatus'] = 'on_track';
    let pacingNote = 'Comfortably on track with your reading cadence.';
    if (adherencePct < 40) {
      pacingStatus = 'behind';
      pacingNote = 'Reading frequency is below target. Try reading 10 minutes tonight.';
    } else if (adherencePct >= 80) {
      pacingStatus = 'ahead';
      pacingNote = 'Superb consistency! Exceeding daily reading aspirations.';
    }

    goalAdherence = {
      hasActiveGoal: true,
      targetDailyMinutes: goal.dailyMinutes,
      daysGoalMet: daysMet,
      adherencePercentage: adherencePct,
      pacingStatus,
      pacingNote,
    };
  }

  return {
    period: bounds.period,
    periodLabel: bounds.periodLabel,
    year: bounds.validYear,
    month: bounds.validMonth,
    dateRangeLabel: bounds.dateRangeLabel,
    startTimestamp: bounds.startMs,
    endTimestamp: bounds.endMs,
    totalReadingMinutes,
    totalSessionsCount,
    totalPagesRead,
    activeReadingDays,
    averageSessionMinutes,
    averagePagesPerHour,
    timeDistribution,
    speedByLanguage,
    speedByBook,
    vocabularyGrowth: {
      wordsSavedCount,
      wordsMasteredCount,
      reviewAccuracyRate,
    },
    goalAdherence,
    topBooks,
    hasSufficientData: sessions.length > 0,
    generatedAt: Date.now(),
  };
}

/**
 * Computes an authoritative reading habit report (FULLAPP §12.3 / §12.4).
 * Pure aggregation with caching, zero invented data, and traceable metrics.
 */
export async function computeHabitReport(options: {
  period?: HabitPeriod;
  year?: number;
  month?: number;
  skipCache?: boolean;
} = {}): Promise<HabitReport> {
  const period = options.period ?? 'month';
  const bounds = getReportDateBounds(period, options.year, options.month);

  const { getDb } = await import('@/db/client');
  const db = await getDb();

  // Invalidation check (FULLAPP §12.4 item 6)
  const sessionSigRow = await db.getFirstAsync<{ count: number; max_ts: number | null }>(
    'SELECT COUNT(*) as count, MAX(started_at) as max_ts FROM reading_sessions WHERE started_at >= ? AND started_at <= ?',
    [bounds.startMs, bounds.endMs],
  );
  const sessionCount = sessionSigRow?.count ?? 0;
  const maxSessionTs = sessionSigRow?.max_ts ?? 0;
  const cacheKey = `${period}_${bounds.validYear}_${bounds.validMonth ?? 'all'}`;
  const currentSignature = `${sessionCount}:${maxSessionTs}`;

  if (!options.skipCache) {
    const cached = reportCache.get(cacheKey);
    if (cached && cached.signature === currentSignature) {
      return cached.report;
    }
  }

  const { getSessionsInDateRange } = await import('@/db/repositories/readingSessions');
  const { listBooks } = await import('@/db/repositories/books');
  const { getActiveReadingGoalBookId, getReadingGoal } = await import('@/db/repositories/readingGoals');

  // 1. Fetch sessions in the period
  const sessions = await getSessionsInDateRange(bounds.startMs, bounds.endMs);

  // 2. Fetch vocabulary activity in period
  const wordRows = await db.getAllAsync<{ id: string; srs_stage: number | null; srs_reps: number | null }>(
    'SELECT id, srs_stage, srs_reps FROM saved_words WHERE created_at >= ? AND created_at <= ?',
    [bounds.startMs, bounds.endMs],
  );

  // 3. Fetch review events accuracy in period
  const reviewRows = await db.getAllAsync<{ grade: number }>(
    'SELECT grade FROM review_events WHERE reviewed_at >= ? AND reviewed_at <= ?',
    [bounds.startMs, bounds.endMs],
  );

  // 4. Fetch positions to know percent complete
  const positionRows = await db.getAllAsync<{ book_id: string; percent_complete: number }>(
    'SELECT book_id, percent_complete FROM reading_positions',
  );
  const positionMap = new Map<string, number>();
  for (const pos of positionRows) {
    positionMap.set(pos.book_id, pos.percent_complete);
  }

  // 5. Fetch all catalog books
  const allBooks = await listBooks();
  const bookMap = new Map<string, { id: string; title: string; author: string; sourceLanguage: string; coverUrl?: string | null }>();
  for (const b of allBooks) {
    bookMap.set(b.id, b);
  }

  // 6. Fetch reading goal
  const activeBookId = await getActiveReadingGoalBookId();
  let goal: { dailyMinutes: number } | null = null;
  if (activeBookId) {
    const g = await getReadingGoal(activeBookId);
    if (g && g.dailyMinutes > 0) {
      goal = { dailyMinutes: g.dailyMinutes };
    }
  }

  const report = calculateHabitReportFromData({
    bounds,
    sessions,
    words: wordRows,
    reviews: reviewRows,
    positionMap,
    bookMap,
    goal,
  });

  reportCache.set(cacheKey, {
    signature: currentSignature,
    report,
  });

  return report;
}

function formatFallbackBookTitle(slug: string): string {
  if (slug === 'quran') return 'The Holy Qur’an';
  if (slug.startsWith('surah-')) return `Surah ${slug.replace('surah-', '')}`;
  if (slug === 'bible-ot') return 'The Old Testament';
  if (slug === 'bible-nt') return 'The New Testament';
  if (slug === 'vedas') return 'The Rigveda';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
