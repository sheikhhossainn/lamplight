# Lamplight — Project Context

## Overview & Product Vision

**Lamplight** is a tactile, bilingual reading app designed around an 1890s private library aesthetic. It provides a distraction-free, contemplative reading space blending classic literature, sacred scriptures, and language acquisition tools.

Core tenets:
- **Atmospheric Reading**: Warm parchment and candlelit lamp modes, natural page-turn sounds, and continuous ambient soundscapes (rain, hearth fire, night library).
- **Frictionless Language Learning**: Tap-and-hold word translations, full-page translations, automatic vocabulary collection into a notebook, and spaced flashcards.
- **Sacred Texts & Reflection**: Dedicated parallel reading verticals for sacred scriptures (Quran, Bible Old/New Testament, Torah, Vedas) paired with semantic, mood-based verse discovery ("How are you feeling?").
- **Offline-First**: Books and scriptures are cached locally on device, supporting reading without an active internet connection.

---

## Tech Stack & Tooling

- **Framework**: React Native with **Expo SDK 57** (pinned).
- **Navigation**: **Expo Router** (file-based routing under `src/app/`).
- **Language**: TypeScript (strict mode, verified via `npx tsc --noEmit`).
- **Local Storage / Database**: **`expo-sqlite`** with custom serialized execution queue (`src/db/client.ts`).
- **File System / Cache**: `expo-file-system` (storing downloaded book texts and imported EPUBs).
- **Remote Backend**: **Supabase** (PostgreSQL, pgvector for semantic verse embeddings, and Edge Functions).
- **Motion & Audio**: `react-native-reanimated`, `react-native-gesture-handler`, `expo-audio`.
- **Styling & Icons**: Design tokens in `src/theme/tokens.ts`, custom vector icons in `src/components/icons.tsx`, `react-native-svg`.

---

## Directory Structure

```text
LampLight/
├── assets/                  # Bundled scripture JSON, audio loops, fonts
├── docs/                    # Architectural & operational documentation
│   ├── architecture.md      # Layout, feature boundaries, conventions
│   ├── design.md            # Design system, palette, typography rules
│   ├── debugging.md         # Known pitfalls and troubleshooting recipes
│   ├── deployment.md        # EAS build and OTA update instructions
│   ├── scriptures.md        # Scripture verticals sources & pipeline
│   └── context-verses.md    # Semantic mood-to-verse search & embeddings
├── scripts/                 # Node maintenance and catalog sync scripts
├── src/
│   ├── app/                 # Expo Router routes
│   │   ├── (tabs)/          # Bottom tabs: library, vocabulary, settings
│   │   ├── bible/           # Bible (Old Testament) routes
│   │   ├── bible-nt/        # Bible (New Testament) routes
│   │   ├── book/[id].tsx    # Book Detail screen (synopsis, download CTA, shelves)
│   │   ├── mood-verses/     # Mood reflection and context verse results
│   │   ├── quran/           # Quran surah list and verse reader
│   │   ├── reader/[bookId].tsx # Prose book reader (paginated engine)
│   │   ├── saved-books.tsx  # Downloaded book storage manager
│   │   └── vedas/           # Vedas texts and hymns
│   ├── components/          # Shared components (BookSpine, ConfirmDialog, HomeGuideModal)
│   ├── db/                  # SQLite client queue, migrations, and repositories
│   │   ├── client.ts        # Serialized SQLite queue (critical for Android stability)
│   │   ├── schema.ts        # Database table definitions and migrations
│   │   └── repositories/    # Domain data access modules
│   ├── features/            # Isolated feature domains
│   │   ├── ambience/        # Ambient background player & preferences
│   │   ├── content-ingestion/# Gutenberg downloader, text parser, EPUB importer
│   │   ├── reader/          # Pagination engine, glyph widths, touch gesture handling
│   │   ├── settings/        # Theme transitions, reading preferences, language pairs
│   │   ├── scripture-verses/# Semantic search client and feeling prompt modal
│   │   ├── translation/     # Translation providers, rate limits, daily caps
│   │   └── vocabulary/      # Flashcards, review prompts, notebook management
│   ├── lib/                 # Shared utilities and navigation guards
│   └── theme/               # ThemeProvider, tokens, typography constants
└── supabase/                # PostgreSQL schema and Edge Functions
```

---

## Core Features & Workflows

### 1. Library & Prose Reading
- **Shelf View**: Horizontal wooden planks with rotated book spines, category filtering, search, and "Continue Reading" cards.
- **Book Details (`/book/[id]`)**: Displays author, synopsis, chapter counts, and language pair.
- **Smart Download Confirmation**: Tapping "Download & Read" prompts the user that the book will be stored locally for offline reading and can be deleted from Settings → Saved books.
- **Pagination Engine**: Measures font metrics on device and computes pixel-accurate pages with zero layout shift. Supports soft page-turn sounds and swipe/fold gestures.
- **Reading Modes**: Seamless toggle between Day (parchment cream) and Lamp (deep charcoal linear gradient).

### 2. Translation & Vocabulary
- **Page Translation**: Tapping the top globe icon triggers full-page translation into the user's target language.
- **Word Lookup**: Long-pressing any word opens an action menu for instant word translation or quote bookmarking.
- **Notebook & Flashcards**: Looked-up words are saved to the Notebook tab. An interactive flashcard engine reinforces retention with flip animations.
- **Daily Review Prompt**: A gentle daily reminder surfaces in the Library (never interrupting active reading).

### 3. Sacred Scripture Verticals
- Independent, verse-keyed verticals for **Quran**, **Bible (OT/NT)**, **Torah**, and **Vedas**.
- Parallel bilingual verse presentation, surah/chapter index navigation, and automatic last-read verse highlighting.
- **Mood / Context Reflection**: Free-text mood input ("anxious", "seeking peace") querying Supabase pgvector embeddings for comforting verses across traditions.

### 4. User Guidance
- **Homescreen Tour (`HomeGuideModal`)**: Outlines the shelf, notebook/flashcards, settings, and reading gestures. Supports seamless tab jumping with automatic resumption when returning to the Library.
- **Reader Guide (`ReaderGuideModal`)**: Pops up on initial book open to demonstrate page turning, full-page translation, and long-press actions.

---

## Hard Engineering Constraints

1. **Serialized SQLite Queue**: Never bypass `src/db/client.ts`. On Android, raw concurrent queries can lock the database; all DB interactions must pass through `getDb()` and the serialized queue.
2. **Design Tokens as Source of Truth**: Never hardcode colors or metrics that exist in `src/theme/tokens.ts`.
   - Primary Dark: `#1C1B1E`
   - Flame Amber: `#F5A623`
   - Parchment: `#F5EDE1`
   - Reading body floor: Lora typography, never below 17px, line-height never below 1.85.
3. **No Unrequested Dependencies**: Do not install packages or modify native configs (`app.json`, `android/`, `ios/`) without explicit user permission.
4. **Smallest Diff**: Only modify code directly necessary for the user's request. Keep edits concise and isolated.
