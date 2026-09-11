import { Directory, File, Paths } from 'expo-file-system';

import {
  cleanBanglaText,
  type BanglaBookDetail,
  fetchBanglaChapterText,
} from '@/features/content-ingestion/banglaApi';
import type { BookChapter, IngestedBook } from '@/features/content-ingestion/textParser';
import { cacheImportedBook } from '@/features/content-ingestion/bookDownloader';
import {
  markBanglaBookDownloaded,
  saveBanglaChapters,
  upsertBanglaBook,
} from '@/db/repositories/books';

const booksDirectory = new Directory(Paths.document, 'books');
const banglaRawDirectory = new Directory(booksDirectory, 'bangla');

export type DownloadProgressCallback = (completed: number, total: number) => void;

// Download a full Bangla book: fetches plain text for each chapter sequentially,
// saves raw chapter files to disk, builds the IngestedBook cache file for the
// reader engine, and updates the local SQLite database.
export async function downloadBanglaBook(
  bookDetail: BanglaBookDetail,
  onProgress?: DownloadProgressCallback,
): Promise<IngestedBook> {
  const { id: rawBookId, slug: rawSlug, title, author, synopsis, genre, chapters } = bookDetail;
  const bookId = (() => {
    try {
      return decodeURIComponent(rawBookId);
    } catch {
      return rawBookId;
    }
  })();
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug);
    } catch {
      return rawSlug;
    }
  })();

  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  if (!banglaRawDirectory.exists) banglaRawDirectory.create({ intermediates: true });

  let bookRawDir: Directory | null = null;
  try {
    bookRawDir = new Directory(banglaRawDirectory, slug);
    if (!bookRawDir.exists) bookRawDir.create({ intermediates: true });
  } catch (err) {
    console.warn('[banglaDownloader] could not create bookRawDir, proceeding without raw files:', err);
  }

  // 1. Save initial metadata in SQLite
  await upsertBanglaBook({
    id: bookId,
    title,
    author,
    synopsis,
    totalChapters: chapters.length,
    coverUrl: bookDetail.coverUrl,
    categories: [genre],
    isAvailable: false,
  });

  await saveBanglaChapters(
    bookId,
    chapters.map((ch) => ({ index: ch.index, title: ch.title, slug: ch.slug })),
  );

  const ingestedChapters: BookChapter[] = new Array(chapters.length);
  const total = chapters.length;
  let completed = 0;

  // 2. Fetch chapters in concurrent batches of 4 for speed and resilience
  const batchSize = 4;
  for (let i = 0; i < chapters.length; i += batchSize) {
    const batch = chapters.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (ch, batchIdx) => {
        const globalIdx = i + batchIdx;
        try {
          const rawText = await fetchBanglaChapterText(ch.slug);
          const text = cleanBanglaText(rawText);

          // Save raw chapter text file (best-effort; non-fatal if file system restricts raw txt)
          if (bookRawDir && bookRawDir.exists) {
            try {
              const chapterFile = new File(bookRawDir, `${ch.index}.txt`);
              chapterFile.write(text);
            } catch {
              // Auxiliary raw save failure should not discard the chapter
            }
          }

          // Convert into paragraphs for reader engine
          const paragraphs = text
            .split(/\n\s*\n/)
            .map((p) => cleanBanglaText(p).trim())
            .filter(
              (p) =>
                p.length > 0 &&
                !p.includes('অধ্যায়টির বিষয়বস্তু উপলব্ধ নেই') &&
                !p.includes('অধ্যায়টির বিষয়বস্তু উপলব্ধ নেই') &&
                !/this book has no content/i.test(p) &&
                !p.includes('অধ্যায়টি লোড করা সম্ভব হয়নি'),
            );

          if (paragraphs.length > 0) {
            ingestedChapters[globalIdx] = {
              index: ch.index,
              title: ch.title,
              pages: [paragraphs],
            };
          }
        } catch (err) {
          console.warn(`[banglaDownloader] error fetching chapter ${ch.slug}:`, err);
        } finally {
          completed += 1;
          if (onProgress) {
            onProgress(completed, total);
          }
        }
      }),
    );
  }

  // 3. Assemble and cache IngestedBook JSON for the reader engine
  const validChapters = ingestedChapters.filter(Boolean);
  if (validChapters.length === 0) {
    throw new Error('এই বইটিতে পড়ার মতো কোনো বিষয়বস্তু নেই।');
  }

  const ingestedBook: IngestedBook = {
    chapters: validChapters,
  };

  // Cache in memory and on disk via cacheImportedBook
  cacheImportedBook(bookId, ingestedBook);
  if (rawBookId !== bookId) {
    cacheImportedBook(rawBookId, ingestedBook);
  }

  // 4. Mark as downloaded in SQLite
  await markBanglaBookDownloaded(bookId);
  if (rawBookId !== bookId) {
    await markBanglaBookDownloaded(rawBookId);
  }

  return ingestedBook;
}

