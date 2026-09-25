import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeAnalyticsPayload,
  createAnalyticsQueueItem,
  formatBatchForSupabase,
  shouldPruneAnalyticsEvent,
  MAX_ANALYTICS_QUEUE_SIZE,
  ANALYTICS_BATCH_SIZE,
  ANALYTICS_MAX_ATTEMPTS,
  ANALYTICS_RETENTION_MS,
  type AnalyticsQueueItem,
} from '../src/features/analytics/analyticsQueue';

test('REL-03 Analytics privacy sanitizer strips forbidden keys', () => {
  const dirtyPayload = {
    book_id: 'gutenberg-1342',
    chapter_index: 2,
    target_lang: 'bn',
    // Forbidden sensitive keys
    email: 'reader@example.com',
    user_email: 'private@test.com',
    raw_text: 'Chapter I. It is a truth universally acknowledged...',
    book_text: 'Full book prose here...',
    quote_text: 'My courage always rises with every attempt to intimidate me.',
    note_text: 'Personal private thoughts about Darcy',
    question: 'What is the nature of suffering in the Vedas?',
    voice_transcript: 'Whisper raw audio transcription',
    translation: 'বাংলা অনুবাদ',
    translated_text: 'বাংলা অনুবাদ বাক্য',
    context_sentence: 'She was not of a disposition to be frightened away.',
    token: 'super_secret_jwt_token',
    password: 'password123',
  };

  const clean = sanitizeAnalyticsPayload(dirtyPayload);

  // Safe properties must remain
  assert.equal(clean.book_id, 'gutenberg-1342');
  assert.equal(clean.chapter_index, 2);
  assert.equal(clean.target_lang, 'bn');

  // Forbidden fields must be stripped completely
  assert.equal(clean.email, undefined);
  assert.equal(clean.user_email, undefined);
  assert.equal(clean.raw_text, undefined);
  assert.equal(clean.book_text, undefined);
  assert.equal(clean.quote_text, undefined);
  assert.equal(clean.note_text, undefined);
  assert.equal(clean.question, undefined);
  assert.equal(clean.voice_transcript, undefined);
  assert.equal(clean.translation, undefined);
  assert.equal(clean.translated_text, undefined);
  assert.equal(clean.context_sentence, undefined);
  assert.equal(clean.token, undefined);
  assert.equal(clean.password, undefined);
});

test('REL-03 Analytics privacy sanitizer redacts embedded emails in string values', () => {
  const payload = {
    error_message: 'Failed to notify reader at user.name+tag@domain.co.uk about sync',
    details: {
      nested_message: 'Contact admin@lamplight.app for support',
    },
    recipients: ['reader1@gmail.com', 'safe_identifier_123'],
  };

  const clean = sanitizeAnalyticsPayload(payload);

  assert.equal(clean.error_message, 'Failed to notify reader at [REDACTED_EMAIL] about sync');
  assert.equal((clean.details as Record<string, unknown>).nested_message, 'Contact [REDACTED_EMAIL] for support');
  assert.deepEqual(clean.recipients, ['[REDACTED_EMAIL]', 'safe_identifier_123']);
});

test('REL-03 Analytics item creation generates stable idempotency event_id and preserves occurred_at', () => {
  const fixedTimestamp = 1716600000000;
  const rawPayload = {
    package_id: 'lamplight_annual_sub',
    source: 'paywall_modal',
  };

  const item = createAnalyticsQueueItem('purchase_started', rawPayload, fixedTimestamp);

  assert.equal(item.eventType, 'purchase_started');
  assert.equal(item.occurredAt, fixedTimestamp);
  assert.ok(item.id.startsWith('evt_'));
  assert.equal(item.attemptCount, 0);
  assert.equal(item.lastAttemptAt, null);
  assert.equal(item.lastError, null);

  // Payload must contain stable event_id matching item.id for remote idempotency
  assert.equal(item.payload.event_id, item.id);
  assert.equal(item.payload.package_id, 'lamplight_annual_sub');
});

test('REL-03 formatBatchForSupabase creates valid PostgREST batch objects with ISO occurred_at', () => {
  const t1 = 1716610000000;
  const t2 = 1716620000000;

  const items: AnalyticsQueueItem[] = [
    createAnalyticsQueueItem('first_book_opened', { book_id: 'book-1' }, t1, 'evt-custom-1'),
    createAnalyticsQueueItem('word_saved', { book_id: 'book-1', target_lang: 'bn' }, t2, 'evt-custom-2'),
  ];

  const batch = formatBatchForSupabase(items, 'user-uuid-1234');

  assert.equal(batch.length, 2);
  assert.equal(batch[0].owner_id, 'user-uuid-1234');
  assert.equal(batch[0].event_type, 'first_book_opened');
  assert.equal(batch[0].occurred_at, new Date(t1).toISOString());
  assert.equal(batch[0].payload.event_id, 'evt-custom-1');

  assert.equal(batch[1].owner_id, 'user-uuid-1234');
  assert.equal(batch[1].event_type, 'word_saved');
  assert.equal(batch[1].occurred_at, new Date(t2).toISOString());
  assert.equal(batch[1].payload.event_id, 'evt-custom-2');
});

test('REL-03 Analytics retention and pruning rules conform to policy', () => {
  const now = Date.now();

  // Fresh item with 0 attempts: do not prune
  assert.equal(shouldPruneAnalyticsEvent({ occurredAt: now - 1000, attemptCount: 0 }, now), false);

  // Fresh item with max attempts exceeded (>= 5): prune
  assert.equal(shouldPruneAnalyticsEvent({ occurredAt: now - 1000, attemptCount: ANALYTICS_MAX_ATTEMPTS }, now), true);
  assert.equal(shouldPruneAnalyticsEvent({ occurredAt: now - 1000, attemptCount: 10 }, now), true);

  // Old item past 30 days retention: prune
  const thirtyOneDaysAgo = now - (ANALYTICS_RETENTION_MS + 100000);
  assert.equal(shouldPruneAnalyticsEvent({ occurredAt: thirtyOneDaysAgo, attemptCount: 1 }, now), true);

  // Item within 30 days retention with few attempts: do not prune
  const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
  assert.equal(shouldPruneAnalyticsEvent({ occurredAt: twentyDaysAgo, attemptCount: 2 }, now), false);
});

test('REL-03 Queue capacity constants enforce size bounds', () => {
  assert.equal(MAX_ANALYTICS_QUEUE_SIZE, 1000);
  assert.equal(ANALYTICS_BATCH_SIZE, 50);
  assert.equal(ANALYTICS_MAX_ATTEMPTS, 5);
  assert.equal(ANALYTICS_RETENTION_MS, 30 * 24 * 60 * 60 * 1000);
});
