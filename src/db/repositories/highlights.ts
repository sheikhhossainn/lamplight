import type { HighlightColorKey } from '@/theme/tokens';
import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type Highlight = {
  id: string;
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  colorKey: HighlightColorKey;
  quoteText: string;
  createdAt: number;
};

type HighlightSqlRow = {
  id: string;
  book_id: string;
  chapter_index: number;
  page_index: number;
  start_offset: number;
  end_offset: number;
  color_key: string;
  quote_text: string;
  created_at: number;
};

function fromSqlRow(row: HighlightSqlRow): Highlight {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    colorKey: row.color_key as HighlightColorKey,
    quoteText: row.quote_text,
    createdAt: row.created_at,
  };
}

export async function listHighlightsForPage(
  bookId: string,
  chapterIndex: number,
  pageIndex: number,
): Promise<Highlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HighlightSqlRow>(
    'SELECT * FROM highlights WHERE book_id = ? AND chapter_index = ? AND page_index = ? ORDER BY start_offset ASC',
    [bookId, chapterIndex, pageIndex],
  );
  return rows.map(fromSqlRow);
}

export async function getHighlight(id: string): Promise<Highlight | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HighlightSqlRow>('SELECT * FROM highlights WHERE id = ?', [id]);
  return row ? fromSqlRow(row) : null;
}

export async function listHighlightsForBook(bookId: string): Promise<Highlight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HighlightSqlRow>(
    'SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC',
    [bookId],
  );
  return rows.map(fromSqlRow);
}

export async function createHighlight(input: Omit<Highlight, 'id' | 'createdAt'>): Promise<Highlight> {
  const db = await getDb();
  const id = generateId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO highlights (id, book_id, chapter_index, page_index, start_offset, end_offset, color_key, quote_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bookId,
      input.chapterIndex,
      input.pageIndex,
      input.startOffset,
      input.endOffset,
      input.colorKey,
      input.quoteText,
      createdAt,
    ],
  );
  return { ...input, id, createdAt };
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM highlights WHERE id = ?', [id]);
}
