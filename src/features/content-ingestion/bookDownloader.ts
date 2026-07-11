import { Directory, File, Paths } from 'expo-file-system';

import { BookFormatError, parseBookText, type IngestedBook } from '@/features/content-ingestion/textParser';

// Replaces the old getBundledBookText: instead of a book's full text being
// bundled into the app binary, it's downloaded from its `text_url` (synced
// from Gutenberg into Supabase by scripts/sync-books.mjs, fetched here via
// src/db/repositories/books.ts's BookRow) the first time it's opened, parsed
// with the exact same textParser.ts used by the sync script, then cached to
// disk so re-opening never re-downloads or re-parses.
const booksDirectory = new Directory(Paths.document, 'books');

// A book parsed once this app session never needs re-reading from disk.
const bookCache = new Map<string, IngestedBook>();

export async function getBookText(
  bookId: string,
  title: string,
  textUrl: string,
  chapter1Anchor?: string,
): Promise<IngestedBook> {
  const cached = bookCache.get(bookId);
  if (cached) return cached;

  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  if (cacheFile.exists) {
    const book = JSON.parse(await cacheFile.text()) as IngestedBook;
    bookCache.set(bookId, book);
    return book;
  }

  // Guard the known bad-data case (see toBulkRow): a text/plain URL that's
  // really a README stub for an HTML-only title. Permanent, not retryable.
  if (/readme/i.test(textUrl)) {
    throw new BookFormatError(`"${title}" isn't available in a readable format.`);
  }

  const response = await fetch(textUrl);
  if (!response.ok) {
    throw new Error(`Failed to download "${title}" (${response.status})`);
  }
  const raw = await response.text();
  const { chapters } = parseBookText(raw, { title, chapter1Anchor });
  const book: IngestedBook = { chapters };

  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  cacheFile.write(JSON.stringify(book));
  bookCache.set(bookId, book);
  return book;
}

// Whether this book has been downloaded (its parsed cache file exists on
// device) — gates the Book Detail "Remove download" option so it never shows
// for a book that was never downloaded.
export function isBookCached(bookId: string): boolean {
  if (bookCache.has(bookId)) return true;
  return new File(booksDirectory, `${bookId}.json`).exists;
}

// Which books are downloaded to this device — one cache file per book id.
// Drives the Saved books manager in Settings (bulk-free storage).
export function listDownloadedBookIds(): string[] {
  if (!booksDirectory.exists) return [];
  return booksDirectory
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'))
    .map((file) => file.name.slice(0, -'.json'.length));
}

// Imported EPUBs are parsed once, on-device, at import time (epubParser.ts) —
// there's no text_url to download from, so this writes straight to the same
// cache file getBookText reads, skipping the fetch entirely on first open.
export function cacheImportedBook(bookId: string, book: IngestedBook): void {
  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  cacheFile.write(JSON.stringify(book));
  bookCache.set(bookId, book);
}

// "Delete book" (Book Detail's more-options menu) — frees the on-device
// download, not the catalog entry itself (that's shared, synced from
// Supabase; deleting it here just means it downloads again next time this
// book is opened). Reading position is cleared by the caller alongside this;
// saved vocabulary/quotes are left untouched — they're independently valuable
// and a user wouldn't expect removing a book to wipe them incidentally.
export async function deleteBookCache(bookId: string): Promise<void> {
  bookCache.delete(bookId);
  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  if (cacheFile.exists) cacheFile.delete();
}
