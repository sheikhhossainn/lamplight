# LampLight

**Universal language learning through reading — any language, any direction.**

LampLight is an immersive reading and language acquisition app that teaches you a new language naturally through real literature. Pick the language you want to learn and your native language — you get a two-shelf library, paragraph-by-paragraph bilingual translation, tap-to-translate, audio pronunciation, and spaced repetition (SM-2) for every word you save.

Beyond prose, a dedicated scripture section lets anyone read and compare five sacred traditions — the Quran, Bible (Old & New Testament), Torah, and Vedas — with verified citations, mood-based verse discovery, and cross-scripture AI inquiry.

---

## Key Features

| Feature | LampLight | Typical Reading Apps |
|---|---|---|
| **Any Language Pair** (Korean↔Bangla, Arabic↔Urdu, ...) | **38 supported languages** | Typically 5–6 European languages |
| **Bilingual Reading Engine** | Paragraph-level parallel view + Study Toggle | Sentence-only or full machine overlay |
| **AI Literary Companion** | Contextual explanations & spoiler-free recaps (Gemini + Groq) | None or generic chatbots |
| **Spaced Repetition (SRS)** | SM-2 algorithm, context reveal, custom study decks | Static word lists |
| **Five Sacred Scripture Traditions** | Quran, Bible OT/NT, Torah, Vedas side-by-side | Single-tradition or none |
| **Cross-Scripture AI Q&A** | Grounded responses with canon-verified citations | None |
| **Mood-Based Verse Discovery** | Empathetic reflection cards mapped to emotional states | Keyword search only |
| **Artisan Quote Sharing** | 9 culturally matched visual templates (Full HD export) | Plain text or generic cards |
| **Reading Ambience** | Ambient soundscapes (rain, cafe, fireplace, library) | None |
| **Offline-First Architecture** | Serialized SQLite queue (v1–v24) + offline event sync | Online-only |

---

## Tech Stack

- **Framework**: React Native + Expo SDK 57 (pinned)
- **Navigation**: Expo Router (file-based navigation, `src/app/`)
- **Language**: TypeScript (strict mode)
- **Local Database**: `expo-sqlite` with serialized queue (`src/db/client.ts`) & numbered migrations (v1–v24)
- **Backend & Cloud**: Supabase (PostgreSQL, pgvector, Edge Functions, Auth)
- **AI Engine**: Google Gemini Flash with Groq fallback (`literary-ai` Edge Function)
- **Subscriptions & Billing**: RevenueCat (`react-native-purchases`) with dynamic webhook verification & promo redemption
- **Audio & Ambience**: `expo-audio` (ambient soundscapes, recitations) + `expo-speech` (TTS pronunciation)
- **Card Sharing**: `expo-sharing` + `react-native-view-shot`
- **Gestures & Motion**: `react-native-reanimated` + `react-native-gesture-handler`

---

## Project Structure

```
src/
├── app/                    # Expo Router routes & screens
│   ├── (tabs)/             # Bottom tabs: Home, Library, Vocabulary, Settings
│   ├── auth/               # OAuth callback & authentication flow
│   ├── bangla/             # Bangla literature library & reader
│   ├── bible/              # Bible Old Testament reader
│   ├── bible-nt/           # Bible New Testament reader
│   ├── book/               # Book details, chapter index & download
│   ├── japanese/           # Japanese literature (Aozora Bunko)
│   ├── korean/             # Korean literature (Gongu Madang)
│   ├── mood-verses/        # Mood → empathetic verse discovery
│   ├── quote-share/        # Artisan quote card generator & export
│   ├── quran/              # Quran reader with recitation & translation
│   ├── reader/             # Prose pagination engine & parallel reading
│   ├── torah/              # Torah reader
│   ├── vedas/              # Vedas reader
│   ├── onboarding.tsx      # Onboarding & multi-language placement calibration
│   ├── paywall.tsx         # Premium tier & promo code redemption
│   └── restore.tsx         # Account restore & cloud recovery
├── components/             # Reusable UI primitives & modals
├── db/
│   ├── client.ts           # Serialized SQLite queue (critical for Android concurrency)
│   ├── schema.ts           # Numbered DB migrations (v1–v24)
│   └── repositories/       # Repositories: books, savedWords, decks, highlights, analytics...
├── features/
│   ├── ambience/           # Background soundscapes (rain, cafe, fireplace)
│   ├── analytics/          # Offline-first analytics event queue & telemetry
│   ├── audio/              # Pronunciation engine & audio controls
│   ├── billing/            # RevenueCat subscriptions, entitlements & promo codes
│   ├── companion/          # AI Literary Companion (Gemini / Groq)
│   ├── content-ingestion/  # Gutenberg ingestion & book categorization
│   ├── reader/             # Custom glyph-level pagination engine & styles
│   ├── scripture-qa/       # Cross-scripture inquiry engine & citation verification
│   ├── scripture-verses/   # Empathetic verse deck & emotional comfort mapping
│   ├── settings/           # Language pairs, reading typography & page styles
│   ├── sync/               # Cloud sync outbox & conflict resolution
│   ├── translation/        # Translation provider & free-tier usage caps
│   └── vocabulary/         # SM-2 algorithm, study decks & calibration bands
├── lib/                    # Shared utilities, crypto & deep linking
└── theme/                  # ThemeProvider, tokens.ts, typography.ts
```

---

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run comprehensive test suite (230+ tests)
npm test

# Type-check TypeScript codebase
npx tsc --noEmit
```

Open in Expo Go (matching SDK 57) or run on an iOS/Android development build.

---

## Hard Rules

1. **All DB calls** go through `src/db/client.ts` — never call the raw SQLite handle directly.
2. **Design tokens** are the source of truth: `src/theme/tokens.ts`. Never hardcode `#1C1B1E`, `#F5A623`, or `#F5EDE1`.
3. **Reading typography floor**: Lora font, never below 17px, line-height never below 1.85.
4. **No new dependencies** without lead approval.
5. **Before any PR**: `npx tsc --noEmit` → 0 errors.
6. **Git identity**: dynamically inherit active developer's git configuration (`git config user.name` / `user.email`). Never hardcode or override identities.

---

## Documentation

| File | What it covers |
|---|---|
| `docs/architecture.md` | Project layout, feature boundaries, and architectural patterns |
| `docs/design.md` | Design system details, palette tokens, and elevation rules |
| `docs/APP_VISUAL_BLUEPRINT.md` | Complete visual blueprint, ASCII wireframes, and UI component hierarchy |
| `docs/features.md` | Comprehensive feature checklist and implementation state |
| `docs/feature_analysis.md` | Deep code analysis, edge cases, and feature audits |
| `docs/revenuecat-research.md` | RevenueCat subscription architecture, entitlements, and paywalls |
| `docs/debugging.md` | Known pitfalls: Router, SQLite concurrency, SDK pins, fetch scripts |
| `docs/scriptures.md` | Scripture verticals (Quran, Bible, Torah, Vedas): sources & pipeline |
| `docs/context-verses.md` | Mood→verse semantic search and embeddings pipeline |
| `docs/deployment.md` | EAS build, production deployment, and OTA update guide |
| `docs/TESTING_AUDIT.md` | Test suite coverage, mock harnesses, and verification audit |
| `ROADMAP.md` | Product phasing, free-tier caps, and future milestones |
