import { Directory, File, Paths } from 'expo-file-system';

import { parseBookText, type IngestedBook } from '@/features/content-ingestion/textParser';

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
