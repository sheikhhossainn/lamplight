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
  // Raw Gutendex subjects/bookshelves for this book; mapped to canonical
  // filter buckets by features/content-ingestion/bookCategories.ts.
  categories: string[];
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
  categories: string | null;
};

// Categories are stored as a JSON string array; tolerate empty/legacy rows.
function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

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
    categories: parseCategories(row.categories),
  };
}

export async function listBooks(): Promise<BookRow[]> {
  const db = await getDb();
  // Hide catalog rows whose text_url is a README stub (HTML-only titles like
  // the CIA World Factbooks) — they can't be read, so don't show them on a
  // shelf only to dead-end at "unavailable". Imported EPUBs (empty text_url)
  // and normal books are unaffected.
  const rows = await db.getAllAsync<BookSqlRow>(
    "SELECT * FROM books WHERE LOWER(text_url) NOT LIKE '%readme%' ORDER BY rowid ASC",
  );
  return rows.map(fromSqlRow);
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BookSqlRow>('SELECT * FROM books WHERE id = ?', [bookId]);
  return row ? fromSqlRow(row) : null;
}

// A user-imported EPUB has no Supabase catalog row and no text_url to
// download from — its chapters are already parsed and cached to disk
// (epubImporter.ts) by the time this runs, so is_available is 1 from the start.
export async function createLocalBook(input: {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  totalChapters: number;
}): Promise<BookRow> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories)
     VALUES (?, ?, ?, ?, '', ?, 1, '', NULL, NULL, NULL, '[]')`,
    [input.id, input.title, input.author, input.sourceLanguage, input.totalChapters],
  );
  return {
    id: input.id,
    title: input.title,
    author: input.author,
    sourceLanguage: input.sourceLanguage,
    synopsis: '',
    totalChapters: input.totalChapters,
    isAvailable: true,
    textUrl: '',
    coverUrl: null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: [],
  };
}

// Whether a book is the user's own imported EPUB (createLocalBook) rather than
// a shared-catalog title. Imported books have no remote text_url but are
// available; catalog books always carry a text_url. The one book a user is
// allowed to delete outright.
export function isImportedBook(book: BookRow): boolean {
  return book.isAvailable && book.textUrl === '' && book.gutenbergId === null;
}

// Delete a user-imported book row. The WHERE clause makes it structurally
// impossible to remove a shared-catalog title (those always have a text_url),
// so a user can never alter the catalog DB even if this is called in error.
// Also clears its reading position (the user's own activity, not catalog data).
export async function deleteImportedBook(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM books WHERE id = ? AND text_url = ''", [bookId]);
  await db.runAsync('DELETE FROM reading_positions WHERE book_id = ?', [bookId]);
}

// Bulk-imported books (scripts/sync-bulk-catalog.mjs) don't get a real
// chapter count until someone actually downloads and parses the text — this
// fills that in locally the first time that happens, so the count stops
// reading as "unknown" from then on for this device.
export async function updateBookTotalChapters(bookId: string, totalChapters: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET total_chapters = ? WHERE id = ?', [totalChapters, bookId]);
}
