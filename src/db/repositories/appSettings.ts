async function loadDb() {
  const { getDb } = await import('@/db/client');
  return getDb();
}

// Tiny key/value persistence for user settings that must outlive an app
// restart (schema v7 `app_settings` table). Deliberately minimal — string
// values only; callers serialize/parse as needed.
export async function getSetting(key: string): Promise<string | null> {
  const db = await loadDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await loadDb();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await loadDb();
  await db.runAsync('DELETE FROM app_settings WHERE key = ?', [key]);
}
