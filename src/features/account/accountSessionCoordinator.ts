export type AuthTransitionType = 'protect' | 'login' | 'merge';

export interface TransitionOptions {
  newUserId: string;
  priorUserId?: string | null;
  type: AuthTransitionType;
  preserveOutbox?: boolean;
}

export interface TransitionPlan {
  steps: string[];
  preserveOutbox: boolean;
  targetUserId: string;
  priorUserId: string | null;
  telemetryEvent: {
    eventType: string;
    payload: Record<string, unknown>;
  };
}

export interface SignOutPlan {
  steps: string[];
  keepLocalData: boolean;
  telemetryEvent: {
    eventType: string;
    payload: Record<string, unknown>;
  };
}

/**
 * Plans the exact sequence of auth transition side effects per FULLAPP §6.4 item 2:
 * 1. RevenueCat identity
 * 2. Sync cursors
 * 3. Pending outbox ownership
 * 4. Entitlement state
 * 5. Forced immediate sync
 * 6. Telemetry without email
 */
export function planAuthTransition(options: TransitionOptions): TransitionPlan {
  const { newUserId, priorUserId, type, preserveOutbox } = options;
  const shouldPreserveOutbox = preserveOutbox ?? (type === 'merge' || type === 'protect');

  const telemetryEvent =
    type === 'protect'
      ? { eventType: 'account_protected', payload: { userId: newUserId } }
      : type === 'merge'
      ? {
          eventType: 'account_merge_completed',
          payload: { priorUserId: priorUserId ?? null, targetUserId: newUserId },
        }
      : { eventType: 'account_login_completed', payload: { userId: newUserId } };

  return {
    steps: [
      'update_revenuecat_identity',
      'reset_sync_cursors',
      shouldPreserveOutbox ? 'preserve_pending_outbox' : 'purge_stale_outbox',
      'refresh_entitlements',
      'trigger_forced_sync',
      'record_telemetry_event',
    ],
    preserveOutbox: shouldPreserveOutbox,
    targetUserId: newUserId,
    priorUserId: priorUserId ?? null,
    telemetryEvent,
  };
}

/**
 * Plans the sign out sequence per FULLAPP §6.4 item 4 & 5.
 */
export function planSignOut(keepLocalData: boolean = true): SignOutPlan {
  return {
    steps: [
      'pause_or_finish_sync',
      'clear_account_bound_cursors',
      'clear_tokens_and_local_data',
      'initialize_anonymous_session',
      'initialize_anonymous_revenuecat_identity',
      'reset_entitlements_to_free',
      'record_sign_out_event',
    ],
    keepLocalData,
    telemetryEvent: {
      eventType: 'account_signed_out',
      payload: { keepLocalData },
    },
  };
}

// Dynamic loaders for decoupled execution in Node tests
async function getBilling() {
  return await import('@/features/billing/revenueCatClient');
}

async function getSync() {
  return await import('@/features/sync/syncWorker');
}

async function getAuth() {
  return await import('@/lib/supabaseAuth');
}

async function getSyncCursor() {
  return await import('@/db/repositories/syncCursor');
}

async function getSyncOutbox() {
  return await import('@/db/repositories/syncOutbox');
}

async function getEntitlements() {
  return await import('@/features/subscription/entitlementService');
}

async function getJournal() {
  return await import('@/db/repositories/syncMergeJournal');
}

async function getAnalytics() {
  return await import('@/features/analytics/analytics');
}

/**
 * Executes auth transition side effects when the Supabase user ID changes.
 */
