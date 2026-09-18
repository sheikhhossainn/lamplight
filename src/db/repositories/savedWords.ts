import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

import { nextLocalMidnight, type SrsCardState, type SrsStage } from '@/features/vocabulary/srsAlgorithm';

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
  srsStage: SrsStage;
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsDueDate: number;
  srsReps: number;
  srsLapses: number;
  phonetic?: string | null;
};

export type DailySavedWordCount = {
  date: string;
  count: number;
};

export type VocabularyEligibility = {
  totalSaved: number;
  dueCount: number;
  reviewableBeforeTodayCount: number;
  savedTodayCount: number;
  perBook: Array<{
    bookId: string;
    savedCount: number;
    dueCount: number;
    latestSavedAt: number;
  }>;
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
  srs_stage?: number;
  srs_interval_days?: number;
  srs_ease_factor?: number;
  srs_due_date?: number;
  srs_reps?: number;
  srs_lapses?: number;
  phonetic?: string | null;
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
    srsStage: ((row.srs_stage ?? 0) as SrsStage),
    srsIntervalDays: row.srs_interval_days ?? 0,
    srsEaseFactor: row.srs_ease_factor ?? 2.5,
    srsDueDate: row.srs_due_date ?? 0,
    srsReps: row.srs_reps ?? 0,
    srsLapses: row.srs_lapses ?? 0,
    phonetic: row.phonetic ?? null,
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

export async function saveWord(
  input: Omit<
    SavedWord,
    'id' | 'createdAt' | 'srsStage' | 'srsIntervalDays' | 'srsEaseFactor' | 'srsDueDate' | 'srsReps' | 'srsLapses'
  > &
    Partial<
      Pick<
        SavedWord,
        'srsStage' | 'srsIntervalDays' | 'srsEaseFactor' | 'srsDueDate' | 'srsReps' | 'srsLapses' | 'phonetic'
      >
    >,
): Promise<SavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  const srsStage = input.srsStage ?? 0;
  const srsIntervalDays = input.srsIntervalDays ?? 0;
  const srsEaseFactor = input.srsEaseFactor ?? 2.5;
  const srsDueDate = input.srsDueDate ?? nextLocalMidnight(createdAt);
  const srsReps = input.srsReps ?? 0;
  const srsLapses = input.srsLapses ?? 0;
  const phonetic = input.phonetic ?? null;

  await db.runAsync(
    `INSERT INTO saved_words (
       id, book_id, source_word, source_lang, target_lang, translation, context_sentence,
       chapter_index, page_index, paragraph_index, created_at,
       srs_stage, srs_interval_days, srs_ease_factor, srs_due_date, srs_reps, srs_lapses, phonetic
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      srsStage,
      srsIntervalDays,
      srsEaseFactor,
      srsDueDate,
      srsReps,
      srsLapses,
      phonetic,
    ],
  );

  return {
    ...input,
    id,
    createdAt,
    srsStage,
    srsIntervalDays,
    srsEaseFactor,
    srsDueDate,
    srsReps,
    srsLapses,
    phonetic,
  };
}

export async function listDueWords(nowMs: number = Date.now()): Promise<SavedWord[]> {
  const db = await getDb();
  // Words due for review: either never reviewed / scheduled (srs_due_date <= nowMs)
  const rows = await db.getAllAsync<SavedWordSqlRow>(
    'SELECT * FROM saved_words WHERE srs_due_date <= ? OR srs_due_date = 0 ORDER BY srs_due_date ASC, created_at ASC',
    [nowMs],
  );
  return rows.map(fromSqlRow);
}

// Counts used to decide whether Review and book Quiz are available. Keep this
// aggregate-only: callers that need actual cards still use listSavedWords().
export async function getVocabularyEligibility(nowMs: number = Date.now()): Promise<VocabularyEligibility> {
  const now = new Date(nowMs);
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const db = await getDb();
  const totals = await db.getFirstAsync<{
    total_saved: number;
    due_count: number;
    reviewable_before_today_count: number;
    saved_today_count: number;
  }>(
    `SELECT
       COUNT(*) AS total_saved,
       COALESCE(SUM(CASE WHEN srs_due_date <= ? OR srs_due_date = 0 THEN 1 ELSE 0 END), 0) AS due_count,
       COALESCE(SUM(CASE WHEN created_at < ? THEN 1 ELSE 0 END), 0) AS reviewable_before_today_count,
       COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS saved_today_count
     FROM saved_words`,
    [nowMs, startOfTodayMs, startOfTodayMs],
  );
  const perBook = await db.getAllAsync<{
    book_id: string;
    saved_count: number;
    due_count: number;
    latest_saved_at: number;
  }>(
    `SELECT
       book_id,
       COUNT(*) AS saved_count,
       COALESCE(SUM(CASE WHEN srs_due_date <= ? OR srs_due_date = 0 THEN 1 ELSE 0 END), 0) AS due_count,
       MAX(created_at) AS latest_saved_at
     FROM saved_words
     GROUP BY book_id`,
    [nowMs],
  );

  return {
    totalSaved: totals?.total_saved ?? 0,
    dueCount: totals?.due_count ?? 0,
    reviewableBeforeTodayCount: totals?.reviewable_before_today_count ?? 0,
    savedTodayCount: totals?.saved_today_count ?? 0,
    perBook: perBook.map((row) => ({
      bookId: row.book_id,
      savedCount: row.saved_count,
      dueCount: row.due_count,
      latestSavedAt: row.latest_saved_at,
    })),
  };
}

export async function listSavedWordCountsByDay(days: number = 30, nowMs: number = Date.now()): Promise<DailySavedWordCount[]> {
  const safeDays = Math.max(1, Math.floor(days));
  const now = new Date(nowMs);
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (safeDays - 1)).getTime();
  const db = await getDb();
  const rows = await db.getAllAsync<DailySavedWordCount>(
    `SELECT DATE(created_at / 1000, 'unixepoch', 'localtime') as date, COUNT(*) as count
     FROM saved_words
     WHERE created_at >= ?
     GROUP BY DATE(created_at / 1000, 'unixepoch', 'localtime')
     ORDER BY date ASC`,
    [rangeStart],
  );
  return rows;
}

export async function updateWordSrs(id: string, srs: SrsCardState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_words
     SET srs_stage = ?,
         srs_interval_days = ?,
         srs_ease_factor = ?,
         srs_due_date = ?,
         srs_reps = ?,
         srs_lapses = ?
     WHERE id = ?`,
    [srs.stage, srs.intervalDays, srs.easeFactor, srs.dueDate, srs.reps, srs.lapses, id],
  );
}

export async function getSrsMetrics(): Promise<{
  totalWords: number;
  dueToday: number;
  learningCount: number;
  masteredCount: number;
}> {
  const db = await getDb();
  const now = Date.now();
  const row = await db.getFirstAsync<{
    total: number;
    due: number;
    learning: number;
    mastered: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN srs_due_date <= ? OR srs_due_date = 0 THEN 1 ELSE 0 END) as due,
       SUM(CASE WHEN srs_stage = 1 THEN 1 ELSE 0 END) as learning,
       SUM(CASE WHEN srs_stage = 3 THEN 1 ELSE 0 END) as mastered
     FROM saved_words`,
    [now],
  );

  return {
    totalWords: row?.total ?? 0,
    dueToday: row?.due ?? 0,
    learningCount: row?.learning ?? 0,
    masteredCount: row?.mastered ?? 0,
  };
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_words WHERE id = ?', [id]);
}

