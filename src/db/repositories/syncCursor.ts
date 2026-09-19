import { getDb } from '@/db/client';
import type { SQLiteDatabase } from 'expo-sqlite';

export type SyncCursor = {
  entityType: string;
  lastServerRevision: number;
  lastSyncedAt: number;
};

type SyncCursorSqlRow = {
  entity_type: string;
  last_server_revision: number;
  last_synced_at: number;
};

export async function getCursor(entityType: string, dbHandle?: SQLiteDatabase): Promise<number> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<SyncCursorSqlRow>(
    'SELECT last_server_revision FROM sync_cursor WHERE entity_type = ?',
    [entityType],
  );
  return row?.last_server_revision ?? 0;
}

export async function updateCursor(
  entityType: string,
  revision: number,
  syncedAt: number = Date.now(),
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  const db = dbHandle ?? (await getDb());
  await db.runAsync(
    `INSERT INTO sync_cursor (entity_type, last_server_revision, last_synced_at)
     VALUES (?, ?, ?)
     ON CONFLICT(entity_type) DO UPDATE SET
       last_server_revision = MAX(sync_cursor.last_server_revision, excluded.last_server_revision),
       last_synced_at = excluded.last_synced_at`,
    [entityType, revision, syncedAt],
  );
}

export async function getAllCursors(
  dbHandle?: SQLiteDatabase,
): Promise<Record<string, { revision: number; lastSyncedAt: number }>> {
  const db = dbHandle ?? (await getDb());
  const rows = await db.getAllAsync<SyncCursorSqlRow>(
    'SELECT entity_type, last_server_revision, last_synced_at FROM sync_cursor',
  );
  const result: Record<string, { revision: number; lastSyncedAt: number }> = {};
  for (const row of rows) {
    result[row.entity_type] = {
      revision: row.last_server_revision,
      lastSyncedAt: row.last_synced_at,
    };
  }
  return result;
}

export async function resetCursors(dbHandle?: SQLiteDatabase): Promise<void> {
  const db = dbHandle ?? (await getDb());
  await db.runAsync('DELETE FROM sync_cursor');
}
