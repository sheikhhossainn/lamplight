# Lamplight — Project Context

Fast path to full context. Read before touching code.

## What it is

Mobile reading app: read public-domain classics with live word/quote translation + vocabulary saving, in a warm "reading by lamplight" aesthetic. Android-first via Expo Go; iOS is a later build profile (same RN codebase).

Roadmap: `ROADMAP.md` (phases, Free/Premium features, schema-to-feature map). Design rules: `CLAUDE.md`.

## Stack

- **React Native + Expo SDK 54** (pinned), TypeScript strict, **Expo Router** (file-based, `src/app/`), **reanimated 4** + **gesture-handler** (available; reader uses core `PanResponder`).
- Deliberately staying in **plain Expo Go** — no native module that forces a Dev Client yet (blocks on-device ML translation + real billing, see below).

**SDK pin gotcha:** phone's Expo Go must match SDK 54 exactly. On `Incompatible SDK version`: update Expo Go, or re-pin — edit `expo` in package.json, then `npx expo install --fix` (never hand-edit other RN/Expo versions).

**Expo Router gotcha:** adding/moving/deleting route files doesn't reliably hot-reload. On stale screens: `npx expo start -c` + force-reopen Expo Go. Always use the object form `router.push({ pathname: '/reader/[bookId]', params })` — typed routes reject template-string paths.

## Design system (locked — `src/theme/`)

`tokens.ts` (colors/spacing/radius/motion) + `typography.ts` (named styles) + `ThemeProvider.tsx` (`useTheme()`, Day/Lamp). Never inline raw hex/px/fontFamily — pull tokens.

- **Colors:** Primary Dark `#1C1B1E`, Flame Amber `#F5A623` (the ONE accent — CTAs/active/progress, never decorative), Parchment `#F5EDE1`. Neutrals warmed, never pure gray. Highlight hues (amber/sage/clay/dusk) reserved for the highlighter + status pills.
- **Type:** Lora (serif) = the book (reading text, titles, quotes). Manrope (sans) = chrome. Reading body **18px / line-height 1.85** (fixed, see reader). Day + Lamp share token keys with flipped surface/text.
- **Motif:** fold/flame (page-curl corner) on covers (`BookSpine`), the bookmark glyph, page-turn. Brand mark = `FlameGlow.tsx` (static SVG; only a glow layer pulses — never scale/rotate/opacity-0 the flame).

## Architecture

```
src/
  app/                       Expo Router routes (thin: compose features, handle nav)
    index / onboarding       splash → onboarding
    (tabs)/                  library · vocabulary · settings
    book/[id]                book detail
    reader/[bookId]          reader (Day/Lamp chrome, one screen)
    quote-share/[id]         quote card
    paywall                  (stub)
  components/                shared UI: BookSpine, FlameGlow, icons,
                             LanguagePicker, ShelfEditorModal
  theme/                     tokens, typography, ThemeProvider, transition overlay
  db/                        SQLite: schema.ts (versioned migrations), client.ts,
                             repositories/* (only these touch SQL)
  features/
    content-ingestion/       remoteCatalog · bookDownloader · textParser
    reader/                  engine/ (paginate, words, glyphWidths), components/
    translation/             provider iface + cloud impl + daily cap
    settings/                readingPrefs, readingTheme, languagePair, themeTransition
    subscription/            isPremiumUser() → false stub (until billing)
  lib/                       generateId() etc.
scripts/ + .github/workflows/  bulk Gutenberg → Supabase catalog sync
supabase/schema.sql          remote catalog + Premium-shaped tables (source of truth)
```

## Data layer

