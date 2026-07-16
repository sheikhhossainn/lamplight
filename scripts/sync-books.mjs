// Seeds the 5 curated "hero" titles: looks up each via the public Gutendex API
// (https://gutendex.com — the de facto public API for Project Gutenberg's
// catalog) and upserts lightweight metadata (not the book text itself) into
// Supabase. The app fetches that metadata via Supabase's REST API
// (src/features/content-ingestion/remoteCatalog.ts) and downloads a book's
// actual text on-device, on demand, only when the reader opens it
// (src/features/content-ingestion/bookDownloader.ts) — this script never
// writes book text anywhere.
//
// RUN LOCALLY (`npm run sync:books`). There is no GitHub Actions cron: Gutendex
// 403s CI/datacenter IPs, so scheduled runs never worked — run it from a real
// machine when the hero list changes. Requires SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the environment (the service-role key must never
// be committed or shipped in the app).
import { createClient } from '@supabase/supabase-js';

import { parseBookText } from '../src/features/content-ingestion/textParser.ts';

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
  {
    id: 'war-and-peace',
    title: 'War and Peace',
    displayAuthor: 'Leo Tolstoy',
    authorMatch: 'tolstoy',
  },
  {
    id: 'the-brothers-karamazov',
    title: 'The Brothers Karamazov',
    displayAuthor: 'Fyodor Dostoevsky',
    authorMatch: 'dosto',
  },
  {
    id: 'arabian-nights',
    title: 'The Arabian Nights Entertainments',
    displayAuthor: 'Anonymous',
    authorMatch: 'lang', // Gutendex credits editor Andrew Lang, not an author
  },
  {
    id: 'the-art-of-war',
    title: 'The Art of War',
    displayAuthor: 'Sun Tzu',
    authorMatch: 'sunzi', // Gutendex spells the author "Sunzi"
  },
  {
    id: 'the-analects-of-confucius',
    title: 'The Analects of Confucius (from the Chinese Classics)',
    displayAuthor: 'Confucius',
    authorMatch: 'confucius',
  },
];

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
  'war-and-peace':
    'Five aristocratic families live through Napoleon’s invasion of Russia — love, war, and the search for meaning across a shifting empire.',
  'the-brothers-karamazov':
    'Three brothers and their murdered father — a novel of faith, doubt, and guilt that unfolds as both family drama and murder mystery.',
  'arabian-nights':
    'Scheherazade spins one tale after another to stay alive one more night — the frame story behind Sindbad, Aladdin, and Ali Baba.',
  'the-art-of-war':
    'A concise ancient treatise on strategy, deception, and command — still read well beyond its original battlefield context.',
  'the-analects-of-confucius':
    'Sayings and teachings attributed to Confucius on ethics, governance, and the cultivation of character, compiled by his followers.',
};

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
  const coverUrl = match.formats['image/jpeg'] ?? null;
  return { gutenbergId: match.id, title: match.title, author: match.authors[0]?.name ?? 'Unknown', textUrl, coverUrl };
}

async function syncOneBook(entry) {
  const found = await findBook(entry);
  const res = await fetch(found.textUrl);
  if (!res.ok) throw new Error(`Failed to download text for "${entry.title}" (${res.status})`);
  const raw = await res.text();

  // Parsed here only to compute total_chapters up front for the Library
  // shelf/detail screen — the chapters/pages themselves are discarded; the
  // app re-parses this same text on-device (via the same parseBookText) the
  // first time a reader actually opens the book.
  const { chapters, usedFallbackSplit } = parseBookText(raw, {
    title: entry.title,
    chapter1Anchor: entry.chapter1Anchor,
  });

  console.log(
    `${entry.id}: gutenberg #${found.gutenbergId} "${found.title}" — ${chapters.length} ${usedFallbackSplit ? 'parts (fallback split)' : 'chapters'}`,
  );

  return {
    id: entry.id,
    title: entry.title,
    author: entry.displayAuthor,
    source_language: 'en',
    synopsis: entry.synopsis,
    total_chapters: chapters.length,
    gutenberg_id: found.gutenbergId,
    source_format: 'gutenberg-text',
    text_url: found.textUrl,
    cover_url: found.coverUrl,
    chapter1_anchor: entry.chapter1Anchor ?? null,
  };
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const rows = [];
for (const entry of CATALOG) {
  entry.synopsis = SYNOPSES[entry.id];
  rows.push(await syncOneBook(entry));
}

const { error } = await supabase.from('books').upsert(rows, { onConflict: 'id' });
if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

console.log(`Synced ${rows.length} books to Supabase.`);
