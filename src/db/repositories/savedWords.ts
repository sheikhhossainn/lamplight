import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type SavedWord = {
  id: string;
  bookId: string;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  contextSentence: string;
  chapterIndex: number;
  pageIndex: number;
  paragraphIndex: number;
  createdAt: number;
  status?: 'learning' | 'known';
  reviewCount?: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  intervalDays?: number;
  frequencyRank?: number;
};

type SavedWordSqlRow = {
  id: string;
  book_id: string;
  source_word: string;
  source_lang: string;
  target_lang: string;
  translation: string;
  context_sentence: string;
  chapter_index: number;
  page_index: number;
  paragraph_index: number;
  created_at: number;
  status?: string | null;
  review_count?: number | null;
  last_reviewed_at?: number | null;
  next_review_at?: number | null;
  interval_days?: number | null;
  frequency_rank?: number | null;
};

function fromSqlRow(row: SavedWordSqlRow): SavedWord {
  return {
    id: row.id,
    bookId: row.book_id,
    sourceWord: row.source_word,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    translation: row.translation,
    contextSentence: row.context_sentence,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    paragraphIndex: row.paragraph_index,
    createdAt: row.created_at,
    status: (row.status as 'learning' | 'known') || 'learning',
    reviewCount: row.review_count ?? 0,
    lastReviewedAt: row.last_reviewed_at ?? 0,
    nextReviewAt: row.next_review_at ?? 0,
    intervalDays: row.interval_days ?? 1,
    frequencyRank: row.frequency_rank ?? 99999,
  };
}

export async function listSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavedWordSqlRow>(
    'SELECT * FROM saved_words ORDER BY created_at DESC',
  );
  return rows.map(fromSqlRow);
}

export async function listSavedWordsForBook(bookId: string): Promise<SavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavedWordSqlRow>(
    'SELECT * FROM saved_words WHERE book_id = ? ORDER BY created_at DESC',
    [bookId],
  );
  return rows.map(fromSqlRow);
}

export async function countSavedWordsForBook(bookId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM saved_words WHERE book_id = ?',
    [bookId],
  );
  return row?.count ?? 0;
}

// Cheap enough to run on every app open — one aggregate row, no word bodies.
// `total` is the whole deck; `readyToReview` counts only words saved before
// `startOfTodayMs`, because a word looked up minutes ago tests nothing.
export async function getReviewStats(startOfTodayMs: number): Promise<{
  total: number;
  readyToReview: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; ready: number }>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN created_at < ? THEN 1 ELSE 0 END) as ready FROM saved_words',
    [startOfTodayMs],
  );
  return { total: row?.total ?? 0, readyToReview: row?.ready ?? 0 };
}

export async function listAllKnownWords(): Promise<Set<string>> {
  const db = await getDb();
  try {
    const rows = await db.getAllAsync<{ source_word: string }>(
      "SELECT source_word FROM saved_words WHERE status = 'known'",
    );
    return new Set(rows.map((r) => r.source_word.toLowerCase().trim()));
  } catch {
    return new Set<string>();
  }
}

export async function saveWord(input: Omit<SavedWord, 'id' | 'createdAt'>): Promise<SavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  const status = input.status || 'learning';
  const reviewCount = input.reviewCount ?? 0;
  const lastReviewedAt = input.lastReviewedAt ?? 0;
  const nextReviewAt = input.nextReviewAt ?? 0;
  const intervalDays = input.intervalDays ?? 1;
  const frequencyRank = input.frequencyRank ?? 99999;

  try {
    await db.runAsync(
      `INSERT INTO saved_words (
        id, book_id, source_word, source_lang, target_lang, translation,
        context_sentence, chapter_index, page_index, paragraph_index, created_at,
        status, review_count, last_reviewed_at, next_review_at, interval_days, frequency_rank
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.bookId,
        input.sourceWord,
        input.sourceLang,
        input.targetLang,
        input.translation,
        input.contextSentence,
        input.chapterIndex,
        input.pageIndex,
        input.paragraphIndex,
        createdAt,
        status,
        reviewCount,
        lastReviewedAt,
        nextReviewAt,
        intervalDays,
        frequencyRank,
      ],
    );
  } catch {
    // Fallback if migration hasn't reached v13 yet
    await db.runAsync(
      `INSERT INTO saved_words (
        id, book_id, source_word, source_lang, target_lang, translation,
        context_sentence, chapter_index, page_index, paragraph_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.bookId,
        input.sourceWord,
        input.sourceLang,
        input.targetLang,
        input.translation,
        input.contextSentence,
        input.chapterIndex,
        input.pageIndex,
        input.paragraphIndex,
        createdAt,
      ],
    );
  }
  return { ...input, id, createdAt, status, reviewCount, lastReviewedAt, nextReviewAt, intervalDays, frequencyRank };
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_words WHERE id = ?', [id]);
}

