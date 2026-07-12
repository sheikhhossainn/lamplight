import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getSession } from '@/lib/supabaseAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_KEY = 'translation_usage_cache';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

type Cache = { date: string; count: number };

async function readCache(): Promise<Cache | null> {
  const raw = await getSetting(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Cache;
  } catch {
    return null;
  }
}

async function writeCache(count: number): Promise<void> {
  await setSetting(CACHE_KEY, JSON.stringify({ date: todayKey(), count }));
}

// Local-only read: today's count if the cache has one, null if it doesn't.
// Lets the UI paint the real remaining count before the server round-trip,
// instead of guessing while getTodayUsageCount() is still in flight.
export async function getCachedTodayUsageCount(): Promise<number | null> {
  const cache = await readCache();
  return cache && cache.date === todayKey() ? cache.count : null;
}

// The real enforcement boundary is public.translation_usage (keyed on
// auth.uid()), not this cache — the cache only makes an offline device fail
// CLOSED instead of unlimited. Without it, a network error here would read as
// "0 used today," so turning on airplane mode after hitting the cap would
// reset it right back to unlimited. With a same-day cached value, offline
// reads that instead. A missing/stale cache (e.g. first launch ever, offline)
// still falls back to 0 — no evidence of usage yet, so it fails open rather
// than bricking a brand-new offline session.
export async function getTodayUsageCount(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return 0;
  try {
    const { accessToken, userId } = await getSession();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/translation_usage?owner_id=eq.${userId}&usage_date=eq.${todayKey()}&select=count_used`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error(`Usage fetch failed: ${response.status}`);
    const rows = (await response.json()) as { count_used: number }[];
    const count = rows[0]?.count_used ?? 0;
    await writeCache(count);
    return count;
  } catch {
    const cache = await readCache();
    return cache && cache.date === todayKey() ? cache.count : 0;
  }
}

// Never throws — a missed server increment is a missed data point (and a
// slightly too-generous cap for that one tap), not a reason to surface an
// error after a translation that already succeeded. Still bumps the local
// cache on failure so repeated offline taps keep counting down toward the cap
// instead of re-reading the same stale number every time; the next successful
// getTodayUsageCount() call overwrites it with the real server value.
export async function incrementTodayUsage(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  const cache = await readCache();
  const optimistic = cache && cache.date === todayKey() ? cache.count + 1 : 1;
  try {
    const { accessToken, userId } = await getSession();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_translation_usage`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_owner_id: userId, p_date: todayKey() }),
    });
    if (!response.ok) throw new Error(`Increment failed: ${response.status}`);
    const serverCount = (await response.json()) as number;
    await writeCache(serverCount);
  } catch {
    await writeCache(optimistic);
  }
}
