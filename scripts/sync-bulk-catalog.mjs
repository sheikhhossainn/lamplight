// Drip-feeds Gutenberg's most-popular books into Supabase, a batch of pages
// per run. RUN LOCALLY (`npm run sync:bulk-catalog`), repeatedly, until it
// reaches TARGET_BOOK_COUNT or Gutendex runs out of pages, then it's a
// harmless no-op. There is deliberately NO GitHub Actions cron for this:
// Gutendex blocks datacenter/CI IPs (403), so scheduled runs never worked —
// it must run from a real machine. Separate from scripts/sync-books.mjs (the 5
// curated "hero" books) on purpose: this script never downloads a book's
// actual text, only Gutendex's own bibliographic metadata — total_chapters is
// stored as 0 (unknown) and only becomes accurate once the app itself
// downloads and parses that book locally, the first time someone opens it.
import { createClient } from '@supabase/supabase-js';

const GUTENDEX_BASE = 'https://gutendex.com/books/';
const CURSOR_KEY = 'bulk_catalog_cursor';

// Tune these to change how fast the catalog fills in / how large it grows.
// ~32 books/page, so 25 pages/run x ~7 daily runs ≈ 5,600 books — comfortably
// past the 2,000-5,000 target, then the run becomes a no-op once TARGET_BOOK_COUNT
// is reached or Gutendex's own pages run out, whichever comes first.
const PAGES_PER_RUN = 25;
const TARGET_BOOK_COUNT = 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchCursor() {
  const { data, error } = await supabase
    .from('sync_state')
    .select('value')
    .eq('key', CURSOR_KEY)
    .maybeSingle();
  if (error) throw new Error(`Failed to read sync cursor: ${error.message}`);
  return data?.value ?? { nextPage: 1, importedCount: 0, done: false };
}

async function saveCursor(cursor) {
  const { error } = await supabase
    .from('sync_state')
    .upsert({ key: CURSOR_KEY, value: cursor }, { onConflict: 'key' });
  if (error) throw new Error(`Failed to save sync cursor: ${error.message}`);
}

// The 5 curated "hero" books (scripts/sync-books.mjs) may well be popular
// enough to also appear in this pagination — skip re-importing them as a
// second, differently-slugged row for the same Gutenberg text.
async function fetchExistingHeroGutenbergIds() {
  const { data, error } = await supabase
    .from('books')
    .select('gutenberg_id')
    .not('id', 'like', 'gutenberg-%');
  if (error) throw new Error(`Failed to read existing books: ${error.message}`);
  return new Set((data ?? []).map((row) => row.gutenberg_id));
}

function toBulkRow(entry) {
  // Some Gutenberg titles (e.g. the CIA World Factbooks — HTML-only reference
  // works) expose a text/plain format whose URL is just a README, not the
  // book. Downloading that "succeeds" but has no book text, so the reader
  // fails to parse it. Prefer a real plain-text file and skip the entry
  // entirely if the only text/plain on offer is a README.
  const textFormat = Object.entries(entry.formats ?? {})
    .filter(([type]) => type.startsWith('text/plain'))
    .find(([, url]) => !/readme/i.test(url));
  if (!textFormat) return null; // no real plain-text edition available — skip

  const subjects = (entry.subjects ?? []).slice(0, 3);
  const categories = Array.from(new Set([...(entry.subjects ?? []), ...(entry.bookshelves ?? [])])).slice(0, 8);

  return {
    id: `gutenberg-${entry.id}`,
    title: entry.title,
    author: entry.authors?.[0]?.name ?? 'Unknown',
    source_language: entry.languages?.[0] ?? 'en',
    synopsis: subjects.length > 0 ? subjects.join(' · ') : 'A Project Gutenberg text.',
    total_chapters: 0, // unknown until downloaded + parsed on-device on first read
    gutenberg_id: entry.id,
    source_format: 'gutenberg-text',
    text_url: textFormat[1],
    cover_url: entry.formats?.['image/jpeg'] ?? null,
    categories,
  };
}

async function run() {
  const cursor = await fetchCursor();
  if (cursor.done) {
    console.log(`Already done (${cursor.importedCount} books imported). Nothing to do.`);
    return;
  }

  const heroGutenbergIds = await fetchExistingHeroGutenbergIds();
  let page = cursor.nextPage;
  let importedCount = cursor.importedCount;
  let pagesThisRun = 0;
  let url = `${GUTENDEX_BASE}?sort=popular&languages=en&page=${page}`;

  while (url && pagesThisRun < PAGES_PER_RUN && importedCount < TARGET_BOOK_COUNT) {
    // Gutendex sits behind bot protection that 403s requests with no (or a bare
    // `node`) User-Agent — especially from datacenter IPs like CI runners. Send
    // a real UA + Accept so the request looks like an ordinary client.
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LamplightCatalogSync/1.0; +https://github.com/sheikhhossainn/lamplight)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Gutendex page ${page} failed (${res.status})`);
    const data = await res.json();

    const rows = data.results
      .filter((entry) => !heroGutenbergIds.has(entry.id))
      .map(toBulkRow)
      .filter((row) => row !== null);

    if (rows.length > 0) {
      const { error } = await supabase.from('books').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`Upsert failed on page ${page}: ${error.message}`);
      importedCount += rows.length;
    }

    console.log(`Page ${page}: ${rows.length} book(s) upserted (${importedCount} total so far)`);

    pagesThisRun += 1;
    page += 1;
    url = data.next;

    // Persist progress after every page, not just at the end — a crash
    // partway through this run still resumes from real progress next time.
    await saveCursor({ nextPage: page, importedCount, done: !url || importedCount >= TARGET_BOOK_COUNT });
  }

  if (!url) {
    console.log(`Gutendex catalog exhausted. Final count: ${importedCount} books.`);
  } else if (importedCount >= TARGET_BOOK_COUNT) {
    console.log(`Reached target of ${TARGET_BOOK_COUNT} books. Done.`);
  } else {
    console.log(`Run complete: ${pagesThisRun} page(s) processed, ${importedCount} books total so far. Resumes at page ${page} next run.`);
  }
}

await run();
