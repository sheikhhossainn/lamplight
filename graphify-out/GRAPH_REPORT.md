# Graph Report - .  (2026-07-11)

## Corpus Check
- 107 files · ~99,309 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 623 nodes · 1275 edges · 33 communities (31 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Reader Engine Core
- CLAUDE.md + Roadmap Docs
- Settings + Language Picker
- Root Layout + Design System
- app.json Config
- Book Catalog Sync
- Package Dependencies
- Reader Text Hit-Testing
- Vocabulary Notebook Screen
- SQLite Client + Migrations
- Library Shelf Screen
- Saved Books + Tab Icons
- Book Detail + Spine
- Splash Screen + Flame Glow
- Shelf Editor + Books Repo
- Notebook Empty-State Illustrations
- NPM Scripts
- Onboarding Screens
- Quote Share Cards
- Unused Expo Template Icons
- package.json Metadata
- reset-project Script
- tsconfig
- Paywall Screen
- EPUB Import + Save Word
- Reading Position Repo
- Expo/Splash Icon Assets
- Android Adaptive Icons + Badge
- Ambience + Design Motion Spec
- Expo App Setup (README)
- Ambience Upload Script
- ESLint Config
- Verify Habits

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 59 edges
2. `getDb()` - 48 edges
3. `Codebase map section` - 28 edges
4. `ReaderScreen()` - 26 edges
5. `expo` - 17 edges
6. `LibraryScreen()` - 17 edges
7. `useTargetLanguage()` - 15 edges
8. `BookDetailScreen()` - 14 edges
9. `Architecture tree (src/ layout)` - 13 edges
10. `scripts` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Codebase map section` --references--> `ReaderScreen()`  [EXTRACTED]
  CLAUDE.md → src/app/reader/[bookId].tsx
- `Codebase map section` --references--> `getDb()`  [EXTRACTED]
  CLAUDE.md → src/db/client.ts
- `Data layer (expo-sqlite, serializing queue)` --references--> `getDb()`  [EXTRACTED]
  context.md → src/db/client.ts
- `Codebase map section` --references--> `useTargetLanguage()`  [EXTRACTED]
  CLAUDE.md → src/features/settings/languagePair.ts
- `Translation & settings section` --references--> `useTargetLanguage()`  [EXTRACTED]
  context.md → src/features/settings/languagePair.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **On-device reader pagination & word-selection flow** — src_app_reader_bookid_readerscreen, src_features_reader_engine_paginate, src_features_reader_components_wordactionmenu, src_features_reader_glyphwidths, src_features_settings_readingprefs [EXTRACTED 1.00]
- **Free-tier rate-limiting & premium-gating pattern** — src_features_translation_cappolicy, src_features_subscription_ispremiumuser, roadmap_free_tier_philosophy [INFERRED 0.85]
- **Token-first design enforcement pattern** — claude_role_operating_rules, claude_design_language, src_theme_tokens, src_theme_typography [EXTRACTED 1.00]

## Communities (33 total, 2 thin omitted)

### Community 0 - "Reader Engine Core"
Cohesion: 0.06
Nodes (48): Reader engine (pagination, glyph hit-testing, word interaction), ReaderMode, ReaderPageFrameProps, ReaderScreen(), READING_DARK_STOPS, selectedText(), styles, { width: screenWidth, height: screenHeight } (+40 more)

### Community 1 - "CLAUDE.md + Roadmap Docs"
Cohesion: 0.06
Nodes (48): CLAUDE.md (project instructions), Codebase map section, context.md (fast-path project context), Architecture tree (src/ layout), Not built yet section, Translation & settings section, Q&A: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, etc.?, ROADMAP.md (product roadmap) (+40 more)

### Community 2 - "Settings + Language Picker"
Cohesion: 0.08
Nodes (32): SettingsScreen(), styles, CloseIcon(), LanguagePicker(), LanguagePickerProps, styles, getSetting(), setSetting() (+24 more)

### Community 3 - "Root Layout + Design System"
Cohesion: 0.09
Nodes (33): Before implementing a UI change (checklist), Design source of truth section, Design system section (locked, src/theme/), Q&A: Does Codebase map (CLAUDE.md) reference all its listed theme files? (correction), Lamplight Reading App.zip (design spec: 12 mockups + design-system doc + moodboard), RootLayout(), AppUpdateBanner(), styles (+25 more)

### Community 4 - "app.json Config"
Cohesion: 0.06
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+26 more)

### Community 5 - "Book Catalog Sync"
Cohesion: 0.11
Nodes (30): Content ingestion (remote, on-demand), CATALOG, findBook(), rows, supabase, syncOneBook(), SYNOPSES, bookCache (+22 more)

### Community 6 - "Package Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, expo, expo-audio, expo-constants, expo-device, expo-file-system, expo-font, expo-glass-effect (+26 more)

### Community 7 - "Reader Text Hit-Testing"
Cohesion: 0.12
Nodes (28): charIndexAtFraction(), charInLine(), fractionAtCharIndex(), getTokenOffsets(), getTokens(), HandlePixel, lineCharOffset(), lineStartOffsets() (+20 more)

### Community 8 - "Vocabulary Notebook Screen"
Cohesion: 0.14
Nodes (25): Data layer (expo-sqlite, serializing queue), styles, Tab, TABS, VocabularyScreen(), ConfirmDialog(), ConfirmDialogProps, styles (+17 more)

### Community 9 - "SQLite Client + Migrations"
Cohesion: 0.13
Nodes (21): backfillBootstrapCategories(), BOOTSTRAP_CATALOG, createQueue(), Enqueue, migrate(), refreshFromRemoteInBackground(), seedBootstrapIfEmpty(), SERIALIZED_METHODS (+13 more)

### Community 10 - "Library Shelf Screen"
Cohesion: 0.16
Nodes (20): getShelfSubtitle(), LibraryScreen(), ROW_ROTATIONS, styles, { width: screenWidth }, createShelf(), deleteShelf(), listShelfItems() (+12 more)

### Community 11 - "Saved Books + Tab Icons"
Cohesion: 0.13
Nodes (18): SavedBooksScreen(), styles, TabsLayout(), BookmarkIcon(), CheckIcon(), ChevronLeftIcon(), FilterIcon(), IconProps (+10 more)

### Community 12 - "Book Detail + Spine"
Cohesion: 0.22
Nodes (14): BookDetailScreen(), styles, BookSpine(), BookSpineProps, FALLBACK_TONES, isDarkSpineColor(), SPINE_COLOR_BY_BOOK, spineColorForBook() (+6 more)

### Community 13 - "Splash Screen + Flame Glow"
Cohesion: 0.14
Nodes (13): SplashScreen(), styles, { width: screenWidth, height: screenHeight }, FLAME_BBOX, FLAME_OPACITY, FlameGlow(), FlameGlowProps, GLOW_INTENSITY (+5 more)

### Community 14 - "Shelf Editor + Books Repo"
Cohesion: 0.19
Nodes (11): Library shelves (user category shelves), ShelfDraft, ShelfEditorModal(), ShelfEditorModalProps, styles, BookRow, BookSqlRow, fromSqlRow() (+3 more)

### Community 15 - "Notebook Empty-State Illustrations"
Cohesion: 0.22
Nodes (13): ReadIllustration(), SkeletonShelf(), ToggleSwitch(), EmptyPrompt(), FlashcardDeck(), AnimatedLine, FlashcardsIllustration(), LampGlowScene() (+5 more)

### Community 16 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, android, ios, lint, reset-project, start, sync:books, sync:bulk-catalog (+3 more)

### Community 17 - "Onboarding Screens"
Cohesion: 0.18
Nodes (9): ILLUSTRATIONS, illustrationStyles, OnboardingScreen(), ShelfIllustration(), Slide, SLIDES, styles, TranslateIllustration() (+1 more)

### Community 18 - "Quote Share Cards"
Cohesion: 0.22
Nodes (7): CARD_WIDTH, QuoteCard(), quoteFontStyle(), QuoteShareScreen(), styles, Variant, VARIANTS

### Community 19 - "Unused Expo Template Icons"
Cohesion: 0.29
Nodes (10): React Logo (2x) - Unused Expo Scaffold Asset, React Logo (3x) - Unused Expo Scaffold Asset, React Logo (1x) - Unused Expo Scaffold Asset, Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default (+2 more)

### Community 20 - "package.json Metadata"
Cohesion: 0.20
Nodes (9): devDependencies, @supabase/supabase-js, tsx, @types/react, typescript, main, name, private (+1 more)

### Community 21 - "reset-project Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 22 - "tsconfig"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, extends, include, @/*, @/assets/*

### Community 23 - "Paywall Screen"
Cohesion: 0.29
Nodes (5): FEATURES, PaywallScreen(), Plan, styles, { width: screenWidth, height: screenHeight }

### Community 24 - "EPUB Import + Save Word"
Cohesion: 0.48
Nodes (5): createLocalBook(), saveWord(), cacheImportedBook(), importEpubFromFile(), generateId()

### Community 25 - "Reading Position Repo"
Cohesion: 0.38
Nodes (6): fromSqlRow(), hideFromContinueReading(), listActiveReadingPositions(), listAllReadingPositions(), ReadingPosition, ReadingPositionSqlRow

### Community 26 - "Expo/Splash Icon Assets"
Cohesion: 0.47
Nodes (6): Expo Icon Vector Symbol (Chevron/Mountain Path), Expo Icon Grid Background Texture, Favicon (Blue Arrow Mark), App Icon (Blue Arrow Mark), Logo Glow Effect Asset, Splash Screen Icon

### Community 27 - "Android Adaptive Icons + Badge"
Cohesion: 0.53
Nodes (6): Android Adaptive Icon Background Layer, Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient), Android Adaptive Icon Monochrome Layer (Expo Arrow Mark, Gray), Expo 'Powered by Expo' Badge (Black, Dark Theme), Expo 'Powered by Expo' Badge (White, Light Theme), Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)

### Community 28 - "Ambience + Design Motion Spec"
Cohesion: 0.33
Nodes (6): assets/sfx/page-turn.mp3 (bundled page-turn rustle SFX), Design language (mood, color, typography, spacing, motion), Icons & motion spec, Reading body typography spec (17px / line-height 1.85), Role & operating rules, Fixed reading base: 18px / line-height 1.85

### Community 29 - "Expo App Setup (README)"
Cohesion: 0.33
Nodes (6): create-expo-app, ESLint + Prettier Setup, Expo Framework, File-based Routing, Jest Unit Testing, Expo App Setup (README)

### Community 30 - "Ambience Upload Script"
Cohesion: 0.67
Nodes (3): ensureBucket(), run(), supabase

## Ambiguous Edges - Review These
- `sync-bulk-catalog.mjs` → `scripts/ingest-books.mjs (Gutendex API -> bundled JSON)`  [AMBIGUOUS]
  context.md · relation: semantically_similar_to
- `Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient)` → `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`  [AMBIGUOUS]
  assets/images/expo-logo.png · relation: conceptually_related_to
- `Expo 'Powered by Expo' Badge (Black, Dark Theme)` → `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`  [AMBIGUOUS]
  assets/images/expo-logo.png · relation: conceptually_related_to
- `Logo Glow Effect Asset` → `Splash Screen Icon`  [AMBIGUOUS]
  assets/images/logo-glow.png · relation: conceptually_related_to
- `React Logo (1x) - Unused Expo Scaffold Asset` → `Expo Starter Tutorial Screenshot (Welcome to Expo, web)`  [AMBIGUOUS]
  assets/images/tutorial-web.png · relation: conceptually_related_to
- `Reading body typography spec (17px / line-height 1.85)` → `Fixed reading base: 18px / line-height 1.85`  [AMBIGUOUS]
  context.md · relation: conceptually_related_to

## Knowledge Gaps
- **215 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `sync-bulk-catalog.mjs` and `scripts/ingest-books.mjs (Gutendex API -> bundled JSON)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient)` and `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Expo 'Powered by Expo' Badge (Black, Dark Theme)` and `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Logo Glow Effect Asset` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `React Logo (1x) - Unused Expo Scaffold Asset` and `Expo Starter Tutorial Screenshot (Welcome to Expo, web)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Reading body typography spec (17px / line-height 1.85)` and `Fixed reading base: 18px / line-height 1.85`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `Notebook Empty-State Illustrations` to `Reader Engine Core`, `CLAUDE.md + Roadmap Docs`, `Settings + Language Picker`, `Root Layout + Design System`, `Reader Text Hit-Testing`, `Vocabulary Notebook Screen`, `Library Shelf Screen`, `Saved Books + Tab Icons`, `Book Detail + Spine`, `Splash Screen + Flame Glow`, `Shelf Editor + Books Repo`, `Onboarding Screens`, `Quote Share Cards`, `Paywall Screen`, `Ambience + Design Motion Spec`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._