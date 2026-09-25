import { getDb } from '@/db/client';
import { getBook, type BookRow } from '@/db/repositories/books';

export type UserReadingStats = {
  totalReadingSeconds: number;
  currentStreakDays: number;
  longestStreakDays: number;
  booksCompletedCount: number;
  booksInProgressCount: number;
  totalSavedWords: number;
  masteredWordsCount: number;
  totalHighlightsCount: number;
  topBooks: Array<{
    bookId: string;
    title: string;
    author: string;
    coverUrl?: string | null;
    totalSeconds: number;
    pagesRead: number;
    percentComplete: number;
  }>;
  readingHabits: {
    personaTitle: string;
    personaDescription: string;
    averageSessionMinutes: number;
    pagesPerHour: number;
    favoriteTimeOfDay: string;
  };
  weeklyActivity: Array<{
    dayLabel: string;
    dateStr: string;
    hasRead: boolean;
    minutesRead: number;
  }>;
};

export async function computeUserReadingStats(): Promise<UserReadingStats> {
  const db = await getDb();

  // 1. Fetch sessions
  const sessionRows = await db.getAllAsync<{
    id: string;
    book_id: string;
    started_at: number;
    duration_seconds: number;
    pages_read: number;
  }>('SELECT id, book_id, started_at, duration_seconds, pages_read FROM reading_sessions');

  // 2. Fetch reading positions
  const positionRows = await db.getAllAsync<{
    book_id: string;
    percent_complete: number;
  }>('SELECT book_id, percent_complete FROM reading_positions');

  // 3. Fetch saved words count and SRS status
  const wordRows = await db.getAllAsync<{
    srs_stage: number | null;
    srs_reps: number | null;
  }>('SELECT srs_stage, srs_reps FROM saved_words');

  // 4. Fetch highlights count
  const highlightCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM highlights',
  );
  const totalHighlightsCount = highlightCountRow?.count ?? 0;

  // Compute Total Reading Time
  let totalReadingSeconds = 0;
  let totalPagesRead = 0;
  const bookDurationMap = new Map<string, { seconds: number; pages: number }>();
  const activeDaysSet = new Set<string>();
  const dayMinutesMap = new Map<string, number>();

  // Time of day buckets: 0-4 night, 5-11 morning, 12-17 afternoon, 18-21 evening, 22-23 night
  const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const s of sessionRows) {
    const sec = Math.max(0, s.duration_seconds || 0);
    totalReadingSeconds += sec;
    totalPagesRead += s.pages_read || 0;

    // Book accumulation
    const prevBook = bookDurationMap.get(s.book_id) ?? { seconds: 0, pages: 0 };
    bookDurationMap.set(s.book_id, {
      seconds: prevBook.seconds + sec,
      pages: prevBook.pages + (s.pages_read || 0),
    });

    // Date grouping (YYYY-MM-DD)
    const d = new Date(s.started_at);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(dateStr);
    dayMinutesMap.set(dateStr, (dayMinutesMap.get(dateStr) ?? 0) + Math.round(sec / 60));

    // Hour bucketing
    const hour = d.getHours();
    if (hour >= 5 && hour < 12) timeBuckets.morning += sec;
    else if (hour >= 12 && hour < 18) timeBuckets.afternoon += sec;
    else if (hour >= 18 && hour < 22) timeBuckets.evening += sec;
    else timeBuckets.night += sec;
  }

  // Calculate Streak
  const sortedDates = Array.from(activeDaysSet).sort();
  let currentStreak = 0;
  let longestStreak = 0;

  if (sortedDates.length > 0) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Check if streak is active today or yesterday
    let checkDate = activeDaysSet.has(todayStr)
      ? today
      : activeDaysSet.has(yesterdayStr)
      ? yesterday
      : null;

    if (checkDate) {
      while (true) {
        const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (activeDaysSet.has(dStr)) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
    }

    // Longest streak
    let tempStreak = 0;
    let prevTimestamp: number | null = null;
    for (const dStr of sortedDates) {
      const [y, m, d] = dStr.split('-').map(Number);
      const ts = new Date(y, m - 1, d).getTime();
      if (prevTimestamp === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((ts - prevTimestamp) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTimestamp = ts;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
  }

  // Completed vs In-Progress Books
  let booksCompletedCount = 0;
  let booksInProgressCount = 0;
  const positionMap = new Map<string, number>();

  for (const pos of positionRows) {
    positionMap.set(pos.book_id, pos.percent_complete);
    if (pos.percent_complete >= 0.98) {
      booksCompletedCount++;
    } else if (pos.percent_complete > 0.02) {
      booksInProgressCount++;
    }
  }

  // Top Books Details
  const sortedBookEntries = Array.from(bookDurationMap.entries())
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .slice(0, 5);

  const topBooks: UserReadingStats['topBooks'] = [];
  for (const [bId, data] of sortedBookEntries) {
    const bookRow = await getBook(bId);
    const pct = positionMap.get(bId) ?? 0;
    topBooks.push({
      bookId: bId,
      title: bookRow?.title ?? formatFallbackBookTitle(bId),
      author: bookRow?.author ?? 'Classic Author',
      coverUrl: bookRow?.coverUrl ?? null,
      totalSeconds: data.seconds,
      pagesRead: data.pages,
      percentComplete: pct,
    });
  }

  // Vocabulary counts
  const totalSavedWords = wordRows.length;
  const masteredWordsCount = wordRows.filter(
    (w) => (w.srs_stage ?? 0) >= 4 || (w.srs_reps ?? 0) >= 3,
  ).length;

  // Reading Persona & Habits
  let highestBucket = 'night';
  let maxBucketVal = timeBuckets.night;
  if (timeBuckets.morning > maxBucketVal) {
    highestBucket = 'morning';
    maxBucketVal = timeBuckets.morning;
  }
  if (timeBuckets.afternoon > maxBucketVal) {
    highestBucket = 'afternoon';
    maxBucketVal = timeBuckets.afternoon;
  }
  if (timeBuckets.evening > maxBucketVal) {
    highestBucket = 'evening';
    maxBucketVal = timeBuckets.evening;
  }

  let personaTitle = 'Not enough reading history';
  let personaDescription = 'Open a book and your reading rhythm will appear here.';
  let favoriteTimeOfDay = 'Awaiting first session';

  if (sessionRows.length === 0) {
    // Keep the empty state honest; there is no meaningful persona before the
    // first tracked reading session.
  } else if (highestBucket === 'night') {
    personaTitle = 'Night Owl Reader';
    personaDescription = 'Most active when the world is quiet and the lamp burns warm (10 PM – 3 AM).';
    favoriteTimeOfDay = 'Late Night';
  } else if (highestBucket === 'morning') {
    personaTitle = 'Morning Scholar';
    personaDescription = 'Welcomes the dawn with literature and coffee (5 AM – 11 AM).';
    favoriteTimeOfDay = 'Morning';
  } else if (highestBucket === 'afternoon') {
    personaTitle = 'Afternoon Reverie';
    personaDescription = 'Finds solace in stories amidst the midday glow (12 PM – 5 PM).';
    favoriteTimeOfDay = 'Afternoon';
  } else if (highestBucket === 'evening') {
    personaTitle = 'Twilight Explorer';
    personaDescription = 'Unwinds at dusk alongside timeless classics (6 PM – 10 PM).';
    favoriteTimeOfDay = 'Evening';
  }

  const sessionCount = sessionRows.length;
  const averageSessionMinutes = sessionCount > 0
    ? Math.round(totalReadingSeconds / sessionCount / 60)
    : 0;
  const totalHours = totalReadingSeconds / 3600;
  const pagesPerHour = totalHours > 0 ? Math.round(totalPagesRead / totalHours) : 0;

  // Last 7 days weekly rhythm
  const weeklyActivity: UserReadingStats['weeklyActivity'] = [];
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(Date.now() - i * 86400000);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const dayLabel = DAY_LABELS[targetDate.getDay()];
    const mins = dayMinutesMap.get(dateStr) ?? 0;
    weeklyActivity.push({
      dayLabel,
      dateStr,
      hasRead: activeDaysSet.has(dateStr),
      minutesRead: mins,
    });
  }

  return {
    totalReadingSeconds,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    booksCompletedCount,
    booksInProgressCount,
    totalSavedWords,
    masteredWordsCount,
    totalHighlightsCount,
    topBooks,
    readingHabits: {
      personaTitle,
      personaDescription,
      averageSessionMinutes,
      pagesPerHour,
      favoriteTimeOfDay,
    },
    weeklyActivity,
  };
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
