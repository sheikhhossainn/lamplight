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

let dbPromise: Promise<TransactionalDb> | null = null;

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

export type TransactionalDb = Omit<SQLiteDatabase, 'withTransactionAsync'> & {
  withTransactionAsync(task: (txDb: SQLiteDatabase) => Promise<void>): Promise<void>;
};

function serializeDb(db: SQLiteDatabase, enqueue: Enqueue): TransactionalDb {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || typeof prop !== 'string' || !SERIALIZED_METHODS.has(prop)) {
        return typeof value === 'function' ? value.bind(target) : value;
      }

      if (prop === 'withTransactionAsync') {
        return (task: (txDb: SQLiteDatabase) => Promise<void>) =>
          enqueue(async () => {
            return await target.withTransactionAsync(async () => {
              await task(target);
            });
          });
      }

      return (...args: unknown[]) => {
        return enqueue(() => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args));
      };
    },
  }) as unknown as TransactionalDb;
}

async function migrate(db: SQLiteDatabase) {
  const { user_version: currentVersion } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )) ?? { user_version: 0 };

  for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
    await db.execAsync(MIGRATIONS[version]);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }

  // Some OTA users reached a schema version that included the SRS migration
  // marker without all of its columns. Keep this repair idempotent so their
  // existing database can recover without clearing reading data.
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(saved_words)');
  const existingColumns = new Set(columns.map((column) => column.name));
  const srsColumns = [
    ['srs_stage', 'INTEGER NOT NULL DEFAULT 0'],
    ['srs_interval_days', 'REAL NOT NULL DEFAULT 0'],
    ['srs_ease_factor', 'REAL NOT NULL DEFAULT 2.5'],
    ['srs_due_date', 'INTEGER NOT NULL DEFAULT 0'],
    ['srs_reps', 'INTEGER NOT NULL DEFAULT 0'],
    ['srs_lapses', 'INTEGER NOT NULL DEFAULT 0'],
    ['phonetic', 'TEXT'],
  ] as const;

  for (const [name, definition] of srsColumns) {
    if (!existingColumns.has(name)) {
      await db.execAsync(`ALTER TABLE saved_words ADD COLUMN ${name} ${definition}`);
    }
  }

  // Idempotent column additions for sync metadata (updated_at, deleted_at)
  const syncColumnTables = [
    {
      table: 'saved_words',
      columns: [
        ['updated_at', 'INTEGER'],
        ['deleted_at', 'INTEGER'],
      ],
    },
    {
      table: 'highlights',
      columns: [
        ['updated_at', 'INTEGER'],
        ['deleted_at', 'INTEGER'],
      ],
    },
    {
      table: 'shelves',
      columns: [
        ['updated_at', 'INTEGER'],
        ['deleted_at', 'INTEGER'],
      ],
    },
    {
      table: 'reading_positions',
      columns: [
        ['deleted_at', 'INTEGER'],
      ],
    },
  ];

  for (const item of syncColumnTables) {
    const tableCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${item.table})`);
    const colSet = new Set(tableCols.map((c) => c.name));
    for (const [colName, colDef] of item.columns) {
      if (!colSet.has(colName)) {
        await db.execAsync(`ALTER TABLE ${item.table} ADD COLUMN ${colName} ${colDef}`);
      }
    }
  }

  // Idempotent recovery for v17-v24 tables and columns in case device user_version was advanced without table creation
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      pages_read INTEGER NOT NULL DEFAULT 0,
      chapter_index INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS reading_sessions_book_idx ON reading_sessions (book_id);
    CREATE INDEX IF NOT EXISTS reading_sessions_started_idx ON reading_sessions (started_at DESC);

    CREATE TABLE IF NOT EXISTS sync_merge_journal (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      prior_account_id TEXT,
      target_account_id TEXT NOT NULL,
      state TEXT NOT NULL,
      backup_reference TEXT,
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS sync_merge_journal_started_idx ON sync_merge_journal (started_at DESC);

    CREATE TABLE IF NOT EXISTS feedback_outbox (
      id TEXT PRIMARY KEY,
      rating INTEGER,
      category TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      message TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reader_notes (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id),
      chapter_index INTEGER NOT NULL,
      page_index INTEGER NOT NULL,
      note_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reader_notes_book_idx ON reader_notes (book_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id),
      chapter_index INTEGER NOT NULL,
      page_index INTEGER NOT NULL,
      label TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(book_id, chapter_index, page_index)
    );
    CREATE INDEX IF NOT EXISTS bookmarks_book_idx ON bookmarks (book_id, chapter_index, page_index);

    CREATE TABLE IF NOT EXISTS download_states (
      book_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      progress INTEGER,
      error_code TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocabulary_decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocabulary_deck_items (
      deck_id TEXT NOT NULL REFERENCES vocabulary_decks(id) ON DELETE CASCADE,
      word_id TEXT NOT NULL REFERENCES saved_words(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (deck_id, word_id)
    );
    CREATE INDEX IF NOT EXISTS deck_items_deck_idx ON vocabulary_deck_items (deck_id);
    CREATE INDEX IF NOT EXISTS deck_items_word_idx ON vocabulary_deck_items (word_id);

    CREATE TABLE IF NOT EXISTS analytics_queue (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS analytics_queue_occurred_idx ON analytics_queue (occurred_at ASC);
  `);

  const bookCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(books)');
  const bookColSet = new Set(bookCols.map((c) => c.name));
  if (bookCols.length > 0 && !bookColSet.has('is_favorite')) {
    await db.execAsync('ALTER TABLE books ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0');
    await db.execAsync('CREATE INDEX IF NOT EXISTS books_favorite_idx ON books (is_favorite, title)');
  }
}

