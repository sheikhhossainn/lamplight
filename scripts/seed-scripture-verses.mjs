// Seeds public.scripture_verses (mood flashcards + comparative Q&A backend) from
// the same static assets already fetched by fetch-quran.mjs / fetch-bible-ot.mjs /
// fetch-bible-nt.mjs — no re-fetching, no new API dependency.
//
// A starter curated deck, not the full ~37k-verse corpus: CURATED below hand-picks
// a small, high-confidence set of well-known verses per (tradition, mood) so the
// mood flashcard deck and comparative Q&A retrieval work end-to-end now. Expand
// CURATED later; resolveCitation() throws immediately on any bad book/chapter/verse
// reference instead of silently seeding wrong data.
//
// Embedding: Supabase/gte-small via @huggingface/transformers, self-hosted (no
// OpenAI, no external API) — downloads the ONNX model to a local cache on first
// run, then runs fully offline. Embeds coalesce(translation, original_text) in
// batches (not one call per row). Model choice matches the Edge Function
// (supabase/functions/context-verses) exactly: it embeds the live user query
// via the Edge Runtime's native Supabase.ai.Session('gte-small') — same model,
// different runtime, since running transformers.js itself inside a Deno Edge
// Function failed to bundle/execute (see that function's header comment).
// Mixing models here would break cosine similarity search.
//
// RUN LOCALLY (`npm run seed:scripture`). Requires SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the environment (the service-role key must never
// be committed or shipped in the app) — same requirement as sync-books.mjs.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@huggingface/transformers';

const ASSETS_DIR = path.join(process.cwd(), 'assets');
const EMBED_BATCH_SIZE = 32;
const UPSERT_BATCH_SIZE = 200;

// Quran: book = surah English name, chapter = surah number, verse_number = ayah
// number, original_text = Arabic, translation = Sahih International English.
// Bible: book = full book name, chapter/verse_number as given, original_text =
// WEB English (already the source language), translation = null.
const CURATED = {
  quran: [
    [12, 86, ['grief']],
    [2, 156, ['grief']],
    [3, 139, ['grief', 'strength']],
    [94, 5, ['hope']],
    [39, 53, ['hope', 'forgiveness']],
    [65, 3, ['hope']],
    [94, 6, ['patience']],
    [2, 153, ['patience']],
    [3, 200, ['patience']],
    [103, 3, ['patience']],
    [14, 7, ['gratitude']],
    [27, 19, ['gratitude']],
    [2, 152, ['gratitude']],
    [3, 175, ['fear']],
    [2, 38, ['fear']],
    [9, 40, ['fear']],
    [13, 28, ['peace']],
    [89, 27, ['peace']],
    [6, 82, ['peace', 'guidance']],
    [1, 6, ['guidance']],
    [2, 2, ['guidance']],
    [17, 9, ['guidance']],
    [4, 110, ['forgiveness']],
    [3, 135, ['forgiveness']],
    [25, 70, ['forgiveness']],
    [2, 286, ['strength']],
    [10, 94, ['doubt']],
    [6, 114, ['doubt']],
    [49, 15, ['doubt']],
  ],
  'bible-ot': [
    ['PSA', 34, 18, ['grief']],
    ['PSA', 137, 1, ['grief']],
    ['PSA', 42, 5, ['grief', 'doubt']],
    ['PSA', 30, 5, ['hope']],
    ['LAM', 3, 22, ['hope']],
    ['PSA', 27, 14, ['patience']],
    ['HAB', 3, 17, ['patience']],
    ['ECC', 3, 1, ['patience']],
    ['PSA', 100, 4, ['gratitude']],
    ['1CH', 16, 34, ['gratitude']],
    ['DEU', 8, 10, ['gratitude']],
    ['PSA', 23, 4, ['fear']],
    ['DEU', 31, 6, ['fear']],
    ['ISA', 41, 10, ['fear']],
    ['PSA', 4, 8, ['peace']],
    ['ISA', 26, 3, ['peace']],
    ['NUM', 6, 26, ['peace']],
    ['PSA', 32, 8, ['guidance']],
    ['PRO', 3, 6, ['guidance']],
    ['ISA', 30, 21, ['guidance']],
    ['PSA', 103, 12, ['forgiveness']],
    ['ISA', 1, 18, ['forgiveness']],
    ['MIC', 7, 18, ['forgiveness']],
    ['PSA', 28, 7, ['strength']],
    ['ISA', 40, 29, ['strength']],
    ['ISA', 40, 31, ['strength']],
    ['NEH', 8, 10, ['strength']],
    ['JOB', 13, 15, ['doubt']],
  ],
  'bible-nt': [
    ['JHN', 11, 35, ['grief']],
    ['MAT', 5, 4, ['grief']],
    ['2CO', 1, 4, ['grief']],
    ['ROM', 15, 13, ['hope']],
    ['1PE', 1, 3, ['hope']],
    ['HEB', 11, 1, ['hope']],
    ['JAS', 1, 4, ['patience']],
    ['ROM', 5, 3, ['patience']],
    ['HEB', 12, 1, ['patience']],
    ['1TH', 5, 18, ['gratitude']],
    ['PHP', 4, 6, ['gratitude']],
    ['COL', 3, 15, ['gratitude']],
    ['2TI', 1, 7, ['fear']],
    ['1JN', 4, 18, ['fear']],
    ['JHN', 14, 27, ['peace']],
    ['PHP', 4, 7, ['peace']],
    ['JHN', 16, 13, ['guidance']],
    ['JAS', 1, 5, ['guidance']],
    ['1JN', 1, 9, ['forgiveness']],
    ['EPH', 1, 7, ['forgiveness']],
    ['LUK', 23, 34, ['forgiveness']],
    ['PHP', 4, 13, ['strength']],
    ['2CO', 12, 9, ['strength']],
    ['EPH', 6, 10, ['strength']],
    ['MAT', 14, 31, ['doubt']],
    ['MRK', 9, 24, ['doubt']],
    ['JHN', 20, 27, ['doubt']],
  ],
};

