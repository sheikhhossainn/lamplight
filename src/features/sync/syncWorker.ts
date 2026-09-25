import { useEffect, useState } from 'react';
import { getDb } from '@/db/client';
import { getSession, isAuthenticatedAccount } from '@/lib/supabaseAuth';
import {
  fetchOutboxBatch,
  acknowledgeMutations,
  recordMutationFailure,
  getPendingMutationCount,
  setOutboxMutationListener,
  type SyncOutboxItem,
} from '@/db/repositories/syncOutbox';
import { getCursor, updateCursor } from '@/db/repositories/syncCursor';
import { resolveLibraryItemId, resolveLocalBookId } from '@/db/repositories/cloudLibraryMap';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type SyncStatus = 'synced' | 'syncing' | 'offline_saved' | 'needs_attention' | 'guest';

type SyncListener = (status: SyncStatus) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = 'guest';
let isSyncRunning = false;
let pendingReRun = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncAborted = false;

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

export async function checkNetworkConnectivity(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function refreshSyncStatus(): Promise<SyncStatus> {
  const isAuth = await isAuthenticatedAccount();
  if (!isAuth) {
    setSyncStatus('guest');
    return 'guest';
  }
  if (currentStatus === 'guest') {
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      setSyncStatus('offline_saved');
      return 'offline_saved';
    }
    const pendingCount = await getPendingMutationCount().catch(() => 0);
    const initialStatus = pendingCount > 0 ? 'offline_saved' : 'synced';
    setSyncStatus(initialStatus);
    return initialStatus;
  }
  return currentStatus;
}

// Initial status reconciliation on load
void isAuthenticatedAccount().then((isAuth) => {
  if (isAuth && currentStatus === 'guest') {
    void refreshSyncStatus();
  }
}).catch(() => {});

export async function scheduleDebouncedSync(delayMs = 3000): Promise<void> {
  const isAuth = await isAuthenticatedAccount();
  if (!isAuth) {
    setSyncStatus('guest');
    return;
  }
  const isOnline = await checkNetworkConnectivity();
  if (!isOnline) {
    setSyncStatus('offline_saved');
    return;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void triggerSync();
  }, delayMs);
}