async function upsertBooks(db: SQLiteDatabase, rows: RemoteBookRow[]) {
  await db.withTransactionAsync(async () => {
    for (const book of rows) {
      await db.runAsync(
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_available, text_url, cover_url, gutenberg_id, chapter1_anchor, categories, source)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
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
           categories = excluded.categories,
           source = excluded.source`,
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
          book.source ?? 'catalog',
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

export async function getDb(): Promise<TransactionalDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      let db: SQLiteDatabase | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          db = await openDatabaseAsync('lamplight.db');
          // Wait on a held lock instead of failing instantly with "database is
          // locked" (e.g. a connection left over from a dev reload finishing a write).
          await db.execAsync('PRAGMA busy_timeout = 5000');
          // If a transaction was left dangling by an abrupt JS reload / Fast Refresh,
          // roll it back to restore autocommit mode and release any held locks.
          try {
            if (await db.isInTransactionAsync()) {
              await db.execAsync('ROLLBACK');
            }
          } catch {
            // Ignore if no transaction was active
          }
          // Enable Write-Ahead Logging (WAL). If the connection is locked or has
          // dangling statements from prior reloads, this throws and triggers the catch block.
          await db.execAsync('PRAGMA journal_mode = WAL');
          break;
        } catch (err) {
          if (db) {
            try {
              // Drain all cached refs so expo-sqlite's NativeDatabase invokes
              // sqlite3_finalize_all_statement() and sqlite3_close(), clearing
              // stale statement locks from prior Fast Refreshes.
              for (let i = 0; i < 20; i++) {
                try {
                  await db.closeAsync();
                } catch {
                  break;
                }
              }
            } catch {}
            db = null;
          }
          if (attempt === 3) throw err;
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }
      if (!db) throw new Error('Failed to open database');
      await migrate(db);
      const enqueue = createQueue();
      await enqueue(() => seedBootstrapIfEmpty(db));
      await enqueue(() => backfillBootstrapCategories(db));
      refreshFromRemoteInBackground(db, enqueue);
      return serializeDb(db, enqueue);
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
