# Lamplight — Project Context

## Overview & Product Vision

**Lamplight** is a universal language learning platform built around reading free books. The core insight: the best way to learn a language is to read things you love in that language, with translation help available at a tap.

**How it works:**
- User picks a language to learn (e.g. Bangla) and their native language (e.g. Korean)
- They get **two book shelves**: one in the target language, one in their native language
- In any book, they can tap a word for instant translation, long-press to save it, or read in parallel bilingual mode (original paragraph above, translation below)
- Every saved word goes into a spaced repetition deck (SM-2) for active recall
- A dedicated **Scripture section** is always available — compare what the Quran, Bible (OT/NT), Torah, and Vedas say on any question, with citations

**Current proof-of-concept scope:** Bangla ↔ English (to prove the system works for the hackathon). The architecture handles any language pair — adding a new pair requires no structural changes.

**Built for:** Shipathon 2026.

---

## Tech Stack

- **Framework**: React Native with **Expo SDK 57** (pinned — must match Expo Go on device)
- **Navigation**: **Expo Router** (file-based routing under `src/app/`)
- **Language**: TypeScript (strict mode, verified via `npx tsc --noEmit`)
- **Local DB**: **expo-sqlite** with custom serialized execution queue (`src/db/client.ts`)
- **Backend**: **Supabase** (PostgreSQL, pgvector for semantic verse search, Edge Functions)
- **Audio**: `expo-speech` (pronunciation engine), `expo-audio` (ambient sounds)
- **Sharing**: `expo-sharing` + `react-native-view-shot` (quote card image capture)
- **Styling**: Design tokens in `src/theme/tokens.ts`, `react-native-svg` for icons and share card graphics

---

## Directory Structure

```text
LampLight/
├── docs/                    # Architecture, design, debugging, deployment docs
│   ├── features.md          # Complete feature checklist (what's built, partial, missing)
│   └── feature_analysis.md  # Deep code analysis — real bugs and specific improvements
├── scripts/                 # Node maintenance and catalog sync scripts
├── src/
│   ├── app/                 # Expo Router routes
│   │   ├── (tabs)/          # Bottom tabs: homescreen, library, vocabulary, settings
│   │   ├── bangla/          # Bangla books library routes
│   │   ├── bible/           # Bible Old Testament reader
│   │   ├── bible-nt/        # Bible New Testament reader
│   │   ├── book/            # Book detail screen
│   │   ├── japanese/        # Japanese books (Aozora Bunko)
│   │   ├── korean/          # Korean books (Gongu Madang)
│   │   ├── mood-verses/     # Mood -> semantic verse search results
│   │   ├── quote-share/     # Quote/highlight share card screen
│   │   ├── quran/           # Quran reader
│   │   ├── reader/          # Prose book reader (paginated)
│   │   ├── torah/           # Torah reader
│   │   ├── vedas/           # Vedas reader
│   │   ├── onboarding.tsx   # Onboarding + vocabulary calibration placement test
│   │   └── paywall.tsx      # Subscription screen
│   ├── components/          # Shared UI components (BookSpine, icons, dialogs)
│   ├── db/
│   │   ├── client.ts        # Serialized SQLite queue — NEVER bypass this
│   │   ├── schema.ts        # DB migrations v1-v13
│   │   └── repositories/    # books, savedWords, highlights, shelves, readingPosition, quran, bible...
│   ├── features/
│   │   ├── ambience/        # Ambient background audio player
│   │   ├── analytics/       # Event logging
│   │   ├── app-update/      # App update prompt
│   │   ├── audio/           # pronunciationEngine.ts (word + paragraph TTS)
│   │   ├── bible-content/   # Bible text ingestion
│   │   ├── content-ingestion/ # Gutenberg downloader, book categories
│   │   ├── quran-content/   # Quran text ingestion
│   │   ├── reader/          # Pagination engine + all reader UI components
│   │   ├── scripture-qa/    # Cross-scripture AI Q&A engine + UI deck
│   │   ├── scripture-verses/ # Mood -> verse semantic search client
│   │   ├── settings/        # Language pair, literary themes, mother tongue, reading prefs
│   │   ├── subscription/    # Subscription state
│   │   ├── translation/     # Cloud translation provider, cap policy, usage tracking
│   │   ├── vedas-content/   # Vedas text ingestion
│   │   └── vocabulary/      # SM-2 SRS algorithm, calibration word lists, review prompt
│   ├── lib/                 # ID generation, haptics, shared utilities
│   └── theme/               # ThemeProvider, tokens.ts, typography.ts
└── supabase/                # PostgreSQL schema and Edge Functions
```

