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
  | 'reading_session'
  | 'vocabulary_deck'
  | 'vocabulary_deck_item'
  | 'bookmark'
  | 'reader_note'
  | 'reading_goal'
  | 'book_favorite';

export type SyncStatus = 'synced' | 'syncing' | 'offline_saved' | 'needs_attention' | 'guest';

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

export const ALL_SYNC_ENTITIES: readonly OutboxEntityType[] = [
  'preference',
  'shelf',
  'shelf_item',
  'reading_position',
  'saved_word',
  'review_event',
  'highlight',
  'quiz_attempt',
  'scripture',
  'reading_session',
  'vocabulary_deck',
  'vocabulary_deck_item',
  'bookmark',
  'reader_note',
  'reading_goal',
  'book_favorite',
] as const;

export const ENTITY_DEPENDENCY_ORDER: Record<OutboxEntityType, number> = {
  preference: 1,
  shelf: 2,
  shelf_item: 3,
  reading_position: 4,
  saved_word: 5,
  review_event: 6,
  highlight: 7,
  quiz_attempt: 8,
  scripture: 9,
  bookmark: 10,
  reader_note: 11,
  reading_session: 12,
  reading_goal: 13,
  vocabulary_deck: 14,
  vocabulary_deck_item: 15,
  book_favorite: 16,
};

/**
 * Conflict resolution: Furthest progress wins; newest timestamp breaks ties (FULLAPP §15.3).
 */
export function resolveReadingPositionConflict(
  local: { percentComplete: number; updatedAt: number },
  remote: { percentComplete: number; updatedAt: number },
): { percentComplete: number; source: 'local' | 'remote' } {
  if (remote.percentComplete > local.percentComplete) {
    return { percentComplete: remote.percentComplete, source: 'remote' };
  }
  if (local.percentComplete > remote.percentComplete) {
    return { percentComplete: local.percentComplete, source: 'local' };
  }
  return remote.updatedAt >= local.updatedAt
    ? { percentComplete: remote.percentComplete, source: 'remote' }
    : { percentComplete: local.percentComplete, source: 'local' };
}

/**
 * Exponential backoff with jitter: 5s, 30s, 2m, 10m, 1h (FULLAPP §15.2 item 8).
 */
export const BACKOFF_STEPS_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000];

export function calculateNextSyncAttempt(attemptCount: number, nowMs = Date.now()): number {
  const idx = Math.min(attemptCount, BACKOFF_STEPS_MS.length - 1);
  const base = BACKOFF_STEPS_MS[idx];
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return nowMs + Math.max(1000, Math.floor(base + jitter));
}
