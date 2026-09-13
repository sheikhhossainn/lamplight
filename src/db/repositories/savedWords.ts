import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

// Shared team contract interfaces (Contract 1: Word State)
export type WordStatus = 'unknown' | 'learning' | 'known';

export type WordStateRecord = {
  sourceWord: string;
  status: WordStatus;
  reviewCount: number;
  intervalDays: number;
  nextReviewAt: number;
};

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
  status: WordStatus;
  reviewCount: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  intervalDays: number;
  frequencyRank: number;
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
  status?: string;
  review_count?: number;
  last_reviewed_at?: number;
  next_review_at?: number;
  interval_days?: number;
  frequency_rank?: number;
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
    status: (row.status as WordStatus) || 'learning',
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
// `total` is the whole deck; `readyToReview` counts words due for SRS review
// or unreviewed words saved before `startOfTodayMs`.
export async function getReviewStats(startOfTodayMs: number): Promise<{
  total: number;
  readyToReview: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; ready: number }>(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN (status IS NULL OR status = 'learning') AND (next_review_at <= ? OR (next_review_at = 0 AND created_at < ?)) THEN 1 ELSE 0 END) as ready
     FROM saved_words`,
    [startOfTodayMs, startOfTodayMs],
  );
  return { total: row?.total ?? 0, readyToReview: row?.ready ?? 0 };
}

export type SaveWordInput = Omit<
  SavedWord,
  'id' | 'createdAt' | 'status' | 'reviewCount' | 'lastReviewedAt' | 'nextReviewAt' | 'intervalDays' | 'frequencyRank'
> & {
  status?: WordStatus;
  reviewCount?: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  intervalDays?: number;
  frequencyRank?: number;
};

export async function saveWord(input: SaveWordInput): Promise<SavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  const status: WordStatus = input.status ?? 'learning';
  const reviewCount = input.reviewCount ?? 0;
  const lastReviewedAt = input.lastReviewedAt ?? 0;
  const intervalDays = input.intervalDays ?? 1;
  const nextReviewAt = input.nextReviewAt ?? (createdAt + intervalDays * 86_400_000);
  const frequencyRank = input.frequencyRank ?? 99999;

  await db.runAsync(
    `INSERT INTO saved_words (
      id, book_id, source_word, source_lang, target_lang, translation,
      context_sentence, chapter_index, page_index, paragraph_index, created_at,
      status, review_count, last_reviewed_at, next_review_at, interval_days, frequency_rank
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  return {
    id,
    bookId: input.bookId,
    sourceWord: input.sourceWord,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    translation: input.translation,
    contextSentence: input.contextSentence,
    chapterIndex: input.chapterIndex,
    pageIndex: input.pageIndex,
    paragraphIndex: input.paragraphIndex,
    createdAt,
    status,
    reviewCount,
    lastReviewedAt,
    nextReviewAt,
    intervalDays,
    frequencyRank,
  };
}

export async function listWordsDueForReview(limit?: number): Promise<SavedWord[]> {
  const db = await getDb();
  const now = Date.now();
  const sql = limit
    ? `SELECT * FROM saved_words
       WHERE (status IS NULL OR status = 'learning')
         AND (next_review_at <= ? OR next_review_at = 0)
       ORDER BY frequency_rank ASC, next_review_at ASC
       LIMIT ?`
    : `SELECT * FROM saved_words
       WHERE (status IS NULL OR status = 'learning')
         AND (next_review_at <= ? OR next_review_at = 0)
       ORDER BY frequency_rank ASC, next_review_at ASC`;
  const params = limit ? [now, limit] : [now];
  const rows = await db.getAllAsync<SavedWordSqlRow>(sql, params);
  return rows.map(fromSqlRow);
}

export async function updateWordSrsState(id: string, isCorrect: boolean): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<SavedWordSqlRow>(
    'SELECT review_count, interval_days, status FROM saved_words WHERE id = ?',
    [id],
  );
  if (!row) return;

  const now = Date.now();
  const currentCount = row.review_count ?? 0;

  let newCount: number;
  let newInterval: number;
  let newStatus: WordStatus;

  if (isCorrect) {
    newCount = currentCount + 1;
    if (newCount === 1) newInterval = 3;
    else if (newCount === 2) newInterval = 7;
    else if (newCount === 3) newInterval = 16;
    else {
      newInterval = 35;
    }
    // Graduation rule: 4 consecutive successful reviews
    newStatus = newCount >= 4 ? 'known' : 'learning';
  } else {
    // Failure penalty: reset interval to 1 day, decrement review_count
    newCount = Math.max(0, currentCount - 1);
    newInterval = 1;
    newStatus = 'learning';
  }

  const nextReviewAt = now + newInterval * 86_400_000;

  await db.runAsync(
    `UPDATE saved_words
     SET review_count = ?,
         interval_days = ?,
         status = ?,
         last_reviewed_at = ?,
         next_review_at = ?
     WHERE id = ?`,
    [newCount, newInterval, newStatus, now, nextReviewAt, id],
  );
}

export async function getKnownWordsCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM saved_words WHERE status = 'known'`,
  );
  return row?.count ?? 0;
}

export async function listAllKnownWords(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ source_word: string }>(
    `SELECT source_word FROM saved_words WHERE status = 'known'`,
  );
  return new Set(rows.map((r) => r.source_word.toLowerCase().trim()));
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_words WHERE id = ?', [id]);
}

