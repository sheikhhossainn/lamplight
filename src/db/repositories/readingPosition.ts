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
    `INSERT INTO reading_positions (book_id, chapter_index, page_index, percent_complete, updated_at, continue_hidden)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(book_id) DO UPDATE SET
       chapter_index = excluded.chapter_index,
       page_index = excluded.page_index,
       -- Progress tracks the FURTHEST point reached, not the current page, so
       -- paging back to re-read never drops the bar to 0%. The
       -- chapter/page above still update to the current page for resume.
       percent_complete = MAX(reading_positions.percent_complete, excluded.percent_complete),
       updated_at = excluded.updated_at,
       -- Reading a book again brings it back into "Continue reading" even if
       -- it had been cleared from the list before.
       continue_hidden = 0`,
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

// Clear a book from the Library's "Continue reading" list without deleting its
// bookmark — an activity-history hide, not a reset (see the v5 migration).
export async function hideFromContinueReading(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE reading_positions SET continue_hidden = 1 WHERE book_id = ?', [bookId]);
}

export async function listAllReadingPositions(): Promise<ReadingPosition[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingPositionSqlRow>(
    'SELECT * FROM reading_positions ORDER BY updated_at DESC',
  );
  return rows.map(fromSqlRow);
}

// The in-progress books shown in "Continue reading" — most recent first,
// excluding any the user has cleared from the list.
export async function listActiveReadingPositions(): Promise<ReadingPosition[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingPositionSqlRow>(
    'SELECT * FROM reading_positions WHERE continue_hidden = 0 ORDER BY updated_at DESC',
  );
  return rows.map(fromSqlRow);
}
