import { getDb } from '@/db/client';

export type ReadingPosition = {
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  percentComplete: number;
  updatedAt: number;
};

type ReadingPositionSqlRow = {
  book_id: string;
  chapter_index: number;
  page_index: number;
  percent_complete: number;
  updated_at: number;
};

function fromSqlRow(row: ReadingPositionSqlRow): ReadingPosition {
  return {
    bookId: row.book_id,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    percentComplete: row.percent_complete,
    updatedAt: row.updated_at,
  };
}

export async function getReadingPosition(bookId: string): Promise<ReadingPosition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReadingPositionSqlRow>(
    'SELECT * FROM reading_positions WHERE book_id = ?',
    [bookId],
  );
  return row ? fromSqlRow(row) : null;
}

export async function upsertReadingPosition(position: Omit<ReadingPosition, 'updatedAt'>) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO reading_positions (book_id, chapter_index, page_index, percent_complete, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       chapter_index = excluded.chapter_index,
       page_index = excluded.page_index,
       percent_complete = excluded.percent_complete,
       updated_at = excluded.updated_at`,
    [
      position.bookId,
      position.chapterIndex,
      position.pageIndex,
      position.percentComplete,
      Date.now(),
    ],
  );
}

export async function deleteReadingPosition(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reading_positions WHERE book_id = ?', [bookId]);
}

export async function listAllReadingPositions(): Promise<ReadingPosition[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingPositionSqlRow>(
    'SELECT * FROM reading_positions ORDER BY updated_at DESC',
  );
  return rows.map(fromSqlRow);
}
