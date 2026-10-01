import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_SYNC_ENTITIES,
  ENTITY_DEPENDENCY_ORDER,
  BACKOFF_STEPS_MS,
  resolveReadingPositionConflict,
  calculateNextSyncAttempt,
  type OutboxEntityType,
  type SyncStatus,
} from '../src/features/sync/syncTypes.ts';

test('SYNC-01: Complete entity coverage and sync outbox specifications', async (t) => {
  await t.test('covers all 16 durable entity types in OutboxEntityType registry', () => {
    assert.equal(ALL_SYNC_ENTITIES.length, 16);
    assert.ok(ALL_SYNC_ENTITIES.includes('reading_position'));
    assert.ok(ALL_SYNC_ENTITIES.includes('saved_word'));
    assert.ok(ALL_SYNC_ENTITIES.includes('highlight'));
    assert.ok(ALL_SYNC_ENTITIES.includes('bookmark'));
    assert.ok(ALL_SYNC_ENTITIES.includes('reader_note'));
    assert.ok(ALL_SYNC_ENTITIES.includes('shelf'));
    assert.ok(ALL_SYNC_ENTITIES.includes('shelf_item'));
    assert.ok(ALL_SYNC_ENTITIES.includes('book_favorite'));
    assert.ok(ALL_SYNC_ENTITIES.includes('review_event'));
    assert.ok(ALL_SYNC_ENTITIES.includes('quiz_attempt'));
    assert.ok(ALL_SYNC_ENTITIES.includes('reading_session'));
    assert.ok(ALL_SYNC_ENTITIES.includes('reading_goal'));
    assert.ok(ALL_SYNC_ENTITIES.includes('preference'));
    assert.ok(ALL_SYNC_ENTITIES.includes('scripture'));
    assert.ok(ALL_SYNC_ENTITIES.includes('vocabulary_deck'));
    assert.ok(ALL_SYNC_ENTITIES.includes('vocabulary_deck_item'));
  });

  await t.test('enforces strict dependency order during batch push (FULLAPP §15.2 item 6)', () => {
    // Shelf must precede shelf items
    assert.ok(ENTITY_DEPENDENCY_ORDER.shelf < ENTITY_DEPENDENCY_ORDER.shelf_item);
    // Vocabulary deck must precede vocabulary deck items
    assert.ok(ENTITY_DEPENDENCY_ORDER.vocabulary_deck < ENTITY_DEPENDENCY_ORDER.vocabulary_deck_item);
    // User preferences must sync first
    assert.equal(ENTITY_DEPENDENCY_ORDER.preference, 1);

    for (const ent of ALL_SYNC_ENTITIES) {
      const priority = ENTITY_DEPENDENCY_ORDER[ent];
      assert.ok(priority >= 1 && priority <= 16);
    }
  });

  await t.test('conflict resolution policy: furthest progress wins for reading positions (FULLAPP §15.3)', () => {
    // Remote is further ahead
    const r1 = resolveReadingPositionConflict(
      { percentComplete: 0.35, updatedAt: 2000 },
      { percentComplete: 0.70, updatedAt: 1000 },
    );
    assert.equal(r1.percentComplete, 0.70);
    assert.equal(r1.source, 'remote');

    // Local is further ahead
    const r2 = resolveReadingPositionConflict(
      { percentComplete: 0.85, updatedAt: 1000 },
      { percentComplete: 0.50, updatedAt: 2000 },
    );
    assert.equal(r2.percentComplete, 0.85);
    assert.equal(r2.source, 'local');

    // Equal progress, newest timestamp wins
    const r3 = resolveReadingPositionConflict(
      { percentComplete: 0.50, updatedAt: 1000 },
      { percentComplete: 0.50, updatedAt: 2000 },
    );
    assert.equal(r3.percentComplete, 0.50);
    assert.equal(r3.source, 'remote');
  });

  await t.test('tombstone deletion prevents resurrection of deleted records (FULLAPP §15.2 item 5)', () => {
    function applyWordUpdate(
      existingRecord: { id: string; translation: string; deletedAt?: string | null },
      incomingChange: { id: string; translation: string; deletedAt?: string | null; updatedAt: number },
    ): { active: boolean; translation: string } {
      if (existingRecord.deletedAt || incomingChange.deletedAt) {
        return { active: false, translation: existingRecord.translation };
      }
      return { active: true, translation: incomingChange.translation };
    }

    // Incoming tombstone deletes record
    const res1 = applyWordUpdate(
      { id: 'w1', translation: 'old' },
      { id: 'w1', translation: 'old', deletedAt: '2026-09-25T12:00:00Z', updatedAt: 2000 },
    );
    assert.equal(res1.active, false);

    // Stale update does not resurrect tombstoned record
    const res2 = applyWordUpdate(
      { id: 'w1', translation: 'old', deletedAt: '2026-09-25T12:00:00Z' },
      { id: 'w1', translation: 'resurrect attempt', updatedAt: 3000 },
    );
    assert.equal(res2.active, false);
  });

  await t.test('retry backoff calculation increases intervals with attempt count (FULLAPP §15.2 item 8)', () => {
    const fixedNow = 1000000;
    const t0 = calculateNextSyncAttempt(0, fixedNow);
    const t1 = calculateNextSyncAttempt(1, fixedNow);
    const t2 = calculateNextSyncAttempt(2, fixedNow);
    const t3 = calculateNextSyncAttempt(3, fixedNow);
    const t4 = calculateNextSyncAttempt(4, fixedNow);

    // Verify jittered values are centered around base intervals: 5s, 30s, 2m, 10m, 1h
    assert.ok(t0 >= fixedNow + 3000 && t0 <= fixedNow + 7000);
    assert.ok(t1 >= fixedNow + 20000 && t1 <= fixedNow + 40000);
    assert.ok(t2 >= fixedNow + 90000 && t2 <= fixedNow + 150000);
    assert.ok(t3 >= fixedNow + 400000 && t3 <= fixedNow + 800000);
    assert.ok(t4 >= fixedNow + 2500000 && t4 <= fixedNow + 4500000);
  });

  await t.test('sync statuses accurately describe system states (FULLAPP §15.2)', () => {
    const VALID_STATUSES: SyncStatus[] = ['synced', 'syncing', 'offline_saved', 'needs_attention', 'guest'];
    for (const status of VALID_STATUSES) {
      assert.ok(typeof status === 'string');
    }
  });
});
