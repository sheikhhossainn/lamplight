import type { BookRow } from '@/db/repositories/books';
import type { ReadingPosition } from '@/db/repositories/readingPosition';

export type LocalRecommendation = {
  book: BookRow;
  reason: string;
};

export type RecommendationOptions = {
  targetLanguage?: string | null;
  recentSessions?: Array<{ durationSeconds: number; startedAt?: number; bookId?: string }>;
  savedWordsCount?: number;
  shelfBookIds?: Set<string> | string[];
  dismissedBookIds?: Set<string> | string[];
  limit?: number;
};

export const DISMISSED_RECOMMENDATIONS_KEY = 'dismissed_recommendations';
export const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Loads dismissed book IDs from app_settings that are still within the 14-day cooldown window.
 */
export async function getDismissedBookIds(nowMs = Date.now()): Promise<Set<string>> {
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    const raw = await getSetting(DISMISSED_RECOMMENDATIONS_KEY);
    if (!raw) return new Set();
    const map = JSON.parse(raw) as Record<string, number>;
    const dismissed = new Set<string>();
    for (const [id, timestamp] of Object.entries(map)) {
      if (nowMs - timestamp < DISMISS_COOLDOWN_MS) {
        dismissed.add(id);
      }
    }
    return dismissed;
  } catch {
    return new Set();
  }
}

/**
 * Persists a dismissed recommendation book ID with a timestamp.
 */
