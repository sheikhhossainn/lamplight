<p align="center">
  <img src="./assets/images/icon.png" width="120" height="120" alt="LampLight Logo" />
</p>

<h1 align="center">LampLight</h1>

<p align="center">
  <strong>Universal language learning through reading — an 1890s candlelit private library for prose and sacred scriptures.</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#sacred-scriptures">Sacred Scriptures</a> •
  <a href="#artisanal-page-themes">Page Themes</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#engineering-standards">Engineering Standards</a> •
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK_57-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/Database-expo--sqlite_v24-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite v24" />
  <img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tests-242_Passing-success?style=flat-square" alt="Tests 242 Passing" />
</p>

---

## Overview

**LampLight** is not a generic ebook reader; it is an immersive, tactile literary sanctuary designed around the warmth of an 1890s candlelit private library. It teaches languages naturally through authentic world literature and sacred texts.

Pick any target language and native tongue across **38 supported languages** in any direction (Korean ↔ Bangla, Arabic ↔ Urdu, English ↔ Japanese, and more). Readers experience parallel paragraph-by-paragraph bilingual reading, instant tap-to-translate, native audio pronunciation, spaced repetition (SM-2), and an AI literary companion that answers questions without spoiling upcoming plot points.

Beyond classical prose, a dedicated **Five Sacred Scripture Traditions** portal enables cross-tradition inquiry, verified citation retrieval, empathetic mood-based verse discovery, and audio recitation.

---

## Key Features

| Capability | LampLight | Typical Reading Apps |
|---|---|---|
| **Any Language Pair** | **38 supported languages** in any direction | Typically 5–6 Western languages |
| **Bilingual Reading Engine** | Paragraph-level parallel view + Study Toggle (Parallel ↔ Full) | Sentence-only or disruptive machine overlay |
| **12 Artisanal Page Themes** | Tailored paper textures, ink palettes, spine accents & deckled edges | Generic white, black, or sepia backgrounds |
| **Spaced Repetition (SRS)** | SuperMemo-2 (SM-2) algorithm, tap-to-reveal context, custom decks | Static word lists with no algorithm |
| **AI Literary Companion** | Contextual inquiries & spoiler-free recaps (Gemini Flash + Groq fallback) | Generic external chat models |
| **Five Sacred Scripture Traditions** | Quran, Bible OT/NT, Torah, Vedas side-by-side with verified citations | Single-tradition or none |
| **Cross-Scripture AI Q&A** | Grounded responses with canon-verified citations & injection defense | Prone to hallucinations and unsourced text |
| **Mood-Based Verse Discovery** | Empathetic reflection cards mapped to emotional states across traditions | Keyword search only |
| **Artisan Quote Sharing** | 9 culturally aligned visual templates (Full HD 1080p export + deep linking) | Plain text or generic cards |
| **Reading Ambience** | Authentic ambient soundscapes (rain, cafe, fireplace, forest brook) | None |
| **Literary Profiles & Avatars** | 8 curated literary presets (Tagore, Woolf, Shakespeare...) + OAuth sync | Generic avatar or placeholder icon |
| **Reading Habit Analytics** | Calendar heatmaps, weekly digests, theme-adaptive report cards | Basic page count counters |
| **Offline-First Architecture** | Serialized SQLite transaction queue (v1–v24) + offline event sync | Online-only or unqueued SQLite crashes |

---

## Sacred Scriptures

LampLight hosts a dedicated, culturally reverent scripture experience spanning five sacred traditions:

* 📖 **The Quran**: Arabic text, verified translations, chapter/surah indexing, and verse audio recitation.
* ✝️ **The Bible (Old & New Testaments)**: Canonical book indexing, parallel chapter study, and cross-tradition citation matching.
* 📜 **The Torah**: Hebrew scriptures with authentic structural division and commentary notes.
* 🪔 **The Vedas**: Rigveda, Samaveda, Yajurveda, and Atharvaveda with hymn-level navigation and philosophical context.
* 🕊️ **Empathetic Verse Discovery (`mood-verses`)**: Dynamic comfort cards mapped to emotional states (grief, anxiety, gratitude, peace, wonder).
* 🛡️ **Cross-Tradition AI Q&A & Citation Resolver**: Strict anti-hallucination verification guaranteeing only canonical verses render as scripture.

