import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import { enqueueMutation } from './syncOutbox';
import type { SQLiteDatabase } from 'expo-sqlite';

export type ReviewEvent = {
  id: string;
  savedWordId: string;
  grade: number;
  reviewedAt: number;
  priorStateJson: string;
  resultingStateJson: string;
  deviceId: string;
  createdAt: number;
};

type ReviewEventSqlRow = {
  id: string;
  saved_word_id: string;
  grade: number;
  reviewed_at: number;
  prior_state_json: string;
  resulting_state_json: string;
  device_id: string;
  created_at: number;
};

function fromSqlRow(row: ReviewEventSqlRow): ReviewEvent {
  return {
    id: row.id,
    savedWordId: row.saved_word_id,
    grade: row.grade,
    reviewedAt: row.reviewed_at,
    priorStateJson: row.prior_state_json,
    resultingStateJson: row.resulting_state_json,
    deviceId: row.device_id,
    createdAt: row.created_at,
  };
}

export async function recordReviewEvent(
  event: Omit<ReviewEvent, 'id' | 'createdAt'> & { id?: string },
  dbHandle?: SQLiteDatabase,
): Promise<ReviewEvent> {
  const db = dbHandle ?? (await getDb());
  const id = event.id ?? generateId();
  const createdAt = Date.now();

  await db.runAsync(
    `INSERT INTO review_events (
       id, saved_word_id, grade, reviewed_at, prior_state_json, resulting_state_json, device_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.savedWordId,
      event.grade,
      event.reviewedAt,
      event.priorStateJson,
      event.resultingStateJson,
      event.deviceId,
      createdAt,
    ],
  );

  const fullEvent: ReviewEvent = {
    ...event,
    id,
    createdAt,
  };

  // Enqueue to sync outbox (append-only)
  await enqueueMutation(
    {
      entityType: 'review_event',
      entityId: id,
      operation: 'upsert',
      payload: fullEvent,
      idempotencyKey: `review_event:${id}`,
    },
    db,
  );

  return fullEvent;
}

export async function listReviewEventsForWord(
  savedWordId: string,
  dbHandle?: SQLiteDatabase,
): Promise<ReviewEvent[]> {
  const db = dbHandle ?? (await getDb());
  const rows = await db.getAllAsync<ReviewEventSqlRow>(
    'SELECT * FROM review_events WHERE saved_word_id = ? ORDER BY reviewed_at DESC',
    [savedWordId],
  );
  return rows.map(fromSqlRow);
}
