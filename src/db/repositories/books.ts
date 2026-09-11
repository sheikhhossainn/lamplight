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
  source?: string;
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
  source?: string | null;
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
    source: row.source ?? 'catalog',
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

export type BanglaChapterRow = {
  bookId: string;
  chapterIndex: number;
  title: string;
  slug: string;
  isDownloaded: boolean;
};

type BanglaChapterSqlRow = {
  book_id: string;
  chapter_index: number;
  title: string;
  slug: string;
  is_downloaded: number;
};

export async function upsertBanglaBook(input: {
  id: string;
  title: string;
  author: string;
  synopsis?: string;
  totalChapters: number;
  coverUrl?: string | null;
  categories?: string[];
  isAvailable?: boolean;
}): Promise<BookRow> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories, source)
     VALUES (?, ?, ?, 'bn', ?, ?, ?, '', ?, NULL, NULL, ?, 'bangla_api')
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       synopsis = excluded.synopsis,
       total_chapters = excluded.total_chapters,
       is_available = excluded.is_available,
       cover_url = COALESCE(excluded.cover_url, books.cover_url),
       categories = excluded.categories,
       source = 'bangla_api'`,
    [
      input.id,
      input.title,
      input.author,
      input.synopsis ?? '',
      input.totalChapters,
      input.isAvailable ? 1 : 0,
      input.coverUrl ?? null,
      JSON.stringify(input.categories ?? []),
    ],
  );
  return {
    id: input.id,
    title: input.title,
    author: input.author,
    sourceLanguage: 'bn',
    synopsis: input.synopsis ?? '',
    totalChapters: input.totalChapters,
    isAvailable: Boolean(input.isAvailable),
    textUrl: '',
    coverUrl: input.coverUrl ?? null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: input.categories ?? [],
    source: 'bangla_api',
  };
}

export async function listBanglaBooks(): Promise<BookRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookSqlRow>(
    "SELECT * FROM books WHERE source = 'bangla_api' OR source_language = 'bn' ORDER BY rowid ASC",
  );
  return rows.map(fromSqlRow);
}

export async function saveBanglaChapters(
  bookId: string,
  chapters: Array<{ index: number; title: string; slug: string }>,
): Promise<void> {
  const db = await getDb();
  for (const ch of chapters) {
    await db.runAsync(
      `INSERT INTO bangla_chapters (book_id, chapter_index, title, slug, is_downloaded)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(book_id, chapter_index) DO UPDATE SET
         title = excluded.title,
         slug = excluded.slug`,
      [bookId, ch.index, ch.title, ch.slug],
    );
  }
}

export async function listBanglaChapters(bookId: string): Promise<BanglaChapterRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BanglaChapterSqlRow>(
    'SELECT * FROM bangla_chapters WHERE book_id = ? ORDER BY chapter_index ASC',
    [bookId],
  );
  return rows.map((r) => ({
    bookId: r.book_id,
    chapterIndex: r.chapter_index,
    title: r.title,
    slug: r.slug,
    isDownloaded: r.is_downloaded === 1,
  }));
}

export async function markBanglaChapterDownloaded(bookId: string, chapterIndex: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE bangla_chapters SET is_downloaded = 1 WHERE book_id = ? AND chapter_index = ?',
    [bookId, chapterIndex],
  );
}

export async function markBanglaBookDownloaded(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET is_available = 1 WHERE id = ?', [bookId]);
  await db.runAsync('UPDATE bangla_chapters SET is_downloaded = 1 WHERE book_id = ?', [bookId]);
}

export type JapaneseChapterRow = {
  bookId: string;
  chapterIndex: number;
  title: string;
  slug: string;
  content: string;
  isDownloaded: boolean;
};

type JapaneseChapterSqlRow = {
  book_id: string;
  chapter_index: number;
  title: string;
  slug: string;
  content: string;
  is_downloaded: number;
};

export async function upsertJapaneseBook(input: {
  id: string;
  title: string;
  author: string;
  synopsis?: string;
  totalChapters: number;
  coverUrl?: string | null;
  categories?: string[];
  isAvailable?: boolean;
  textUrl?: string | null;
}): Promise<BookRow> {
  const db = await getDb();
  const resolvedTextUrl = input.textUrl || `internal://aozora/${input.id}`;
  await db.runAsync(
    `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories, source)
     VALUES (?, ?, ?, 'ja', ?, ?, ?, ?, ?, NULL, NULL, ?, 'aozora_bunko')
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       synopsis = excluded.synopsis,
       total_chapters = excluded.total_chapters,
       is_available = excluded.is_available,
       text_url = excluded.text_url,
       cover_url = COALESCE(excluded.cover_url, books.cover_url),
       categories = excluded.categories,
       source = 'aozora_bunko'`,
    [
      input.id,
      input.title,
      input.author,
      input.synopsis ?? '',
      input.totalChapters,
      input.isAvailable ? 1 : 0,
      resolvedTextUrl,
      input.coverUrl ?? null,
      JSON.stringify(input.categories ?? []),
    ],
  );
  return {
    id: input.id,
    title: input.title,
    author: input.author,
    sourceLanguage: 'ja',
    synopsis: input.synopsis ?? '',
    totalChapters: input.totalChapters,
    isAvailable: !!input.isAvailable,
    textUrl: resolvedTextUrl,
    coverUrl: input.coverUrl ?? null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: input.categories ?? [],
    source: 'aozora_bunko',
  };
}