---

## Artisanal Page Themes

The reader features **12 authentic reading themes** inspired by physical printmaking traditions:

* **Classic**: Warmed editorial parchment with charcoal ink.
* **Modern**: High-contrast, clean sans-serif typography.
* **Manuscript**: Antiqued library paper with deep umber script.
* **Editorial**: Crisp cream stock with refined literary leading.
* **Sage**: Calming green undertone designed for extended eye comfort.
* **Kraft**: Raw unbleached fibrous book stock.
* **Oxford**: Academic navy accents on ivory paper.
* **Vellum**: Delicate translucent animal-skin parchment aesthetic.
* **Nocturne**: Charcoal-slate night surface with glowing amber accents.
* **Zen**: Japanese washi paper with sumi soot ink.
* **Dusk**: Deep twilight palette for midnight reading sessions.
* **Nordic**: Cool minimalist Scandinavian bookpress tones.

---

## Tech Stack

* **Framework**: [React Native](https://reactnative.dev/) + [Expo SDK 57](https://expo.dev/) (pinned)
* **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based navigation, `src/app/`)
* **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode, zero `tsc` error tolerance)
* **Local Database**: `expo-sqlite` with serialized transaction queue (`src/db/client.ts`) & numbered migrations (v1–v24)
* **Backend & Cloud**: [Supabase](https://supabase.com/) (PostgreSQL, pgvector embeddings, Edge Functions, Auth)
* **AI Engine**: Google Gemini Flash with Groq fallback (`literary-ai` Supabase Edge Function)
* **Subscriptions & Billing**: RevenueCat (`react-native-purchases`) with promo code redemption & restore purchases
* **Audio & Ambience**: `expo-audio` (ambient soundscapes, recitations) + `expo-speech` (TTS pronunciation)
* **Visual Card Generation**: `expo-sharing` + `react-native-view-shot`
* **Animations & Gestures**: `react-native-reanimated` + `react-native-gesture-handler`

---

## Project Structure

```
src/
├── app/                    # Expo Router routes & screens
│   ├── (tabs)/             # Tab navigation: Home, Library, Vocabulary, Settings
│   ├── auth/               # OAuth callback & authentication flow
│   ├── bangla/             # Bengali literature reader & chapter browser
│   ├── bible/              # Bible Old Testament reader
│   ├── bible-nt/           # Bible New Testament reader
│   ├── book/               # Book details, chapter index & download manager
│   ├── japanese/           # Japanese literature reader (Aozora Bunko)
│   ├── korean/             # Korean literature reader (Gongu Madang)
│   ├── mood-verses/        # Emotional reflection & empathetic verse discovery
│   ├── quote-share/        # Artisan quote card generator & Full HD export
│   ├── quran/              # Quran reader with recitation & translations
│   ├── reader/             # Custom glyph pagination engine & parallel reading
│   ├── torah/              # Torah reader
│   ├── vedas/              # Vedas reader (Rigveda, Samaveda, Yajurveda, Atharvaveda)
│   ├── onboarding.tsx      # Onboarding & multi-language placement calibration
│   ├── paywall.tsx         # RevenueCat subscriptions & promo code redemption
│   ├── profile.tsx         # Reader profile, avatar customization & reading stats
│   └── restore.tsx         # Account restore & cloud recovery
├── components/             # Reusable UI primitives, modals & design elements
├── db/
│   ├── client.ts           # Serialized SQLite queue (critical for Android concurrency)
│   ├── schema.ts           # Numbered DB migrations (v1–v24)
│   └── repositories/       # Repositories: books, savedWords, decks, highlights, analytics...
├── features/
│   ├── account/            # Literary avatars, credentials & guest-to-account merge
│   ├── ambience/           # Background soundscapes (rain, cafe, fireplace)
│   ├── analytics/          # Calendar heatmaps, ReadingReportCard & offline event queue
│   ├── audio/              # Pronunciation engine & audio controls
│   ├── billing/            # RevenueCat subscriptions, entitlements & promo codes
│   ├── companion/          # AI Literary Companion (Gemini / Groq) & spoiler guard
│   ├── content-ingestion/  # Gutenberg ingestion & book categorization
│   ├── discovery/          # Language-matched book recommendations & reading estimates
│   ├── reader/             # 12 page styles, glyph pagination & failure handler
│   ├── scripture-qa/       # Cross-scripture inquiry engine & citation verification
│   ├── scripture-verses/   # Empathetic verse deck & emotional comfort mapping
│   ├── settings/           # Language pairs, reading typography & culture themes
│   ├── sync/               # Cloud sync outbox & conflict resolution ("furthest progress wins")
│   ├── translation/        # Translation provider & free-tier usage caps
│   └── vocabulary/         # SuperMemo SM-2 algorithm, study decks & calibration bands
├── lib/                    # Shared utilities, crypto & deep linking
└── theme/                  # ThemeProvider, tokens.ts, typography.ts
```

---

## Getting Started

### Prerequisites

* Node.js (v18+)
* npm or yarn
* [Expo Go](https://expo.dev/go) matching SDK 57 (or an iOS/Android development build)

### Installation

```bash
# Clone the repository
git clone https://github.com/sheikhhossainn/lamplight.git
cd lamplight

# Install dependencies
npm install

# Start development server
npx expo start
```

### Verification & Testing

```bash
# Run complete test suite (240+ tests passing)
npm test

# Type-check TypeScript codebase (zero errors)
npx tsc --noEmit
```

---

## Engineering Standards

The codebase adheres to strict engineering invariants defined in `AGENTS.md`:

1. **Serialized SQLite Queue**: Every database interaction must pass through `src/db/client.ts`. Never bypass the queue or interact with raw SQLite handles directly (prevents Android SQLite concurrency locks).
2. **Design Tokens as Source of Truth**: All colors and dimensions derive from `src/theme/tokens.ts` and `typography.ts`. Never hardcode brand constants (`#1C1B1E`, `#F5A623`, `#F5EDE1`).
3. **Reading Typography Floor**: The reading body text enforces a strict floor: Lora font, $\ge 17\text{px}$, line-height ratio $\ge 1.85$.
4. **Resilient Offline Architecture**: Client events and reading progress queue locally before syncing to Supabase.
5. **Git Author & Push Guardrails**: Commits must dynamically respect the active developer's environment (`git config user.name` and `user.email`). Pushes to protected branches (`main`, `dev`) are restricted to dedicated feature branches (`feature/*`) merged via Pull Request.

---

## Documentation

| Document | Focus & Coverage |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Project layout, feature boundaries, and architectural patterns |
| [`docs/design.md`](./docs/design.md) | Design system tokens, elevation rules, and color palettes |
| [`docs/APP_VISUAL_BLUEPRINT.md`](./docs/APP_VISUAL_BLUEPRINT.md) | Visual blueprint, ASCII wireframes, and UI component hierarchy |
| [`docs/features.md`](./docs/features.md) | Detailed feature checklist and implementation state |
| [`docs/feature_analysis.md`](./docs/feature_analysis.md) | Deep codebase analysis, edge cases, and feature audits |
| [`docs/revenuecat-research.md`](./docs/revenuecat-research.md) | RevenueCat subscription architecture, entitlements, and paywalls |
| [`docs/debugging.md`](./docs/debugging.md) | Known pitfalls: Router, SQLite concurrency, SDK pins, fetch scripts |
| [`docs/scriptures.md`](./docs/scriptures.md) | Scripture verticals (Quran, Bible, Torah, Vedas): sources & pipeline |
| [`docs/context-verses.md`](./docs/context-verses.md) | Mood→verse semantic search and embeddings pipeline |
| [`docs/deployment.md`](./docs/deployment.md) | EAS build, production deployment, and OTA update guide |
| [`docs/TESTING_AUDIT.md`](./docs/TESTING_AUDIT.md) | Test suite coverage, mock harnesses, and verification audit |
| [`ROADMAP.md`](./ROADMAP.md) | Product phasing, free-tier caps, and future milestones |
