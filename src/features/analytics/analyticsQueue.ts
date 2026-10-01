/**
 * Offline analytics event queue pure engine (REL-03 / FULLAPP §7.4 & §18.2).
 *
 * Implements:
 * 1. Strict privacy sanitization: excluding email, book text, notes, questions,
 *    and literary translation context.
 * 2. Stable event IDs for idempotency.
 * 3. Exact occurred_at preservation without timestamp shifting.
 * 4. Queue retention and size policy (max 1000 events, 30 days retention, 5 max attempts).
 * 5. Batch formatting for Supabase PostgREST insertion.
 */

export type AnalyticsQueueItem = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: number;
  createdAt: number;
  attemptCount: number;
  lastAttemptAt: number | null;
  lastError: string | null;
};

export type SupabaseAnalyticsEvent = {
  owner_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
};

export const MAX_ANALYTICS_QUEUE_SIZE = 1000;
export const ANALYTICS_BATCH_SIZE = 50;
export const ANALYTICS_MAX_ATTEMPTS = 5;
export const ANALYTICS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const FORBIDDEN_KEYS = new Set([
  'email',
  'user_email',
  'email_address',
  'text',
  'raw_text',
  'book_text',
  'chapter_text',
  'page_text',
  'quote_text',
  'note_text',
  'question',
  'raw_question',
  'query',
  'transcript',
  'voice_transcript',
  'inquiry_text',
  'translation',
  'translated_text',
  'context_sentence',
  'context',
  'token',
  'password',
  'secret',
  'access_token',
  'refresh_token',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function generateAnalyticsEventId(nowMs: number = Date.now()): string {
  const timestamp = nowMs.toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `evt_${timestamp}_${rand}`;
}

/**
 * Sanitizes analytics payloads before enqueueing or uploading.
 * Strips blacklisted sensitive keys and redacts accidental email strings.
 */
export function sanitizeAnalyticsPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = value.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAnalyticsPayload(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') {
          return item.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
        }
        if (item && typeof item === 'object') {
          return sanitizeAnalyticsPayload(item as Record<string, unknown>);
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Constructs an AnalyticsQueueItem ready for SQLite persistence.
 */
export function createAnalyticsQueueItem(
  eventType: string,
  payload: Record<string, unknown>,
  occurredAt: number = Date.now(),
  overrideId?: string,
): AnalyticsQueueItem {
  const id = overrideId ?? generateAnalyticsEventId(occurredAt);
  const sanitized = sanitizeAnalyticsPayload(payload);
  // Ensure stable event_id is attached for remote deduplication
  sanitized.event_id = id;

  return {
    id,
    eventType,
    payload: sanitized,
    occurredAt,
    createdAt: Date.now(),
    attemptCount: 0,
    lastAttemptAt: null,
    lastError: null,
  };
}

/**
 * Formats a batch of queued items for insertion into Supabase public.analytics_events.
 * Preserves the original occurred_at timestamp in ISO format.
 */
export function formatBatchForSupabase(
  items: AnalyticsQueueItem[],
  userId: string | null,
): SupabaseAnalyticsEvent[] {
  return items.map((item) => ({
    owner_id: userId,
    event_type: item.eventType,
    payload: item.payload,
    occurred_at: new Date(item.occurredAt).toISOString(),
  }));
}

/**
 * Evaluates whether an event should be pruned based on age or failure count.
 */
export function shouldPruneAnalyticsEvent(
  item: { occurredAt: number; attemptCount: number },
  nowMs: number = Date.now(),
): boolean {
  if (item.attemptCount >= ANALYTICS_MAX_ATTEMPTS) {
    return true;
  }
  if (nowMs - item.occurredAt > ANALYTICS_RETENTION_MS) {
    return true;
  }
  return false;
}
