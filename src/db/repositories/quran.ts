import type { HighlightColorKey } from '@/theme/tokens';
import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type QuranReadingPosition = {
  surahNumber: number;
  verseNumber: number;
  updatedAt: number;
};

type QuranReadingPositionSqlRow = {
  surah_number: number;
  verse_number: number;
  updated_at: number;
};

function readingPositionFromSqlRow(row: QuranReadingPositionSqlRow): QuranReadingPosition {
  return {
    surahNumber: row.surah_number,
    verseNumber: row.verse_number,
    updatedAt: row.updated_at,
  };
}

export async function getQuranReadingPosition(surahNumber: number): Promise<QuranReadingPosition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<QuranReadingPositionSqlRow>(
    'SELECT * FROM quran_reading_position WHERE surah_number = ?',
    [surahNumber],
  );
  return row ? readingPositionFromSqlRow(row) : null;
}

// The most recently read surah/verse across the whole Quran, for the surah
// list's "continue reading" affordance.
export async function getLatestQuranReadingPosition(): Promise<QuranReadingPosition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<QuranReadingPositionSqlRow>(
    'SELECT * FROM quran_reading_position ORDER BY updated_at DESC LIMIT 1',
  );
  return row ? readingPositionFromSqlRow(row) : null;
}

export async function upsertQuranReadingPosition(
  position: Omit<QuranReadingPosition, 'updatedAt'>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO quran_reading_position (surah_number, verse_number, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(surah_number) DO UPDATE SET
       verse_number = excluded.verse_number,
       updated_at = excluded.updated_at`,
    [position.surahNumber, position.verseNumber, Date.now()],
  );
}

export type QuranHighlight = {
  id: string;
  surahNumber: number;
  verseNumber: number;
  colorKey: HighlightColorKey;
  createdAt: number;
};

type QuranHighlightSqlRow = {
  id: string;
  surah_number: number;
  verse_number: number;
  color_key: string;
  created_at: number;
};

function highlightFromSqlRow(row: QuranHighlightSqlRow): QuranHighlight {
  return {
    id: row.id,
    surahNumber: row.surah_number,
    verseNumber: row.verse_number,
    colorKey: row.color_key as HighlightColorKey,
    createdAt: row.created_at,
  };
}

export async function listQuranHighlightsForSurah(surahNumber: number): Promise<QuranHighlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QuranHighlightSqlRow>(
    'SELECT * FROM quran_highlights WHERE surah_number = ? ORDER BY verse_number ASC',
    [surahNumber],
  );
  return rows.map(highlightFromSqlRow);
}

// Every bookmarked verse across the whole Quran, for the Notebook's "Saved
// verses" tab.
export async function listAllQuranHighlights(): Promise<QuranHighlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QuranHighlightSqlRow>(
    'SELECT * FROM quran_highlights ORDER BY created_at DESC',
  );
  return rows.map(highlightFromSqlRow);
}

export async function createQuranHighlight(
  input: Omit<QuranHighlight, 'id' | 'createdAt'>,
): Promise<QuranHighlight> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO quran_highlights (id, surah_number, verse_number, color_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.surahNumber, input.verseNumber, input.colorKey, createdAt],
  );
  return { ...input, id, createdAt };
}

export async function deleteQuranHighlight(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM quran_highlights WHERE id = ?', [id]);
}

export type QuranSavedWord = {
  id: string;
  surahNumber: number;
  verseNumber: number;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  createdAt: number;
};

type QuranSavedWordSqlRow = {
  id: string;
  surah_number: number;
  verse_number: number;
  source_word: string;
  source_lang: string;
  target_lang: string;
  translation: string;
  created_at: number;
};

function savedWordFromSqlRow(row: QuranSavedWordSqlRow): QuranSavedWord {
  return {
    id: row.id,
    surahNumber: row.surah_number,
    verseNumber: row.verse_number,
    sourceWord: row.source_word,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    translation: row.translation,
    createdAt: row.created_at,
  };
}

export async function listQuranSavedWords(): Promise<QuranSavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QuranSavedWordSqlRow>(
    'SELECT * FROM quran_saved_words ORDER BY created_at DESC',
  );
  return rows.map(savedWordFromSqlRow);
}

export async function saveQuranWord(
  input: Omit<QuranSavedWord, 'id' | 'createdAt'>,
): Promise<QuranSavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO quran_saved_words (id, surah_number, verse_number, source_word, source_lang, target_lang, translation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.surahNumber,
      input.verseNumber,
      input.sourceWord,
      input.sourceLang,
      input.targetLang,
      input.translation,
      createdAt,
    ],
  );
  return { ...input, id, createdAt };
}

export async function deleteQuranSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM quran_saved_words WHERE id = ?', [id]);
}
