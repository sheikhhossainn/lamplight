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

// Pagination is paragraph-atomic — except when a single paragraph is taller
// than a whole page, where "atomic" would force the overflow off the bottom
// edge (some P&P paragraphs run 20+ lines on a phone). Only that case splits,
// at a word boundary, sized a line short of a full page so the estimate error
// lands as slack instead of clipping.
function splitOverlongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const pieces: string[] = [];
  let rest = paragraph;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars);
    if (cut <= 0) cut = maxChars;
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest.length > 0) pieces.push(rest);
  return pieces;
}

// Height-aware pagination computed on-device from the actual screen size and
// the reader's current font settings — so a page fills the screen without
// spilling text past the bottom edge, and reflows when the font changes.
export function paginateBook(book: IngestedBook, m: PaginationMetrics): ReaderPage[] {
  const charsPerLine =
    m.measuredCharsPerLine && m.measuredCharsPerLine > 0
      ? m.measuredCharsPerLine
      : Math.max(8, Math.floor(m.contentWidthPx / (m.fontSizePx * 0.54)));
  const gapLines = m.paragraphGapPx / m.lineHeightPx;
  // Floored, never rounded up: a partial line still occupies a full
  // line-height on screen, so fractional slack here packs one line more than
  // physically fits and clips the page bottom.
  const pageLines = Math.max(3, Math.floor((m.contentHeightPx - m.chapterTitleExtraPx) / m.lineHeightPx));
  const maxParagraphChars = charsPerLine * Math.max(2, pageLines - 1);

  const pages: ReaderPage[] = [];
  let globalIndex = 0;

  for (const chapter of book.chapters) {
    const paragraphs = chapter.pages
      .flat()
      .flatMap((paragraph) => splitOverlongParagraph(paragraph, maxParagraphChars));
    if (paragraphs.length === 0) continue;

    let start = 0;
    let pageIndexInChapter = 0;
    while (start < paragraphs.length) {
      const isChapterStart = pageIndexInChapter === 0;
      // Reserve the chapter-title zone on EVERY page (not just chapter starts):
      // on a chapter start the "Chapter N" heading fills it; on a continuation
      // page it's an empty top band. Either way the body's first line starts at
      // the same Y, so paging never makes the text jump up/down.
      let usedLines = 0;
      let i = start;
      while (i < paragraphs.length) {
        const paraLines = Math.max(1, Math.ceil(paragraphs[i].length / charsPerLine));
        const need = paraLines + (i > start ? gapLines : 0);
        if (i > start && usedLines + need > pageLines) break;
        usedLines += need;
        i += 1;
      }
      if (i === start) i = start + 1; // one piece per page at minimum (post-split, always fits)

      const pageParagraphs = paragraphs.slice(start, i);

      // Fill a ragged bottom: when the page broke because the NEXT paragraph
      // didn't fit and several empty lines remain, take the leading sentences
      // of that paragraph (word-boundary cut sized to the leftover lines) onto
      // this page and leave the remainder to start the next one — a paragraph
      // flowing across a page turn, exactly like print.
      if (i < paragraphs.length) {
        const leftover = Math.floor(pageLines - usedLines - gapLines);
        if (leftover >= 3 && paragraphs[i].length > leftover * charsPerLine) {
          const fillChars = leftover * charsPerLine;
          const cut = paragraphs[i].lastIndexOf(' ', fillChars);
          if (cut >= charsPerLine) {
            pageParagraphs.push(paragraphs[i].slice(0, cut));
            paragraphs[i] = paragraphs[i].slice(cut).trimStart();
          }
        }
      }

      pages.push({
        globalIndex,
        chapterIndex: chapter.index,
        pageIndexInChapter,
        chapterTitle: chapter.title,
        isChapterStart,
        paragraphs: pageParagraphs,
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
