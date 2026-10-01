import { generateId } from '@/lib/id';
import type { SavedWord } from './savedWords';

export type VocabularyDeck = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type VocabularyDeckWithCount = VocabularyDeck & {
  wordCount: number;
};

type VocabularyDeckSqlRow = {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  word_count?: number;
};

type SavedWordSqlRow = {
  id: string;
  book_id: string;
  source_word: string;
  source_lang: string;
  target_lang: string;
  translation: string;
  context_sentence: string;
  chapter_index: number;
  page_index: number;
  paragraph_index: number;
  created_at: number;
  srs_stage?: number;
  srs_interval_days?: number;
  srs_ease_factor?: number;
  srs_due_date?: number;
  srs_reps?: number;
  srs_lapses?: number;
  phonetic?: string | null;
};

function fromSqlRow(row: SavedWordSqlRow): SavedWord {
  return {
    id: row.id,
    bookId: row.book_id,
    sourceWord: row.source_word,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    translation: row.translation,
    contextSentence: row.context_sentence,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    paragraphIndex: row.paragraph_index,
    createdAt: row.created_at,
    srsStage: ((row.srs_stage ?? 0) as any),
    srsIntervalDays: row.srs_interval_days ?? 0,
    srsEaseFactor: row.srs_ease_factor ?? 2.5,
    srsDueDate: row.srs_due_date ?? 0,
    srsReps: row.srs_reps ?? 0,
    srsLapses: row.srs_lapses ?? 0,
    phonetic: row.phonetic ?? null,
  };
}

async function loadDb() {
  const { getDb } = await import('@/db/client');
  return getDb();
}

export const MAX_DECK_NAME_LENGTH = 50;

/**
 * Validates a prospective deck name according to product rules.
 */
export function validateDeckName(name: string): { valid: boolean; error?: string; cleanName: string } {
  const cleanName = (name ?? '').trim();
  if (cleanName.length === 0) {
    return { valid: false, error: 'Deck name cannot be empty.', cleanName };
  }
  if (cleanName.length > MAX_DECK_NAME_LENGTH) {
    return {
      valid: false,
      error: `Deck name must be ${MAX_DECK_NAME_LENGTH} characters or fewer.`,
      cleanName,
    };
  }
  return { valid: true, cleanName };
}

/**
 * Pure evaluation helper for multi-deck membership calculation.
 */
export function calculateDeckItemDiff(params: {
  currentDeckIds: string[];
  targetDeckIds: string[];
}): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(params.currentDeckIds);
  const targetSet = new Set(params.targetDeckIds);

  const toAdd = params.targetDeckIds.filter((id) => !currentSet.has(id));
  const toRemove = params.currentDeckIds.filter((id) => !targetSet.has(id));

  return { toAdd, toRemove };
}

/**
 * Create a new named vocabulary deck.
 */
export async function createVocabularyDeck(name: string): Promise<VocabularyDeck> {
  const validation = validateDeckName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const db = await loadDb();
  const id = generateId();
  const now = Date.now();

  await db.runAsync(
    'INSERT INTO vocabulary_decks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, validation.cleanName, now, now],
  );

  const deck: VocabularyDeck = {
    id,
    name: validation.cleanName,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation(
      {
        entityType: 'vocabulary_deck',
        entityId: id,
        operation: 'upsert',
        payload: deck,
      },
      db,
    );
  } catch (err) {
    console.warn('[vocabularyDecks] Failed to enqueue deck mutation:', err);
  }

  return deck;
}

/**
 * List all vocabulary decks with their real-time word count.
 */