export async function coordinateAuthTransition(options: TransitionOptions): Promise<void> {
  const plan = planAuthTransition(options);

  // 1. Update RevenueCat identity
  try {
    const billing = await getBilling();
    await billing.configureBilling(plan.targetUserId);
  } catch (err) {
    console.warn('[SessionCoordinator] RevenueCat identity transition error:', err);
  }

  // 2. Sync cursors: reset cursors so client fetches cloud revisions for new user identity
  try {
    const cursorRepo = await getSyncCursor();
    await cursorRepo.resetCursors();
  } catch (err) {
    console.warn('[SessionCoordinator] Reset cursors error:', err);
  }

  // 3. Pending outbox ownership:
  // For merge or account protection, preserve pending local mutations so they sync to new account.
  // For clean sign-in to an existing account without merging, purge stale guest outbox items
  // to guarantee no mutation is uploaded under the wrong owner ID.
  try {
    if (!plan.preserveOutbox) {
      const outboxRepo = await getSyncOutbox();
      await outboxRepo.resetOutbox();
    }
  } catch (err) {
    console.warn('[SessionCoordinator] Outbox ownership error:', err);
  }

  // 4. Entitlement state: refresh server-verified entitlements
  try {
    const ent = await getEntitlements();
    const refreshReason =
      options.type === 'protect'
        ? 'account_protect'
        : options.type === 'merge'
        ? 'account_merge'
        : 'account_login';
    await ent.refreshEntitlements(refreshReason);
  } catch (err) {
    console.warn('[SessionCoordinator] Refresh entitlements error:', err);
  }

  // 5. Trigger immediate cloud sync for new identity
  try {
    const syncWorker = await getSync();
    void syncWorker.triggerSync({ forceImmediate: true });
  } catch (err) {
    console.warn('[SessionCoordinator] Trigger sync error:', err);
  }

  // 6. Record telemetry events without logging email addresses (FULLAPP §6.4 item 5)
  try {
    const analytics = await getAnalytics();
    analytics.logEvent(plan.telemetryEvent.eventType, plan.telemetryEvent.payload);
  } catch {
    // Non-critical telemetry error
  }
}

/**
 * Handles account sign out per FULLAPP §6.4 item 4 & 5.
 */
export async function coordinateSignOut(keepLocalData: boolean = true): Promise<void> {
  const plan = planSignOut(keepLocalData);

  // 1. Finish or pause current sync
  try {
    const syncWorker = await getSync();
    await syncWorker.pauseOrFinishSync(3000);
  } catch (err) {
    console.warn('[SessionCoordinator] Pause sync error:', err);
  }

  // 2. Clear account-bound cursors
  try {
    const cursorRepo = await getSyncCursor();
    await cursorRepo.resetCursors();
  } catch (err) {
    console.warn('[SessionCoordinator] Clear cursors error:', err);
  }

  // 3. Clear session tokens, optionally clear SQLite tables, and re-initialize anonymous Supabase session
  try {
    const auth = await getAuth();
    await auth.signOutUser(keepLocalData);
  } catch (err) {
    console.warn('[SessionCoordinator] Auth signOutUser error:', err);
  }

  // 4. Initialize matching RevenueCat identity for new anonymous user
  try {
    const auth = await getAuth();
    const newSession = await auth.getSession();
    const billing = await getBilling();
    if (newSession?.userId) {
      await billing.configureBilling(newSession.userId);
    } else {
      await billing.logOutBilling();
    }
  } catch (err) {
    console.warn('[SessionCoordinator] RevenueCat anonymous config error:', err);
  }

  // 5. Reset entitlements to free
  try {
    const ent = await getEntitlements();
    ent.resetEntitlementsToFree();
  } catch (err) {
    console.warn('[SessionCoordinator] Reset entitlements error:', err);
  }

  // 6. Record account_signed_out event without email
  try {
    const analytics = await getAnalytics();
    analytics.logEvent(plan.telemetryEvent.eventType, plan.telemetryEvent.payload);
  } catch {
    // Non-critical
  }
}

/**
 * Reconciles incomplete merge journals on app startup.
 * Guarantees account transitions survive app termination without leaving the reader in a corrupted state.
 */
export async function reconcilePendingMergeJournals(): Promise<void> {
  try {
    const journalRepo = await getJournal();
    const latest = await journalRepo.getLatestMergeJournal();
    if (!latest) return;

    if (latest.state === 'staging' || latest.state === 'merging') {
      console.warn(`[SessionCoordinator] Reconciling interrupted merge journal ${latest.id} (state: ${latest.state})`);
      await journalRepo.updateMergeJournalState(latest.id, 'failed');
      const analytics = await getAnalytics();
      analytics.logEvent('account_merge_failed', {
        journalId: latest.id,
        reason: 'recovered_incomplete_journal_after_restart',
      });
    }
  } catch (err) {
    console.warn('[SessionCoordinator] Error reconciling merge journal:', err);
  }
}
