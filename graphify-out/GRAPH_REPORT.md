# Graph Report - D:/Coding/LampLight  (2026-07-10)

## Corpus Check
- 19 files · ~81,142 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 482 nodes · 759 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 1% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.62)
- Token cost: 80,749 input · 0 output

## Community Hubs (Navigation)
- Book Detail + Quote Share
- Package Dependencies
- context.md Architecture Doc
- Splash + Onboarding
- Book Sync + Reader Screen
- Root Layout + Settings
- Library Shelf + Book Spine
- Vocabulary + Translation Popup
- Sync Workflow + Premium Roadmap
- app.json Config
- Highlight Picker + Design Docs
- Reader Drag Selection Engine
- Unused Expo Template Icons
- reset-project Script
- tsconfig
- Lamplight Brand Assets
- Expo/Android Platform Icons
- ESLint Config
- Color System (Design Doc)
- Fold Motif (Design Doc)
- Icons & Motion (Design Doc)
- Spacing & Shape (Design Doc)
- Typography System (Design Doc)

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 29 edges
2. `getDb()` - 26 edges
3. `expo` - 14 edges
4. `SettingsScreen()` - 13 edges
5. `Codebase map` - 13 edges
6. `parseBookText()` - 11 edges
7. `useTargetLanguage()` - 9 edges
8. `getBook()` - 9 edges
9. `Phase 1 — Premium, v1` - 9 edges
10. `LibraryScreen()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Expo Framework` --semantically_similar_to--> `React Native + Expo SDK 54 Stack`  [INFERRED] [semantically similar]
  README.md → context.md
- `File-based Routing` --semantically_similar_to--> `Expo Router (file-based, src/app/)`  [INFERRED] [semantically similar]
  README.md → context.md
- `Weekly Monday 06:00 UTC cron schedule` --semantically_similar_to--> `Role & operating rules`  [INFERRED] [semantically similar]
  .github/workflows/sync-books.yml → CLAUDE.md
- `Role & operating rules` --semantically_similar_to--> `Phasing philosophy`  [INFERRED] [semantically similar]
  CLAUDE.md → ROADMAP.md
- `Schema-to-feature map` --conceptually_related_to--> `Codebase map`  [INFERRED]
  ROADMAP.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Design token consistency mechanism** — claude_design_source_of_truth, src_theme_tokens, src_theme_typography, claude_before_ui_change_workflow [INFERRED 0.85]
- **Free tier cap design pattern** — roadmap_free_tier_philosophy, roadmap_phase_0_alpha, supabase_schema_sql_plans_table [INFERRED 0.80]
- **Book catalog sync pipeline** — github_workflows_sync_books_sync_book_catalog, github_workflows_sync_books_npm_run_sync_books, src_features_content_ingestion_catalog, scripts_ingest_books [INFERRED 0.75]
- **Reader Chrome System (Day/Lamp modes)** — context_reader_mode_enum, context_lampglowoverlay, context_warmthpicker, context_flameglow, context_pageturnflash [EXTRACTED 1.00]
- **Book Ingestion Pipeline (Gutendex to bundled JSON)** — context_ingest_books_script, context_gutendex, context_strip_leading_toc, context_chapter1_anchor, context_book_catalog [EXTRACTED 1.00]
- **Translation System (provider, endpoint, cap policy)** — context_translationprovider, context_cloudtranslationprovider, context_google_translate_endpoint, context_cappolicy [EXTRACTED 1.00]

## Communities (23 total, 6 thin omitted)

