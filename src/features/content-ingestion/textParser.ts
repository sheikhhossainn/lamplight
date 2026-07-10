// Pure text-processing logic for turning a raw Project Gutenberg plain-text
// body into paginated chapters. No `fs`/`path`/`node:` imports — this file
// must run unchanged both on-device (Hermes, when a book is downloaded and
// opened for the first time) and under Node (via `tsx`, in
// scripts/sync-books.mjs, which only needs it to compute `total_chapters`).

export type BookPage = string[]; // ordered paragraphs

export type BookChapter = {
  index: number;
  title: string;
  pages: BookPage[];
};

// paginateBook (src/features/reader/engine/paginate.ts) only ever reads
// `.chapters` — title/author/synopsis/etc. already live on the DB `BookRow`
// (src/db/repositories/books.ts) fetched separately, so they aren't
// duplicated here.
export type IngestedBook = {
  chapters: BookChapter[];
};

const PAGE_CHAR_BUDGET = 1400;

// Candidate chapter-heading patterns, tried in order — different Gutenberg
// editions/translators format headings differently. The first pattern
// yielding at least MIN_CHAPTER_MATCHES wins.
const MIN_CHAPTER_MATCHES = 3;
const HEADING_PATTERNS = [
  /\n[ \t]*CHAPTER[ \t]+[IVXLCDM]+\.?[ \t]*\n/g,
  /\n[ \t]*CHAPTER[ \t]+\d+\.?[ \t]*\n/g,
  /\n[ \t]*Chapter[ \t]+[IVXLCDM]+\.?[ \t]*\n/g,
  /\n[ \t]*Chapter[ \t]+\d+\.?[ \t]*\n/g,
  /\n[ \t]*BOOK[ \t]+[IVXLCDM]+\.?[ \t]*\n/g,
];

export function stripBracketedBlocks(text: string, openToken: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf(openToken, i);
    if (start === -1) {
      result += text.slice(i);
      break;
    }
    result += text.slice(i, start);
    let depth = 1;
    let j = start + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '[') depth += 1;
      else if (text[j] === ']') depth -= 1;
      j += 1;
    }
    i = j;
  }
  return result;
}

export function cleanParagraphText(paragraph: string): string {
  return paragraph
    .replace(/\s+/g, ' ')
    .replace(/\/\*\s*/g, '')
    .replace(/\s*\*\//g, '')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

export function splitIntoParagraphs(chapterText: string): string[] {
  return chapterText
    .split(/\n\s*\n/)
    .map(cleanParagraphText)
    .filter((p) => p.length > 0);
}

export function chunkIntoPages(paragraphs: string[], charBudget: number): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let currentLength = 0;
  for (const paragraph of paragraphs) {
    if (current.length > 0 && currentLength + paragraph.length > charBudget) {
      pages.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(paragraph);
    currentLength += paragraph.length;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function extractBody(raw: string, title: string): string {
  const startMatch = raw.match(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  if (!startMatch || !endMatch || startMatch.index == null) {
    throw new Error(`Could not find Gutenberg START/END markers for "${title}"`);
  }
  return raw.slice(startMatch.index + startMatch[0].length, endMatch.index);
}

// Many Gutenberg editions list every chapter heading once in a "CONTENTS"
// table (tightly packed, near-zero gaps between entries) before the real
// chapters begin — which otherwise duplicates every boundary. TOC entries
// cluster far more tightly than any real chapter body ever does, so a run of
// several small gaps at the very start is a reliable tell regardless of how
// long real chapters happen to be.
export function stripLeadingToc(
  boundaries: { index: number; end: number }[],
): { index: number; end: number }[] {
  const TOC_GAP_THRESHOLD = 500;
  const MIN_TOC_RUN = 3;
  let i = 0;
  while (i < boundaries.length - 1 && boundaries[i + 1].index - boundaries[i].index < TOC_GAP_THRESHOLD) {
    i += 1;
  }
  return i >= MIN_TOC_RUN ? boundaries.slice(i + 1) : boundaries;
}

export function splitIntoChapters(body: string, chapter1Anchor?: string): string[] | null {
  for (const pattern of HEADING_PATTERNS) {
    pattern.lastIndex = 0;
    const rawBoundaries: { index: number; end: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      rawBoundaries.push({ index: match.index, end: match.index + match[0].length });
    }
    if (rawBoundaries.length < MIN_CHAPTER_MATCHES) continue;

    const boundaries = stripLeadingToc(rawBoundaries);

    const chunks: string[] = [];
    // Whatever precedes the first detected heading is discarded by default —
    // it's front matter (title page, translator's introduction, TOC), not a
    // real unheaded chapter. Only kept when this book has a known, explicit
    // anchor for where its real (unheaded) Chapter 1 actually starts.
    if (chapter1Anchor) {
      const preamble = body.slice(0, boundaries[0].index);
      const anchorIndex = preamble.indexOf(chapter1Anchor);
      if (anchorIndex !== -1) chunks.push(preamble.slice(anchorIndex));
    }

    for (let i = 0; i < boundaries.length; i += 1) {
      const start = boundaries[i].end;
      const end = boundaries[i + 1]?.index ?? body.length;
      chunks.push(body.slice(start, end));
    }
    return chunks;
  }
  return null; // no heading pattern matched well enough
}

export function chunkByLength(body: string, targetChars = 6000): string[] {
  const paragraphs = body.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  for (const paragraph of paragraphs) {
    if (current.length > 0 && currentLength + paragraph.length > targetChars) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLength = 0;
    }
    current.push(paragraph);
    currentLength += paragraph.length;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

// Orchestrates the whole raw-Gutenberg-text -> paginated-chapters pipeline.
// Shared by scripts/sync-books.mjs (which only needs `chapters.length`) and
// the on-device downloader (which needs the full paginated result).
export function parseBookText(
  raw: string,
  opts: { title: string; chapter1Anchor?: string },
): { chapters: BookChapter[]; usedFallbackSplit: boolean } {
  const normalized = raw.replace(/\r\n/g, '\n');
  let body = extractBody(normalized, opts.title);

  // Drop a repeated printer's colophon that some editions place right before
  // the END marker (harmless no-op if the pattern isn't present).
  const colophon = body.match(/\n[ \t]*[A-Z][A-Z .,:'-]{0,60}PRESS[:.][\s\S]{0,150}$/);
  if (colophon && colophon.index != null && colophon.index > body.length - 2000) {
    body = body.slice(0, colophon.index);
  }

  let rawChapters = splitIntoChapters(body, opts.chapter1Anchor);
  let usedFallbackSplit = false;
  if (!rawChapters) {
    rawChapters = chunkByLength(body);
    usedFallbackSplit = true;
  }

  const chapters = rawChapters
    .map((rawChapter, index) => {
      const cleaned = stripBracketedBlocks(rawChapter, '[Illustration');
      const paragraphs = splitIntoParagraphs(cleaned);
      const pages = chunkIntoPages(paragraphs, PAGE_CHAR_BUDGET);
      return {
        index,
        title: usedFallbackSplit ? `Part ${index + 1}` : `Chapter ${index + 1}`,
        pages,
      };
    })
    .filter((chapter) => chapter.pages.length > 0);

  return { chapters, usedFallbackSplit };
}
