import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { fetchRemoteCatalog, type RemoteBookRow } from '@/features/content-ingestion/remoteCatalog';

import { MIGRATIONS } from './schema';

// Last-resort bootstrap only: used when the local `books` table is still
// empty AND the very first fetchRemoteCatalog() call fails (a cold, offline
// first launch) — otherwise the Library shelf would be completely blank.
// Metadata only, trimmed down from the pre-Supabase manifest; no `textUrl`,
// so books seeded from this can't be opened until the remote sync succeeds.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BOOTSTRAP_CATALOG: {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
}[] = require('../../assets/books/manifest.json');

let dbPromise: Promise<SQLiteDatabase> | null = null;

// expo-sqlite's Android binding corrupts native statement state when two
// statements are prepared concurrently on the same connection — surfaces as
// "NativeDatabase.prepareAsync ... cannot be cast to NativeStatement". Every
// screen in this app opens with a Promise.all of several reads against the
// one shared connection (see reader/[bookId], book/[id], library, vocabulary),
// so this is reachable from ordinary use, not an edge case. Wrapping the
// handle returned to callers in a serializing queue lets call sites keep
// writing Promise.all naturally while every statement still runs one at a
// time under the hood. migrate()/syncBooksFromRemote() below intentionally
// run against the *raw* db (not this wrapper) since they're already strictly
// sequential and run once, before anything else can reach the connection.
const SERIALIZED_METHODS = new Set([
  'execAsync',
  'getAllAsync',
  'getFirstAsync',
  'runAsync',
  'withTransactionAsync',
]);

function serializeDb(db: SQLiteDatabase): SQLiteDatabase {
  let queue: Promise<unknown> = Promise.resolve();
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || typeof prop !== 'string' || !SERIALIZED_METHODS.has(prop)) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (...args: unknown[]) => {
        const run = () => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        const result = queue.then(run, run);
        // Advance the queue on failure too — one rejected call must not wedge
        // every call queued behind it.
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      };
    },
  });
}

async function migrate(db: SQLiteDatabase) {
  const { user_version: currentVersion } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )) ?? { user_version: 0 };

  for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
    await db.execAsync(MIGRATIONS[version]);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

async function upsertBooks(db: SQLiteDatabase, rows: RemoteBookRow[]) {
  await db.withTransactionAsync(async () => {
    for (const book of rows) {
      await db.runAsync(
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           author = excluded.author,
           source_language = excluded.source_language,
           synopsis = excluded.synopsis,
           total_chapters = excluded.total_chapters,
           is_available = 1,
           text_url = excluded.text_url,
           cover_url = excluded.cover_url,
           gutenberg_id = excluded.gutenberg_id,
           chapter1_anchor = excluded.chapter1_anchor`,
        [
          book.id,
          book.title,
          book.author,
          book.sourceLanguage,
          book.synopsis,
          book.totalChapters,
          book.textUrl,
          book.coverUrl,
          book.gutenbergId,
          book.chapter1Anchor,
        ],
      );
    }
  });
}

// Refreshes the local `books` cache from Supabase every app process (the
// `dbPromise` singleton below already limits this to once). Network failure
// (offline, timeout) is expected and non-fatal — whatever's already cached
// locally from a previous successful sync just keeps being used. Only on a
// genuinely first-ever, offline launch (local table still empty afterward)
// does it fall back to the tiny bundled bootstrap catalog.
async function syncBooksFromRemote(db: SQLiteDatabase) {
  try {
    const remoteRows = await fetchRemoteCatalog();
    await upsertBooks(db, remoteRows);
    return;
  } catch (error) {
    console.warn('[db] Remote catalog sync failed, using local cache:', error);
  }

  const { count } = (await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM books',
  )) ?? { count: 0 };
  if (count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const book of BOOTSTRAP_CATALOG) {
      await db.runAsync(
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url)
         VALUES (?, ?, ?, ?, ?, ?, 0, '')`,
        [book.id, book.title, book.author, book.sourceLanguage, book.synopsis, book.totalChapters],
      );
    }
  });
}

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('lamplight.db');
      await migrate(db);
      await syncBooksFromRemote(db);
      return serializeDb(db);
    })();
  }
  return dbPromise;
}
