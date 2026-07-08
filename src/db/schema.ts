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
];
