// Universal Korean Literature Downloader and Parser.
// Fetches Korean classics from Wikisource / Gongu archives, cleans markup,
// and segments text into paginated reading chapters.
import {
  chunkIntoPages,
  PAGE_CHAR_BUDGET,
  type BookChapter,
  type IngestedBook,
} from '@/features/content-ingestion/textParser';

export async function downloadKoreanBook(textUrl: string, title: string): Promise<IngestedBook> {
  let rawText = '';

  if (textUrl.startsWith('wikisource://')) {
    const articleTitle = decodeURIComponent(textUrl.replace(/^wikisource:\/\//, ''));
    const apiUrl = `https://ko.wikisource.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(articleTitle)}&format=json`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Lamplight/1.0 (contact: skhossain799@gmail.com; mobile reading app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download Korean text for "${title}" (${response.status})`);
    }

    const data = await response.json();
    const page = Object.values(data?.query?.pages || {})[0] as { extract?: string } | undefined;
    rawText = page?.extract || '';
  } else if (textUrl.startsWith('http://') || textUrl.startsWith('https://')) {
    const response = await fetch(textUrl, {
      headers: {
        'User-Agent': 'Lamplight/1.0 (contact: skhossain799@gmail.com)',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download text for "${title}" (${response.status})`);
    }
    rawText = await response.text();
  }

  if (!rawText.trim()) {
    throw new Error(`No readable content found for "${title}"`);
  }

  return parseKoreanText(rawText, title);
}

export function parseKoreanText(raw: string, fallbackTitle: string): IngestedBook {
  // 1. Clean Wikipedia / Wikisource template headers and bibliographic footers
  let cleaned = raw
    .replace(/^==\s*개요\s*==[\s\S]*?\n(?=[^\n=])/m, '')
    .replace(/\n==\s*각주\s*==[\s\S]*$/m, '')
    .replace(/\n==\s*참고 문헌\s*==[\s\S]*$/m, '')
    .replace(/\n==\s*외부 링크\s*==[\s\S]*$/m, '')
    .trim();

  // 2. Look for chapter boundaries: "제1장", "제1부", "1.", "1장", etc.
  const lines = cleaned.split(/\r?\n/);
  const rawChapters: Array<{ title: string; lines: string[] }> = [];
  let currentChapter = { title: fallbackTitle, lines: [] as string[] };

  const HEADING_REGEX = /^(제\s*\d+\s*[장부편회]|\[\s*\d+\s*\]|【\s*[^】]+\s*】|^\d+\s*[\.장])/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (HEADING_REGEX.test(trimmed)) {
      if (currentChapter.lines.length > 0) {
        rawChapters.push(currentChapter);
      }
      currentChapter = { title: trimmed, lines: [] };
      continue;
    }

    currentChapter.lines.push(trimmed);
  }

  if (currentChapter.lines.length > 0) {
    rawChapters.push(currentChapter);
  }

  // If text is a single long work without section titles, split into reasonable parts
  const finalChapters: BookChapter[] = [];

  if (rawChapters.length <= 1 && (rawChapters[0]?.lines.length ?? 0) > 150) {
    const allLines = rawChapters[0]?.lines ?? [];
    const PART_SIZE = 120;
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
      pages: [['본문을 찾을 수 없습니다.']],
    });
  }

  return { chapters: finalChapters };
}
