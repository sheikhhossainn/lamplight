# Lamplight — Reading App

React Native + Expo SDK 54, Expo Router (file-based routing, `src/app/`), TypeScript.

## Role & operating rules

- Senior React Native (Expo) engineer. Match the design exactly — never redesign unless asked.
- Smallest possible diff. Never refactor or "clean up" code unrelated to the task.
- Preserve spacing, typography, colors, shadows, and animations exactly as specified.
- Reuse existing components before creating new ones.
- Follow the existing design system (below) — never hardcode a value that already exists as a token.
- Ask instead of guessing when a spec is unclear or a screen/interaction isn't covered below.
- Don't touch native config (`app.json`, `ios/`, `android/`) or add dependencies without asking first.
- Don't chase performance work unless asked — it competes with "smallest diff."
- Concise explanations. Don't restate the diff back to the user.

## Design source of truth

The design spec lives in `Lamplight Reading App.zip` (12 annotated mobile screens + a design-system
reference + moodboard). It has already been fully transcribed into code — **read code tokens first,
the zip only when a screen/interaction isn't covered by them**:

- [src/theme/tokens.ts](src/theme/tokens.ts) — colors, spacing, radius, motion timing, icon stroke spec
- [src/theme/typography.ts](src/theme/typography.ts) — named type styles, font family mapping
- [src/theme/ThemeProvider.tsx](src/theme/ThemeProvider.tsx) — day/lamp theme context, `useTheme()`
- [src/theme/ThemeTransitionOverlay.tsx](src/theme/ThemeTransitionOverlay.tsx) — theme-switch transition

Never inline a raw hex, px, or font family in a screen/component — pull from these files. If a value
is genuinely missing from tokens (not just hard to find), add it there, don't ad-hoc it in the screen.

## Design language (condensed from the design system doc)

**Mood:** intimate, analog, candlelit. Never flat/corporate. Reading content is serif and warm;
app chrome is sans and quiet.

**Color**
- Brand core (fixed, never altered): Primary Dark `#1C1B1E`, Flame Amber `#F5A623`, Parchment `#F5EDE1`.
- Amber is the ONE recurring accent — CTAs, active/selected state, progress fill, bookmark, lamp glow.
  One accent per screen, never decorative.
- Neutrals are always warmed toward charcoal/parchment — never pure black/gray.
- Highlight colors (amber/sage/clay/dusk) are reserved for the highlighter tool + status pills only;
  each pairs a hue with an icon glyph so meaning never depends on color alone. Don't reuse elsewhere.
- Day and Lamp (dark) themes share the same token *keys* with flipped surface/text values — see
  `LamplightColor` vs `LamplightColorDark` in tokens.ts. Always theme through `useTheme()`, never branch
  manually on light/dark.

**Typography** — two families, strict separation, never mixed:
- **Lora** (serif, italic-leaning) — anything that *is* the book: reading text, titles, quotes, wordmark,
  literary-voice headlines.
- **Manrope** (sans) — app chrome: buttons, nav, labels, settings, metadata.
- Reading body is Lora 17px / line-height 1.85 — "the single most important number in the system."
  Never shrink below 17px, never tighten that line-height.
- UI chrome sets line-height 1 (compact, immediate) next to loose reading prose.
- Minimum on-page size 11px. Letter-spacing 0 everywhere except eyebrow labels (+1.2px uppercase),
  pills/badges (+0.3–0.5px), wordmark (+0.3px).
- Use the named styles in `LamplightTypography`, never a raw `TextStyle` with hardcoded `fontFamily`.

**Spacing & shape**
- Base unit 4px scale: 4/8/12/16/20/24/32. Screen margins 22–28px, card padding 14–18px,
  section gaps 20–26px. Tab bar 66px fixed, buttons 52px tall pill.
- Radius: pill `100` (buttons/tags/tab pills), card `12` (panels/popups/sheets), circle `50%`
  (swatches/avatars/lamp icon).
- **The fold motif** (from the logo's negative-space flame = a folded page) recurs three ways: page-curl
  corner on every book cover/share card, dog-ear-shaped Save/bookmark glyph, page-curl page-turn
  transition. Never substitute a generic drop-shadow card corner where a curl belongs.

**Icons & motion**
- Thin line strokes, 1.6–1.8px weight, rounded caps/joins. Warm charcoal on light, cream on dark.
  Bookmark/save icon is the one filled glyph; everything else stroked. No icon fonts, no emoji.
- Flame flicker: 2.6–3.2s ease-in-out, multi-keyframe scale+skew+glow — never a plain opacity pulse.
- Lamp glow pulse: 4s ease-in-out, opacity 0.7→1.
- Page turn: page-curl transition, ~350–450ms.
- Chrome fade (reader top bar): ~200–250ms, auto-hides ~2s after last tap.
- No bounce/overshoot easing anywhere — calm, not playful.

## Codebase map

- `src/app/` — Expo Router screens (file-based). Tabs: library, vocabulary, settings. Also
  onboarding, book detail, reader, quote-share, paywall.
- `src/features/reader/` — reading engine: `engine/paginate.ts`, `engine/words.ts` (tokenization),
  `components/ReaderPageView.tsx`, `WordTranslationPopup.tsx`, `WordActionMenu.tsx`,
  `HighlightColorPicker.tsx`.
- `src/features/translation/` — translation provider abstraction (`TranslationProvider.ts`,
  `cloudTranslationProvider.ts`), daily usage cap (`capPolicy.ts`).
- `src/features/settings/` — reading prefs, reading theme, language pair, theme transition state.
- `src/features/content-ingestion/` — book catalog (`catalog.ts`), fed by `scripts/ingest-books.mjs`
  (Gutendex API → bundled JSON).
- `src/db/repositories/` — SQLite-backed repos (highlights, savedWords, reading position via `getDb()`).
- `src/components/` — shared: `BookSpine.tsx`, `FlameGlow.tsx`, `icons.tsx`.

**Core hubs (touch with care, they fan out wide):** `useTheme()`, `getDb()`, `ReaderScreen()`,
`useTargetLanguage()`.

## Before implementing a UI change

1. Check `src/theme/tokens.ts` and `typography.ts` for the value/style you need — don't invent one.
2. Check `src/components/` and `src/features/*/components/` for an existing component to reuse.
3. If the change touches a specific one of the 12 mockup screens and the tokens above don't fully
   answer it, open `Lamplight Reading App.zip` → `Lamplight Mobile App.dc.html` for that screen's
   annotation before guessing.
4. If still unclear, ask — don't guess.
