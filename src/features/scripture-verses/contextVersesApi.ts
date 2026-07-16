// Calls the context-verses Edge Function (supabase/functions/context-verses) —
// a separate endpoint from the PostgREST REST API used everywhere else in this
// feature (remoteCatalog.ts, moodVersesApi.ts). The Edge Function embeds the
// free-text feeling with gte-small server-side and calls
// search_verses_by_tradition once per tradition itself; the app never touches
// the embedding model or the DB function directly for this flow.
import type { ScriptureVerseCard } from './moods';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchContextVerses(feelingText: string, perTradition = 2): Promise<ScriptureVerseCard[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.');
  }

  // Cold-start (model load) on the Edge Function can take longer than a
  // typical REST call — give it real room instead of aborting a slow-but-fine
  // first request.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/context-verses`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: feelingText, perTradition }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Context verses fetch failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected context verses response shape');
  }
  return data.map(parseRow);
}

function parseRow(row: unknown): ScriptureVerseCard {
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.tradition !== 'string') {
    throw new Error('Unexpected context verse row shape');
  }
  return {
    id: r.id,
    tradition: r.tradition as ScriptureVerseCard['tradition'],
    book: String(r.book ?? ''),
    chapter: Number(r.chapter ?? 0),
    verseNumber: Number(r.verse_number ?? 0),
    originalText: String(r.original_text ?? ''),
    translation: typeof r.translation === 'string' ? r.translation : null,
    similarity: typeof r.similarity === 'number' ? r.similarity : undefined,
  };
}
