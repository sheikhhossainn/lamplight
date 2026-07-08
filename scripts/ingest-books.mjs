// One-time, dev-time content ingestion: looks up each catalog title via the
// public Gutendex API (https://gutendex.com — the de facto public API for
// Project Gutenberg's catalog), downloads the plain-text edition, and emits
// cleaned per-book JSON bundled as an app asset. Not run on-device.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'assets', 'books');
const PAGE_CHAR_BUDGET = 1400;
const GUTENDEX_BASE = 'https://gutendex.com/books/';

const CATALOG = [
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    displayAuthor: 'Jane Austen',
    authorMatch: 'austen',
    // This Gutenberg edition prints a critic's introduction (quoting Walt
    // Whitman) before the novel, and the real Chapter 1 itself has no
    // heading — genuinely ambiguous without an anchor. Every other book in
    // this catalog has a properly headed Chapter 1, so the safe default
    // (discard anything before the first heading) is correct for them; this
    // is the one deliberate, known exception.
    chapter1Anchor: 'It is a truth universally acknowledged',
  },
  {
    id: 'don-quixote',
    title: 'Don Quixote',
    displayAuthor: 'Miguel de Cervantes',
    authorMatch: 'cervantes',
  },
  { id: 'the-odyssey', title: 'The Odyssey', displayAuthor: 'Homer', authorMatch: 'homer' },
  {
    id: 'anna-karenina',
    title: 'Anna Karenina',
    displayAuthor: 'Leo Tolstoy',
    authorMatch: 'tolstoy',
  },
  {
    id: 'crime-and-punishment',
    title: 'Crime and Punishment',
    displayAuthor: 'Fyodor Dostoevsky',
    authorMatch: 'dosto', // covers both "Dostoevsky" and Gutendex's "Dostoyevsky" spelling
  },
];

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

async function findBook(entry) {
  const url = `${GUTENDEX_BASE}?search=${encodeURIComponent(entry.title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gutendex search failed for "${entry.title}" (${res.status})`);
  const data = await res.json();
  const match = data.results.find((book) =>
    book.authors.some((a) => a.name.toLowerCase().includes(entry.authorMatch)),
  );
  if (!match) throw new Error(`No Gutendex match for "${entry.title}" by ${entry.authorMatch}`);
  const textUrl = Object.entries(match.formats).find(([type]) => type.startsWith('text/plain'))?.[1];
  if (!textUrl) throw new Error(`No plain-text format for "${entry.title}" (gutendex id ${match.id})`);
  return { gutenbergId: match.id, title: match.title, author: match.authors[0]?.name ?? 'Unknown', textUrl };
}

