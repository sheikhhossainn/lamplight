import { Directory, File, Paths } from 'expo-file-system';

import {
  type BanglaBookDetail,
  fetchBanglaChapterText,
} from '@/features/content-ingestion/banglaApi';
import type { BookChapter, IngestedBook } from '@/features/content-ingestion/textParser';
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
  const { id: bookId, slug, title, author, synopsis, genre, chapters } = bookDetail;

  if (!booksDirectory.exists) booksDirectory.create({ intermediates: true });
  if (!banglaRawDirectory.exists) banglaRawDirectory.create({ intermediates: true });

  const bookRawDir = new Directory(banglaRawDirectory, slug);
  if (!bookRawDir.exists) bookRawDir.create({ intermediates: true });

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
          const text = await fetchBanglaChapterText(ch.slug);

          // Save raw chapter text file
          const chapterFile = new File(bookRawDir, `${ch.index}.txt`);
          chapterFile.write(text);

          // Convert into paragraphs for reader engine
          const paragraphs = text
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

          ingestedChapters[globalIdx] = {
            index: ch.index,
            title: ch.title,
            pages: [paragraphs.length > 0 ? paragraphs : ['']],
          };
        } catch (err) {
          console.warn(`[banglaDownloader] error fetching chapter ${ch.slug}:`, err);
          ingestedChapters[globalIdx] = {
            index: ch.index,
            title: ch.title,
            pages: [['অধ্যায়টি লোড করা সম্ভব হয়নি।']],
          };
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
  const ingestedBook: IngestedBook = {
    chapters: ingestedChapters.filter(Boolean),
  };

  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  cacheFile.write(JSON.stringify(ingestedBook));

  // 4. Mark as downloaded in SQLite
  await markBanglaBookDownloaded(bookId);

  return ingestedBook;
}

// Check if a Bangla book has been downloaded and is available for offline reading
export function isBanglaBookDownloaded(bookId: string): boolean {
  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  return cacheFile.exists;
}

// Remove downloaded chapter texts and JSON cache file to free storage
export async function deleteBanglaBookDownload(bookId: string, slug?: string): Promise<void> {
  const cacheFile = new File(booksDirectory, `${bookId}.json`);
  if (cacheFile.exists) {
    cacheFile.delete();
  }

  if (slug) {
    const bookRawDir = new Directory(banglaRawDirectory, slug);
    if (bookRawDir.exists) {
      bookRawDir.delete();
    }
  }

  // Update SQLite state
  const { getDb } = await import('@/db/client');
  const db = await getDb();
  await db.runAsync('UPDATE books SET is_available = 0 WHERE id = ?', [bookId]);
  await db.runAsync('UPDATE bangla_chapters SET is_downloaded = 0 WHERE book_id = ?', [bookId]);
}
