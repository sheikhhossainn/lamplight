import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type SavedWord = {
  id: string;
  bookId: string;
  sourceWord: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  contextSentence: string;
  chapterIndex: number;
  createdAt: number;
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
  created_at: number;
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
    createdAt: row.created_at,
  };
}

export async function listSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavedWordSqlRow>(
    'SELECT * FROM saved_words ORDER BY created_at DESC',
  );
  return rows.map(fromSqlRow);
}

export async function countSavedWordsForBook(bookId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM saved_words WHERE book_id = ?',
    [bookId],
  );
  return row?.count ?? 0;
}

export async function saveWord(input: Omit<SavedWord, 'id' | 'createdAt'>): Promise<SavedWord> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO saved_words (id, book_id, source_word, source_lang, target_lang, translation, context_sentence, chapter_index, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bookId,
      input.sourceWord,
      input.sourceLang,
      input.targetLang,
      input.translation,
      input.contextSentence,
      input.chapterIndex,
      createdAt,
    ],
  );
  return { ...input, id, createdAt };
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_words WHERE id = ?', [id]);
}
