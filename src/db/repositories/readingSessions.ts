import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import { enqueueMutation } from './syncOutbox';

export type ReadingSession = {
  id: string;
  bookId: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  pagesRead: number;
  chapterIndex: number;
  synced: number;
};

type ReadingSessionSqlRow = {
  id: string;
  book_id: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number;
  pages_read: number;
  chapter_index: number;
  synced: number;
};

function fromSqlRow(row: ReadingSessionSqlRow): ReadingSession {
  return {
    id: row.id,
    bookId: row.book_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    pagesRead: row.pages_read,
    chapterIndex: row.chapter_index,
    synced: row.synced,
  };
}

export async function insertReadingSession(session: {
  id?: string;
  bookId: string;
  startedAt: number;
  endedAt?: number | null;
  durationSeconds: number;
  pagesRead: number;
  chapterIndex: number;
}): Promise<string> {
  const db = await getDb();
  const id = session.id || generateId();
  await db.runAsync(
    `INSERT INTO reading_sessions (id, book_id, started_at, ended_at, duration_seconds, pages_read, chapter_index, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      session.bookId,
      session.startedAt,
      session.endedAt ?? null,
      session.durationSeconds,
      session.pagesRead,
      session.chapterIndex,
    ],
  );
  try {
    await enqueueMutation({ entityType: 'reading_session', entityId: id, operation: 'upsert', payload: { id, bookId: session.bookId, startedAt: session.startedAt, endedAt: session.endedAt ?? null, durationSeconds: session.durationSeconds, pagesRead: session.pagesRead, chapterIndex: session.chapterIndex } }, db);
  } catch { /* sync enqueue non-fatal */ }
  return id;
}

export async function updateReadingSession(
  id: string,
  updates: {
    endedAt?: number | null;
    durationSeconds?: number;
    pagesRead?: number;
  },
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: any[] = [];

  if (updates.endedAt !== undefined) {
    sets.push('ended_at = ?');
    params.push(updates.endedAt);
  }
  if (updates.durationSeconds !== undefined) {
    sets.push('duration_seconds = ?');
    params.push(updates.durationSeconds);
  }
  if (updates.pagesRead !== undefined) {
    sets.push('pages_read = ?');
    params.push(updates.pagesRead);
  }

  if (sets.length === 0) return;
  params.push(id);

  await db.runAsync(`UPDATE reading_sessions SET ${sets.join(', ')} WHERE id = ?`, params);
  try {
    await enqueueMutation({ entityType: 'reading_session', entityId: id, operation: 'upsert', payload: { id, ...updates } }, db);
  } catch { /* sync enqueue non-fatal */ }
}

export async function getRecentSessions(limit: number = 100): Promise<ReadingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingSessionSqlRow>(
    'SELECT * FROM reading_sessions ORDER BY started_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(fromSqlRow);
}

export async function getAllSessions(): Promise<ReadingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingSessionSqlRow>(
    'SELECT * FROM reading_sessions ORDER BY started_at ASC',
  );
  return rows.map(fromSqlRow);
}

export async function getSessionsForBook(bookId: string): Promise<ReadingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingSessionSqlRow>(
    'SELECT * FROM reading_sessions WHERE book_id = ? ORDER BY started_at DESC',
    [bookId],
  );
  return rows.map(fromSqlRow);
}

export async function getSessionsInDateRange(
  startTimestamp: number,
  endTimestamp: number,
): Promise<ReadingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReadingSessionSqlRow>(
    'SELECT * FROM reading_sessions WHERE started_at >= ? AND started_at <= ? ORDER BY started_at ASC',
    [startTimestamp, endTimestamp],
  );
  return rows.map(fromSqlRow);
}