function stripBracketedBlocks(text, openToken) {
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

function cleanParagraphText(paragraph) {
  return paragraph
    .replace(/\s+/g, ' ')
    .replace(/\/\*\s*/g, '')
    .replace(/\s*\*\//g, '')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function splitIntoParagraphs(chapterText) {
  return chapterText
    .split(/\n\s*\n/)
    .map(cleanParagraphText)
    .filter((p) => p.length > 0);
}

function chunkIntoPages(paragraphs, charBudget) {
  const pages = [];
  let current = [];
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

function extractBody(raw, title) {
  const startMatch = raw.match(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  if (!startMatch || !endMatch) {
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
function stripLeadingToc(boundaries) {
  const TOC_GAP_THRESHOLD = 500;
  const MIN_TOC_RUN = 3;
  let i = 0;
  while (i < boundaries.length - 1 && boundaries[i + 1].index - boundaries[i].index < TOC_GAP_THRESHOLD) {
    i += 1;
  }
  return i >= MIN_TOC_RUN ? boundaries.slice(i + 1) : boundaries;
}

function splitIntoChapters(body, chapter1Anchor) {
  for (const pattern of HEADING_PATTERNS) {
    pattern.lastIndex = 0;
    const rawBoundaries = [];
    let match;
    while ((match = pattern.exec(body)) !== null) {
      rawBoundaries.push({ index: match.index, end: match.index + match[0].length });
    }
    if (rawBoundaries.length < MIN_CHAPTER_MATCHES) continue;

    const boundaries = stripLeadingToc(rawBoundaries);

    const chunks = [];
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

function chunkByLength(body, targetChars = 6000) {
  const paragraphs = body.split(/\n\s*\n/);
  const chunks = [];
  let current = [];
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

async function ingestBook(entry) {
  const found = await findBook(entry);
  const res = await fetch(found.textUrl);
  if (!res.ok) throw new Error(`Failed to download text for "${entry.title}" (${res.status})`);
  const raw = (await res.text()).replace(/\r\n/g, '\n');

  let body = extractBody(raw, entry.title);

  // Drop a repeated printer's colophon that some editions place right before
  // the END marker (harmless no-op if the pattern isn't present).
  const colophon = body.match(/\n[ \t]*[A-Z][A-Z .,:'-]{0,60}PRESS[:.][\s\S]{0,150}$/);
  if (colophon && colophon.index > body.length - 2000) {
    body = body.slice(0, colophon.index);
  }

  let rawChapters = splitIntoChapters(body, entry.chapter1Anchor);
  let usedFallback = false;
  if (!rawChapters) {
    rawChapters = chunkByLength(body);
    usedFallback = true;
  }

  const chapters = rawChapters.map((raw, index) => {
    const cleaned = stripBracketedBlocks(raw, '[Illustration');
    const paragraphs = splitIntoParagraphs(cleaned);
    const pages = chunkIntoPages(paragraphs, PAGE_CHAR_BUDGET);
    return {
      index,
      title: usedFallback ? `Part ${index + 1}` : `Chapter ${index + 1}`,
      pages,
    };
  }).filter((chapter) => chapter.pages.length > 0);

  const book = {
    id: entry.id,
    title: entry.title,
    author: entry.displayAuthor,
    sourceLanguage: 'en',
    synopsis: entry.synopsis,
    totalChapters: chapters.length,
    gutenbergId: found.gutenbergId,
    isBundled: true,
    chapters,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, `${entry.id}.json`), JSON.stringify(book), 'utf8');

  const totalPages = chapters.reduce((sum, c) => sum + c.pages.length, 0);
  console.log(
    `${entry.id}: gutenberg #${found.gutenbergId} "${found.title}" — ${chapters.length} ${usedFallback ? 'parts (fallback split)' : 'chapters'}, ${totalPages} pages`,
  );

  // Lightweight metadata only — no chapter text — so the app can eagerly parse
  // the whole catalog for the Library shelf without loading every book's full
  // text (megabytes each) into memory just to show a title and synopsis.
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    sourceLanguage: book.sourceLanguage,
    synopsis: book.synopsis,
    totalChapters: book.totalChapters,
    isBundled: book.isBundled,
    sourceFormat: 'gutenberg-json',
  };
}

const SYNOPSES = {
  'pride-and-prejudice':
    'A novel of manners set among the landed gentry — wit, courtship, and first impressions undone. This 1813 English text is in the public domain.',
  'don-quixote':
    'The ingenious hidalgo who tilts at windmills — a knight errant’s delusions of chivalry collide with the real world, in the book that gave us the modern novel.',
  'the-odyssey':
    'Odysseus’s ten-year voyage home from Troy — monsters, gods, and the long wait of a wife who never stopped believing.',
  'anna-karenina':
    'A married aristocrat’s affair unravels her standing in Russian high society, set against her brother-in-law’s parallel search for meaning.',
  'crime-and-punishment':
    'A destitute former student murders a pawnbroker, then spends the rest of the novel unraveling under the weight of his own guilt.',
};

const manifest = [];
for (const entry of CATALOG) {
  entry.synopsis = SYNOPSES[entry.id];
  manifest.push(await ingestBook(entry));
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`manifest.json: ${manifest.length} entries`);