export async function dismissRecommendation(bookId: string, nowMs = Date.now()): Promise<void> {
  try {
    const { getSetting, setSetting } = await import('@/db/repositories/appSettings');
    const raw = await getSetting(DISMISSED_RECOMMENDATIONS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[bookId] = nowMs;
    // Prune expired entries to prevent unbounded storage
    for (const [id, ts] of Object.entries(map)) {
      if (nowMs - ts >= DISMISS_COOLDOWN_MS) {
        delete map[id];
      }
    }
    await setSetting(DISMISSED_RECOMMENDATIONS_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal
  }
}

/**
 * Builds small, explainable recommendations from data already on the device (LIB-04).
 * Deterministic scoring based on target language, completed/abandoned books,
 * categories & authors read, session durations, and shelf/favorite status.
 */
export function getLocalRecommendations(
  books: BookRow[],
  positions: ReadingPosition[],
  optionsOrLimit?: number | RecommendationOptions,
): LocalRecommendation[] {
  if (books.length === 0) return [];

  const options: RecommendationOptions =
    typeof optionsOrLimit === 'number'
      ? { limit: optionsOrLimit }
      : (optionsOrLimit ?? {});

  const limit = options.limit ?? 3;
  const targetLang = options.targetLanguage?.trim().toLowerCase() || null;
  const dismissedSet = new Set(
    options.dismissedBookIds instanceof Set
      ? Array.from(options.dismissedBookIds)
      : options.dismissedBookIds ?? [],
  );
  const shelfSet = new Set(
    options.shelfBookIds instanceof Set
      ? Array.from(options.shelfBookIds)
      : options.shelfBookIds ?? [],
  );

  const positionByBook = new Map(positions.map((p) => [p.bookId, p]));

  // Categorize reading history
  const completedBooks: BookRow[] = [];
  const inProgressBooks: BookRow[] = [];
  const familiarBooks: BookRow[] = [];

  for (const book of books) {
    const pos = positionByBook.get(book.id);
    const isCompleted = Boolean(pos && pos.percentComplete >= 0.98);
    const isInProgress = Boolean(pos && pos.percentComplete > 0.02 && pos.percentComplete < 0.98);
    const isShelvedOrFav = book.isFavorite || shelfSet.has(book.id);

    if (isCompleted) {
      completedBooks.push(book);
      familiarBooks.push(book);
    } else if (isInProgress) {
      inProgressBooks.push(book);
      familiarBooks.push(book);
    } else if (isShelvedOrFav) {
      familiarBooks.push(book);
    }
  }

  // Calculate average session duration to detect short readers (e.g. <= 25 min)
  let isShortReader = false;
  if (options.recentSessions && options.recentSessions.length > 0) {
    const totalSeconds = options.recentSessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 0),
      0,
    );
    const avgMinutes = totalSeconds / options.recentSessions.length / 60;
    if (avgMinutes > 0 && avgMinutes <= 25) {
      isShortReader = true;
    }
  }

  // Accumulate weights from familiar books
  const categoryWeights = new Map<string, number>();
  const languageWeights = new Map<string, number>();
  const authorWeights = new Map<string, number>();

  for (const book of familiarBooks) {
    const weight = book.isFavorite ? 3 : 1;
    for (const category of book.categories) {
      const key = category.trim().toLowerCase();
      if (key) categoryWeights.set(key, (categoryWeights.get(key) ?? 0) + weight);
    }
    const language = book.sourceLanguage.trim().toLowerCase();
    if (language) languageWeights.set(language, (languageWeights.get(language) ?? 0) + weight);
    const author = book.author.trim().toLowerCase();
    if (author) authorWeights.set(author, (authorWeights.get(author) ?? 0) + weight);
  }

  // Available candidates: exclude unavailable, dismissed, completed, and currently active books
  const candidates = books.filter((book) => {
    if (!book.isAvailable) return false;
    if (dismissedSet.has(book.id)) return false;
    const pos = positionByBook.get(book.id);
    // Exclude completed books
    if (pos && pos.percentComplete >= 0.98) return false;
    // Exclude in-progress books (currently being read)
    if (pos && pos.percentComplete > 0.02) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  // Find candidate scores and explainable reasons
  const scored = candidates.map((book) => {
    let score = 0;
    let reason = '';

    const authorKey = book.author.trim().toLowerCase();
    const langKey = book.sourceLanguage.trim().toLowerCase();

    // 1. Author continuation: check if user finished or read a book by this author
    const authorCompleted = completedBooks.find(
      (b) => b.author.trim().toLowerCase() === authorKey,
    );
    const authorFamiliar = familiarBooks.find(
      (b) => b.author.trim().toLowerCase() === authorKey,
    );

    // 2. Finished book connection: check if candidate shares category with a completed book
    let finishedBookMatch: BookRow | null = null;
    for (const fBook of completedBooks) {
      const sharedCat = fBook.categories.some((c) =>
        book.categories.some((bc) => bc.trim().toLowerCase() === c.trim().toLowerCase()),
      );
      if (sharedCat) {
        finishedBookMatch = fBook;
        break;
      }
    }

    // 3. Practice-friendly at level check
    const matchesTargetLang = Boolean(targetLang && langKey === targetLang);
    const isPracticeFriendly =
      matchesTargetLang && (book.totalChapters > 0 && book.totalChapters <= 15);

    // 4. Short read check
    const isShortBook = book.totalChapters > 0 && book.totalChapters <= 10;

    // Determine highest-priority reason and weight score
    if (authorCompleted) {
      score += 16;
      reason = 'Continue this author';
    } else if (authorFamiliar) {
      score += 14;
      reason = 'Continue this author';
    } else if (finishedBookMatch) {
      score += 13;
      reason = `Because you finished ${finishedBookMatch.title}`;
    } else if (isShortReader && isShortBook) {
      score += 11;
      reason = 'A shorter read for tonight';
    } else if (isPracticeFriendly) {
      score += 10;
      reason = 'Practice-friendly books at your level';
    }

    // Category affinity boost
    const matchingCategories = book.categories
      .filter((c) => categoryWeights.has(c.trim().toLowerCase()))
      .sort(
        (a, b) =>
          (categoryWeights.get(b.trim().toLowerCase()) ?? 0) -
          (categoryWeights.get(a.trim().toLowerCase()) ?? 0),
      );

    const topCategory = matchingCategories[0];
    if (topCategory) {
      const catWeight = categoryWeights.get(topCategory.trim().toLowerCase()) ?? 0;
      score += catWeight * 3;
      if (!reason) {
        reason = `Because you spend time with ${topCategory.toLowerCase()} works.`;
      }
    }

    // Language affinity boost
    if (matchesTargetLang) {
      score += 8;
    } else {
      const lWeight = languageWeights.get(langKey) ?? 0;
      score += lWeight * 2;
    }

    // Shelved / Favorite bonus (wishlist intent)
    if (book.isFavorite || shelfSet.has(book.id)) {
      score += 6;
      if (!reason) {
        reason = 'From your saved reading list.';
      }
    }

    // General fallback reasons if none matched
    if (!reason) {
      if (authorWeights.get(authorKey) ?? 0 > 0) {
        reason = 'Continue this author';
      } else if (matchesTargetLang) {
        reason = `A fresh ${book.sourceLanguage.toUpperCase()} read for your shelf.`;
      } else {
        reason = 'A nearby classic for your next quiet session.';
      }
    }

    return { book, reason, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, Math.max(0, limit))
    .map(({ book, reason }) => ({ book, reason }));
}
