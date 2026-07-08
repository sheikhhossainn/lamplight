import { getDb } from '@/db/client';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local reset at UTC midnight
}

export async function getTodayUsageCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count_used: number }>(
    'SELECT count_used FROM translation_usage WHERE date = ?',
    [todayKey()],
  );
  return row?.count_used ?? 0;
}

export async function incrementTodayUsage(): Promise<number> {
  const db = await getDb();
  const date = todayKey();
  await db.runAsync(
    `INSERT INTO translation_usage (date, count_used) VALUES (?, 1)
     ON CONFLICT(date) DO UPDATE SET count_used = count_used + 1`,
    [date],
  );
  const row = await db.getFirstAsync<{ count_used: number }>(
    'SELECT count_used FROM translation_usage WHERE date = ?',
    [date],
  );
  return row?.count_used ?? 1;
}
