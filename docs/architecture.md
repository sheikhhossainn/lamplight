# Architecture

React Native + Expo SDK 57, Expo Router (file-based routes in `src/app/`), TypeScript.
Local data in SQLite (expo-sqlite); remote backend is Supabase (Postgres + Edge Functions).

## Layout

| Path | Responsibility |
|---|---|
| `src/app/` | Expo Router routes. `(tabs)/` = primary tabs (homescreen, library, vocabulary, settings); scripture verticals (`quran/`, `bible/`, `bible-nt/`, `vedas/`, `mood-verses/`); reader (`book/[id]`, `chapter/`). |
| `src/features/` | Feature domains: `reader/`, `content-ingestion/` (Gutenberg, Bangla, Japanese, Korean), `settings/` (tri-state theme, mother tongue, target language), `vocabulary/` (calibration, SRS, word banks), `translation/`, `sync/`, `audio/`. |
| `src/db/` | SQLite layer: `client.ts` (serializing queue — the only way to touch the DB), `schema.ts` (versioned migrations), `repositories/`. |
| `src/theme/` | Design tokens (`tokens.ts`), typography (`typography.ts`), `ThemeProvider.tsx` — see [design.md](design.md). |
| `src/components/` | Shared UI (e.g. `BookSpine`, `CultureEditionBanner`, pickers, icons). |
| `assets/` | Bundled static scripture JSON (`quran/`, `bible/`, `bible-nt/`, `vedas/`). |
| `scripts/` | One-off Node fetch/seed scripts (`fetch-*.mjs`, `seed-scripture-verses.mjs`). |
| `supabase/` | `schema.sql` (source of truth for remote schema, incl. `plans` free-tier caps) and `functions/` (Edge Functions). |

## Tri-State Coupling Architecture

The reading and UI layer separates three orthogonal user preferences:

1. **`literaryTheme` (Visual Atmosphere)**:
   - Governs palette, paper texture, and wood tones: `korean` (Hanji), `japanese` (Washi), `bengali` (Bengal ink/river), `arabic` (Navy & gold), `western` (Editorial cream).
   - Changed independently via the dedicated **"Change themes"** picker (`LiteraryThemePicker.tsx`).
2. **`motherTongue` (UI Support & Companion Language)**:
   - Governs the UI text script/translation, lookup target, and secondary companion literature shelf.
   - Dynamically adapts theme monograms and edition titles via `getModularThemePresentation()` without altering the chosen visual palette.
3. **`targetReadingLanguage` (Reading Goal)**:
   - Drives Homescreen spotlight, vocabulary calibration, and primary Library curated shelves (e.g. English classics).

## God-node files

`useTheme()`, `getDb()`, `ReaderScreen()`, `useMotherTongue()`, `useTargetReadingLanguage()`.
Query graphify for the specific edge/behavior needed; only open the file if the change is inside it.

## Content pipelines

1. **Prose books & multi-lingual classics**:
   - Gutenberg (English), Bangla catalog, Aozora (Japanese), Gongu (Korean), plus user EPUB imports.
   - `content-ingestion/`, `books` & language chapter tables, `ReaderScreen` with pixel-precise font-metric page addressing.
2. **Scriptures**:
   - Verse-keyed parallel verticals (Quran, Bible OT/NT, Vedas), deliberately NOT routed through the prose pipeline.
   - Bundled JSON assets + dedicated DB tables + dedicated routes, sharing word-tap, translation, and highlight components. Full rationale: [scriptures.md](scriptures.md).

## Context verses (mood → verse search)

Free-text feeling → semantic verse search via pgvector embeddings (`Supabase/gte-small`,
384-dim) and the `context-verses` Edge Function. Details, including why the Edge Function must
use `Supabase.ai.Session` and never a different embedding model: [context-verses.md](context-verses.md).

## Conventions

- **Database serialization**: Every SQLite call goes through the serialized queue in `db/client.ts`. Never call the raw db handle directly.
- **Supabase REST**: Called with plain `fetch` (`remoteCatalog.ts`, `contextVersesApi.ts`) — `@supabase/supabase-js` is not bundled.
- **Analytics**: `logEvent()` into `analytics_events`, fire-and-forget.
- **Scripture verticals**: Duplicated, not parameterized — sibling code per tradition is the accepted pattern.
- **Product roadmap**: Phasing, free-tier caps, and schema-to-feature maps live in [../ROADMAP.md](../ROADMAP.md).