---

## Core Features (Implemented)

### Reader
- Paragraph-by-paragraph bilingual parallel view (original + translation, 🔊 per paragraph)
- Tap word → instant translation popup (anchored to tap position, with 🔊 + Save)
- Long-press word → action menu (Translate / Save as quote)
- Custom pagination engine — glyph-level layout, zero shift, page-turn sound
- Parallel Study ↔ Full Translation toggle
- Reading position persistence (resumes exactly where you left off)
- Page style selector (font, size, background)
- Ambient sound (rain, hearth, night library)

### Vocabulary & SRS
- Every saved word stores: source word, translation, context sentence, book/chapter/page/paragraph
- SM-2 spaced repetition: Again / Hard / Good / Easy with correct interval math
- SRS stage tracking: New → Learning → Reviewing → Mastered
- Vocabulary calibration placement test (4 frequency bands per language)

### Scripture
- Full readers: Quran, Bible OT, Bible NT, Torah, Vedas
- Cross-scripture AI Q&A with sourced citations
- Rate limiting + caching on Q&A calls
- Verse highlighting and word saving across all scripture verticals
- Mood → verse semantic search (Supabase pgvector)

### Library
- English books (Project Gutenberg), Bangla, Japanese, Korean books
- User-created shelves, category filter, book cover images
- Saved books screen, "Continue reading" history

### Social & Sharing
- Highlight/quote saving from any book or scripture
- Share card screen: 3 visual variants, swipe to cycle, export via OS share sheet
- Verse share cards

### Language & Personalisation
- 38 target languages
- Literary themes: Gothic, Romance, Philosophy, Adventure
- Day / Lamp reading modes
- Mother tongue setting (partially wired)
- Translation usage cap (300/day free, unlimited premium)

---

## Known Gaps (Priority Order)

1. **Context sentence not shown in SRS review** — data is saved, just not rendered
2. **Copy button in translation popup is broken** — no onPress handler
3. **Source language hardcoded to English** — blocks non-English source books from correct translation
4. **SRS review flood** — no LIMIT on due-words query
5. **getSpeechLocale missing 30 of 38 languages** — wrong locale codes for non-Latin scripts
6. **Culture-matched themes + share cards** — not built yet
7. **In-reader scripture cross-reference** — Q&A exists but not wired to verse tap

Full audit: `docs/feature_analysis.md`

---

## Hard Engineering Constraints

1. **Serialized SQLite Queue**: Never bypass `src/db/client.ts`. On Android, raw concurrent queries lock the database.
2. **Design Tokens**: Never hardcode colors/sizes that exist in `src/theme/tokens.ts`.
   - Primary Dark: `#1C1B1E` | Flame Amber: `#F5A623` | Parchment: `#F5EDE1`
   - Reading body: Lora font, never below 17px, line-height never below 1.85
3. **No New Dependencies**: Do not install packages or modify `app.json`, `android/`, `ios/` without lead approval.
4. **SDK Pin**: Expo Go on-device must be SDK 57. See `docs/debugging.md` if there's a mismatch.
5. **Git Identity**: All commits authored as `sheikhhossainn` / `skhossain799@gmail.com`.
