import type { IngestedBook } from '@/features/content-ingestion/textParser';

export type ReaderPage = {
  globalIndex: number;
  chapterIndex: number;
  pageIndexInChapter: number;
  chapterTitle: string;
  isChapterStart: boolean;
  paragraphs: string[];
};

export type PaginationMetrics = {
  contentWidthPx: number; // usable text column width
  contentHeightPx: number; // usable text column height on a normal (non-chapter-start) page
  fontSizePx: number;
  lineHeightPx: number;
  paragraphGapPx: number; // marginBottom between paragraphs
  chapterTitleExtraPx: number; // vertical space the "Chapter N" heading eats on its page
  // Real average characters-per-line, measured on-device (see the reader's
  // hidden measurement Text). When present it replaces the crude font-size
  // estimate, so pages pack tightly instead of leaving a blank bottom strip.
  measuredCharsPerLine?: number;
};

// Height-aware pagination computed on-device from the actual screen size and
// the reader's current font settings — so a page fills the screen without
// spilling text past the bottom edge, and reflows when the font changes.
export function paginateBook(book: IngestedBook, m: PaginationMetrics): ReaderPage[] {
  const charsPerLine =
    m.measuredCharsPerLine && m.measuredCharsPerLine > 0
      ? m.measuredCharsPerLine
      : Math.max(8, Math.floor(m.contentWidthPx / (m.fontSizePx * 0.54)));
  const gapLines = m.paragraphGapPx / m.lineHeightPx;

  const pages: ReaderPage[] = [];
  let globalIndex = 0;

  for (const chapter of book.chapters) {
    const paragraphs = chapter.pages.flat();
    if (paragraphs.length === 0) continue;

    let start = 0;
    let pageIndexInChapter = 0;
    while (start < paragraphs.length) {
      const isChapterStart = pageIndexInChapter === 0;
      const availablePx = m.contentHeightPx - (isChapterStart ? m.chapterTitleExtraPx : 0);
      // One extra fractional line of slack: the last line of each paragraph is
      // usually partial, so allowing a hair over the exact count fills the page
      // right to the bottom without the last line being clipped.
      const maxLines = Math.max(3, availablePx / m.lineHeightPx + 0.5);

      let usedLines = 0;
      let i = start;
      while (i < paragraphs.length) {
        const paraLines = Math.max(1, Math.ceil(paragraphs[i].length / charsPerLine));
        const need = paraLines + (i > start ? gapLines : 0);
        if (i > start && usedLines + need > maxLines) break;
        usedLines += need;
        i += 1;
      }
      if (i === start) i = start + 1; // a single over-long paragraph still gets its own page

      pages.push({
        globalIndex,
        chapterIndex: chapter.index,
        pageIndexInChapter,
        chapterTitle: chapter.title,
        isChapterStart,
        paragraphs: paragraphs.slice(start, i),
      });
      globalIndex += 1;
      pageIndexInChapter += 1;
      start = i;
    }
  }

  return pages;
}

// A representative English prose sample the reader renders once (hidden) to
// measure how many characters actually fit per line at the current font and
// column width — text-independent enough that one measurement calibrates the
// whole book, and re-measured whenever the font size changes.
export const PAGINATION_MEASURE_SAMPLE =
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.';

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