/**
 * Sanitizes an already-loaded IngestedBook by stripping any residual
 * scraping artifacts like "Bookmark" or "Bookmarks" across all chapters.
 */
export function sanitizeBanglaIngestedBook(book: IngestedBook): IngestedBook {
  const cleanChapters = book.chapters
    .map((ch) => ({
      ...ch,
      pages: ch.pages
        .map((pageParagraphs) =>
          pageParagraphs
            .map((p) => cleanBanglaText(p).trim())
            .filter(
              (p) =>
                p.length > 0 &&
                !p.includes('অধ্যায়টির বিষয়বস্তু উপলব্ধ নেই') &&
                !p.includes('অধ্যায়টির বিষয়বস্তু উপলব্ধ নেই') &&
                !/this book has no content/i.test(p) &&
                !p.includes('অধ্যায়টি লোড করা সম্ভব হয়নি'),
            ),
        )
        .filter((page) => page.length > 0),
    }))
    .filter((ch) => ch.pages.length > 0);

  return {
    chapters: cleanChapters,
  };
}

// Check if a Bangla book has been downloaded and is available for offline reading
export function isBanglaBookDownloaded(bookId: string): boolean {
  const cleanId = (() => {
    try {
      return decodeURIComponent(bookId);
    } catch {
      return bookId;
    }
  })();
  const cacheFile = new File(booksDirectory, `${cleanId}.json`);
  if (cacheFile.exists) return true;
  if (cleanId !== bookId) {
    const rawCacheFile = new File(booksDirectory, `${bookId}.json`);
    if (rawCacheFile.exists) return true;
  }
  return false;
}

// Remove downloaded chapter texts and JSON cache file to free storage
export async function deleteBanglaBookDownload(bookId: string, slug?: string): Promise<void> {
  const cleanId = (() => {
    try {
      return decodeURIComponent(bookId);
    } catch {
      return bookId;
    }
  })();

  const cacheFile = new File(booksDirectory, `${cleanId}.json`);
  if (cacheFile.exists) {
    cacheFile.delete();
  }
  if (cleanId !== bookId) {
    const rawCacheFile = new File(booksDirectory, `${bookId}.json`);
    if (rawCacheFile.exists) {
      rawCacheFile.delete();
    }
  }

  if (slug) {
    const cleanSlug = (() => {
      try {
        return decodeURIComponent(slug);
      } catch {
        return slug;
      }
    })();
    const bookRawDir = new Directory(banglaRawDirectory, cleanSlug);
    if (bookRawDir.exists) {
      bookRawDir.delete();
    }
  }

  // Update SQLite state
  const { getDb } = await import('@/db/client');
  const db = await getDb();
  await db.runAsync('UPDATE books SET is_available = 0 WHERE id = ? OR id = ?', [cleanId, bookId]);
  await db.runAsync('UPDATE bangla_chapters SET is_downloaded = 0 WHERE book_id = ? OR book_id = ?', [cleanId, bookId]);
}