// Automatically trigger debounced sync whenever an outbox mutation is enqueued (only for authenticated users)
setOutboxMutationListener(() => {
  void scheduleDebouncedSync(3000);
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

  // 1. First check if the user is logged in with an authenticated account
  const isAuth = await isAuthenticatedAccount();
  if (!isAuth) {
    setSyncStatus('guest');
    return;
  }

  // 2. Second check if the device has an active internet connection
  const isOnline = await checkNetworkConnectivity();
  if (!isOnline) {
    setSyncStatus('offline_saved');
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
    while (continueLoop && !syncAborted) {
      pendingReRun = false;
      await runSyncIteration(options?.forceImmediate ?? false);
      continueLoop = pendingReRun && !syncAborted;
    }

    const pendingCount = await getPendingMutationCount();
    setSyncStatus(pendingCount > 0 ? 'offline_saved' : 'synced');
  } catch (error: unknown) {
    console.warn('[SyncWorker] Iteration error:', error);
    const msg = (error as Error)?.message || '';
    if (
      msg.includes('Network') ||
      msg.includes('Failed to fetch') ||
      msg.includes('abort') ||
      msg.includes('offline') ||
      msg.includes('timeout')
    ) {
      setSyncStatus('offline_saved');
    } else {
      setSyncStatus('needs_attention');
    }
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Gracefully aborts or finishes the current sync iteration before an identity switch or sign-out.
 */
export async function pauseOrFinishSync(timeoutMs = 3000): Promise<void> {
  syncAborted = true;
  pendingReRun = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const startTime = Date.now();
  while (isSyncRunning && Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  syncAborted = false;
  setSyncStatus('guest');
}

async function runSyncIteration(forceImmediate: boolean): Promise<void> {
  if (syncAborted) return;
  let session: { accessToken: string; userId: string } | null = null;
  try {
    session = await getSession();
  } catch {
    // Cannot authenticate right now -> device is offline or credentials unavailable
    setSyncStatus('offline_saved');
    return;
  }

  if (!session?.userId) {
    setSyncStatus('guest');
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

    case 'reading_session': {
      const libraryItemId = payload.bookId ? await resolveLibraryItemId(payload.bookId, session.accessToken) : null;
      const body = {
        id: payload.id,
        owner_id: session.userId,
        library_item_id: libraryItemId,
        started_at: new Date(payload.startedAt).toISOString(),
        ended_at: payload.endedAt ? new Date(payload.endedAt).toISOString() : null,
        duration_seconds: payload.durationSeconds ?? 0,
        pages_read: payload.pagesRead ?? 0,
        chapter_index: payload.chapterIndex ?? 0,
        created_at: new Date(payload.startedAt ?? Date.now()).toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_sessions`, {
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

    case 'bookmark': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?id=eq.${mutation.entityId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
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
        label: payload.label ?? null,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
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

    case 'reader_note': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/reader_notes?id=eq.${mutation.entityId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
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
        note_text: payload.noteText,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/reader_notes`, {
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

    case 'reading_goal': {
      if (mutation.operation === 'delete') {
        const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
        if (!libraryItemId) return false;
        const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_goals?library_item_id=eq.${libraryItemId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        return res.ok;
      }
      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      const body = {
        owner_id: session.userId,
        library_item_id: libraryItemId,
        target_days: payload.targetDays,
        target_completion_date: new Date(payload.targetCompletionDate).toISOString(),
        daily_minutes: payload.dailyMinutes,
        preferred_hour: payload.preferredHour,
        preferred_minute: payload.preferredMinute,
        notifications_enabled: payload.notificationsEnabled,
        is_adaptive: payload.isAdaptive,
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_goals`, {
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

    case 'book_favorite': {
      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      if (!payload.isFavorite) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/book_favorites?library_item_id=eq.${libraryItemId}&owner_id=eq.${session.userId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        return res.ok;
      }

      const body = {
        owner_id: session.userId,
        library_item_id: libraryItemId,
        created_at: new Date().toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/book_favorites`, {
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

    case 'shelf_item': {
      const libraryItemId = await resolveLibraryItemId(payload.bookId, session.accessToken);
      if (!libraryItemId) return false;

      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/shelf_items?shelf_id=eq.${payload.shelfId}&library_item_id=eq.${libraryItemId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        return res.ok;
      }

      const body = {
        shelf_id: payload.shelfId,
        library_item_id: libraryItemId,
        owner_id: session.userId,
        created_at: new Date().toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/shelf_items`, {
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

    case 'vocabulary_deck': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary_decks?id=eq.${mutation.entityId}`, {
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
        created_at: new Date(payload.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(payload.updatedAt ?? Date.now()).toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary_decks`, {
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

    case 'vocabulary_deck_item': {
      if (mutation.operation === 'delete') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary_deck_items?deck_id=eq.${payload.deckId}&saved_word_id=eq.${payload.wordId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        return res.ok;
      }

      const body = {
        deck_id: payload.deckId,
        saved_word_id: payload.wordId,
        owner_id: session.userId,
        created_at: new Date().toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary_deck_items`, {
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
        await db.withTransactionAsync(async (tx) => {
          for (const pos of positions) {
            const time = new Date(pos.updated_at).getTime();
            if (time > maxTime) maxTime = time;

            const bookId = await resolveLocalBookId(pos.library_item_id, session.accessToken, tx);
            if (bookId) {
              await tx.runAsync(
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

  // 2. Pull saved words (Union by UUID, tombstone deletion)
  try {
    const lastSynced = await getCursor('saved_words');
    const isoDate = new Date(lastSynced).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_words?owner_id=eq.${session.userId}&updated_at=gt.${encodeURIComponent(isoDate)}&order=updated_at.asc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (res.ok) {
      const words = (await res.json()) as Array<{
        id: string;
        library_item_id: string;
        source_word: string;
        source_lang: string;
        target_lang: string;
        translation: string;
        context_sentence: string;
        chapter_index: number;
        page_index: number;
        paragraph_index: number;
        srs_box?: number;
        srs_ease_factor?: number;
        srs_next_review_at?: string | null;
        srs_review_count?: number;
        created_at: string;
        updated_at: string;
        deleted_at?: string | null;
      }>;

      if (words.length > 0) {
        let maxTime = lastSynced;
        await db.withTransactionAsync(async (tx) => {
          for (const word of words) {
            const time = new Date(word.updated_at).getTime();
            if (time > maxTime) maxTime = time;

            if (word.deleted_at) {
              await tx.runAsync('DELETE FROM saved_words WHERE id = ?', [word.id]);
            } else {
              const bookId = await resolveLocalBookId(word.library_item_id, session.accessToken, tx);
              if (bookId) {
                const srsDueDate = word.srs_next_review_at ? new Date(word.srs_next_review_at).getTime() : 0;
                await tx.runAsync(
                  `INSERT INTO saved_words (
                     id, book_id, source_word, source_lang, target_lang, translation, context_sentence,
                     chapter_index, page_index, paragraph_index, created_at,
                     srs_stage, srs_ease_factor, srs_due_date, srs_reps, srs_interval_days, srs_lapses
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                   ON CONFLICT(id) DO UPDATE SET
                     translation = excluded.translation,
                     context_sentence = excluded.context_sentence,
                     srs_stage = excluded.srs_stage,
                     srs_ease_factor = excluded.srs_ease_factor,
                     srs_due_date = excluded.srs_due_date,
                     srs_reps = excluded.srs_reps`,
                  [
                    word.id,
                    bookId,
                    word.source_word,
                    word.source_lang,
                    word.target_lang,
                    word.translation,
                    word.context_sentence,
                    word.chapter_index,
                    word.page_index ?? 0,
                    word.paragraph_index ?? 0,
                    new Date(word.created_at).getTime(),
                    word.srs_box ?? 0,
                    word.srs_ease_factor ?? 2.5,
                    srsDueDate,
                    word.srs_review_count ?? 0,
                  ],
                );
              }
            }
          }
        });
        await updateCursor('saved_words', maxTime, Date.now());
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Saved words pull error:', err);
  }

  // 3. Pull highlights
  try {
    const lastSynced = await getCursor('highlights');
    const isoDate = new Date(lastSynced).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/highlights?owner_id=eq.${session.userId}&created_at=gt.${encodeURIComponent(isoDate)}&order=created_at.asc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (res.ok) {
      const highlights = (await res.json()) as Array<{
        id: string;
        library_item_id: string;
        chapter_index: number;
        page_index: number;
        start_offset: number;
        end_offset: number;
        color_key: string;
        quote_text: string;
        created_at: string;
        deleted_at?: string | null;
      }>;

      if (highlights.length > 0) {
        let maxTime = lastSynced;
        await db.withTransactionAsync(async (tx) => {
          for (const hl of highlights) {
            const time = new Date(hl.created_at).getTime();
            if (time > maxTime) maxTime = time;

            if (hl.deleted_at) {
              await tx.runAsync('DELETE FROM highlights WHERE id = ?', [hl.id]);
            } else {
              const bookId = await resolveLocalBookId(hl.library_item_id, session.accessToken, tx);
              if (bookId) {
                await tx.runAsync(
                  `INSERT INTO highlights (id, book_id, chapter_index, page_index, start_offset, end_offset, color_key, quote_text, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                     color_key = excluded.color_key,
                     quote_text = excluded.quote_text`,
                  [
                    hl.id,
                    bookId,
                    hl.chapter_index,
                    hl.page_index,
                    hl.start_offset,
                    hl.end_offset,
                    hl.color_key,
                    hl.quote_text,
                    time,
                  ],
                );
              }
            }
          }
        });
        await updateCursor('highlights', maxTime, Date.now());
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Highlights pull error:', err);
  }

  // 4. Pull shelves
  try {
    const lastSynced = await getCursor('shelves');
    const isoDate = new Date(lastSynced).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/shelves?owner_id=eq.${session.userId}&created_at=gt.${encodeURIComponent(isoDate)}&order=created_at.asc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (res.ok) {
      const shelves = (await res.json()) as Array<{
        id: string;
        name: string;
        created_at: string;
      }>;

      if (shelves.length > 0) {
        let maxTime = lastSynced;
        await db.withTransactionAsync(async (tx) => {
          for (const shelf of shelves) {
            const time = new Date(shelf.created_at).getTime();
            if (time > maxTime) maxTime = time;

            await tx.runAsync(
              `INSERT INTO shelves (id, name, created_at)
               VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
              [shelf.id, shelf.name, time],
            );
          }
        });
        await updateCursor('shelves', maxTime, Date.now());
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Shelves pull error:', err);
  }

  // 5. Pull quiz attempts
  try {
    const lastSynced = await getCursor('quiz_attempts');
    const isoDate = new Date(lastSynced).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quiz_attempts?owner_id=eq.${session.userId}&created_at=gt.${encodeURIComponent(isoDate)}&order=created_at.asc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (res.ok) {
      const attempts = (await res.json()) as Array<{
        id: string;
        book_id: string;
        mode: string;
        started_at: string;
        completed_at?: string | null;
        correct_count: number;
        question_count: number;
        answers: Record<string, unknown>;
        created_at: string;
      }>;

      if (attempts.length > 0) {
        let maxTime = lastSynced;
        await db.withTransactionAsync(async (tx) => {
          for (const att of attempts) {
            const time = new Date(att.created_at).getTime();
            if (time > maxTime) maxTime = time;

            await tx.runAsync(
              `INSERT INTO quiz_attempts (
                 id, book_id, mode, started_at, completed_at, correct_count, question_count, answers_json, created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO NOTHING`,
              [
                att.id,
                att.book_id,
                att.mode,
                new Date(att.started_at).getTime(),
                att.completed_at ? new Date(att.completed_at).getTime() : null,
                att.correct_count,
                att.question_count,
                JSON.stringify(att.answers ?? {}),
                time,
                time,
              ],
            );
          }
        });
        await updateCursor('quiz_attempts', maxTime, Date.now());
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Quiz attempts pull error:', err);
  }
}
