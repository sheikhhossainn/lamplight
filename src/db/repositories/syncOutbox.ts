import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import type { SQLiteDatabase } from 'expo-sqlite';

export type OutboxOperation = 'upsert' | 'delete';

export type OutboxEntityType =
  | 'preference'
  | 'shelf'
  | 'shelf_item'
  | 'reading_position'
  | 'saved_word'
  | 'review_event'
  | 'highlight'
  | 'quiz_attempt'
  | 'scripture'
  | 'reading_session';

export type SyncOutboxItem = {
  id: string;
  entityType: OutboxEntityType;
  entityId: string;
  operation: OutboxOperation;
  payloadJson: string;
  idempotencyKey: string;
  createdAt: number;
  attemptCount: number;
  nextAttemptAt: number | null;
  lastErrorCode: string | null;
};

type SyncOutboxSqlRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  idempotency_key: string;
  created_at: number;
  attempt_count: number;
  next_attempt_at: number | null;
  last_error_code: string | null;
};

function fromSqlRow(row: SyncOutboxSqlRow): SyncOutboxItem {
  return {
    id: row.id,
    entityType: row.entity_type as OutboxEntityType,
    entityId: row.entity_id,
    operation: row.operation as OutboxOperation,
    payloadJson: row.payload_json,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastErrorCode: row.last_error_code,
  };
}

const MAX_BATCH_SIZE_BYTES = 256 * 1024; // 256 KB
const MAX_BATCH_COUNT = 50;

type OutboxMutationListener = () => void;
let mutationListener: OutboxMutationListener | null = null;

export function setOutboxMutationListener(listener: OutboxMutationListener | null) {
  mutationListener = listener;
}

/**
 * Enqueue a mutation into the sync outbox with automatic compaction rules.
 * Accepts an optional dbHandle to run within an existing serialized transaction.
 */
export async function enqueueMutation(
  mutation: {
    entityType: OutboxEntityType;
    entityId: string;
    operation: OutboxOperation;
    payload: unknown;
    idempotencyKey?: string;
  },
  dbHandle?: SQLiteDatabase,
): Promise<string> {
  const db = dbHandle ?? (await getDb());
  const now = Date.now();
  const payloadJson = JSON.stringify(mutation.payload);

  // Apply compaction rules
  if (mutation.operation === 'delete') {
    // If deleting a saved word, highlight, or shelf item that was created locally
    // but not yet pushed to the server, collapse both into a no-op.
    if (['saved_word', 'highlight', 'shelf_item', 'preference'].includes(mutation.entityType)) {
      const pendingCreate = await db.getFirstAsync<SyncOutboxSqlRow>(
        'SELECT id FROM sync_outbox WHERE entity_type = ? AND entity_id = ? AND operation = ?',
        [mutation.entityType, mutation.entityId, 'upsert'],
      );
      if (pendingCreate) {
        // Created locally and deleted before any push -> remove create, omit delete
        await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [pendingCreate.id]);
        return pendingCreate.id;
      }
    }
  } else if (mutation.operation === 'upsert') {
    // For reading position, preference, and shelf edits: keep only the newest unsent mutation
    if (['reading_position', 'preference', 'shelf'].includes(mutation.entityType)) {
      const pendingRow = await db.getFirstAsync<SyncOutboxSqlRow>(
        'SELECT id FROM sync_outbox WHERE entity_type = ? AND entity_id = ?',
        [mutation.entityType, mutation.entityId],
      );
      if (pendingRow) {
        await db.runAsync(
          `UPDATE sync_outbox
           SET payload_json = ?, created_at = ?, next_attempt_at = NULL, last_error_code = NULL
           WHERE id = ?`,
          [payloadJson, now, pendingRow.id],
        );
        return pendingRow.id;
      }
    }
  }

  const id = generateId();
  const idempotencyKey =
    mutation.idempotencyKey ?? `${mutation.entityType}:${mutation.entityId}:${now}:${Math.random().toString(36).slice(2, 8)}`;

  await db.runAsync(
    `INSERT INTO sync_outbox (
       id, entity_type, entity_id, operation, payload_json,
       idempotency_key, created_at, attempt_count, next_attempt_at, last_error_code
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       operation = excluded.operation,
       created_at = excluded.created_at`,
    [
      id,
      mutation.entityType,
      mutation.entityId,
      mutation.operation,
      payloadJson,
      idempotencyKey,
      now,
    ],
  );

  try {
    mutationListener?.();
  } catch {
    // Non-critical notification error
  }

  return id;
}

