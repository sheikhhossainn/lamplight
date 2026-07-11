// Pure text-processing logic for turning a raw EPUB package (zip bytes) into
// the same paginated-chapters shape textParser.ts produces for Gutenberg
// plain-text books, so the reader engine never needs to know which source a
// book came from. No Gutenberg-specific markers here — EPUB has its own
// structure (container.xml -> OPF manifest/spine -> XHTML chapter files).
import JSZip from 'jszip';

import { chunkIntoPages, cleanParagraphText, PAGE_CHAR_BUDGET, splitIntoParagraphs } from './textParser';
import type { BookChapter } from './textParser';

export type ParsedEpub = {
  title: string;
  author: string;
  language: string;
  chapters: BookChapter[];
};

function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match ? match[1].trim() : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// Resolves an OPF-relative href (which may contain "../") against the
// directory the OPF file lives in, the way a browser resolves a relative URL.
function resolvePath(baseDir: string, href: string): string {
  const decoded = decodeURIComponent(href.split('#')[0]);
  const parts = (baseDir ? `${baseDir}/${decoded}` : decoded).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

function htmlToParagraphs(html: string): string[] {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  // Turn block-level boundaries into blank lines before stripping tags, so
  // splitIntoParagraphs (which splits on blank lines) sees the same shape it
  // would from a Gutenberg plain-text file.
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<(p|div|h[1-6]|li|blockquote)[^>]*>/gi, '\n\n');
  const plainText = decodeEntities(withBreaks.replace(/<[^>]+>/g, ''));
  return splitIntoParagraphs(plainText);
}

function chapterTitleFromHtml(html: string, fallback: string): string {
  const heading = firstMatch(html, /<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i) ?? firstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  if (!heading) return fallback;
  const cleaned = cleanParagraphText(decodeEntities(heading.replace(/<[^>]+>/g, '')));
  return cleaned.length > 0 ? cleaned : fallback;
}

export async function parseEpub(base64: string): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  const opfPath = containerXml ? firstMatch(containerXml, /full-path="([^"]+)"/) : null;
  if (!opfPath) throw new Error('Not a valid EPUB — missing container.xml manifest reference.');

  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Not a valid EPUB — missing package document.');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const manifest = new Map<string, string>();
  for (const itemTag of opfXml.match(/<item\b[^>]*\/?>/g) ?? []) {
    const id = firstMatch(itemTag, /\bid="([^"]+)"/);
    const href = firstMatch(itemTag, /\bhref="([^"]+)"/);
    if (id && href) manifest.set(id, href);
  }

  const spineMatch = opfXml.match(/<spine\b[^>]*>([\s\S]*?)<\/spine>/i);
  const spineIds = (spineMatch?.[1].match(/<itemref\b[^>]*\/?>/g) ?? [])
    .map((tag) => firstMatch(tag, /\bidref="([^"]+)"/))
    .filter((id): id is string => id !== null);

  const title = firstMatch(opfXml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i) ?? 'Untitled';
  const author = firstMatch(opfXml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i) ?? 'Unknown';
  const language = firstMatch(opfXml, /<dc:language[^>]*>([\s\S]*?)<\/dc:language>/i) ?? 'en';

  const chapters: BookChapter[] = [];
  for (const idref of spineIds) {
    const href = manifest.get(idref);
    if (!href) continue;
    const path = resolvePath(opfDir, href);
    const html = await zip.file(path)?.async('text');
    if (!html) continue;

    const paragraphs = htmlToParagraphs(html);
    const pages = chunkIntoPages(paragraphs, PAGE_CHAR_BUDGET);
    if (pages.length === 0) continue;

    chapters.push({
      index: chapters.length,
      title: chapterTitleFromHtml(html, `Chapter ${chapters.length + 1}`),
      pages,
    });
  }

  if (chapters.length === 0) throw new Error('Could not find any readable chapters in this EPUB.');

  return {
    title: cleanParagraphText(decodeEntities(title)),
    author: cleanParagraphText(decodeEntities(author)),
    language: language.split('-')[0].toLowerCase(),
    chapters,
  };
}