### Community 0 - "Book Detail + Quote Share"
Cohesion: 0.08
Nodes (43): BookDetailScreen(), styles, CARD_WIDTH, QuoteCard(), QuoteShareScreen(), styles, Variant, styles (+35 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.04
Nodes (46): dependencies, expo, expo-constants, expo-device, expo-file-system, expo-font, expo-glass-effect, @expo-google-fonts/lora (+38 more)

### Community 2 - "context.md Architecture Doc"
Cohesion: 0.05
Nodes (46): Project Architecture (src/ layout), BOOK_CATALOG / catalog.ts, Full Build Plan (floating-noodling-metcalfe.md), capPolicy.ts Daily Translation Cap (20/day), chapter1Anchor Override (Pride and Prejudice), cloudTranslationProvider.ts, Color Palette (Flame Amber, Parchment, Primary Dark), Content Ingestion Feature (catalog.ts) (+38 more)

### Community 3 - "Splash + Onboarding"
Cohesion: 0.06
Nodes (34): SplashScreen(), styles, { width: screenWidth, height: screenHeight }, ILLUSTRATIONS, illustrationStyles, OnboardingScreen(), ReadIllustration(), ShelfIllustration() (+26 more)

### Community 4 - "Book Sync + Reader Screen"
Cohesion: 0.08
Nodes (33): CATALOG, findBook(), rows, supabase, syncOneBook(), SYNOPSES, ReaderMode, ReaderPageFrameProps (+25 more)

### Community 5 - "Root Layout + Settings"
Cohesion: 0.10
Nodes (27): SettingsScreen(), SettingsSlider(), styles, ToggleSwitch(), current, emit(), fontSizePxFromPref(), getReadingPrefs() (+19 more)

### Community 6 - "Library Shelf + Book Spine"
Cohesion: 0.09
Nodes (29): chunk(), getShelfSubtitle(), LibraryScreen(), ROW_ROTATIONS, styles, { width: screenWidth }, BookSpine(), BookSpineProps (+21 more)

### Community 7 - "Vocabulary + Translation Popup"
Cohesion: 0.11
Nodes (21): Codebase map, Core hubs (useTheme, getDb, ReaderScreen, useTargetLanguage), src/db/repositories (SQLite-backed repos, getDb), getTodayUsageCount(), incrementTodayUsage(), todayKey(), LoadState, styles (+13 more)

### Community 8 - "Sync Workflow + Premium Roadmap"
Cohesion: 0.08
Nodes (27): Role & operating rules, npm run sync:books step, SUPABASE_SERVICE_ROLE_KEY secret, SUPABASE_URL secret, Sync book catalog (workflow), Weekly Monday 06:00 UTC cron schedule, workflow_dispatch manual trigger, Billing (subscriptions table + provider) (+19 more)

### Community 9 - "app.json Config"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, reactCompiler, typedRoutes (+17 more)

### Community 10 - "Highlight Picker + Design Docs"
Cohesion: 0.11
Nodes (20): Before implementing a UI change (workflow), Design source of truth, COLOR_KEYS, HighlightColorPicker(), HighlightColorPickerProps, styles, src/theme/ThemeTransitionOverlay.tsx, LamplightTheme (+12 more)

### Community 11 - "Reader Drag Selection Engine"
Cohesion: 0.17
Nodes (18): getSentenceEndOffsets(), getSentences(), getTokens(), getTokenSentenceIndices(), HandlePixel, locateOffsetPixel(), locateSentenceKey(), ParagraphLayout (+10 more)

### Community 12 - "Unused Expo Template Icons"
Cohesion: 0.29
Nodes (10): React Logo (2x) - Unused Expo Scaffold Asset, React Logo (3x) - Unused Expo Scaffold Asset, React Logo (1x) - Unused Expo Scaffold Asset, Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default (+2 more)

### Community 13 - "reset-project Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 14 - "tsconfig"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, extends, include, @/*, @/assets/*

### Community 15 - "Lamplight Brand Assets"
Cohesion: 0.47
Nodes (6): Expo Icon Vector Symbol (Chevron/Mountain Path), Expo Icon Grid Background Texture, Favicon (Blue Arrow Mark), App Icon (Blue Arrow Mark), Logo Glow Effect Asset, Splash Screen Icon

### Community 16 - "Expo/Android Platform Icons"
Cohesion: 0.53
Nodes (6): Android Adaptive Icon Background Layer, Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient), Android Adaptive Icon Monochrome Layer (Expo Arrow Mark, Gray), Expo 'Powered by Expo' Badge (Black, Dark Theme), Expo 'Powered by Expo' Badge (White, Light Theme), Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)

## Ambiguous Edges - Review These
- `Splash Screen Icon` → `Logo Glow Effect Asset`  [AMBIGUOUS]
  assets/images/logo-glow.png · relation: conceptually_related_to
- `Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient)` → `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`  [AMBIGUOUS]
  assets/images/expo-logo.png · relation: conceptually_related_to
- `Expo 'Powered by Expo' Badge (Black, Dark Theme)` → `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`  [AMBIGUOUS]
  assets/images/expo-logo.png · relation: conceptually_related_to
- `React Logo (1x) - Unused Expo Scaffold Asset` → `Expo Starter Tutorial Screenshot (Welcome to Expo, web)`  [AMBIGUOUS]
  assets/images/tutorial-web.png · relation: conceptually_related_to

## Knowledge Gaps
- **195 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Splash Screen Icon` and `Logo Glow Effect Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Android Adaptive Icon Foreground Layer (Expo Arrow Mark, Blue Gradient)` and `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Expo 'Powered by Expo' Badge (Black, Dark Theme)` and `Expo Logo (Template Asset, Content Not Visually Resolvable at Render Scale)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `React Logo (1x) - Unused Expo Scaffold Asset` and `Expo Starter Tutorial Screenshot (Welcome to Expo, web)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Codebase map` connect `Vocabulary + Translation Popup` to `Splash + Onboarding`, `Book Sync + Reader Screen`, `Library Shelf + Book Spine`, `Sync Workflow + Premium Roadmap`, `Highlight Picker + Design Docs`, `Reader Drag Selection Engine`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `Schema-to-feature map` connect `Sync Workflow + Premium Roadmap` to `Vocabulary + Translation Popup`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Splash + Onboarding` to `Book Detail + Quote Share`, `Root Layout + Settings`, `Library Shelf + Book Spine`, `Vocabulary + Translation Popup`, `Highlight Picker + Design Docs`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._