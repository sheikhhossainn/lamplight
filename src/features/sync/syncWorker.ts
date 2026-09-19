import { useEffect, useState } from 'react';
import { getDb } from '@/db/client';
import { getSession } from '@/lib/supabaseAuth';
import {
  fetchOutboxBatch,
  acknowledgeMutations,
  recordMutationFailure,
  getPendingMutationCount,
  setOutboxMutationListener,
  type SyncOutboxItem,
} from '@/db/repositories/syncOutbox';
import { getCursor, updateCursor } from '@/db/repositories/syncCursor';
import { resolveLibraryItemId } from '@/db/repositories/cloudLibraryMap';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type SyncStatus = 'synced' | 'syncing' | 'offline_saved' | 'needs_attention';

type SyncListener = (status: SyncStatus) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = 'synced';
let isSyncRunning = false;
let pendingReRun = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);
  return status;
}

export function scheduleDebouncedSync(delayMs = 3000): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void triggerSync();
  }, delayMs);
}

// Automatically trigger debounced sync whenever an outbox mutation is enqueued
setOutboxMutationListener(() => {
  scheduleDebouncedSync(3000);
});

function setSyncStatus(status: SyncStatus) {
  if (currentStatus !== status) {
    currentStatus = status;
    for (const listener of listeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('[SyncWorker] Error notifying listener:', err);
      }
    }
  }
}

// Exponential backoff with jitter: 5s, 30s, 2m, 10m, 1h
const BACKOFF_STEPS_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000];

function calculateNextAttempt(attemptCount: number): number {
  const idx = Math.min(attemptCount, BACKOFF_STEPS_MS.length - 1);
  const base = BACKOFF_STEPS_MS[idx];
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Date.now() + Math.max(1000, Math.floor(base + jitter));
}

/**
 * Triggers a sync iteration.
 * Merges concurrent triggers into a single-flight execution loop.
 */
export async function triggerSync(options?: { forceImmediate?: boolean }): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return;
  }

  if (isSyncRunning) {
    pendingReRun = true;
    return;
  }

  isSyncRunning = true;
  setSyncStatus('syncing');

  try {
    let continueLoop = true;
    while (continueLoop) {
      pendingReRun = false;
      await runSyncIteration(options?.forceImmediate ?? false);
      continueLoop = pendingReRun;
    }

    const pendingCount = await getPendingMutationCount();
    setSyncStatus(pendingCount > 0 ? 'offline_saved' : 'synced');
  } catch (error) {
    console.warn('[SyncWorker] Iteration error:', error);
    setSyncStatus('offline_saved');
  } finally {
    isSyncRunning = false;
  }
}

async function runSyncIteration(forceImmediate: boolean): Promise<void> {
  let session: { accessToken: string; userId: string } | null = null;
  try {
    session = await getSession();
  } catch {
    // Cannot authenticate right now -> device is offline or credentials unavailable
    setSyncStatus('offline_saved');
    return;
  }

  const now = Date.now();
  const effectiveNow = forceImmediate ? Number.MAX_SAFE_INTEGER : now;

  // 1. Fetch pending outbox mutations
  const mutations = await fetchOutboxBatch(effectiveNow);
  if (mutations.length > 0) {
    await pushMutationsBatch(mutations, session);
  }

  // 2. Incremental Pull from Server
  await pullServerChanges(session);
}

async function pushMutationsBatch(
  mutations: SyncOutboxItem[],
  session: { accessToken: string; userId: string },
): Promise<void> {
  const acknowledgedIds: string[] = [];

  for (const mutation of mutations) {
    try {
      const success = await pushSingleMutation(mutation, session);
      if (success) {
        acknowledgedIds.push(mutation.id);
      } else {
        const nextAttempt = calculateNextAttempt(mutation.attemptCount);
        await recordMutationFailure(mutation.id, 'PUSH_FAILED', nextAttempt);
      }
    } catch (err: unknown) {
      const nextAttempt = calculateNextAttempt(mutation.attemptCount);
      const errCode = (err as Error)?.message?.slice(0, 50) ?? 'NETWORK_ERROR';
      await recordMutationFailure(mutation.id, errCode, nextAttempt);
    }
  }

  if (acknowledgedIds.length > 0) {
    await acknowledgeMutations(acknowledgedIds);
  }
}

