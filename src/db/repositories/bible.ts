import type { HighlightColorKey } from '@/theme/tokens';
import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type BibleReadingPosition = {
  bookId: string;
  chapter: number;
  verse: number;
  updatedAt: number;
};

type BibleReadingPositionSqlRow = {
  book_id: string;
  chapter: number;
  verse: number;
  updated_at: number;
};

function readingPositionFromSqlRow(row: BibleReadingPositionSqlRow): BibleReadingPosition {
  return {
    bookId: row.book_id,
    chapter: row.chapter,
    verse: row.verse,
    updatedAt: row.updated_at,
  };
}

export async function getBibleReadingPosition(bookId: string): Promise<BibleReadingPosition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BibleReadingPositionSqlRow>(
    'SELECT * FROM bible_reading_position WHERE book_id = ?',
    [bookId],
  );
  return row ? readingPositionFromSqlRow(row) : null;
}

// The most recently read book/chapter/verse across the whole Old Testament,
// for the book list's "continue reading" affordance.
export async function getLatestBibleReadingPosition(): Promise<BibleReadingPosition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BibleReadingPositionSqlRow>(
    'SELECT * FROM bible_reading_position ORDER BY updated_at DESC LIMIT 1',
  );
  return row ? readingPositionFromSqlRow(row) : null;
}

export async function upsertBibleReadingPosition(
  position: Omit<BibleReadingPosition, 'updatedAt'>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO bible_reading_position (book_id, chapter, verse, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       chapter = excluded.chapter,
       verse = excluded.verse,
       updated_at = excluded.updated_at`,
    [position.bookId, position.chapter, position.verse, Date.now()],
  );
}

export type BibleHighlight = {
  id: string;
  bookId: string;
  chapter: number;
  verse: number;
  colorKey: HighlightColorKey;
  createdAt: number;
};

type BibleHighlightSqlRow = {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  color_key: string;
  created_at: number;
};

function highlightFromSqlRow(row: BibleHighlightSqlRow): BibleHighlight {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    verse: row.verse,
    colorKey: row.color_key as HighlightColorKey,
    createdAt: row.created_at,
  };
}

export async function listBibleHighlightsForBook(bookId: string): Promise<BibleHighlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BibleHighlightSqlRow>(
    'SELECT * FROM bible_highlights WHERE book_id = ? ORDER BY chapter ASC, verse ASC',
    [bookId],
  );
  return rows.map(highlightFromSqlRow);
}

// Every bookmarked verse across both testaments (OT and NT books share this
// table — see the schema note in docs/scriptures.md), for the Notebook's "Saved
// verses" tab.
export async function listAllBibleHighlights(): Promise<BibleHighlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BibleHighlightSqlRow>(
    'SELECT * FROM bible_highlights ORDER BY created_at DESC',
  );
  return rows.map(highlightFromSqlRow);
}

export async function createBibleHighlight(
  input: Omit<BibleHighlight, 'id' | 'createdAt'>,
): Promise<BibleHighlight> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO bible_highlights (id, book_id, chapter, verse, color_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.bookId, input.chapter, input.verse, input.colorKey, createdAt],
  );
  return { ...input, id, createdAt };
}

export async function deleteBibleHighlight(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bible_highlights WHERE id = ?', [id]);
}

export type BibleSavedWord = {
  id: string;
  bookId: string;
  chapter: number;
  verse: number;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  createdAt: number;
};

type BibleSavedWordSqlRow = {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  source_word: string;
  source_lang: string;
  target_lang: string;
  translation: string;
  created_at: number;
};

function savedWordFromSqlRow(row: BibleSavedWordSqlRow): BibleSavedWord {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    verse: row.verse,
    sourceWord: row.source_word,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    translation: row.translation,
    createdAt: row.created_at,
  };
}

export async function listBibleSavedWords(): Promise<BibleSavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BibleSavedWordSqlRow>(
    'SELECT * FROM bible_saved_words ORDER BY created_at DESC',
  );
  return rows.map(savedWordFromSqlRow);
}

export async function saveBibleWord(
  input: Omit<BibleSavedWord, 'id' | 'createdAt'>,
): Promise<BibleSavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO bible_saved_words (id, book_id, chapter, verse, source_word, source_lang, target_lang, translation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bookId,
      input.chapter,
      input.verse,
      input.sourceWord,
      input.sourceLang,
      input.targetLang,
      input.translation,
      createdAt,
    ],
  );
  return { ...input, id, createdAt };
}

export async function deleteBibleSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bible_saved_words WHERE id = ?', [id]);
}
