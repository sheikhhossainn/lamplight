# LampLight

**Universal language learning through reading — any language, any direction.**

LampLight is a reading app that teaches you a new language the natural way: by reading real books. Pick the language you want to learn and your native language — you get a two-shelf library, paragraph-by-paragraph bilingual translation, tap-to-translate, and spaced repetition for every word you save. A dedicated scripture section lets anyone compare what the Quran, Bible (Old & New Testament), Torah, and Vedas say on any question — side by side, with citations.

Built for **Shipathon 2026**.

---

## What makes it different

| Feature | LampLight | Competitors |
|---|---|---|
| Any language pair (Korean↔Bangla, Arabic↔Urdu, ...) | Yes | Linga: 6 EU languages only |
| Paragraph-level parallel bilingual view | Yes | No competitor has this |
| Native-language book shelf + target-language shelf | Yes | No competitor has this |
| Cross-scripture AI Q&A with citations | Yes | No one |
| Social quote cards (culturally matched) | Yes | No one |
| Sentence save + quote sharing | Yes | Linga: words only |
| 38 supported target languages | Yes | — |

---

## Tech Stack

- **Framework**: React Native + Expo SDK 57 (pinned)
- **Navigation**: Expo Router (file-based, `src/app/`)
- **Language**: TypeScript (strict)
- **Local DB**: expo-sqlite with serialized queue (`src/db/client.ts`)
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **Audio**: expo-speech (pronunciation engine, ambient sounds)
- **Sharing**: expo-sharing + react-native-view-shot (quote card capture)

---

## Project Structure

```
src/
├── app/                    # Expo Router routes
│   ├── (tabs)/             # Bottom tabs: homescreen, library, vocabulary, settings
│   ├── bangla/             # Bangla books routes
│   ├── bible/              # Bible Old Testament reader
│   ├── bible-nt/           # Bible New Testament reader
│   ├── book/               # Book detail & download
│   ├── japanese/           # Japanese books (Aozora Bunko)
│   ├── korean/             # Korean books (Gongu Madang)
│   ├── mood-verses/        # Mood → semantic verse search
│   ├── quote-share/        # Quote share card screen
│   ├── quran/              # Quran reader
│   ├── reader/             # Prose book reader (paginated engine)
│   ├── torah/              # Torah reader
│   ├── vedas/              # Vedas reader
│   ├── onboarding.tsx      # Onboarding + vocabulary calibration
│   └── paywall.tsx         # Subscription screen
├── components/             # Shared UI components
├── db/
│   ├── client.ts           # Serialized SQLite queue (critical for Android)
│   ├── schema.ts           # DB migrations v1-v13
│   └── repositories/       # Data access: books, savedWords, highlights, shelves...
├── features/
│   ├── audio/              # pronunciationEngine.ts
│   ├── content-ingestion/  # Gutenberg downloader + book categories
│   ├── reader/             # Pagination engine + all reader components
│   ├── scripture-qa/       # Cross-scripture AI engine + UI
│   ├── scripture-verses/   # Mood → verse semantic search
│   ├── settings/           # Language pair, themes, reading prefs, mother tongue
│   ├── translation/        # Translation provider + cap policy
│   └── vocabulary/         # SM-2 SRS algorithm + calibration
├── lib/                    # Shared utilities
└── theme/                  # ThemeProvider, tokens.ts, typography.ts
```

---

## Running the App

```bash
npm install
npx expo start
```

Open in Expo Go (SDK 57 required). Scan the QR code.

---

## Hard Rules

1. **All DB calls** go through `src/db/client.ts` — never call the raw SQLite handle directly.
2. **Design tokens** are the source of truth: `src/theme/tokens.ts`. Never hardcode `#1C1B1E`, `#F5A623`, or `#F5EDE1`.
3. **Reading typography floor**: Lora font, never below 17px, line-height never below 1.85.
4. **No new dependencies** without lead approval.
5. **Before any PR**: `npx tsc --noEmit` → 0 errors.
6. **Git identity**: dynamically inherit active developer's git configuration (`git config user.name` / `user.email`). Never hardcode or override identities.

---

## Docs

| File | What it covers |
|---|---|
| `docs/architecture.md` | Project layout and feature boundaries |
| `docs/design.md` | Design system details beyond the token constants |
| `docs/features.md` | Full feature checklist (implemented / partial / not started) |
| `docs/feature_analysis.md` | Deep code analysis of each feature — real bugs and improvements |
| `docs/debugging.md` | Known pitfalls: Router, SQLite, SDK, fetch scripts |
| `docs/scriptures.md` | Scripture verticals: sources, pipeline |
| `docs/context-verses.md` | Mood→verse semantic search and embeddings |
| `docs/deployment.md` | EAS build and OTA update instructions |
| `TEAMCONTRIBUTION.md` | Task ownership per contributor |
| `ROADMAP.md` | Product phasing and free-tier caps |
