import { getDb } from '@/db/client';

export type DownloadStateStatus = 'queued' | 'downloading' | 'failed' | 'ready' | 'unavailable';

export type DownloadState = {
  bookId: string;
  status: DownloadStateStatus;
  progress: number | null;
  errorCode: string | null;
  updatedAt: number;
};

type DownloadStateSqlRow = {
  book_id: string;
  status: string;
  progress: number | null;
  error_code: string | null;
  updated_at: number;
};

function fromSqlRow(row: DownloadStateSqlRow): DownloadState {
  return {
    bookId: row.book_id,
    status: row.status as DownloadStateStatus,
    progress: row.progress,
    errorCode: row.error_code,
    updatedAt: row.updated_at,
  };
}

export async function setDownloadState(input: {
  bookId: string;
  status: DownloadStateStatus;
  progress?: number | null;
  errorCode?: string | null;
}): Promise<DownloadState> {
  const db = await getDb();
  const now = Date.now();
  const progress = input.progress == null ? null : Math.max(0, Math.min(100, Math.round(input.progress)));
  await db.runAsync(
    `INSERT INTO download_states (book_id, status, progress, error_code, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       status = excluded.status,
       progress = excluded.progress,
       error_code = excluded.error_code,
       updated_at = excluded.updated_at`,
    [input.bookId, input.status, progress, input.errorCode ?? null, now],
  );
  return { bookId: input.bookId, status: input.status, progress, errorCode: input.errorCode ?? null, updatedAt: now };
}

export async function listDownloadStates(): Promise<DownloadState[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DownloadStateSqlRow>('SELECT * FROM download_states ORDER BY updated_at DESC');
  return rows.map(fromSqlRow);
}

export async function clearDownloadState(bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM download_states WHERE book_id = ?', [bookId]);
}
