# Lamplight — Project Context

Read this before touching the code. It's the fast path to full context — architecture, decisions, what's built, what's known-broken-on-purpose.

## What this is

A mobile reading app: read public-domain classics with live word/quote translation and vocabulary saving, in a warm "reading by lamplight" aesthetic. Android-first via Expo Go; iOS is a cheap follow-on later (same RN codebase, just a build profile).

Full build plan (milestones, rationale): `C:\Users\Mahi-Shahi\.claude\plans\floating-noodling-metcalfe.md`

## Stack & why

- **React Native + Expo SDK 54** (`~54.0.35`, pinned — see "SDK version" below), TypeScript strict, **Expo Router** (file-based, in `src/app/`).
- Chosen over an earlier Kotlin Multiplatform + Compose Multiplatform plan because the user's dev environment is **VS Code**, not Android Studio/IntelliJ — CMP's tooling assumes a JetBrains IDE; RN + Expo has first-class VS Code support and Expo Go lets you iterate on a physical phone with near-zero native setup.
- **Staying in Expo Go** (no custom Dev Client) through the current feature set — deliberately avoided any native module that would force that transition early (see Translation and Billing below).

### SDK version — read this if the app won't launch on a phone

Expo Go on the phone must match the project's Expo SDK **exactly**. This project is pinned to **SDK 54** because that's what the phone's Expo Go build supported when this was set up (`client version 54.0.8, supported sdk 54`). If you see `Incompatible SDK version` at launch: either update Expo Go on the phone, or re-pin this project to whatever SDK the phone's Expo Go reports, via:
```
# edit "expo" version in package.json, then:
npm install expo@~<target>.0.x
npx expo install --fix   # realigns react, react-native, expo-router, reanimated, etc.
rm -rf node_modules package-lock.json && npm install
```
Do **not** hand-edit the other Expo/RN package versions — always let `expo install --fix` resolve them.

### Known Expo Router gotcha

Deleting/adding/restructuring route files (e.g. moving a screen into a route group) does **not** reliably hot-reload. If a screen shows stale/deleted content after an edit, stop Metro and restart with `npx expo start -c` (clears cache, forces route-table rebuild), then force-close and reopen Expo Go on the phone.

## Design system (locked — do not tweak ad hoc)

Source of truth: `src/theme/tokens.ts` (colors, spacing, radius, motion timings) and `src/theme/typography.ts` (11 named text styles). Both transcribed directly from the Figma Design System doc — see the color/typography rules below, they're not arbitrary.

