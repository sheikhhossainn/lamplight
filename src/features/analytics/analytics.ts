import {
  formatBatchForSupabase,
  ANALYTICS_BATCH_SIZE,
} from '@/features/analytics/analyticsQueue';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function getAnalyticsRepo() {
  return await import('@/db/repositories/analyticsQueue');
}

async function getAuth() {
  return await import('@/lib/supabaseAuth');
}

let isFlushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a debounced background flush of the offline analytics queue.
 */
function scheduleFlush(delayMs = 1500) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, delayMs);
}

/**
 * Fire-and-forget event logging (REL-03 / FULLAPP §7.4 & §18).
 *
 * 1. Enqueues the event into the local SQLite queue (preserves occurred_at, sanitizes sensitive data).
 * 2. Schedules a debounced background flush so airplane-mode events aren't lost and online events batch cleanly.
 * 3. Never throws into the UI.
 */
export function logEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
  occurredAt?: number,
): void {
  void (async () => {
    try {
      const repo = await getAnalyticsRepo();
      await repo.enqueueEvent(eventType, payload, occurredAt);
      scheduleFlush();
    } catch {
      // Local SQLite write error or test environment without DB — non-fatal for UI
    }
  })();
}

/**
 * Flushes queued analytics events to Supabase in batches.
 * Safe to call on app startup, connectivity return, or app backgrounding.
 */
export async function flushAnalyticsQueue(): Promise<{ sent: number; failed: number }> {
  if (isFlushing) return { sent: 0, failed: 0 };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { sent: 0, failed: 0 };

  isFlushing = true;
  let totalSent = 0;
  let totalFailed = 0;

  try {
    const { getSession } = await getAuth();
    const { accessToken, userId } = await getSession();
    if (!accessToken) {
      return { sent: 0, failed: 0 };
    }

    const repo = await getAnalyticsRepo();

    // Process up to 5 batches per flush run to bound execution time
    for (let i = 0; i < 5; i++) {
      const batch = await repo.fetchQueueBatch(ANALYTICS_BATCH_SIZE);
      if (batch.length === 0) break;

      const formattedEvents = formatBatchForSupabase(batch, userId);
      const batchIds = batch.map((item) => item.id);

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(formattedEvents),
        });

        if (response.ok) {
          await repo.deleteQueueItems(batchIds);
          totalSent += batch.length;
        } else {
          const errText = await response.text().catch(() => response.statusText);
          await repo.recordQueueAttempt(batchIds, `HTTP ${response.status}: ${errText}`);
          totalFailed += batch.length;
          // Halt further batch attempts on server error
          break;
        }
      } catch (networkError) {
        // Network unavailable or timeout — keep events in queue and halt flush
        await repo.recordQueueAttempt(batchIds, networkError instanceof Error ? networkError.message : 'Network error');
        totalFailed += batch.length;
        break;
      }
    }
  } catch {
    // Session retrieval or database error
  } finally {
    isFlushing = false;
  }

  return { sent: totalSent, failed: totalFailed };
}
