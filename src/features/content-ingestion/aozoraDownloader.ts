// Universal Aozora Bunko (青空文庫) downloader and parser.
// Downloads public domain Japanese literary works from Aozora Bunko's archive,
// unpacks the Shift-JIS encoded zip/text, strips ruby markup, and segments
// into paginated reading chapters.
import JSZip from 'jszip';

import { chunkIntoPages, PAGE_CHAR_BUDGET, type BookChapter, type IngestedBook } from '@/features/content-ingestion/textParser';

export async function downloadAozoraBook(textUrl: string, title: string): Promise<IngestedBook> {
  const response = await fetch(textUrl);
  if (!response.ok) {
    throw new Error(`Failed to download "${title}" (${response.status})`);
  }

  let rawText = '';

  if (textUrl.endsWith('.zip')) {
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const txtFile = Object.values(zip.files).find((f) => f.name.endsWith('.txt'));
    if (!txtFile) {
      throw new Error(`Archive for "${title}" does not contain a text file.`);
    }
    const bytes = await txtFile.async('uint8array');
    const decoder = new TextDecoder('shift-jis');
    rawText = decoder.decode(bytes);
  } else {
    const arrayBuffer = await response.arrayBuffer();
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      rawText = decoder.decode(arrayBuffer);
    } catch {
      const decoder = new TextDecoder('shift-jis');
      rawText = decoder.decode(arrayBuffer);
    }
  }

  return parseAozoraText(rawText, title);
}

export function parseAozoraText(raw: string, fallbackTitle: string): IngestedBook {
  // 1. Strip Aozora header notes (preamble explaining notation between hyphens)
  const headerSep = '-------------------------------------------------------';
  const firstSep = raw.indexOf(headerSep);
  let body = raw;
  if (firstSep !== -1) {
    const secondSep = raw.indexOf(headerSep, firstSep + headerSep.length);
    if (secondSep !== -1) {
      body = raw.slice(secondSep + headerSep.length);
    }
  }

  // 2. Strip bottom bibliographic / publishing notes
  const footerIdx = body.search(/\n\s*(底本：|-------------------------------------------------------)/);
  if (footerIdx !== -1) {
    body = body.slice(0, footerIdx);
  }

  // 3. Scan lines and identify chapters
  const lines = body.split(/\r?\n/);
  const rawChapters: Array<{ title: string; lines: string[] }> = [];
  let currentChapter = { title: fallbackTitle || '本文', lines: [] as string[] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Aozora heading markup: e.g. ［＃「上　先生と私」は大見出し］ or ［＃「一」は中見出し］
    const headingMatch = line.match(/［＃「([^」]+)」は[大中小]見出し］/);
    if (headingMatch) {
      if (currentChapter.lines.length > 0) {
        rawChapters.push(currentChapter);
      }
      currentChapter = { title: headingMatch[1], lines: [] };
      continue;
    }

    // Strip inline ruby annotations 《...》, ruby anchors ｜, and formatting tags ［＃...］
    const cleaned = line
      .replace(/《[^》]+》/g, '')
      .replace(/｜/g, '')
      .replace(/［＃[^］]+］/g, '')
      .trim();

    if (cleaned) {
      currentChapter.lines.push(cleaned);
    }
  }

  if (currentChapter.lines.length > 0) {
    rawChapters.push(currentChapter);
  }

  // If no explicit headings found, or single giant chapter, break into reasonable length parts
  const finalChapters: BookChapter[] = [];

  if (rawChapters.length <= 1 && (rawChapters[0]?.lines.length ?? 0) > 400) {
    // Break into parts of ~150 lines
    const allLines = rawChapters[0]?.lines ?? [];
    const PART_SIZE = 150;
    for (let i = 0; i < allLines.length; i += PART_SIZE) {
      const partIndex = Math.floor(i / PART_SIZE);
      const slice = allLines.slice(i, i + PART_SIZE);
      const pages = chunkIntoPages(slice, PAGE_CHAR_BUDGET);
      finalChapters.push({
        index: partIndex,
        title: `${fallbackTitle} (${partIndex + 1})`,
        pages,
      });
    }
  } else {
    rawChapters.forEach((ch, index) => {
      const pages = chunkIntoPages(ch.lines, PAGE_CHAR_BUDGET);
      if (pages.length > 0) {
        finalChapters.push({
          index,
          title: ch.title,
          pages,
        });
      }
    });
  }

  if (finalChapters.length === 0) {
    finalChapters.push({
      index: 0,
      title: fallbackTitle,
      pages: [['本文が見つかりませんでした。']],
    });
  }

  return { chapters: finalChapters };
}
