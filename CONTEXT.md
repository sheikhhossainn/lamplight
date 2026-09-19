# Lamplight — Project Context & Agent Guide

## 1. Product Vision & Architecture

**Lamplight** is a universal reading platform designed around language immersion and contemplative scripture study. 

### Core Product Tenets:
- **Read to Learn**: Users learn a target language (e.g. English, Japanese, Korean, Bangla) by reading classic literature with instant tap-to-translate, bilingual parallel paragraphs, and audio pronunciation.
- **Tri-State Orthogonal Preferences**:
  1. `literaryTheme`: Aesthetic visual atmosphere (Hanji paper, Washi textures, Bengal ink, Arabic navy/gold, Western editorial cream). Configured via **"Change themes"** (`LiteraryThemePicker.tsx`).
  2. `motherTongue`: UI support language, dictionary translation target, and companion native literature shelf. Dynamically translates the theme banner typography without overriding the visual atmosphere.
  3. `targetReadingLanguage`: The language the user is reading/learning. Dictates the Homescreen spotlight, vocabulary calibration, and primary Library curated shelf.
- **Active Recall**: Every translated word can be saved with contextual sentence data into an SM-2 spaced repetition system (SRS) for flashcard review.
- **Contemplative Scripture Suite**: Dedicated parallel readers for the Quran, Bible (Old & New Testaments), and Vedas, paired with semantic mood-to-verse search and cross-tradition inquiry.

---

## 2. Information Map for Agents (Where to Find What)

Before implementing, use this index to find the source of truth for each domain:

