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

// Fluid continuous-flow pagination computed on-device from the actual screen
// size and the reader's current font settings. Text flows smoothly across page
// boundaries at word boundaries, ensuring pages fill the full vertical span
// between upper and lower bounds without ragged gaps or premature page turns.
export function paginateBook(book: IngestedBook, m: PaginationMetrics): ReaderPage[] {
  const charsPerLine =
    m.measuredCharsPerLine && m.measuredCharsPerLine > 0
      ? m.measuredCharsPerLine
      : Math.max(8, Math.floor(m.contentWidthPx / (m.fontSizePx * 0.54)));
  const gapLines = m.paragraphGapPx / m.lineHeightPx;
  // Upper and lower bounds vertical budget:
  // Chapter-start pages deduct chapter title footprint;
  // Continuation pages budget for the full vertical span between upper and lower bounds.
  const chapterStartLines = Math.max(3, Math.floor((m.contentHeightPx - m.chapterTitleExtraPx) / m.lineHeightPx));
  const continuationLines = Math.max(3, Math.floor(m.contentHeightPx / m.lineHeightPx));

  const pages: ReaderPage[] = [];
  let globalIndex = 0;

  for (const chapter of book.chapters) {
    const rawParagraphs = chapter.pages
      .flat()
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p.length > 0);

    if (rawParagraphs.length === 0) continue;

    // Working copy of paragraphs so fluid splits mutate in-flight cleanly
    const paragraphs = [...rawParagraphs];
    let i = 0;
    let pageIndexInChapter = 0;

    while (i < paragraphs.length) {
      const isChapterStart = pageIndexInChapter === 0;
      const maxLines = isChapterStart ? chapterStartLines : continuationLines;

      const pageParagraphs: string[] = [];
      let usedLines = 0;

      while (i < paragraphs.length) {
        const text = paragraphs[i].trim();
        if (text.length === 0) {
          i += 1;
          continue;
        }

        const gapCost = pageParagraphs.length > 0 ? gapLines : 0;
        const remainingLines = maxLines - usedLines - gapCost;

        if (remainingLines < 0.85) {
          // Page is full between upper and lower bounds
          break;
        }

        const rawLines = text.length / charsPerLine;
        const roundedLines = Math.max(1, Math.ceil(rawLines));

        // If paragraph fits comfortably (or within slight slack tolerance)
        if (rawLines <= remainingLines + 0.35) {
          pageParagraphs.push(text);
          usedLines += roundedLines + gapCost;
          i += 1;
        } else {
          // Paragraph exceeds available room: flow as many full lines as fit
          const linesToTake = Math.floor(remainingLines + 0.2);
          if (linesToTake >= 1) {
            const maxChars = linesToTake * charsPerLine;
            let cut = text.lastIndexOf(' ', maxChars);
            if (cut <= 0 || cut < Math.floor(charsPerLine * 0.5)) {
              // Try finding next space within small tolerance
              const nextSpace = text.indexOf(' ', maxChars);
              if (nextSpace !== -1 && nextSpace <= maxChars + Math.floor(charsPerLine * 0.35)) {
                cut = nextSpace;
              } else {
                cut = maxChars;
              }
            }

            const remainder = text.slice(cut).trim();
            // If remainder is just 1-2 words (< 15 chars), absorb onto current page to prevent orphan line
            if (remainder.length > 0 && remainder.length < 15 && rawLines <= remainingLines + 0.6) {
              pageParagraphs.push(text);
              usedLines += roundedLines + gapCost;
              i += 1;
            } else if (remainder.length > 0) {
              const chunk = text.slice(0, cut).trim();
              if (chunk.length > 0) {
                pageParagraphs.push(chunk);
                usedLines += Math.max(1, Math.ceil(chunk.length / charsPerLine)) + gapCost;
                paragraphs[i] = remainder;
              } else {
                i += 1;
              }
            } else {
              pageParagraphs.push(text);
              usedLines += roundedLines + gapCost;
              i += 1;
            }
          }
          break;
        }
      }

      const cleanParagraphs = pageParagraphs.map((p) => p.trim()).filter((p) => p.length > 0);
      if (cleanParagraphs.length === 0) {
        if (i < paragraphs.length) {
          cleanParagraphs.push(paragraphs[i]);
          i += 1;
        } else {
          break;
        }
      }

      pages.push({
        globalIndex,
        chapterIndex: chapter.index,
        pageIndexInChapter,
        chapterTitle: chapter.title,
        isChapterStart,
        paragraphs: cleanParagraphs,
      });

      globalIndex += 1;
      pageIndexInChapter += 1;
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

export const BANGLA_PAGINATION_SAMPLE =
  'সকল মানুষের জন্মগতভাবে স্বাধীন এবং মর্যাদা ও অধিকারে সমান। তারা বিবেক ও বুদ্ধি সম্পন্ন এবং তাদের একে অপরের প্রতি ভ্রাতৃত্বপূর্ণ মনোভাব নিয়ে আচরণ করা উচিত। প্রত্যেক মানুষেরই জীবন, স্বাধীনতা ও ব্যক্তিগত নিরাপত্তার অধিকার রয়েছে।';

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