/**
 * Fetches a batch of up to 50 mutations or 256 KB, ordered by entity dependency order:
 * preference -> shelf -> shelf_item -> reading_position -> saved_word -> review_event -> highlight -> quiz_attempt -> scripture
 */
export async function fetchOutboxBatch(
  nowMs: number = Date.now(),
  dbHandle?: SQLiteDatabase,
): Promise<SyncOutboxItem[]> {
  const db = dbHandle ?? (await getDb());

  const rows = await db.getAllAsync<SyncOutboxSqlRow>(
    `SELECT * FROM sync_outbox
     WHERE next_attempt_at IS NULL OR next_attempt_at <= ?
     ORDER BY CASE entity_type
       WHEN 'preference' THEN 1
       WHEN 'shelf' THEN 2
       WHEN 'shelf_item' THEN 3
       WHEN 'reading_position' THEN 4
       WHEN 'saved_word' THEN 5
       WHEN 'review_event' THEN 6
       WHEN 'highlight' THEN 7
       WHEN 'quiz_attempt' THEN 8
       WHEN 'scripture' THEN 9
       ELSE 10 END ASC, created_at ASC
     LIMIT ?`,
    [nowMs, MAX_BATCH_COUNT * 2], // Oversample slightly to handle byte slicing
  );

  const batch: SyncOutboxItem[] = [];
  let totalBytes = 0;

  for (const row of rows) {
    if (batch.length >= MAX_BATCH_COUNT) break;
    const item = fromSqlRow(row);
    const itemBytes = (item.payloadJson ? item.payloadJson.length : 0) + item.idempotencyKey.length + 100;
    if (batch.length > 0 && totalBytes + itemBytes > MAX_BATCH_SIZE_BYTES) {
      break;
    }
    totalBytes += itemBytes;
    batch.push(item);
  }

  return batch;
}

/**
 * Remove successfully acknowledged mutations from the outbox.
 */
export async function acknowledgeMutations(
  ids: string[],
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  if (ids.length === 0) return;
  const db = dbHandle ?? (await getDb());
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM sync_outbox WHERE id IN (${placeholders})`, ids);
}

/**
 * Record a failure on a mutation with exponential backoff delay.
 */
export async function recordMutationFailure(
  id: string,
  errorCode: string,
  nextAttemptAt: number,
  dbHandle?: SQLiteDatabase,
): Promise<void> {
  const db = dbHandle ?? (await getDb());
  await db.runAsync(
    `UPDATE sync_outbox
     SET attempt_count = attempt_count + 1,
         next_attempt_at = ?,
         last_error_code = ?
     WHERE id = ?`,
    [nextAttemptAt, errorCode, id],
  );
}

/**
 * Returns the count of pending mutations waiting in outbox.
 */
export async function getPendingMutationCount(dbHandle?: SQLiteDatabase): Promise<number> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_outbox',
  );
  return row?.count ?? 0;
}

/**
 * Returns the oldest unsent mutation for telemetry and diagnostics.
 */
export async function getOldestUnsentMutation(dbHandle?: SQLiteDatabase): Promise<SyncOutboxItem | null> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<SyncOutboxSqlRow>(
    'SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 1',
  );
  return row ? fromSqlRow(row) : null;
}

/**
 * Purges the entire outbox (e.g. on account switch / logout).
 */
export async function resetOutbox(dbHandle?: SQLiteDatabase): Promise<void> {
  const db = dbHandle ?? (await getDb());
  await db.runAsync('DELETE FROM sync_outbox');
}
