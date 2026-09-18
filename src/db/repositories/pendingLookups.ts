import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import { cloudTranslationProvider } from '@/features/translation/cloudTranslationProvider';
import type { LanguageCode } from '@/features/translation/TranslationProvider';

export type PendingWordLookup = {
  id: string;
  bookId: string;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  contextSentence: string;
  chapterIndex: number;
  pageIndex: number;
  paragraphIndex: number;
  requestedAt: number;
  attemptCount: number;
  nextAttemptAt: number | null;
  lastErrorCode: string | null;
  status: 'pending' | 'resolving' | 'failed';
};

type PendingLookupSqlRow = {
  id: string;
  book_id: string;
  source_word: string;
  source_lang: string;
  target_lang: string;
  context_sentence: string;
  chapter_index: number;
  page_index: number;
  paragraph_index: number;
  requested_at: number;
  attempt_count: number;
  next_attempt_at: number | null;
  last_error_code: string | null;
  status: 'pending' | 'resolving' | 'failed';
};

function fromSqlRow(row: PendingLookupSqlRow): PendingWordLookup {
  return {
    id: row.id,
    bookId: row.book_id,
    sourceWord: row.source_word,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    contextSentence: row.context_sentence,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    paragraphIndex: row.paragraph_index,
    requestedAt: row.requested_at,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastErrorCode: row.last_error_code,
    status: row.status,
  };
}

// Exponential backoff with jitter: 5s, 30s, 2m, 10m, 1h
const BACKOFF_SCHEDULE_MS = [
  5 * 1000,
  30 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  60 * 60 * 1000,
];

function calculateBackoff(attemptCount: number): number {
  const index = Math.min(attemptCount, BACKOFF_SCHEDULE_MS.length - 1);
  const base = BACKOFF_SCHEDULE_MS[index];
  // Add ±15% jitter
  const jitter = base * 0.15 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

export type CreatePendingLookupInput = {
  id?: string;
  bookId: string;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  contextSentence: string;
  chapterIndex: number;
  pageIndex: number;
  paragraphIndex: number;
  requestedAt?: number;
};

/**
 * Save an uncached lookup for later resolution (e.g. while offline)
 */
export async function createPendingLookup(input: CreatePendingLookupInput): Promise<PendingWordLookup> {
  const db = await getDb();
  const id = input.id ?? generateId();
  const now = input.requestedAt ?? Date.now();

  await db.runAsync(
    `INSERT INTO pending_word_lookups (
      id, book_id, source_word, source_lang, target_lang,
      context_sentence, chapter_index, page_index, paragraph_index,
      requested_at, attempt_count, next_attempt_at, last_error_code, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'pending')
    ON CONFLICT(id) DO UPDATE SET
      status = 'pending',
      next_attempt_at = NULL`,
    [
      id,
      input.bookId,
      input.sourceWord,
      input.sourceLang,
      input.targetLang,
      input.contextSentence,
      input.chapterIndex,
      input.pageIndex,
      input.paragraphIndex,
      now,
    ],
  );

  return {
    id,
    bookId: input.bookId,
    sourceWord: input.sourceWord,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    contextSentence: input.contextSentence,
    chapterIndex: input.chapterIndex,
    pageIndex: input.pageIndex,
    paragraphIndex: input.paragraphIndex,
    requestedAt: now,
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    status: 'pending',
  };
}

/**
 * List pending lookups, optionally filtered by book
 */
export async function listPendingLookups(bookId?: string): Promise<PendingWordLookup[]> {
  const db = await getDb();
  const query = bookId
    ? `SELECT * FROM pending_word_lookups WHERE book_id = ? ORDER BY requested_at DESC`
    : `SELECT * FROM pending_word_lookups ORDER BY requested_at DESC`;
  const params = bookId ? [bookId] : [];

  const rows = await db.getAllAsync<PendingLookupSqlRow>(query, params);
  return rows.map(fromSqlRow);
}

/**
 * Get count of pending lookups
 */
export async function countPendingLookups(): Promise<number> {
  const db = await getDb();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_word_lookups WHERE status != 'failed'`,
  );
  return result?.count ?? 0;
}

/**
 * Delete a pending lookup by ID
 */
export async function deletePendingLookup(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM pending_word_lookups WHERE id = ?`, [id]);
}

