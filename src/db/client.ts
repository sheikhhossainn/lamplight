import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { BOOK_CATALOG } from '@/features/content-ingestion/catalog';

import { MIGRATIONS } from './schema';

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase) {
  const { user_version: currentVersion } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )) ?? { user_version: 0 };

  for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
    await db.execAsync(MIGRATIONS[version]);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

async function seedBooks(db: SQLiteDatabase) {
  const { count } = (await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM books',
  )) ?? { count: 0 };
  if (count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const book of BOOK_CATALOG) {
      await db.runAsync(
        `INSERT INTO books (id, title, author, source_language, synopsis, total_chapters, is_bundled)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          book.id,
          book.title,
          book.author,
          book.sourceLanguage,
          book.synopsis,
          book.totalChapters,
          book.isBundled ? 1 : 0,
        ],
      );
    }
  });
}

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('lamplight.db');
      await migrate(db);
      await seedBooks(db);
      return db;
    })();
  }
  return dbPromise;
}
