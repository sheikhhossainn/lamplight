import { getDb } from '@/db/client';

export type SyncMergeJournalState =
  | 'prompting'
  | 'staging'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export type SyncMergeJournal = {
  id: string;
  started_at: number;
  prior_account_id: string | null;
  target_account_id: string;
  state: SyncMergeJournalState;
  backup_reference: string | null;
  completed_at: number | null;
};

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a new merge journal entry before beginning an account merge.
 */
export async function createMergeJournal(
  priorAccountId: string | null,
  targetAccountId: string,
  backupReference?: string,
): Promise<string> {
  const db = await getDb();
  const id = generateUuid();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO sync_merge_journal (
      id, started_at, prior_account_id, target_account_id, state, backup_reference, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    [id, now, priorAccountId, targetAccountId, 'prompting', backupReference ?? null],
  );

  return id;
}

/**
 * Updates the lifecycle state of an existing merge journal.
 */
export async function updateMergeJournalState(
  id: string,
  state: SyncMergeJournalState,
  completedAt?: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_merge_journal
     SET state = ?, completed_at = ?
     WHERE id = ?`,
    [state, completedAt ?? (state === 'completed' ? Date.now() : null), id],
  );
}

/**
 * Retrieves the most recent merge journal record.
 */
export async function getLatestMergeJournal(): Promise<SyncMergeJournal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SyncMergeJournal>(
    `SELECT * FROM sync_merge_journal ORDER BY started_at DESC LIMIT 1`,
  );
  return row ?? null;
}
