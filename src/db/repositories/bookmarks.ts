import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import { enqueueMutation } from './syncOutbox';

export type Bookmark = {
  id: string;
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  label: string | null;
  createdAt: number;
  updatedAt: number;
};

type BookmarkSqlRow = {
  id: string;
  book_id: string;
  chapter_index: number;
  page_index: number;
  label: string | null;
  created_at: number;
  updated_at: number;
};

function fromSqlRow(row: BookmarkSqlRow): Bookmark {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBookmarksForBook(bookId: string): Promise<Bookmark[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookmarkSqlRow>(
    'SELECT * FROM bookmarks WHERE book_id = ? ORDER BY chapter_index ASC, page_index ASC',
    [bookId],
  );
  return rows.map(fromSqlRow);
}

export async function createBookmark(input: {
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  label?: string | null;
}): Promise<Bookmark> {
  const db = await getDb();
  const existing = await db.getFirstAsync<BookmarkSqlRow>(
    'SELECT * FROM bookmarks WHERE book_id = ? AND chapter_index = ? AND page_index = ?',
    [input.bookId, input.chapterIndex, input.pageIndex],
  );
  if (existing) return fromSqlRow(existing);

  const now = Date.now();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO bookmarks (id, book_id, chapter_index, page_index, label, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.bookId, input.chapterIndex, input.pageIndex, input.label?.trim() || null, now, now],
  );
  const bookmark: Bookmark = {
    id,
    bookId: input.bookId,
    chapterIndex: input.chapterIndex,
    pageIndex: input.pageIndex,
    label: input.label?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await enqueueMutation({ entityType: 'bookmark', entityId: id, operation: 'upsert', payload: bookmark }, db);
  } catch { /* sync enqueue non-fatal */ }
  return bookmark;
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
  try {
    await enqueueMutation({ entityType: 'bookmark', entityId: bookmarkId, operation: 'delete', payload: { id: bookmarkId } }, db);
  } catch { /* sync enqueue non-fatal */ }
}

export async function renameBookmark(bookmarkId: string, label: string | null): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync('UPDATE bookmarks SET label = ?, updated_at = ? WHERE id = ?', [label?.trim() || null, now, bookmarkId]);
  try {
    await enqueueMutation({ entityType: 'bookmark', entityId: bookmarkId, operation: 'upsert', payload: { id: bookmarkId, label: label?.trim() || null, updatedAt: now } }, db);
  } catch { /* sync enqueue non-fatal */ }
}
