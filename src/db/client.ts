import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { beginLibrarySync, endLibrarySync } from '@/features/content-ingestion/librarySync';
import { fetchRemoteCatalog, type RemoteBookRow } from '@/features/content-ingestion/remoteCatalog';

import { MIGRATIONS } from './schema';

// Seeded into `books` immediately on every cold start where the table is
// still empty — before any network call — so the Library shelf always shows
// something instantly instead of sitting empty for however long the remote
// fetch takes (that round trip used to block getDb() itself). Metadata only,
// trimmed down from the pre-Supabase manifest; no `textUrl`, so a book seeded
// from this can't be opened until the real sync (below) upserts over it —
// usually within a couple seconds, well before anyone's tapped into a book.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BOOTSTRAP_CATALOG: {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  categories?: string[];
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
// time under the hood.
//
// The queue itself (`enqueue`) is exposed separately from the proxy, and
// multi-statement helpers (upsertBooks, seedBootstrapIfEmpty — both use
// withTransactionAsync with nested runAsync calls inside) always run against
// the *raw* db, submitted to the queue as ONE job via `enqueue`. Running them
// against the *wrapped* proxy instead would deadlock: the outer
// withTransactionAsync call enqueues and starts running, but by the time its
// callback fires, the queue has already moved on to "after this job" — so the
// nested runAsync call queues up *behind* the very transaction it's part of,
// and neither ever completes. (This actually shipped briefly — every DB call
// in the app hangs forever the moment it happens, which is exactly what a
// permanent black screen on opening a book looks like.)
const SERIALIZED_METHODS = new Set([
  'execAsync',
  'getAllAsync',
  'getFirstAsync',
  'runAsync',
  'withTransactionAsync',
]);

type Enqueue = <T>(fn: () => Promise<T>) => Promise<T>;

function createQueue(): Enqueue {
  let queue: Promise<unknown> = Promise.resolve();
  return (fn) => {
    const result = queue.then(fn, fn);
    // Advance the queue on failure too — one rejected call must not wedge
    // every call queued behind it.
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

function serializeDb(db: SQLiteDatabase, enqueue: Enqueue): SQLiteDatabase {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || typeof prop !== 'string' || !SERIALIZED_METHODS.has(prop)) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (...args: unknown[]) =>
        enqueue(() => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args));
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
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
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
           chapter1_anchor = excluded.chapter1_anchor,
           categories = excluded.categories`,
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
          JSON.stringify(book.categories),
        ],
      );
    }
  });
}

// Instant, local-only — never touches the network. Guarantees the Library
// always has *something* to show the moment the DB opens, on a completely
// fresh install, before the real catalog has ever synced once.
async function seedBootstrapIfEmpty(db: SQLiteDatabase) {
  const { count } = (await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM books',
  )) ?? { count: 0 };
  if (count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const book of BOOTSTRAP_CATALOG) {
      await db.runAsync(
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, categories)
         VALUES (?, ?, ?, ?, ?, ?, 0, '', ?)`,
        [
          book.id,
          book.title,
          book.author,
          book.sourceLanguage,
          book.synopsis,
          book.totalChapters,
          JSON.stringify(book.categories ?? []),
        ],
      );
    }
  });
}

// Hero books (manifest) aren't in the remote catalog sync, so on an install
// that predates the categories column their rows keep the empty default and
// would never appear under any filter. Idempotent backfill: set categories
// for the manifest books whose row is still uncategorized. Cheap (5 rows),
// runs once per launch, no-ops once they're filled.
async function backfillBootstrapCategories(db: SQLiteDatabase) {
  for (const book of BOOTSTRAP_CATALOG) {
    if (!book.categories || book.categories.length === 0) continue;
    await db.runAsync(
      `UPDATE books SET categories = ? WHERE id = ? AND (categories = '' OR categories = '[]')`,
      [JSON.stringify(book.categories), book.id],
    );
  }
}

// Deliberately not awaited by getDb() — the whole point is that nothing in
// the app blocks on this network round trip. The network fetch itself runs
// completely outside the queue (it touches no DB call at all); only once it
// resolves does the actual write get submitted to `enqueue` as one job, so it
// never occupies the queue for the multi-second duration of the request.
// Network failure (offline, timeout) is expected and non-fatal: whatever's
// already cached locally just keeps being used until the next app launch.
function refreshFromRemoteInBackground(db: SQLiteDatabase, enqueue: Enqueue) {
  beginLibrarySync();
  fetchRemoteCatalog()
    .then((remoteRows) => enqueue(() => upsertBooks(db, remoteRows)))
    .catch((error) => {
      console.warn('[db] Remote catalog sync failed, using local cache:', error);
    })
    .finally(() => endLibrarySync());
}

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('lamplight.db');
      await migrate(db);
      const enqueue = createQueue();
      await enqueue(() => seedBootstrapIfEmpty(db));
      await enqueue(() => backfillBootstrapCategories(db));
      refreshFromRemoteInBackground(db, enqueue);
      return serializeDb(db, enqueue);
    })();
  }
  return dbPromise;
}
