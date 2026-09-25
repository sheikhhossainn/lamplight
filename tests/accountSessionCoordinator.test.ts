import test from 'node:test';
import assert from 'node:assert/strict';

import {
  planAuthTransition,
  planSignOut,
} from '../src/features/account/accountSessionCoordinator';

test('AUTH-03: planAuthTransition follows strict side-effect order per FULLAPP §6.4 item 2', () => {
  const plan = planAuthTransition({
    newUserId: 'usr_new_123',
    type: 'login',
    preserveOutbox: false,
  });

  // Verify the exact 6-step sequence
  assert.deepEqual(plan.steps, [
    'update_revenuecat_identity',
    'reset_sync_cursors',
    'purge_stale_outbox',
    'refresh_entitlements',
    'trigger_forced_sync',
    'record_telemetry_event',
  ]);
  assert.equal(plan.preserveOutbox, false);
  assert.equal(plan.targetUserId, 'usr_new_123');
  assert.equal(plan.telemetryEvent.eventType, 'account_login_completed');
  assert.equal(plan.telemetryEvent.payload.userId, 'usr_new_123');
  assert.equal((plan.telemetryEvent.payload as any).email, undefined);
});

test('AUTH-03: planAuthTransition preserves outbox during account merge', () => {
  const plan = planAuthTransition({
    priorUserId: 'guest_prior_789',
    newUserId: 'usr_target_456',
    type: 'merge',
    preserveOutbox: true,
  });

  assert.deepEqual(plan.steps, [
    'update_revenuecat_identity',
    'reset_sync_cursors',
    'preserve_pending_outbox',
    'refresh_entitlements',
    'trigger_forced_sync',
    'record_telemetry_event',
  ]);
  assert.equal(plan.preserveOutbox, true);
  assert.equal(plan.priorUserId, 'guest_prior_789');
  assert.equal(plan.targetUserId, 'usr_target_456');
  assert.equal(plan.telemetryEvent.eventType, 'account_merge_completed');
  assert.equal(plan.telemetryEvent.payload.priorUserId, 'guest_prior_789');
  assert.equal(plan.telemetryEvent.payload.targetUserId, 'usr_target_456');
  assert.equal((plan.telemetryEvent.payload as any).email, undefined);
});

test('AUTH-03: planAuthTransition preserves outbox during account protection', () => {
  const plan = planAuthTransition({
    newUserId: 'usr_protected_111',
    type: 'protect',
  });

  assert.equal(plan.preserveOutbox, true);
  assert.equal(plan.steps[2], 'preserve_pending_outbox');
  assert.equal(plan.telemetryEvent.eventType, 'account_protected');
  assert.equal(plan.telemetryEvent.payload.userId, 'usr_protected_111');
  assert.equal((plan.telemetryEvent.payload as any).email, undefined);
});

test('AUTH-03: planSignOut covers all 7 teardown steps in order', () => {
  const keepDataPlan = planSignOut(true);
  assert.deepEqual(keepDataPlan.steps, [
    'pause_or_finish_sync',
    'clear_account_bound_cursors',
    'clear_tokens_and_local_data',
    'initialize_anonymous_session',
    'initialize_anonymous_revenuecat_identity',
    'reset_entitlements_to_free',
    'record_sign_out_event',
  ]);
  assert.equal(keepDataPlan.keepLocalData, true);
  assert.equal(keepDataPlan.telemetryEvent.eventType, 'account_signed_out');
  assert.equal(keepDataPlan.telemetryEvent.payload.keepLocalData, true);
  assert.equal((keepDataPlan.telemetryEvent.payload as any).email, undefined);

  const clearDataPlan = planSignOut(false);
  assert.equal(clearDataPlan.keepLocalData, false);
  assert.equal(clearDataPlan.telemetryEvent.payload.keepLocalData, false);
});
