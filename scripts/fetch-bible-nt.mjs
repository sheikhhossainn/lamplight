// One-off fetch of the New Testament (World English Bible — public domain) from
// bible-api.com (free, no-key REST API) into static JSON assets bundled with
// the app. Sibling of fetch-bible-ot.mjs — same approach, same JFB commentary
// source, separate output directory since the New Testament is its own
// library spine/route ('/bible-nt'), not merged into the Old Testament screens.
//
// RUN LOCALLY (`npm run fetch:bible-nt`). bible-api.com rate-limits to 15
// requests/30s, and the New Testament is ~260 chapters — this takes ~10
// minutes. Re-run only if switching translations; the output is committed.
//
// Resumable: writes books.json/verses.json after every book (not just at the
// end) and skips any book already fully present on disk from a prior partial
// run — a mid-run network drop (bible-api.com occasionally resets the
// connection) costs one book's retry budget, not the whole run.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://bible-api.com/data/web';
const COMMENTARY_BASE = 'https://bible.helloao.org/api/c/jamieson-fausset-brown';
const OUT_DIR = path.join(process.cwd(), 'assets', 'bible-nt');

// New Testament, in canonical order — hardcoded (not sliced from the API's
// full 66-book list) so a future API change can't silently pull in Old
// Testament books.
const NT_BOOK_IDS = [
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// Retries both HTTP-level failures (429/503) and network-level failures
// (ECONNRESET etc. — bible-api.com drops the connection occasionally) with
// backoff, instead of letting a transient error crash the whole run.
async function fetchJson(url, attempt = 1) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    if (attempt > 8) throw err;
    const backoffMs = attempt * 3000;
    console.log(`network error (${err.message}), retrying in ${backoffMs}ms (attempt ${attempt}) — ${url}`);
    await sleep(backoffMs);
    return fetchJson(url, attempt + 1);
  }
  if ((res.status === 429 || res.status === 503) && attempt <= 6) {
    const backoffMs = attempt * 3000;
    console.log(`${res.status}, retrying in ${backoffMs}ms (attempt ${attempt}) — ${url}`);
    await sleep(backoffMs);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Fetch failed for ${url} (${res.status})`);
  return res.json();
}

// JFB groups commentary under the first verse number of a range (e.g. an
// entry numbered 3 covers verses 3-5 until the next entry). Returns a
// verseNumber -> text lookup covering every verse in the chapter, extended
// through `lastVerse` (the chapter's actual verse count from the WEB text,
// not just the highest JFB entry number — otherwise the tail of the last
// range in the chapter silently loses its commentary). Missing chapters
// (404, or a genuinely absent JFB entry — confirmed on PSA/146, where the
// host's static-site server returns its docs-site shell as HTML with a 200
// instead of a real 404) resolve to an empty map rather than failing the
// whole fetch.
async function fetchChapterCommentary(bookId, chapter, lastVerse, attempt = 1) {
  let res;
  try {
    res = await fetch(`${COMMENTARY_BASE}/${bookId}/${chapter}.json`);
  } catch (err) {
    if (attempt > 8) throw err;
    await sleep(attempt * 2000);
    return fetchChapterCommentary(bookId, chapter, lastVerse, attempt + 1);
  }
  if (res.status === 404) return new Map();
  if (res.status === 429 || res.status === 503) {
    await sleep(2000);
    return fetchChapterCommentary(bookId, chapter, lastVerse, attempt + 1);
  }
  if (!res.ok) throw new Error(`Commentary fetch failed for ${bookId} ${chapter} (${res.status})`);

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return new Map();
  const body = await res.json();

  const entries = (body.chapter?.content ?? [])
    .filter((item) => item.type === 'verse')
    .map((item) => ({ number: item.number, text: item.content.join('\n\n').trim() }))
    .sort((a, b) => a.number - b.number);

  const byVerse = new Map();
  let current = null;
  for (let v = 1; v <= lastVerse; v++) {
    const entry = entries.find((e) => e.number === v);
    if (entry) current = entry.text;
    if (current) byVerse.set(v, current);
  }
  return byVerse;
}

await mkdir(OUT_DIR, { recursive: true });

const booksPath = path.join(OUT_DIR, 'books.json');
const versesPath = path.join(OUT_DIR, 'verses.json');
const existingBooks = (await readJsonIfExists(booksPath)) ?? [];
const existingVerses = (await readJsonIfExists(versesPath)) ?? {};

const books = existingBooks.filter((b) => NT_BOOK_IDS.includes(b.id));
const versesByBook = { ...existingVerses };

async function persist() {
  await writeFile(booksPath, JSON.stringify(books, null, 2));
  await writeFile(versesPath, JSON.stringify(versesByBook));
}

for (const bookId of NT_BOOK_IDS) {
  const bookInfo = await fetchJson(`${BASE}/${bookId}`);
  await sleep(2100); // stay under 15 req/30s
  const bookName = bookInfo.chapters[0]?.book ?? bookId;
  const chapterCount = bookInfo.chapters.length;

  // "Done" means already fetched at full chapter count AND already carries
  // commentary — a partial run that got interrupted between books would
  // otherwise look "complete" by chapter count alone.
  const existingChapters = versesByBook[bookId] ?? {};
  const hasCommentary = Object.values(existingChapters).some((verses) =>
    verses.some((v) => v.commentary),
  );
  const alreadyDone =
    Object.keys(existingChapters).length === chapterCount &&
    hasCommentary &&
    books.some((b) => b.id === bookId && b.chapterCount === chapterCount);
  if (alreadyDone) {
    console.log(`${bookId} (${bookName}): already fetched, skipping`);
    continue;
  }

  const chapters = {};
  for (const { chapter } of bookInfo.chapters) {
    const chapterData = await fetchJson(`${BASE}/${bookId}/${chapter}`);
    await sleep(2100);
    const commentaryByVerse = await fetchChapterCommentary(bookId, chapter, chapterData.verses.length);
    chapters[chapter] = chapterData.verses.map((v) => ({
      number: v.verse,
      text: v.text.trim(),
      ...(commentaryByVerse.get(v.verse) ? { commentary: commentaryByVerse.get(v.verse) } : {}),
    }));
  }
  versesByBook[bookId] = chapters;
  const existingIndex = books.findIndex((b) => b.id === bookId);
  const entry = { id: bookId, name: bookName, chapterCount };
  if (existingIndex >= 0) books[existingIndex] = entry;
  else books.push(entry);

  await persist();
  console.log(`${bookId} (${bookName}): ${chapterCount} chapters`);
}

// Restore canonical book order (checkpointing above can append out of order
// when resuming past a skipped book).
books.sort((a, b) => NT_BOOK_IDS.indexOf(a.id) - NT_BOOK_IDS.indexOf(b.id));
await persist();
console.log(`Wrote ${books.length} books to assets/bible-nt/books.json`);
console.log('Wrote assets/bible-nt/verses.json');
console.log('Done.');
