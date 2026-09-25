import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createAnalyticsQueueItem,
  type AnalyticsQueueItem,
  MAX_ANALYTICS_QUEUE_SIZE,
  ANALYTICS_BATCH_SIZE,
  ANALYTICS_MAX_ATTEMPTS,
  ANALYTICS_RETENTION_MS,
} from '@/features/analytics/analyticsQueue';

async function loadDb(dbHandle?: SQLiteDatabase) {
  if (dbHandle) return dbHandle;
  const { getDb } = await import('@/db/client');
  return getDb();
}

type AnalyticsQueueSqlRow = {
  id: string;
  event_type: string;
  payload_json: string;
  occurred_at: number;
  created_at: number;
  attempt_count: number;
  last_attempt_at: number | null;
  last_error: string | null;
};

function fromSqlRow(row: AnalyticsQueueSqlRow): AnalyticsQueueItem {
  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(row.payload_json);
  } catch {
    parsedPayload = {};
  }

  return {
    id: row.id,
    eventType: row.event_type,
    payload: parsedPayload,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    lastError: row.last_error,
  };
}

/**
 * Enqueues a sanitized analytics event into the local SQLite queue.
 * Automatically enforces queue size caps and prunes expired items.
 */
export async function enqueueEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
  occurredAt?: number,
  dbHandle?: SQLiteDatabase,
): Promise<string> {
  const db = await loadDb(dbHandle);
  const item = createAnalyticsQueueItem(eventType, payload, occurredAt);
  const payloadJson = JSON.stringify(item.payload);

  await db.runAsync(
    `INSERT INTO analytics_queue (
       id, event_type, payload_json, occurred_at, created_at, attempt_count, last_attempt_at, last_error
     ) VALUES (?, ?, ?, ?, ?, 0, NULL, NULL)`,
    [item.id, item.eventType, payloadJson, item.occurredAt, item.createdAt],
  );

  // Enforce queue retention and size cap policies
  const now = Date.now();
  const cutoffTime = now - ANALYTICS_RETENTION_MS;

  // Prune expired or excessive failed attempts
  await db.runAsync(
    'DELETE FROM analytics_queue WHERE occurred_at < ? OR attempt_count >= ?',
    [cutoffTime, ANALYTICS_MAX_ATTEMPTS],
  );

  // Check queue size and trim oldest if exceeding MAX_ANALYTICS_QUEUE_SIZE
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT count(*) as count FROM analytics_queue',
  );
  if (countRow && countRow.count > MAX_ANALYTICS_QUEUE_SIZE) {
    const excess = countRow.count - MAX_ANALYTICS_QUEUE_SIZE;
    await db.runAsync(
      `DELETE FROM analytics_queue WHERE id IN (
         SELECT id FROM analytics_queue ORDER BY occurred_at ASC LIMIT ?
       )`,
      [excess],
    );
  }

  return item.id;
}

/**
 * Fetches the oldest batch of queued events for upload.
 */
export async function fetchQueueBatch(
  limit: number = ANALYTICS_BATCH_SIZE,
  dbHandle?: SQLiteDatabase,
): Promise<AnalyticsQueueItem[]> {
  const db = await loadDb(dbHandle);
  const rows = await db.getAllAsync<AnalyticsQueueSqlRow>(
    'SELECT * FROM analytics_queue ORDER BY occurred_at ASC LIMIT ?',
    [limit],
  );
  return rows.map(fromSqlRow);
}

/**
 * Deletes items that were successfully uploaded.
 */
export async function deleteQueueItems(
  ids: string[],
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  if (ids.length === 0) return;
  const db = await loadDb(dbHandle);
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM analytics_queue WHERE id IN (${placeholders})`,
    ids,
  );
}

/**
 * Records a failed upload attempt for a batch of items.
 */
export async function recordQueueAttempt(
  ids: string[],
  errorMessage: string,
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  if (ids.length === 0) return;
  const db = await loadDb(dbHandle);
  const now = Date.now();
  const placeholders = ids.map(() => '?').join(',');

  await db.runAsync(
    `UPDATE analytics_queue
     SET attempt_count = attempt_count + 1,
         last_attempt_at = ?,
         last_error = ?
     WHERE id IN (${placeholders})`,
    [now, errorMessage, ...ids],
  );

  // Remove any that have reached max attempts
  await db.runAsync(
    'DELETE FROM analytics_queue WHERE attempt_count >= ?',
    [ANALYTICS_MAX_ATTEMPTS],
  );
}

/**
 * Returns the count of pending items in the analytics queue.
 */
export async function getQueueCount(dbHandle?: SQLiteDatabase): Promise<number> {
  const db = await loadDb(dbHandle);
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count(*) as count FROM analytics_queue',
  );
  return row?.count ?? 0;
}

/**
 * Clears all items in the analytics queue.
 */
export async function clearQueue(dbHandle?: SQLiteDatabase): Promise<void> {
  const db = await loadDb(dbHandle);
  await db.runAsync('DELETE FROM analytics_queue');
}
