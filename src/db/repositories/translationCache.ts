import { getDb } from '@/db/client';
import type { LanguageCode, TranslationResult } from '@/features/translation/TranslationProvider';

export type PersistentTranslationRow = {
  key: string;
  source_text: string;
  source_lang: string;
  target_lang: string;
  translated_text: string;
  context_sentence: string | null;
  provider: string;
  created_at: number;
  last_accessed_at: number;
  soft_expires_at: number | null;
  hard_expires_at: number | null;
};

// 90 days soft expiry for single-word / base translations, 365 days hard expiry
const WORD_SOFT_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;
const WORD_HARD_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

// 30 days soft expiry for sentence translations, 180 days hard expiry
const SENTENCE_SOFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const SENTENCE_HARD_EXPIRY_MS = 180 * 24 * 60 * 60 * 1000;

export function buildTranslationCacheKey(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  contextSentence?: string,
): string {
  const normalized = text.trim().toLowerCase();
  if (contextSentence && contextSentence.trim().length > 0) {
    return `${from}|${to}|${normalized}|${contextSentence.trim().slice(0, 48).toLowerCase()}`;
  }
  return `${from}|${to}|${normalized}`;
}

/**
 * Retrieve cached translation from SQLite.
 * Returns null if not present or hard expired.
 */
export async function getCachedTranslation(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  contextSentence?: string,
  nowMs: number = Date.now(),
): Promise<TranslationResult | null> {
  const db = await getDb();
  const key = buildTranslationCacheKey(text, from, to, contextSentence);

  const row = await db.getFirstAsync<PersistentTranslationRow>(
    `SELECT * FROM persistent_translation_cache WHERE key = ?`,
    [key],
  );

  if (!row) return null;

  // If hard-expired, do not use
  if (row.hard_expires_at && nowMs > row.hard_expires_at) {
    return null;
  }

  // Update last_accessed_at at most once per 24 hours to prevent write amplification
  if (nowMs - row.last_accessed_at > 24 * 60 * 60 * 1000) {
    void db.runAsync(
      `UPDATE persistent_translation_cache SET last_accessed_at = ? WHERE key = ?`,
      [nowMs, key],
    );
    void db.runAsync(
      `UPDATE cache_entries SET last_accessed_at = ?, updated_at = ? WHERE key = ?`,
      [nowMs, nowMs, key],
    );
  }

  return {
    sourceText: row.source_text,
    translatedText: row.translated_text,
  };
}

function getUtf8ByteSize(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * Persist translation in SQLite persistent_translation_cache and cache_entries
 */
export async function setCachedTranslation(
  text: string,
  translatedText: string,
  from: LanguageCode,
  to: LanguageCode,
  contextSentence?: string,
  provider: string = 'google',
  nowMs: number = Date.now(),
): Promise<void> {
  const db = await getDb();
  const key = buildTranslationCacheKey(text, from, to, contextSentence);
  const isSentence = text.trim().includes(' ') || (contextSentence && contextSentence.length > 0);

  const softExpiry = nowMs + (isSentence ? SENTENCE_SOFT_EXPIRY_MS : WORD_SOFT_EXPIRY_MS);
  const hardExpiry = nowMs + (isSentence ? SENTENCE_HARD_EXPIRY_MS : WORD_HARD_EXPIRY_MS);
  const byteSize = getUtf8ByteSize(`${key}${text}${translatedText}${contextSentence ?? ''}`);

  await db.runAsync(
    `INSERT INTO persistent_translation_cache (
      key, source_text, source_lang, target_lang, translated_text,
      context_sentence, provider, created_at, last_accessed_at,
      soft_expires_at, hard_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      translated_text = excluded.translated_text,
      last_accessed_at = excluded.last_accessed_at,
      soft_expires_at = excluded.soft_expires_at,
      hard_expires_at = excluded.hard_expires_at`,
    [
      key,
      text,
      from,
      to,
      translatedText,
      contextSentence ?? null,
      provider,
      nowMs,
      nowMs,
      softExpiry,
      hardExpiry,
    ],
  );

  // Maintain cache_entries record for storage accounting & LRU cleanup
  await db.runAsync(
    `INSERT INTO cache_entries (
      key, cache_type, owner_scope, schema_version, provider_version,
      content_hash, byte_size, created_at, updated_at, last_accessed_at,
      soft_expires_at, hard_expires_at, state
    ) VALUES (?, 'translation', 'shared', 1, ?, NULL, ?, ?, ?, ?, ?, ?, 'ready')
    ON CONFLICT(key) DO UPDATE SET
      byte_size = excluded.byte_size,
      updated_at = excluded.updated_at,
      last_accessed_at = excluded.last_accessed_at,
      soft_expires_at = excluded.soft_expires_at,
      hard_expires_at = excluded.hard_expires_at,
      state = 'ready'`,
    [
      key,
      provider,
      byteSize,
      nowMs,
      nowMs,
      nowMs,
      softExpiry,
      hardExpiry,
    ],
  );
}

/**
 * Evict hard-expired translations to reclaim space
 */
export async function evictExpiredTranslations(nowMs: number = Date.now()): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `DELETE FROM persistent_translation_cache WHERE hard_expires_at IS NOT NULL AND hard_expires_at < ?`,
    [nowMs],
  );
  await db.runAsync(
    `DELETE FROM cache_entries WHERE cache_type = 'translation' AND hard_expires_at IS NOT NULL AND hard_expires_at < ?`,
    [nowMs],
  );
  return res.changes;
}