export async function listVocabularyDecks(): Promise<VocabularyDeckWithCount[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<VocabularyDeckSqlRow>(
    `SELECT
       d.id,
       d.name,
       d.created_at,
       d.updated_at,
       COUNT(i.word_id) AS word_count
     FROM vocabulary_decks d
     LEFT JOIN vocabulary_deck_items i ON d.id = i.deck_id
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    wordCount: r.word_count ?? 0,
  }));
}

/**
 * Fetch a single vocabulary deck by ID.
 */
export async function getVocabularyDeck(id: string): Promise<VocabularyDeck | null> {
  const db = await loadDb();
  const row = await db.getFirstAsync<VocabularyDeckSqlRow>(
    'SELECT id, name, created_at, updated_at FROM vocabulary_decks WHERE id = ?',
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Rename an existing vocabulary deck.
 */
export async function renameVocabularyDeck(id: string, name: string): Promise<void> {
  const validation = validateDeckName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const db = await loadDb();
  const now = Date.now();
  await db.runAsync(
    'UPDATE vocabulary_decks SET name = ?, updated_at = ? WHERE id = ?',
    [validation.cleanName, now, id],
  );

  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation(
      {
        entityType: 'vocabulary_deck',
        entityId: id,
        operation: 'upsert',
        payload: { id, name: validation.cleanName, updatedAt: now },
      },
      db,
    );
  } catch (err) {
    console.warn('[vocabularyDecks] Failed to enqueue rename mutation:', err);
  }
}

/**
 * Delete a vocabulary deck.
 * Removing a deck removes its membership rows but leaves the underlying saved words untouched.
 */
export async function deleteVocabularyDeck(id: string): Promise<void> {
  const db = await loadDb();
  await db.runAsync('DELETE FROM vocabulary_deck_items WHERE deck_id = ?', [id]);
  await db.runAsync('DELETE FROM vocabulary_decks WHERE id = ?', [id]);

  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation(
      {
        entityType: 'vocabulary_deck',
        entityId: id,
        operation: 'delete',
        payload: { id },
      },
      db,
    );
  } catch (err) {
    console.warn('[vocabularyDecks] Failed to enqueue delete mutation:', err);
  }
}

/**
 * Add a saved word to a deck.
 */
export async function addWordToDeck(deckId: string, wordId: string): Promise<void> {
  const db = await loadDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT OR IGNORE INTO vocabulary_deck_items (deck_id, word_id, added_at)
     VALUES (?, ?, ?)`,
    [deckId, wordId, now],
  );
}

/**
 * Remove a word from a deck.
 */
export async function removeWordFromDeck(deckId: string, wordId: string): Promise<void> {
  const db = await loadDb();
  await db.runAsync(
    'DELETE FROM vocabulary_deck_items WHERE deck_id = ? AND word_id = ?',
    [deckId, wordId],
  );
}

/**
 * Add multiple words to a deck in one batch.
 */
export async function addWordsToDeckBatch(deckId: string, wordIds: string[]): Promise<number> {
  if (wordIds.length === 0) return 0;
  const db = await loadDb();
  const now = Date.now();

  let insertedCount = 0;
  for (const wordId of wordIds) {
    const res = await db.runAsync(
      `INSERT OR IGNORE INTO vocabulary_deck_items (deck_id, word_id, added_at)
       VALUES (?, ?, ?)`,
      [deckId, wordId, now],
    );
    if (res.changes && res.changes > 0) {
      insertedCount += res.changes;
    }
  }

  return insertedCount;
}

/**
 * List all saved words filed under a specific deck.
 */
export async function listWordsForDeck(deckId: string): Promise<SavedWord[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<SavedWordSqlRow>(
    `SELECT w.*
     FROM saved_words w
     INNER JOIN vocabulary_deck_items i ON w.id = i.word_id
     WHERE i.deck_id = ?
     ORDER BY i.added_at DESC`,
    [deckId],
  );

  return rows.map(fromSqlRow);
}

/**
 * List all deck IDs that contain a given word.
 */
export async function listDeckIdsForWord(wordId: string): Promise<string[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<{ deck_id: string }>(
    'SELECT deck_id FROM vocabulary_deck_items WHERE word_id = ?',
    [wordId],
  );
  return rows.map((r) => r.deck_id);
}