async function loadJson(...parts) {
  return JSON.parse(await readFile(path.join(ASSETS_DIR, ...parts), 'utf8'));
}

async function loadSources() {
  const [quranVerses, surahs, otVerses, otBooks, ntVerses, ntBooks] = await Promise.all([
    loadJson('quran', 'verses.json'),
    loadJson('quran', 'surahs.json'),
    loadJson('bible', 'verses.json'),
    loadJson('bible', 'books.json'),
    loadJson('bible-nt', 'verses.json'),
    loadJson('bible-nt', 'books.json'),
  ]);
  return {
    quranVerses,
    surahByNumber: new Map(surahs.map((s) => [s.number, s])),
    otVerses,
    otBookById: new Map(otBooks.map((b) => [b.id, b])),
    ntVerses,
    ntBookById: new Map(ntBooks.map((b) => [b.id, b])),
  };
}

function resolveQuranCitation(sources, surahNumber, ayahNumber, moodTags) {
  const surah = sources.surahByNumber.get(surahNumber);
  if (!surah) throw new Error(`quran: unknown surah ${surahNumber}`);
  const verse = sources.quranVerses[String(surahNumber)]?.find((v) => v.number === ayahNumber);
  if (!verse) throw new Error(`quran: missing ${surah.nameEnglish} ${surahNumber}:${ayahNumber}`);
  return {
    tradition: 'quran',
    book: surah.nameEnglish,
    chapter: surahNumber,
    verse_number: ayahNumber,
    original_text: verse.textArabic,
    translation: verse.textEnglish,
    mood_tags: moodTags,
  };
}

function resolveBibleCitation(sources, tradition, bookId, chapter, verseNumber, moodTags) {
  const store = tradition === 'bible-ot' ? sources.otVerses : sources.ntVerses;
  const booksById = tradition === 'bible-ot' ? sources.otBookById : sources.ntBookById;
  const book = booksById.get(bookId);
  if (!book) throw new Error(`${tradition}: unknown book ${bookId}`);
  const verse = store[bookId]?.[String(chapter)]?.find((v) => v.number === verseNumber);
  if (!verse) throw new Error(`${tradition}: missing ${book.name} ${chapter}:${verseNumber}`);
  return {
    tradition,
    book: book.name,
    chapter,
    verse_number: verseNumber,
    original_text: verse.text,
    translation: null,
    mood_tags: moodTags,
  };
}

function resolveAllCitations(sources) {
  const rows = [];
  for (const [surah, ayah, moods] of CURATED.quran) {
    rows.push(resolveQuranCitation(sources, surah, ayah, moods));
  }
  for (const tradition of ['bible-ot', 'bible-nt']) {
    for (const [bookId, chapter, verse, moods] of CURATED[tradition]) {
      rows.push(resolveBibleCitation(sources, tradition, bookId, chapter, verse, moods));
    }
  }
  return rows;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

async function embedRows(rows) {
  console.log(`Loading Supabase/gte-small (first run downloads and caches the model)...`);
  const embedder = await pipeline('feature-extraction', 'Supabase/gte-small');

  const batches = chunk(rows, EMBED_BATCH_SIZE);
  let done = 0;
  for (const batch of batches) {
    const texts = batch.map((row) => row.translation ?? row.original_text);
    const output = await embedder(texts, { pooling: 'mean', normalize: true });
    const embeddings = output.tolist();
    batch.forEach((row, i) => {
      row.embedding = embeddings[i];
    });
    done += batch.length;
    console.log(`Embedded ${done}/${rows.length} verses`);
  }
}

async function upsertRows(rows) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
    const { error } = await supabase
      .from('scripture_verses')
      .upsert(batch, { onConflict: 'tradition,book,chapter,verse_number' });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

const sources = await loadSources();
const rows = resolveAllCitations(sources);
console.log(`Resolved ${rows.length} curated verses (${CURATED.quran.length} quran, ${CURATED['bible-ot'].length} bible-ot, ${CURATED['bible-nt'].length} bible-nt).`);

await embedRows(rows);
await upsertRows(rows);

console.log(`Seeded ${rows.length} verses to scripture_verses.`);