| Topic / Domain | Primary File / Directory | Description |
|---|---|---|
| **Coding & Git Rules** | [`AGENTS.md`](file:///d:/Coding/LampLight/AGENTS.md) | Hard constraints, author identity, smallest-diff rules, git push ban |
| **System Architecture** | [`docs/architecture.md`](file:///d:/Coding/LampLight/docs/architecture.md) | Component layout, data flow, tri-state model, content pipelines |
| **Design System & Tokens** | [`src/theme/tokens.ts`](file:///d:/Coding/LampLight/src/theme/tokens.ts)<br>[`docs/design.md`](file:///d:/Coding/LampLight/docs/design.md) | Colors, typography, spacing, radius, day/lamp themes |
| **Visual Blueprint** | [`docs/APP_VISUAL_BLUEPRINT.md`](file:///d:/Coding/LampLight/docs/APP_VISUAL_BLUEPRINT.md) | ASCII wireframes, layout blueprints, design context |
| **Scripture Pipelines** | [`docs/scriptures.md`](file:///d:/Coding/LampLight/docs/scriptures.md) | Schemas, data sources, and recipes for Quran, Bible, Vedas |
| **Semantic Verse Search** | [`docs/context-verses.md`](file:///d:/Coding/LampLight/docs/context-verses.md) | Mood-to-verse embeddings (gte-small), Supabase pgvector |
| **Debugging & Pitfalls** | [`docs/debugging.md`](file:///d:/Coding/LampLight/docs/debugging.md) | SQLite locking, router quirks, SDK pin, fetch issues |
| **Deployment & Updates** | [`docs/deployment.md`](file:///d:/Coding/LampLight/docs/deployment.md) | EAS updates, channels, native build instructions |
| **Product Phasing** | [`ROADMAP.md`](file:///d:/Coding/LampLight/ROADMAP.md) | Free-tier limits, release phases, schema-to-feature map |
| **Graphify Knowledge Graph** | [`graphify-out/GRAPH_REPORT.md`](file:///d:/Coding/LampLight/graphify-out/GRAPH_REPORT.md) | Community hubs, symbol dependencies, structural cluster map |

### When Documentation is Missing: Graphify Fallback
If a feature or mechanism is not documented in `docs/`:
1. **Never guess** or run blind directory scans.
2. Open [`graphify-out/GRAPH_REPORT.md`](file:///d:/Coding/LampLight/graphify-out/GRAPH_REPORT.md) and locate the relevant hub under **Community Hubs**.
3. Use `graphify explain "<SymbolOrFile>"` or `graphify query "<feature>"` in the terminal.
4. Read only the target files in that community, implement with the smallest diff, and verify with `npx tsc --noEmit`.

---

## 3. Tech Stack & Platform Details

- **Framework**: React Native with **Expo SDK 57** (strict version match with Expo Go)
- **Routing**: **Expo Router** (`src/app/`)
- **Language**: TypeScript (strict mode, zero build warnings)
- **Local Database**: `expo-sqlite` accessed exclusively through serialized task queue in `src/db/client.ts`
- **Remote Backend**: **Supabase** (PostgreSQL, pgvector, Edge Functions; accessed via raw `fetch`, without heavy client SDK)
- **State Stores**: Synchronous external stores (`useSyncExternalStore`) for theme, language, and preferences
- **Audio & Speech**: `expo-speech` (TTS pronunciation engine) and `expo-audio` (ambient reading sounds)
- **Motion**: `react-native-reanimated` with standardized cubic-bezier easing tokens

---

## 4. Codebase Directory Layout

```text
LampLight/
├── docs/                        # Specialized architectural documentation
│   ├── APP_VISUAL_BLUEPRINT.md  # Wireframes and screen specifications
│   ├── architecture.md          # Domain boundaries & conventions
│   ├── context-verses.md        # Mood search & vector embeddings
│   ├── debugging.md             # Known pitfalls & debug procedures
│   ├── deployment.md            # EAS OTA update guidelines
│   ├── design.md                # Design tokens & color system
│   └── scriptures.md            # Scripture data formats & pipelines
├── graphify-out/                # Codebase relationship graph & community maps
│   └── GRAPH_REPORT.md          # Community hubs & dependency breakdown
├── src/
│   ├── app/                     # Expo Router routes
│   │   ├── (tabs)/              # Main navigation tabs: homescreen, library, vocabulary, settings
│   │   ├── book/[id].tsx        # Book overview and details
│   │   ├── chapter/             # Book chapter reader
│   │   ├── quran/, bible/, ...  # Scripture vertical reader screens
│   │   ├── mood-verses/         # Mood search results
│   │   └── onboarding.tsx       # Onboarding flow & calibration test
│   ├── components/              # Reusable UI (BookSpine, CultureEditionBanner, pickers, icons)
│   ├── db/                      # SQLite database layer
│   │   ├── client.ts            # Serialized execution queue (CRITICAL: all DB calls go here)
│   │   ├── schema.ts            # Versioned migrations
│   │   └── repositories/        # Domain queries (books, savedWords, readingPosition, scriptures)
│   ├── features/                # Domain logic
│   │   ├── audio/               # TTS and audio pronunciation engine
│   │   ├── content-ingestion/   # Multi-lingual catalog fetchers (Gutenberg, Bangla, Aozora, Gongu)
│   │   ├── reader/              # Pixel-precise font-metric pagination and reader gestures
│   │   ├── settings/            # Tri-state theme engine, mother tongue, reading preferences
│   │   ├── subscription/        # Entitlements and free-tier policy
│   │   ├── sync/                # Background cloud synchronization
│   │   ├── translation/         # Translation APIs and daily cap tracking
│   │   └── vocabulary/          # SM-2 SRS spaced repetition algorithm & placement calibration
│   └── theme/                   # ThemeProvider, design tokens, typography
└── supabase/                    # Supabase schema definitions and Edge Functions
```

---

## 5. Non-Negotiable Engineering Rules

1. **Serialized SQLite Queue**: Never call the SQLite handle directly. Always route queries through `src/db/client.ts`. Android will crash under concurrent raw transactions.
2. **Smallest Possible Diff**: Only touch code directly relevant to the user's task. Never refactor or clean up adjacent code without an explicit request.
3. **Design Tokens First**: Never hardcode colors, spacing, or typography. Reference `src/theme/tokens.ts` and `typography.ts` via `useTheme()`.
4. **Git Constraints**:
   - Commit author identity must always be `sheikhhossainn` (`skhossain799@gmail.com`).
   - **NEVER** run `git push` without explicit, unambiguous user command.
5. **Verification**: Always verify TypeScript integrity by running `npx tsc --noEmit` before concluding work.
