import { getDb } from '@/db/client';

export type BookLexiconProfile = {
  bookId: string;
  totalRunningTokens: number;
  uniqueWordCount: number;
  tokenFrequencies: Record<string, number>;
};

type BookLexiconSqlRow = {
  book_id: string;
  total_tokens: number;
  unique_words: number;
  lexicon_json: string;
};

// In-memory LRU / cache for <1ms query responses
const lexiconCache = new Map<string, BookLexiconProfile>();
let allLexiconsLoaded = false;

function fromSqlRow(row: BookLexiconSqlRow): BookLexiconProfile {
  let frequencies: Record<string, number> = {};
  try {
    frequencies = JSON.parse(row.lexicon_json);
  } catch {
    frequencies = {};
  }
  return {
    bookId: row.book_id,
    totalRunningTokens: row.total_tokens,
    uniqueWordCount: row.unique_words,
    tokenFrequencies: frequencies,
  };
}

/**
 * Upserts a precomputed book lexicon profile into SQLite.
 */
export async function upsertBookLexicon(
  bookId: string,
  totalTokens: number,
  uniqueWords: number,
  frequencies: Record<string, number>,
): Promise<void> {
  const db = await getDb();
  const jsonStr = JSON.stringify(frequencies);

  await db.runAsync(
    `INSERT INTO book_lexicons (book_id, total_tokens, unique_words, lexicon_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       total_tokens = excluded.total_tokens,
       unique_words = excluded.unique_words,
       lexicon_json = excluded.lexicon_json`,
    [bookId, totalTokens, uniqueWords, jsonStr],
  );

  const profile: BookLexiconProfile = {
    bookId,
    totalRunningTokens: totalTokens,
    uniqueWordCount: uniqueWords,
    tokenFrequencies: frequencies,
  };
  lexiconCache.set(bookId, profile);
}

/**
 * Retrieves a single book lexicon profile by bookId.
 * Checks memory cache first (<1ms), then SQLite (<10ms), and finally bundled JSON fallback.
 */
export async function getBookLexicon(bookId: string): Promise<BookLexiconProfile | null> {
  if (lexiconCache.has(bookId)) {
    return lexiconCache.get(bookId) || null;
  }

  const db = await getDb();
  try {
    const row = await db.getFirstAsync<BookLexiconSqlRow>(
      'SELECT * FROM book_lexicons WHERE book_id = ?',
      [bookId],
    );

    if (row) {
      const profile = fromSqlRow(row);
      lexiconCache.set(bookId, profile);
      return profile;
    }
  } catch {
    // Fall back to bundled JSON if table doesn't exist yet
  }

  // Fallback to bundled JSON if not yet inserted to SQLite
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bundled = require('../../../assets/data/book_lexicons.json');
    if (bundled && bundled[bookId]) {
      const profile = bundled[bookId] as BookLexiconProfile;
      lexiconCache.set(bookId, profile);
      // Asynchronously seed SQLite
      upsertBookLexicon(
        profile.bookId,
        profile.totalRunningTokens,
        profile.uniqueWordCount,
        profile.tokenFrequencies,
      ).catch(() => {});
      return profile;
    }
  } catch {
    // No bundled file found
  }

  return null;
}

/**
 * Retrieves all book lexicon profiles in a single query.
 */
export async function getAllBookLexicons(): Promise<Map<string, BookLexiconProfile>> {
  if (allLexiconsLoaded && lexiconCache.size > 0) {
    return new Map(lexiconCache);
  }

  const result = new Map<string, BookLexiconProfile>();

  const db = await getDb();
  try {
    const rows = await db.getAllAsync<BookLexiconSqlRow>('SELECT * FROM book_lexicons');
    for (const row of rows) {
      const profile = fromSqlRow(row);
      result.set(profile.bookId, profile);
      lexiconCache.set(profile.bookId, profile);
    }
  } catch {
    // Fall back
  }

  // If SQLite was empty, populate from bundled JSON
  if (result.size === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bundled = require('../../../assets/data/book_lexicons.json');
      if (bundled && typeof bundled === 'object') {
        for (const [id, prof] of Object.entries(bundled)) {
          const profile = prof as BookLexiconProfile;
          result.set(id, profile);
          lexiconCache.set(id, profile);
          upsertBookLexicon(
            profile.bookId,
            profile.totalRunningTokens,
            profile.uniqueWordCount,
            profile.tokenFrequencies,
          ).catch(() => {});
        }
      }
    } catch {
      // Bundled file not available yet
    }
  }

  if (result.size > 0) {
    allLexiconsLoaded = true;
  }

  return result;
}