`expo-sqlite` async via `getDb()` singleton (`db/client.ts`) — runs versioned migrations (`schema.ts`), then **seeds `books` metadata instantly** from `assets/books/manifest.json` and, in the background, upserts the **remote Supabase catalog** (`fetchRemoteCatalog`). All DB calls are funneled through a **serializing queue** (expo-sqlite Android corrupts state on concurrent statements — don't remove it; multi-statement helpers run as one `enqueue` job).

Tables (v4): `books`, `reading_positions`, `saved_words`, `highlights`, `translation_usage`, **`shelves` + `shelf_items`** (user category shelves). Repos in `db/repositories/*`.

## Content ingestion (remote, on-demand)

Books are **remote metadata** (Supabase `books`, synced from Gutendex by `scripts/sync-bulk-catalog.mjs` on a daily GitHub-Actions cron — targets ~5000 popular titles; needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` secrets; **not** triggered by push). No book text is bundled. On first open, `bookDownloader.ts` fetches the plain-text edition from `text_url` and `textParser.ts` cleans/splits it on-device (`total_chapters` starts 0, filled in after first parse).

`textParser` handles Gutenberg quirks: CRLF→`\n`, duplicate leading TOC stripping, front-matter discard (only Pride & Prejudice needs a `chapter1Anchor` override — its Ch.1 is unheaded). Don't add a generic paragraph-length heuristic (tried, reverted — can't tell an unheaded Ch.1 from a long intro essay).

## Reader engine (`src/app/reader/[bookId].tsx` + `features/reader/`)

- **On-device pagination** (`engine/paginate.ts`): sizes pages from real device metrics — `contentWidthPx/Height` (screen − margins − safe-area) and a one-shot **measured chars-per-line** sample. Paragraph-atomic (never splits a paragraph → ragged bottom is intentional). A fixed **chapter-title zone is reserved on every page** so body's first line lands at the same Y (no jump when paging).
- **Fixed reading base:** 18px / line-height 1.85 (`settings/readingPrefs.ts` constants — the old font/line-spacing sliders were removed; cross-device robustness comes from the paginator, not a user knob).
- **Smooth swipe:** each paragraph is **one `<Text>`** (not one per word) so pages mount cheap; native horizontal `FlatList` paging, `removeClippedSubviews`, no per-frame transform.
- **Word interaction = hold, not tap.** Long-press a word → `WordActionMenu` (Translate / Save as quote). Tap toggles chrome. The held/active word gets an amber highlight.
- **Precise selection** (the hard part — RN exposes no per-glyph metrics): hit-testing maps touch→char via **measured real glyph advances** (`engine/glyphWidths.ts`, one hidden measure pass) normalized per line, with **exact `indexOf` line-start offsets** (not a `+1`-per-wrap guess). Quote handles drag **char-by-char** with a **native grab-offset** (capture finger↔edge delta on touch-down, apply on move). `highlights.start_offset/end_offset` store first/last **paragraph index** (the in-book marker is paragraph-level); the saved `quote_text` is the exact selected substring.
- **Day/Lamp** share one screen via a `ReaderMode` enum — never forked.

## Translation & settings

- `features/translation/`: `TranslationProvider` iface (swap seam) → `cloudTranslationProvider` (unofficial key-free `translate.googleapis.com` endpoint; in-memory cache). Daily free cap = **25/day** (`capPolicy.ts`, `FREE_DAILY_TRANSLATION_LIMIT`) — **currently disabled by an early-return for the beta**; gates only word/quote translate, never reading/vocab. `isPremiumUser()` is a `false` stub.
- **Language:** `settings/languagePair.ts` — 39 ISO target languages; chosen via the searchable `LanguagePicker` sheet in Settings only (the reader popup shows the pair read-only). `LanguageCode` is a plain string (endpoint takes any ISO code).

## Library shelves

Horizontal, slidable shelves. "All books" + **user category shelves** (`shelves`/`shelf_items`): `ShelfEditorModal` names a shelf + multi-selects books; each renders as its own slidable shelf.

## Not built yet

Billing (RevenueCat/IAP), on-device ML Kit translation, spaced repetition, reading insights, cloud sync, premium ambience/themes — all require leaving Expo Go for a Dev Client, not done. Schema already has room (Premium is additive; see ROADMAP).

## Verify habits

After non-trivial change: `npx tsc --noEmit` (must be clean). For visual/interactive changes, ask the user what they see on the phone — don't assume. Branches: `feature/ui-ux-polish` (active) merges to `dev`; `main` is base.
