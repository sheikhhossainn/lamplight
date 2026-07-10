// Fetches the book catalog's metadata (title/author/synopsis/download URL —
// never book text itself) from Supabase's auto-generated REST API
// (PostgREST). Plain fetch, no client library on-device — @supabase/supabase-js
// is used only by scripts/sync-books.mjs (Node-only, never bundled here).
// Called once per app process by src/db/client.ts to refresh the local SQLite
// `books` cache; src/db/repositories/books.ts is the source of truth for
// every other read in the app.
export type RemoteBookRow = {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  gutenbergId: number;
  sourceFormat: string;
  textUrl: string;
  coverUrl: string | null;
  // A handful of Gutenberg editions (e.g. this Pride and Prejudice text) have
  // no heading on their real Chapter 1, printing an introduction before it —
  // this marks where that unheaded chapter actually starts. null for the
  // (common) case where the first detected heading is genuinely Chapter 1.
  chapter1Anchor: string | null;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchRemoteCatalog(): Promise<RemoteBookRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/books?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Remote catalog fetch failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected remote catalog response shape');
  }
  return data.map(parseRow);
}

function parseRow(row: unknown): RemoteBookRow {
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.text_url !== 'string') {
    throw new Error('Unexpected remote catalog row shape');
  }
  return {
    id: r.id,
    title: String(r.title ?? ''),
    author: String(r.author ?? ''),
    sourceLanguage: String(r.source_language ?? 'en'),
    synopsis: String(r.synopsis ?? ''),
    totalChapters: Number(r.total_chapters ?? 0),
    gutenbergId: Number(r.gutenberg_id ?? 0),
    sourceFormat: String(r.source_format ?? 'gutenberg-text'),
    textUrl: r.text_url,
    coverUrl: typeof r.cover_url === 'string' ? r.cover_url : null,
    chapter1Anchor: typeof r.chapter1_anchor === 'string' ? r.chapter1_anchor : null,
  };
}
