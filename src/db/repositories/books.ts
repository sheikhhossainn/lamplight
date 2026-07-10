import { getDb } from '@/db/client';

export type BookRow = {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  isAvailable: boolean;
  textUrl: string;
  coverUrl: string | null;
  gutenbergId: number | null;
  chapter1Anchor: string | null;
};

type BookSqlRow = {
  id: string;
  title: string;
  author: string;
  source_language: string;
  synopsis: string;
  total_chapters: number;
  is_available: number;
  text_url: string;
  cover_url: string | null;
  gutenberg_id: number | null;
  chapter1_anchor: string | null;
};

function fromSqlRow(row: BookSqlRow): BookRow {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    sourceLanguage: row.source_language,
    synopsis: row.synopsis,
    totalChapters: row.total_chapters,
    isAvailable: row.is_available === 1,
    textUrl: row.text_url,
    coverUrl: row.cover_url,
    gutenbergId: row.gutenberg_id,
    chapter1Anchor: row.chapter1_anchor,
  };
}

export async function listBooks(): Promise<BookRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookSqlRow>('SELECT * FROM books ORDER BY rowid ASC');
  return rows.map(fromSqlRow);
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BookSqlRow>('SELECT * FROM books WHERE id = ?', [bookId]);
  return row ? fromSqlRow(row) : null;
}

// Bulk-imported books (scripts/sync-bulk-catalog.mjs) don't get a real
// chapter count until someone actually downloads and parses the text — this
// fills that in locally the first time that happens, so the count stops
// reading as "unknown" from then on for this device.
export async function updateBookTotalChapters(bookId: string, totalChapters: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET total_chapters = ? WHERE id = ?', [totalChapters, bookId]);
}