- **Colors**: Primary Dark `#1C1B1E`, Flame Amber `#F5A623` (the ONE recurring accent — CTAs, progress, active states — never decorative), Parchment `#F5EDE1`. Derived neutrals (ink/umber/fawn/straw/hairline/card/ember/lampText) for text/surfaces — never pure black/gray. Highlight colors (sage/clay/dusk + amber) are reserved for the highlighter tool only — never reused elsewhere in the UI.
- **Typography**: Lora (serif) = anything that IS the book (reading text, titles, quotes). Manrope (sans) = app chrome. Reading body line-height is **1.85** — the single most important number in the system, never shrink it.
- **Motif**: fold/flame (lifted-corner page-curl) appears on book covers/cards (`BookSpine.tsx`), the bookmark glyph, and the reader's page-turn transition (`PageTurnFlash.tsx`).
- **Brand mark**: `src/components/FlameGlow.tsx` renders the exact logo SVG (tile + flame + fold bars). Only a glow layer behind it animates (opacity pulse) — the mark itself is always fully static/opaque. (Earlier version scaled+rotated the flame and dipped its opacity to 0 — looked like distortion/glitching. Don't reintroduce that.)

## Architecture

```
src/
  app/                    Expo Router routes (thin — compose features, handle nav params)
    index.tsx             Splash (animated logo, auto-advances to /onboarding)
    onboarding.tsx         3-slide onboarding
    (tabs)/               Library / Vocabulary / Settings bottom tabs
    book/[id].tsx          Book Detail
    reader/[bookId].tsx    Reader (all 3 chrome variants live here)
    quote-share/[highlightId].tsx   Quote/share card (3 visual variants)
  components/              Shared dumb UI: BookSpine, FlameGlow, icons
  theme/                   tokens.ts, typography.ts, ThemeProvider.tsx (useTheme())
  db/                      SQLite: schema.ts (versioned migrations), client.ts, repositories/*
  features/
    content-ingestion/     catalog.ts — book metadata + require()'d bundled text (see Content below)
    reader/                engine/ (pagination, word tokenizing), components/ (chrome pieces)
    translation/           TranslationProvider interface + cloud impl + daily cap policy
    subscription/          isPremiumUser() stub — always false until Milestone 7
  lib/                      generateId() etc.
scripts/
  ingest-books.mjs          Dev-time only. Fetches + cleans book text. Re-run to add/refresh books.
assets/books/*.json          Ingested book text (bundled into the JS bundle via require()).
```

Routing note: `useLocalSearchParams` + `router.push({ pathname: '/reader/[bookId]', params: {...} })` — Expo Router's typed routes reject plain template-string paths like `` `/reader/${id}` ``; always use the object form.

## Data layer

SQLite (`expo-sqlite`, modern async API) via `src/db/client.ts` → `getDb()` singleton, runs versioned migrations (`src/db/schema.ts`) then seeds `books` from `BOOK_CATALOG` on first launch. Tables: `books`, `reading_positions`, `saved_words`, `highlights`, `translation_usage`. Repositories in `src/db/repositories/*` are the only thing that should touch SQL directly.

## Content ingestion (Gutenberg via Gutendex)

`scripts/ingest-books.mjs` — dev-time Node script, not run on-device. Looks up each catalog title via **Gutendex** (`https://gutendex.com`, the de facto public API for Project Gutenberg's catalog — Gutenberg itself has no official REST API), downloads the plain-text edition, cleans it, splits into chapters, paginates by a character budget (1400 chars/page), writes `assets/books/<id>.json`. Run with `node scripts/ingest-books.mjs`.

All 5 catalog books are ingested and fully readable: Pride and Prejudice (60 ch.), Don Quixote Part 1 (52 ch.), The Odyssey (24 books), Anna Karenina (239 ch.), Crime and Punishment (39 ch.) — chapter counts verified against the real books.

**Non-obvious things the script handles** (re-derive these from source before "fixing" the script, they're not bugs):
- Gutenberg mirrors serve **CRLF** line endings — raw text is normalized to `\n` before any regex runs.
- Many editions print a duplicate **Table of Contents** (every chapter heading listed once, tightly packed, then again at the real heading) — `stripLeadingToc()` detects a run of ≥3 suspiciously small gaps between heading matches at the start and drops that whole run. TOC entries cluster far more tightly than any real chapter body ever does, regardless of book length, so this generalizes across books.
- Front matter (title page, translator's intro/biography) before the first real chapter heading is **discarded by default** — genuinely ambiguous to detect generically (a translator's bio can be many paragraphs long, same as real prose). Only `pride-and-prejudice` has an explicit `chapter1Anchor` override (`"It is a truth universally acknowledged"`) because that specific Gutenberg edition's real Chapter 1 has no heading at all and sits after a critic's introduction essay. If a newly-added book's Chapter 1 goes missing, check whether it needs the same kind of anchor rather than adding a generic heuristic — a generic "paragraph length" heuristic was tried and reverted; it can't distinguish "real unheaded chapter 1" from "long editorial introduction."
- Author-name matching guards against Gutendex spelling variants (e.g. it's "Dostoyevsky" with a Y in Gutendex's data — matched via substring `'dosto'`).
- Book bundling is via static `require()` (Metro needs static paths) — adding a 6th book means adding both a `CATALOG` entry in the script **and** a `require()` line in `src/features/content-ingestion/catalog.ts`. `BOOK_CATALOG` (shelf metadata) is derived from the required JSON, not hand-maintained — don't reintroduce a parallel hardcoded array.
- Current bundle size cost: ~14MB JS bundle with all 5 books statically required in (vs ~5MB with just one). Acceptable for now; if it becomes a problem, the fix is loading chapter text via `expo-file-system` from a copied asset instead of `require()`, per the original plan.

## Reader engine

- **Pagination**: chapters are pre-chunked at ingestion time by character budget, not measured against actual on-device rendered glyph layout. Pragmatic simplification — real per-device text measurement is the more-correct, much-harder approach. `src/features/reader/engine/paginate.ts` flattens a book into a flat page list (`{chapterIndex, pageIndexInChapter, paragraphs}`) for the horizontal `FlatList` pager.
- **3 chrome variants**, all sharing one `ReaderScreen` (`src/app/reader/[bookId].tsx`) + one pagination engine, switched via a `ReaderMode` enum — never forked into separate screens:
  - **Day**: parchment/ink, chrome auto-hides ~2s after last tap, corner hot-zone taps to turn page.
  - **Lamp default**: charcoal/cream + `LampGlowOverlay` (radial amber glow, opacity tied to a warmth value), persistent floating lamp icon (reuses `FlameGlow` in `glowPulse` mode) opens a discrete 5-preset `WarmthPicker` (not a continuous drag slider — pragmatic simplification).
  - **Lamp alt**: zero persistent chrome; long-press left/right screen edges summons the same warmth picker transiently; an invisible top-left 44×44 tap zone is the only way back to Day mode (an affordance not literally in the Figma spec, added so users aren't stranded in a chromeless mode).
- **Word tap → translate**: paragraphs render as nested tappable `Text` spans (`ReaderPageView.tsx` + `engine/words.ts` tokenizer). **Highlight**: long-press a paragraph (not arbitrary text-range selection — paragraph-level granularity is a deliberate scope cut; the `highlights` table's `start_offset`/`end_offset` columns are repurposed to hold the paragraph index, not a character offset, when read back in the Reader — see `highlightMap` in `reader/[bookId].tsx`).
- **Page-turn transition**: `PageTurnFlash.tsx` — a brief amber corner flash, not a 3D page-flip sim (matches the design system's "calm, not playful" motion rule).

## Translation

`src/features/translation/` — `TranslationProvider` interface is the swap seam; `cloudTranslationProvider.ts` is the only implementation so far, calling the **unofficial, key-free** `translate.googleapis.com/translate_a/single` endpoint (works well, but unofficial — could break or rate-limit without warning; a paid API is the durable fallback if that happens). In-memory cache only (no persisted cache yet). Daily free-tier cap (`capPolicy.ts`, 20/day) is enforced **only** at the word-tap/quote-translate call sites — reading, highlighting, and vocabulary viewing must never gate on it. On-device translation (ML Kit) and real billing are both deferred to Milestone 7+ because they require leaving Expo Go for a custom Dev Client; `isPremiumUser()` is a hardcoded `false` stub until then.

## What's NOT built yet

Milestone 7 onward from the plan: RevenueCat/Play Billing, on-device ML Kit translation ("offline language packs"), extra lamp themes, page-turn sounds, real Settings screen, accessibility/contrast verification pass, production store readiness. All of these require the Expo Go → Dev Client transition (`eas build --profile development`), which hasn't happened yet — everything built so far runs in plain Expo Go.

## Verification habits for this project

After any non-trivial change: `npx tsc --noEmit` (must be clean), then `npx expo export --platform android` as a bundling smoke test (catches Metro/require errors tsc won't), then `rm -rf dist`. Neither replaces actually checking the phone when the change is visual/interactive — ask the user what they see rather than assuming.
