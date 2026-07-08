import type { IngestedBook } from '@/features/content-ingestion/catalog';

export type ReaderPage = {
  globalIndex: number;
  chapterIndex: number;
  pageIndexInChapter: number;
  chapterTitle: string;
  isChapterStart: boolean;
  paragraphs: string[];
};

// Pages are pre-chunked at ingestion time by a character budget (see
// scripts/ingest-books.mjs), not measured against actual rendered glyph
// layout — a pragmatic simplification. Real per-device text measurement is
// the harder, more accurate approach; this gets a working reader without it.
export function flattenBookToPages(book: IngestedBook): ReaderPage[] {
  const pages: ReaderPage[] = [];
  let globalIndex = 0;
  for (const chapter of book.chapters) {
    chapter.pages.forEach((paragraphs, pageIndexInChapter) => {
      pages.push({
        globalIndex,
        chapterIndex: chapter.index,
        pageIndexInChapter,
        chapterTitle: chapter.title,
        isChapterStart: pageIndexInChapter === 0,
        paragraphs,
      });
      globalIndex += 1;
    });
  }
  return pages;
}

export function findGlobalIndex(
  pages: ReaderPage[],
  chapterIndex: number,
  pageIndexInChapter: number,
): number {
  const found = pages.findIndex(
    (page) => page.chapterIndex === chapterIndex && page.pageIndexInChapter === pageIndexInChapter,
  );
  return found === -1 ? 0 : found;
}
