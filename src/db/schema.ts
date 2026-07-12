// Numbered migrations applied in order via PRAGMA user_version — even schema v1
// goes through this path so later ALTERs never need to be hand-written blind.
export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    source_language TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    total_chapters INTEGER NOT NULL,
    is_bundled INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reading_positions (
    book_id TEXT PRIMARY KEY REFERENCES books(id),
    chapter_index INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    percent_complete REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_words (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id),
    source_word TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translation TEXT NOT NULL,
    context_sentence TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id),
    chapter_index INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    color_key TEXT NOT NULL,
    quote_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS translation_usage (
    date TEXT PRIMARY KEY,
    count_used INTEGER NOT NULL
  );
  `,
  // v2 — record exactly where a word was saved so Vocabulary can jump back to
  // the precise page (previously only the chapter was known).
  `
  ALTER TABLE saved_words ADD COLUMN page_index INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE saved_words ADD COLUMN paragraph_index INTEGER NOT NULL DEFAULT 0;
  `,
  // v3 — `books` is now a local cache of a remote (Supabase) catalog synced by
  // scripts/sync-books.mjs, instead of a one-time seed from a bundled JSON
  // manifest. text_url is where the reader downloads a book's actual text
  // from, on demand; is_bundled is renamed since it no longer means "text
  // ships in the binary" but "this row's text_url is available to download".
  `
  ALTER TABLE books RENAME COLUMN is_bundled TO is_available;
  ALTER TABLE books ADD COLUMN text_url TEXT NOT NULL DEFAULT '';
  ALTER TABLE books ADD COLUMN cover_url TEXT;
  ALTER TABLE books ADD COLUMN gutenberg_id INTEGER;
  ALTER TABLE books ADD COLUMN chapter1_anchor TEXT;
  `,
  // v4 — user-created shelves ("categories"): a named shelf and the set of books
  // the user filed onto it. Membership is many-to-many, keyed on the pair.
  `
  CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id TEXT NOT NULL REFERENCES shelves(id),
    book_id TEXT NOT NULL REFERENCES books(id),
    added_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, book_id)
  );
  `,
  // v5 — let the user clear a book from the Library's "Continue reading" list
  // WITHOUT losing its bookmark. This is an activity-history flag, not a
  // delete: the reading position stays, so opening the book from the shelf
  // still resumes where they left off; reading it again un-hides it (see
  // upsertReadingPosition).
  `
  ALTER TABLE reading_positions ADD COLUMN continue_hidden INTEGER NOT NULL DEFAULT 0;
  `,
  // v6 — cache each book's raw Gutendex subjects/bookshelves (a JSON string
  // array) locally so the Library's category filter runs entirely on-device:
  // no per-tap network call, works offline. Canonical buckets (Philosophy,
  // Religion, ...) are derived from these strings at read time by
  // features/content-ingestion/bookCategories.ts — kept as raw strings here so
  // the taxonomy can change without a re-sync.
  `
  ALTER TABLE books ADD COLUMN categories TEXT NOT NULL DEFAULT '';
  `,
  // v7 — a generic key/value store for user settings that must survive an app
  // restart (the in-memory stores in features/settings reset on relaunch). The
  // translation language pair is the first to move here; ambience track,
  // page-turn sound, and reading theme can follow the same pattern.
  `
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // v8 — Quran reading (verse-level, not chapter/page/paragraph like prose
  // books): separate tables keyed by (surah_number, verse_number) rather than
  // reusing books/reading_positions/highlights/saved_words, since those
  // columns mean something different (a book id FK, a font-metric-relative
  // page/paragraph index) that verse addressing doesn't have.
  `
  CREATE TABLE IF NOT EXISTS quran_reading_position (
    surah_number INTEGER PRIMARY KEY,
    verse_number INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quran_highlights (
    id TEXT PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    color_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quran_saved_words (
    id TEXT PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    source_word TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
  // v9 — Bible (Old Testament) reading. Same shape as the Quran tables (v8),
  // keyed by (book_id, chapter, verse) instead of (surah_number,
  // verse_number) since a Bible book spans many chapters, unlike a surah.
  `
  CREATE TABLE IF NOT EXISTS bible_reading_position (
    book_id TEXT PRIMARY KEY,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bible_highlights (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    color_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bible_saved_words (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    source_word TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
];
