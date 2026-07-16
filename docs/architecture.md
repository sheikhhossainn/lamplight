# Architecture

React Native + Expo SDK 54, Expo Router (file-based routes in `src/app/`), TypeScript.
Local data in SQLite (expo-sqlite); remote backend is Supabase (Postgres + Edge Functions).

## Layout

| Path | Responsibility |
|---|---|
| `src/app/` | Expo Router routes. `(tabs)/` = tab screens; each content vertical gets its own route group (`quran/`, `bible/`, `bible-nt/`, `vedas/`, `torah/`, `mood-verses/`). |
| `src/features/` | Feature modules — reader engine + shared reader components, per-scripture content loaders (`*-content/`), `translation/`, `scripture-verses/`. |
| `src/db/` | SQLite layer: `client.ts` (serializing queue — the only way to touch the DB), `schema.ts` (versioned migrations), `repositories/`. |
| `src/theme/` | Design tokens, typography, ThemeProvider — see [design.md](design.md). |
| `src/components/` | Shared UI (e.g. `BookSpine`, icons). |
| `assets/` | Bundled static scripture JSON (`quran/`, `bible/`, `bible-nt/`, `vedas/`). |
| `scripts/` | One-off Node fetch/seed scripts (`fetch-*.mjs`, `seed-scripture-verses.mjs`). |
| `supabase/` | `schema.sql` (source of truth for remote schema, incl. `plans` free-tier caps) and `functions/` (Edge Functions). |

## God-node files

`useTheme()`, `getDb()`, `ReaderScreen()`, `useTargetLanguage()` fan out into nearly every
community. Query graphify for the specific edge/behavior needed; only open the file if the
change is inside it.

## Content pipelines — two distinct ones

1. **Prose books** — EPUB import + Gutenberg catalog, `content-ingestion/`, `books` table,
   `ReaderScreen` with pixel-precise font-metric page addressing.
2. **Scriptures** — verse-keyed parallel verticals (Quran, Bible OT/NT, Vedas), deliberately
   NOT routed through the prose pipeline. Bundled JSON asset + own DB tables + own routes,
   sharing only the word-tap/translation/highlight components. Full rationale, per-scripture
   sources, and the "add another scripture" recipe: [scriptures.md](scriptures.md).

## Context verses (mood → verse search)

Free-text feeling → semantic verse search via pgvector embeddings (`Supabase/gte-small`,
384-dim) and the `context-verses` Edge Function. Details, including why the Edge Function must
use `Supabase.ai.Session` and never a different embedding model: [context-verses.md](context-verses.md).

## Conventions

- Supabase REST is called with plain `fetch` (`remoteCatalog.ts`, `contextVersesApi.ts`) —
  `@supabase/supabase-js` is not bundled.
- Analytics: `logEvent()` into `analytics_events`, fire-and-forget.
- Scripture verticals are duplicated, not parameterized — sibling code per tradition is the
  accepted pattern.
- Product phasing, free-tier caps, and the schema-to-feature map live in
  [../ROADMAP.md](../ROADMAP.md).