export async function listJapaneseBooks(): Promise<BookRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookSqlRow>(
    "SELECT * FROM books WHERE source = 'aozora_bunko' OR source_language = 'ja' ORDER BY rowid ASC",
  );
  return rows.map(fromSqlRow);
}

export async function saveJapaneseChapters(
  bookId: string,
  chapters: Array<{ index: number; title: string; slug: string; content: string }>,
): Promise<void> {
  const db = await getDb();
  for (const ch of chapters) {
    await db.runAsync(
      `INSERT INTO japanese_chapters (book_id, chapter_index, title, slug, content, is_downloaded)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(book_id, chapter_index) DO UPDATE SET
         title = excluded.title,
         slug = excluded.slug,
         content = excluded.content`,
      [bookId, ch.index, ch.title, ch.slug, ch.content],
    );
  }
}

export async function listJapaneseChapters(bookId: string): Promise<JapaneseChapterRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JapaneseChapterSqlRow>(
    'SELECT * FROM japanese_chapters WHERE book_id = ? ORDER BY chapter_index ASC',
    [bookId],
  );
  return rows.map((r) => ({
    bookId: r.book_id,
    chapterIndex: r.chapter_index,
    title: r.title,
    slug: r.slug,
    content: r.content,
    isDownloaded: r.is_downloaded === 1,
  }));
}

export async function markJapaneseBookDownloaded(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE japanese_chapters SET is_downloaded = 1 WHERE book_id = ?', [bookId]);
}

export async function markJapaneseBookRemoved(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE japanese_chapters SET is_downloaded = 0 WHERE book_id = ?', [bookId]);
}

export type KoreanChapterRow = {
  bookId: string;
  chapterIndex: number;
  title: string;
  slug: string;
  content: string;
  isDownloaded: boolean;
};

type KoreanChapterSqlRow = {
  book_id: string;
  chapter_index: number;
  title: string;
  slug: string;
  content: string;
  is_downloaded: number;
};

export async function upsertKoreanBook(input: {
  id: string;
  title: string;
  author: string;
  synopsis?: string;
  totalChapters: number;
  coverUrl?: string | null;
  categories?: string[];
  isAvailable?: boolean;
  textUrl?: string | null;
}): Promise<BookRow> {
  const db = await getDb();
  const resolvedTextUrl = input.textUrl || `internal://korean/${input.id}`;
  await db.runAsync(
    `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories, source)
     VALUES (?, ?, ?, 'ko', ?, ?, ?, ?, ?, NULL, NULL, ?, 'gongu_korea')
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       synopsis = excluded.synopsis,
       total_chapters = excluded.total_chapters,
       is_available = excluded.is_available,
       text_url = excluded.text_url,
       cover_url = COALESCE(excluded.cover_url, books.cover_url),
       categories = excluded.categories,
       source = 'gongu_korea'`,
    [
      input.id,
      input.title,
      input.author,
      input.synopsis ?? '',
      input.totalChapters,
      input.isAvailable ? 1 : 0,
      resolvedTextUrl,
      input.coverUrl ?? null,
      JSON.stringify(input.categories ?? []),
    ],
  );
  return {
    id: input.id,
    title: input.title,
    author: input.author,
    sourceLanguage: 'ko',
    synopsis: input.synopsis ?? '',
    totalChapters: input.totalChapters,
    isAvailable: !!input.isAvailable,
    textUrl: resolvedTextUrl,
    coverUrl: input.coverUrl ?? null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: input.categories ?? [],
    source: 'gongu_korea',
  };
}

export async function listKoreanBooks(): Promise<BookRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookSqlRow>(
    "SELECT * FROM books WHERE source = 'gongu_korea' OR source_language = 'ko' ORDER BY rowid ASC",
  );
  return rows.map(fromSqlRow);
}

export async function saveKoreanChapters(
  bookId: string,
  chapters: Array<{ index: number; title: string; slug: string; content: string }>,
): Promise<void> {
  const db = await getDb();
  for (const ch of chapters) {
    await db.runAsync(
      `INSERT INTO korean_chapters (book_id, chapter_index, title, slug, content, is_downloaded)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(book_id, chapter_index) DO UPDATE SET
         title = excluded.title,
         slug = excluded.slug,
         content = excluded.content`,
      [bookId, ch.index, ch.title, ch.slug, ch.content],
    );
  }
}

export async function listKoreanChapters(bookId: string): Promise<KoreanChapterRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<KoreanChapterSqlRow>(
    'SELECT * FROM korean_chapters WHERE book_id = ? ORDER BY chapter_index ASC',
    [bookId],
  );
  return rows.map((r) => ({
    bookId: r.book_id,
    chapterIndex: r.chapter_index,
    title: r.title,
    slug: r.slug,
    content: r.content,
    isDownloaded: r.is_downloaded === 1,
  }));
}

export async function markKoreanBookDownloaded(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE korean_chapters SET is_downloaded = 1 WHERE book_id = ?', [bookId]);
}

export async function markKoreanBookRemoved(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE korean_chapters SET is_downloaded = 0 WHERE book_id = ?', [bookId]);
}