async function pushSingleMutation(
  mutation: SyncOutboxItem,
  session: { accessToken: string; userId: string },
): Promise<boolean> {
  const payload = JSON.parse(mutation.payloadJson);

  switch (mutation.entityType) {
    case 'reading_position': {
      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      const body = {
        owner_id: session.userId,
        library_item_id: libraryItemId,
        chapter_index: payload.chapterIndex,
        page_index: payload.pageIndex,
        percent_complete: payload.percentComplete,
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_positions`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'saved_word': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_words?id=eq.${mutation.entityId}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        });
        return res.ok;
      }

      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      const body = {
        id: payload.id,
        owner_id: session.userId,
        library_item_id: libraryItemId,
        source_word: payload.sourceWord,
        source_lang: payload.sourceLang,
        target_lang: payload.targetLang,
        translation: payload.translation,
        context_sentence: payload.contextSentence,
        chapter_index: payload.chapterIndex,
        page_index: payload.pageIndex ?? 0,
        paragraph_index: payload.paragraphIndex ?? 0,
        srs_box: payload.srsStage ?? 0,
        srs_ease_factor: payload.srsEaseFactor ?? 2.5,
        srs_next_review_at: payload.srsDueDate ? new Date(payload.srsDueDate).toISOString() : null,
        srs_review_count: payload.srsReps ?? 0,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/saved_words`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'highlight': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/highlights?id=eq.${mutation.entityId}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        });
        return res.ok;
      }

      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      const body = {
        id: payload.id,
        owner_id: session.userId,
        library_item_id: libraryItemId,
        chapter_index: payload.chapterIndex,
        page_index: payload.pageIndex,
        start_offset: payload.startOffset,
        end_offset: payload.endOffset,
        color_key: payload.colorKey,
        quote_text: payload.quoteText,
        quote_card_theme: payload.quoteCardTheme ?? null,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/highlights`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'review_event': {
      const body = {
        id: payload.id,
        owner_id: session.userId,
        saved_word_id: payload.savedWordId,
        grade: payload.grade,
        reviewed_at: new Date(payload.reviewedAt).toISOString(),
        prior_state: payload.priorStateJson,
        resulting_state: payload.resultingStateJson,
        device_id: payload.deviceId,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/review_events`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'quiz_attempt': {
      const body = {
        id: payload.id,
        owner_id: session.userId,
        book_id: payload.bookId,
        mode: payload.mode,
        started_at: new Date(payload.startedAt).toISOString(),
        completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : null,
        correct_count: payload.correctCount,
        question_count: payload.questionCount,
        answers: payload.answers,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'shelf': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/shelves?id=eq.${mutation.entityId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        return res.ok;
      }

      const body = {
        id: payload.id,
        owner_id: session.userId,
        name: payload.name,
        sort_order: payload.sortOrder ?? 0,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/shelves`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    case 'preference': {
      const body = {
        owner_id: session.userId,
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_preferences`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    }

    default:
      return true;
  }
}

async function pullServerChanges(session: { accessToken: string; userId: string }): Promise<void> {
  const db = await getDb();

  // 1. Pull reading positions
  try {
    const lastSynced = await getCursor('reading_positions');
    const isoDate = new Date(lastSynced).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reading_positions?owner_id=eq.${session.userId}&updated_at=gt.${encodeURIComponent(isoDate)}&order=updated_at.asc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (res.ok) {
      const positions = (await res.json()) as Array<{
        library_item_id: string;
        chapter_index: number;
        page_index: number;
        percent_complete: number;
        updated_at: string;
      }>;

      if (positions.length > 0) {
        let maxTime = lastSynced;
        await db.withTransactionAsync(async () => {
          for (const pos of positions) {
            const time = new Date(pos.updated_at).getTime();
            if (time > maxTime) maxTime = time;

            // Map library_item_id back to local_book_id
            const mapRow = await db.getFirstAsync<{ local_book_id: string }>(
              'SELECT local_book_id FROM cloud_library_map WHERE library_item_id = ?',
              [pos.library_item_id],
            );
            const bookId = mapRow?.local_book_id;
            if (bookId) {
              await db.runAsync(
                `INSERT INTO reading_positions (book_id, chapter_index, page_index, percent_complete, updated_at, continue_hidden)
                 VALUES (?, ?, ?, ?, ?, 0)
                 ON CONFLICT(book_id) DO UPDATE SET
                   chapter_index = excluded.chapter_index,
                   page_index = excluded.page_index,
                   percent_complete = MAX(reading_positions.percent_complete, excluded.percent_complete),
                   updated_at = excluded.updated_at`,
                [bookId, pos.chapter_index, pos.page_index, pos.percent_complete, time],
              );
            }
          }
        });
        await updateCursor('reading_positions', maxTime, Date.now());
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Reading positions pull error:', err);
  }
}
