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

// Gutendex's text_url (e.g. https://www.gutenberg.org/ebooks/1342.txt.utf-8)
// 302-redirects to an http:// (not https://) cache URL — Android blocks
// cleartext redirects by default, so the fetch fails on every device before
// it ever reaches the real file. Resolve straight to the https cache path
// Gutenberg actually redirects to, skipping the insecure hop entirely.
function resolveDirectUrl(textUrl: string): string {
  const match = textUrl.match(/gutenberg\.org\/ebooks\/(\d+)\.txt/);
  return match ? `https://www.gutenberg.org/cache/epub/${match[1]}/pg${match[1]}.txt` : textUrl;
}

function normalizeBookId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function getBookText(
  bookId: string,
  title: string,
  textUrl?: string | null,
  chapter1Anchor?: string,
): Promise<IngestedBook> {
  const cleanId = normalizeBookId(bookId);
  const cached = bookCache.get(cleanId) ?? bookCache.get(bookId);
  if (cached) return cached;

  let cacheFile = new File(booksDirectory, `${cleanId}.json`);
  if (!cacheFile.exists && cleanId !== bookId) {
    cacheFile = new File(booksDirectory, `${bookId}.json`);
  }

  if (cacheFile.exists) {
    const rawJson = await cacheFile.text();
    let book = JSON.parse(rawJson) as IngestedBook;
    if (cleanId.startsWith('bn-') || bookId.startsWith('bn-')) {
      const { sanitizeBanglaIngestedBook } = await import('@/features/content-ingestion/banglaDownloader');
      book = sanitizeBanglaIngestedBook(book);
      if (book.chapters.length === 0) {
        throw new BookFormatError('এই বইটিতে পড়ার মতো কোনো বিষয়বস্তু নেই।');
      }
    }
    bookCache.set(cleanId, book);
    if (cleanId !== bookId) bookCache.set(bookId, book);
    return book;
  }

  // Auto-download Bangla book if opening directly
  if (cleanId.startsWith('bn-') || bookId.startsWith('bn-')) {
    const { fetchBanglaBookDetail } = await import('@/features/content-ingestion/banglaApi');
    const { downloadBanglaBook } = await import('@/features/content-ingestion/banglaDownloader');
    const slug = cleanId.replace(/^bn-/, '');
    const detail = await fetchBanglaBookDetail(slug);
    const ingested = await downloadBanglaBook(detail);
    if (ingested.chapters.length === 0) {
      throw new BookFormatError('এই বইটিতে পড়ার মতো কোনো বিষয়বস্তু নেই।');
    }
    bookCache.set(cleanId, ingested);
    if (cleanId !== bookId) bookCache.set(bookId, ingested);
    return ingested;
  }

  // Auto-ingest Japanese (Aozora Bunko) book if opening directly
  if (cleanId.startsWith('ja-') || bookId.startsWith('ja-')) {
    const { fetchJapaneseBookDetail, fetchJapaneseChapterText } = await import(
      '@/features/content-ingestion/japaneseApi'
    );
    const { markJapaneseBookDownloaded } = await import('@/db/repositories/books');
    const detail = await fetchJapaneseBookDetail(cleanId);
    const chapters = await Promise.all(
      detail.chapters.map(async (ch) => {
        const text = await fetchJapaneseChapterText(ch.slug, cleanId);
        const paragraphs = text
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        return {
          index: ch.index,
          title: ch.title,
          pages: [paragraphs],
        };
      }),
    );
    const ingested: IngestedBook = { chapters };
    if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
    cacheFile.write(JSON.stringify(ingested));
    bookCache.set(cleanId, ingested);
    if (cleanId !== bookId) bookCache.set(bookId, ingested);
    await markJapaneseBookDownloaded(cleanId);
    return ingested;
  }

  // Auto-ingest Korean (Gongu) book if opening directly
  if (cleanId.startsWith('ko-') || bookId.startsWith('ko-')) {
    const { fetchKoreanBookDetail, fetchKoreanChapterText } = await import(
      '@/features/content-ingestion/koreanApi'
    );
    const { markKoreanBookDownloaded } = await import('@/db/repositories/books');
    const detail = await fetchKoreanBookDetail(cleanId);

    // If hero book with curated chapters
    const isHeroBook =
      detail &&
      detail.chapters &&
      detail.chapters.length > 0 &&
      !detail.chapters[0].slug.endsWith('-full');

    if (isHeroBook) {
      const chapters = await Promise.all(
        detail.chapters.map(async (ch) => {
          const text = await fetchKoreanChapterText(ch.slug, cleanId);
          const paragraphs = text
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
          return {
            index: ch.index,
            title: ch.title,
            pages: [paragraphs],
          };
        }),
      );
      const ingested: IngestedBook = { chapters };
      if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
      cacheFile.write(JSON.stringify(ingested));
      bookCache.set(cleanId, ingested);
      if (cleanId !== bookId) bookCache.set(bookId, ingested);
      try {
        await markKoreanBookDownloaded(cleanId);
      } catch {
        // non-fatal
      }
      return ingested;
    }

    // Resolve textUrl if not provided
    let effectiveTextUrl = textUrl;
    if (!effectiveTextUrl) {
      try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/books?id=eq.${encodeURIComponent(cleanId)}&select=text_url`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            },
          );
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows[0]?.text_url) {
              effectiveTextUrl = rows[0].text_url;
            }
          }
        }
      } catch {
        // non-fatal
      }
    }

    // If remote textUrl (Wikisource or archive URL)
    if (
      effectiveTextUrl &&
      (effectiveTextUrl.startsWith('wikisource://') ||
        effectiveTextUrl.startsWith('http://') ||
        effectiveTextUrl.startsWith('https://'))
    ) {
      const { downloadKoreanBook } = await import('@/features/content-ingestion/koreanDownloader');
      const book = await downloadKoreanBook(effectiveTextUrl, title);
      if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
      cacheFile.write(JSON.stringify(book));
      bookCache.set(cleanId, book);
      if (cleanId !== bookId) bookCache.set(bookId, book);
      try {
        await markKoreanBookDownloaded(cleanId);
      } catch {
        // non-fatal
      }
      return book;
    }
  }

  if (!textUrl) {
    throw new Error(`No text source available for "${title}"`);
  }

  // Auto-ingest Aozora Bunko Japanese books from archive ZIP/TXT
  if (
    cleanId.startsWith('aozora-') ||
    bookId.startsWith('aozora-') ||
    textUrl.includes('aozora.gr.jp') ||
    textUrl.endsWith('.zip')
  ) {
    const { downloadAozoraBook } = await import('@/features/content-ingestion/aozoraDownloader');
    const { markJapaneseBookDownloaded } = await import('@/db/repositories/books');
    const book = await downloadAozoraBook(textUrl, title);
    if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
    cacheFile.write(JSON.stringify(book));
    bookCache.set(cleanId, book);
    if (cleanId !== bookId) bookCache.set(bookId, book);
    try {
      await markJapaneseBookDownloaded(cleanId);
    } catch {
      // non-fatal
    }
    return book;
  }

  // Guard the known bad-data case (see toBulkRow): a text/plain URL that's
  // really a README stub for an HTML-only title. Permanent, not retryable.
  if (/readme/i.test(textUrl)) {
    throw new BookFormatError(`"${title}" isn't available in a readable format.`);
  }

  const response = await fetch(resolveDirectUrl(textUrl));
  if (!response.ok) {
    throw new Error(`Failed to download "${title}" (${response.status})`);
  }
  const raw = await response.text();
  const { chapters } = parseBookText(raw, { title, chapter1Anchor });
  const book: IngestedBook = { chapters };

  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  cacheFile.write(JSON.stringify(book));
  bookCache.set(cleanId, book);
  if (cleanId !== bookId) bookCache.set(bookId, book);
  return book;
}

// Whether this book has been downloaded (its parsed cache file exists on
// device) — gates the Book Detail "Remove download" option so it never shows
// for a book that was never downloaded.
export function isBookCached(bookId: string): boolean {
  const cleanId = normalizeBookId(bookId);
  if (bookCache.has(cleanId) || bookCache.has(bookId)) return true;
  if (new File(booksDirectory, `${cleanId}.json`).exists) return true;
  if (cleanId !== bookId && new File(booksDirectory, `${bookId}.json`).exists) return true;
  return false;
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
  const cleanId = normalizeBookId(bookId);
  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  const cacheFile = new File(booksDirectory, `${cleanId}.json`);
  cacheFile.write(JSON.stringify(book));
  bookCache.set(cleanId, book);
  if (cleanId !== bookId) {
    const rawCacheFile = new File(booksDirectory, `${bookId}.json`);
    rawCacheFile.write(JSON.stringify(book));
    bookCache.set(bookId, book);
  }
}

// "Delete book" (Book Detail's more-options menu) — frees the on-device
// download, not the catalog entry itself (that's shared, synced from
// Supabase; deleting it here just means it downloads again next time this
// book is opened). Reading position is cleared by the caller alongside this;
// saved vocabulary/quotes are left untouched — they're independently valuable
// and a user wouldn't expect removing a book to wipe them incidentally.
export async function deleteBookCache(bookId: string): Promise<void> {
  const cleanId = normalizeBookId(bookId);
  bookCache.delete(cleanId);
  bookCache.delete(bookId);
  const cacheFile = new File(booksDirectory, `${cleanId}.json`);
  if (cacheFile.exists) cacheFile.delete();
  if (cleanId !== bookId) {
    const rawCacheFile = new File(booksDirectory, `${bookId}.json`);
    if (rawCacheFile.exists) rawCacheFile.delete();
  }
  if (
    cleanId.startsWith('ja-') ||
    bookId.startsWith('ja-') ||
    cleanId.startsWith('aozora-') ||
    bookId.startsWith('aozora-')
  ) {
    try {
      const { markJapaneseBookRemoved } = await import('@/db/repositories/books');
      await markJapaneseBookRemoved(cleanId);
    } catch {
      // Non-fatal if DB update fails
    }
  }

  if (cleanId.startsWith('ko-') || bookId.startsWith('ko-')) {
    try {
      const { markKoreanBookRemoved } = await import('@/db/repositories/books');
      await markKoreanBookRemoved(cleanId);
    } catch {
      // Non-fatal if DB update fails
    }
  }
}
