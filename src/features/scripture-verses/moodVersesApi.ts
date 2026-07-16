// Fetches a mood-tag flashcard deck from public.get_mood_verses (supabase/schema.sql).
// Not currently wired to any screen (superseded by the free-text context
// search in contextVersesApi.ts) but left in place — a complete, working unit
// against a real deployed SQL function, cheap to keep for a future "browse by
// mood" entry point. Plain fetch against PostgREST's RPC endpoint, no client
// library on-device — same convention as remoteCatalog.ts.
import type { ScriptureVerseCard } from './moods';

export type MoodVerseRow = ScriptureVerseCard;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchMoodVerses(mood: string, perTradition = 2): Promise<MoodVerseRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_mood_verses`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_mood: mood, p_per_tradition: perTradition }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Mood verses fetch failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected mood verses response shape');
  }
  return data.map(parseRow);
}

function parseRow(row: unknown): MoodVerseRow {
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.tradition !== 'string') {
    throw new Error('Unexpected mood verse row shape');
  }
  return {
    id: r.id,
    tradition: r.tradition as MoodVerseRow['tradition'],
    book: String(r.book ?? ''),
    chapter: Number(r.chapter ?? 0),
    verseNumber: Number(r.verse_number ?? 0),
    originalText: String(r.original_text ?? ''),
    translation: typeof r.translation === 'string' ? r.translation : null,
    moodTags: Array.isArray(r.mood_tags) ? r.mood_tags.filter((m): m is string => typeof m === 'string') : [],
  };
}
