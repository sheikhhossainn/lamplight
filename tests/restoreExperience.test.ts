import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialRestorePlan,
  updateRestoreItemStatus,
  retrySingleRestoreItem,
  shouldRestoreCloudPosition,
  type RestoreSessionState,
} from '../src/features/sync/restoreService.ts';

test('SYNC-03: Restore experience and cloud recovery guarantees', async (t) => {
  await t.test('orders restoration plan with metadata first before book content (FULLAPP §15.5 item 2)', () => {
    const plan = createInitialRestorePlan({
      hasShelves: true,
      positionCount: 3,
      savedWordCount: 15,
      noteCount: 4,
      bookCount: 2,
      bookTitles: [
        { id: '1342', title: 'Pride and Prejudice' },
        { id: '84', title: 'Frankenstein' },
      ],
    });

    assert.equal(plan.items.length, 6);
    // Categories sequence: metadata -> positions -> learning -> books
    assert.equal(plan.items[0].category, 'metadata');
    assert.equal(plan.items[1].category, 'positions');
    assert.equal(plan.items[2].category, 'learning');
    assert.equal(plan.items[3].category, 'learning');
    assert.equal(plan.items[4].category, 'books');
    assert.equal(plan.items[5].category, 'books');

    // Partial restore is immediately marked usable
    assert.equal(plan.isPartialUsable, true);
  });

  await t.test('never replaces newer local progress with older cloud progress (FULLAPP §15.5 item 5)', () => {
    const now = Date.now();

    // Case 1: Local is 80% complete at t=2000. Cloud is 50% complete at t=1000.
    const shouldRestore1 = shouldRestoreCloudPosition(
      { percentComplete: 0.80, updatedAt: now },
      { percentComplete: 0.50, updatedAt: now - 50000 },
    );
    assert.equal(shouldRestore1, false, 'Local progress is ahead; cloud must not overwrite');

    // Case 2: Local is 30% complete. Cloud is 75% complete from another device.
    const shouldRestore2 = shouldRestoreCloudPosition(
      { percentComplete: 0.30, updatedAt: now - 10000 },
      { percentComplete: 0.75, updatedAt: now },
    );
    assert.equal(shouldRestore2, true, 'Cloud is further ahead; should restore');

    // Case 3: Fresh device with no local position.
    const shouldRestore3 = shouldRestoreCloudPosition(null, { percentComplete: 0.45, updatedAt: now });
    assert.equal(shouldRestore3, true, 'No local progress; should restore cloud position');
  });

  await t.test('supports granular retry of a single failed item (FULLAPP §15.5 item 4)', () => {
    let state = createInitialRestorePlan({
      hasShelves: true,
      positionCount: 1,
      savedWordCount: 1,
      noteCount: 0,
      bookCount: 1,
    });

    // Mark metadata restored, but positions failed
    state = updateRestoreItemStatus(state, 'meta_shelves', 'restored');
    state = updateRestoreItemStatus(state, 'meta_positions', 'failed', 'Timeout error');

    assert.equal(state.failedCount, 1);
    assert.equal(state.restoredCount, 1);
    assert.equal(state.items.find((i) => i.id === 'meta_positions')?.status, 'failed');

    // User taps retry on the failed item
    state = retrySingleRestoreItem(state, 'meta_positions');
    assert.equal(state.failedCount, 0);
    assert.equal(state.items.find((i) => i.id === 'meta_positions')?.status, 'pending');
    assert.equal(state.items.find((i) => i.id === 'meta_positions')?.errorMessage, undefined);
  });

  await t.test('tracks overall stage completion and partial usability accurately', () => {
    let state = createInitialRestorePlan({
      hasShelves: true,
      positionCount: 1,
      savedWordCount: 0,
      noteCount: 0,
      bookCount: 0,
    });

    assert.equal(state.stage, 'idle');
    state = updateRestoreItemStatus(state, 'meta_shelves', 'restored');
    state = updateRestoreItemStatus(state, 'meta_positions', 'restored');

    assert.equal(state.stage, 'completed');
    assert.equal(state.restoredCount, 2);
    assert.equal(state.failedCount, 0);
    assert.ok(state.completedAt);
  });
});
