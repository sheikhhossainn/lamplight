import { getDb } from '@/db/client';
import type { SQLiteDatabase } from 'expo-sqlite';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type CloudLibraryMapSqlRow = {
  local_book_id: string;
  library_item_id: string;
  content_fingerprint: string;
  updated_at: number;
};

export async function getLibraryItemId(
  localBookId: string,
  dbHandle?: SQLiteDatabase,
): Promise<string | null> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<CloudLibraryMapSqlRow>(
    'SELECT library_item_id FROM cloud_library_map WHERE local_book_id = ?',
    [localBookId],
  );
  return row?.library_item_id ?? null;
}

export async function setLibraryMapping(
  localBookId: string,
  libraryItemId: string,
  contentFingerprint: string = localBookId,
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  const db = dbHandle ?? (await getDb());
  await db.runAsync(
    `INSERT INTO cloud_library_map (local_book_id, library_item_id, content_fingerprint, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(local_book_id) DO UPDATE SET
       library_item_id = excluded.library_item_id,
       content_fingerprint = excluded.content_fingerprint,
       updated_at = excluded.updated_at`,
    [localBookId, libraryItemId, contentFingerprint, Date.now()],
  );
}

/**
 * Resolves library_item_id for a given localBookId.
 * Checks local cache first; if missing and online, queries Supabase library_items.
 */
export async function resolveLibraryItemId(
  localBookId: string,
  accessToken?: string,
  dbHandle?: SQLiteDatabase,
): Promise<string | null> {
  const cached = await getLibraryItemId(localBookId, dbHandle);
  if (cached) return cached;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const token = accessToken ?? SUPABASE_ANON_KEY;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/library_items?catalog_book_id=eq.${encodeURIComponent(localBookId)}&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      const items = (await response.json()) as Array<{ id: string }>;
      if (items && items.length > 0 && items[0]?.id) {
        const libraryItemId = items[0].id;
        await setLibraryMapping(localBookId, libraryItemId, localBookId, dbHandle);
        return libraryItemId;
      }
    }
  } catch {
    // Network or parse issue, return null for offline fallback
  }

  return null;
}

/**
 * Resolves local_book_id for a given libraryItemId.
 * Checks local cache first; if missing and online, queries Supabase library_items.
 */
export async function resolveLocalBookId(
  libraryItemId: string,
  accessToken?: string,
  dbHandle?: SQLiteDatabase,
): Promise<string | null> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<CloudLibraryMapSqlRow>(
    'SELECT local_book_id FROM cloud_library_map WHERE library_item_id = ?',
    [libraryItemId],
  );
  if (row?.local_book_id) return row.local_book_id;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const token = accessToken ?? SUPABASE_ANON_KEY;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/library_items?id=eq.${encodeURIComponent(libraryItemId)}&select=catalog_book_id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      const items = (await response.json()) as Array<{ catalog_book_id: string }>;
      if (items && items.length > 0 && items[0]?.catalog_book_id) {
        const localBookId = items[0].catalog_book_id;
        await setLibraryMapping(localBookId, libraryItemId, localBookId, dbHandle);
        return localBookId;
      }
    }
  } catch {
    // Offline or network error
  }

  return null;
}