/**
 * Attempt to resolve pending lookups in small batches (e.g. on reconnect/foreground).
 * Promotes resolved lookups into saved_words and removes them from pending_word_lookups.
 */
export async function resolvePendingLookupsBatch(maxBatch = 5, nowMs: number = Date.now()): Promise<{
  resolvedCount: number;
  failedCount: number;
}> {
  const db = await getDb();

  const candidates = await db.getAllAsync<PendingLookupSqlRow>(
    `SELECT * FROM pending_word_lookups
     WHERE status IN ('pending', 'resolving')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY requested_at ASC
     LIMIT ?`,
    [nowMs, maxBatch],
  );

  if (candidates.length === 0) {
    return { resolvedCount: 0, failedCount: 0 };
  }

  let resolvedCount = 0;
  let failedCount = 0;

  for (const item of candidates) {
    try {
      // Mark resolving
      await db.runAsync(
        `UPDATE pending_word_lookups SET status = 'resolving' WHERE id = ?`,
        [item.id],
      );

      const translationResult = await cloudTranslationProvider.translateWord(
        item.source_word,
        item.source_lang as LanguageCode,
        item.target_lang as LanguageCode,
      );

      if (!translationResult || !translationResult.translatedText) {
        throw new Error('Empty translation response');
      }

      // Promote to saved_words atomically and remove from pending
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO saved_words (
            id, book_id, source_word, source_lang, target_lang,
            translation, context_sentence, chapter_index, page_index, paragraph_index,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            translation = excluded.translation,
            updated_at = excluded.updated_at`,
          [
            item.id,
            item.book_id,
            item.source_word,
            item.source_lang,
            item.target_lang,
            translationResult.translatedText,
            item.context_sentence,
            item.chapter_index,
            item.page_index,
            item.paragraph_index,
            item.requested_at,
            nowMs,
          ],
        );

        await db.runAsync(
          `DELETE FROM pending_word_lookups WHERE id = ?`,
          [item.id],
        );

        // Enqueue mutation to sync_outbox
        await db.runAsync(
          `INSERT INTO sync_outbox (
            id, entity_type, entity_id, operation, payload_json,
            idempotency_key, created_at, attempt_count, next_attempt_at, last_error_code
          ) VALUES (?, 'saved_word', ?, 'create', ?, ?, ?, 0, NULL, NULL)
          ON CONFLICT(idempotency_key) DO NOTHING`,
          [
            generateId(),
            item.id,
            JSON.stringify({
              id: item.id,
              book_id: item.book_id,
              source_word: item.source_word,
              source_lang: item.source_lang,
              target_lang: item.target_lang,
              translation: translationResult.translatedText,
              context_sentence: item.context_sentence,
              chapter_index: item.chapter_index,
              page_index: item.page_index,
              paragraph_index: item.paragraph_index,
              created_at: item.requested_at,
              updated_at: nowMs,
            }),
            `saved_word:create:${item.id}`,
            nowMs,
          ],
        );
      });

      resolvedCount++;
    } catch (err) {
      failedCount++;
      const attempts = item.attempt_count + 1;
      const backoff = calculateBackoff(attempts);
      const nextAttempt = nowMs + backoff;
      const errorMessage = err instanceof Error ? err.message : String(err);

      // If permanent network/bad language failure after 5 attempts, mark failed
      const finalStatus = attempts >= 5 ? 'failed' : 'pending';

      await db.runAsync(
        `UPDATE pending_word_lookups
         SET attempt_count = ?,
             next_attempt_at = ?,
             last_error_code = ?,
             status = ?
         WHERE id = ?`,
        [attempts, nextAttempt, errorMessage, finalStatus, item.id],
      );
    }
  }

  return { resolvedCount, failedCount };
}
