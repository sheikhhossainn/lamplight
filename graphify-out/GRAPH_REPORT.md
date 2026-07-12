# Graph Report - D:/Coding/LampLight  (2026-07-12)

## Corpus Check
- 68 files · ~4,115,095 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 791 nodes · 1400 edges · 58 communities (45 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.55)
- Token cost: 284,323 input · 0 output

## Community Hubs (Navigation)
- Data Layer & Library Sync
- App Shell, Settings & Translation Cap
- Expo App Config
- Content Parsing & Pagination
- Scripture Book Lists & Reading Position
- Expo/React Dependencies
- Reader Page Rendering Engine
- Ambience Player
- Bible Verse Reader
- Library Screen & Vocab Review Prompt
- Project Docs & Scripture Content Notes
- Language Picker & Target Language
- Quran Verse Reader
- Book Reader Screen & Downloader
- Design Tokens & Theme
- Book Detail & Spine
- Quote & Verse Share
- Saved Books & Tab Icons
- NPM Scripts
- Flame Glow & Loading Screen
- Quran DB Repository
- Reading Theme & Transition
- Confirm Dialog & Onboarding Illustrations
- Bible DB Repository
- Bible NT Fetch Script
- Bible OT Fetch Script
- Vocabulary Tab & Flashcards
- Roadmap & Business Model
- Word Tokenization
- Package Metadata
- Translation Provider
- Quran Fetch Script
- Reset Project Script
- TypeScript Config
- Page Turn Sound
- Bulk Catalog Sync Script
- Paywall Screen
- Shelf Editor Modal
- Saved Words Repository
- Word Action Menu
- Tab Icon Assets
- README
- Book Categories
- Upload Ambience Script
- ESLint Config
- Reading Line Height Pref
- Expo Vector Symbol Asset
- Grid Texture Asset
- Lamp App Icon Asset
- Android Icon Background
- Android Icon Foreground
- Android Icon Monochrome
- Favicon Asset
- Main App Icon Asset
- Splash Icon Asset
- Page Turn SFX Asset
- Roadmap Document

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 37 edges
2. `useTheme()` - 25 edges
3. `expo` - 18 edges
4. `BookDetailScreen()` - 14 edges
5. `scripts` - 14 edges
6. `ChevronRightIcon()` - 12 edges
7. `parseEpub()` - 11 edges
8. `ChevronLeftIcon()` - 11 edges
9. `logEvent()` - 10 edges
10. `parseBookText()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Engineering rules (smallest diff, reuse before new, no new deps without asking)` --semantically_similar_to--> `Bible — New Testament feature vertical`  [INFERRED] [semantically similar]
  CLAUDE.md → scriptures.md
- `parseEpub()` --references--> `jszip`  [EXTRACTED]
  src/features/content-ingestion/epubParser.ts → package.json
- `Q&A: Does Codebase map (CLAUDE.md) reference all its listed theme files? (correction)` --conceptually_related_to--> `Q&A: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, etc.?`  [INFERRED]
  graphify-out/memory/query_20260710_065217_does_codebase_map__claude_md__reference_all_its_li.md → graphify-out/memory/query_20260710_064940_why_does_codebase_map_connect_vocabulary_translati.md
- `useAppUpdateBanner()` --references--> `updates`  [EXTRACTED]
  src/features/app-update/useAppUpdateBanner.ts → app.json
- `Design system source of truth (tokens.ts, typography.ts, ThemeProvider.tsx)` --shares_data_with--> `Quran feature vertical`  [INFERRED]
  CLAUDE.md → scriptures.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Verse-level scripture parallel-vertical pattern (Quran, Bible OT, Bible NT)** — scriptures_md_verse_architecture, scriptures_md_quran, scriptures_md_bible_ot, scriptures_md_bible_nt [INFERRED 0.85]
- **Graphify-first context loading workflow** — claude_md_graphify_first, claude_md_god_node_files, claude_md_engineering_rules [INFERRED 0.75]

## Communities (58 total, 13 thin omitted)

### Community 0 - "Data Layer & Library Sync"
Cohesion: 0.05
Nodes (62): backfillBootstrapCategories(), BOOTSTRAP_CATALOG, createQueue(), Enqueue, getDb(), migrate(), refreshFromRemoteInBackground(), seedBootstrapIfEmpty() (+54 more)

### Community 1 - "App Shell, Settings & Translation Cap"
Cohesion: 0.06
Nodes (43): SplashScreen(), styles, { width: screenWidth, height: screenHeight }, RootLayout(), finishOnboarding(), ILLUSTRATIONS, illustrationStyles, Slide (+35 more)

### Community 2 - "Expo App Config"
Cohesion: 0.05
Nodes (37): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 3 - "Content Parsing & Pagination"
Cohesion: 0.09
Nodes (32): jszip, CATALOG, findBook(), rows, supabase, syncOneBook(), SYNOPSES, chapterTitleFromHtml() (+24 more)

### Community 4 - "Scripture Book Lists & Reading Position"
Cohesion: 0.10
Nodes (28): BibleBookListScreen(), styles, BibleNtBookListScreen(), styles, QuranSurahListScreen(), styles, BibleReadingPosition, getLatestBibleReadingPosition() (+20 more)

### Community 5 - "Expo/React Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, expo, expo-asset, expo-audio, expo-constants, expo-device, expo-file-system, expo-font (+26 more)

### Community 6 - "Reader Page Rendering Engine"
Cohesion: 0.11
Nodes (27): charIndexAtFraction(), charInLine(), fractionAtCharIndex(), getTokenOffsets(), getTokens(), HandlePixel, lineCharOffset(), lineStartOffsets() (+19 more)

### Community 7 - "Ambience Player"
Cohesion: 0.17
Nodes (18): SoundWaveIcon(), AmbiencePicker(), AmbiencePickerProps, styles, VolumeSlider(), emit(), getAmbienceTrackId(), getAmbienceVolume() (+10 more)

### Community 8 - "Bible Verse Reader"
Cohesion: 0.19
Nodes (21): BibleVerseReaderScreen(), FlatVerse, HeldWord, styles, verseKey(), BibleNtVerseReaderScreen(), FlatVerse, HeldWord (+13 more)

### Community 9 - "Library Screen & Vocab Review Prompt"
Cohesion: 0.15
Nodes (15): getShelfSubtitle(), LibraryScreen(), ROW_ROTATIONS, styles, { width: screenWidth }, FilterIcon(), SearchIcon(), styles (+7 more)

### Community 10 - "Project Docs & Scripture Content Notes"
Cohesion: 0.20
Nodes (19): CLAUDE.md (Lamplight project instructions), Locked brand constants (Primary Dark, Flame Amber, Parchment, Lora reading floor), Channel→branch link gotcha (silent OTA failure), Design system source of truth (tokens.ts, typography.ts, ThemeProvider.tsx), Engineering rules (smallest diff, reuse before new, no new deps without asking), expo-sqlite Android serializing queue (db/client.ts), God-node files (useTheme, getDb, ReaderScreen, useTargetLanguage), Graphify-first context loading strategy (+11 more)

### Community 11 - "Language Picker & Target Language"
Cohesion: 0.16
Nodes (15): LanguagePicker(), LanguagePickerProps, styles, BY_CODE, emit(), getTargetLanguage(), hydrateTargetLanguage(), listeners (+7 more)

### Community 12 - "Quran Verse Reader"
Cohesion: 0.19
Nodes (16): HeldWord, QuranVerseReaderScreen(), styles, WordLang, buildQuranVerseEntries(), createQuranHighlight(), deleteQuranHighlight(), listQuranHighlightsForSurah() (+8 more)

### Community 13 - "Book Reader Screen & Downloader"
Cohesion: 0.14
Nodes (14): ReaderMode, ReaderPageFrameProps, ReaderScreen(), READING_DARK_STOPS, selectedText(), styles, { width: screenWidth, height: screenHeight }, MoonIcon() (+6 more)

### Community 14 - "Design Tokens & Theme"
Cohesion: 0.19
Nodes (13): Q&A: Does Codebase map (CLAUDE.md) reference all its listed theme files? (correction), LamplightTheme, ThemeContext, IconStroke, LamplightColor, LamplightColorDark, LamplightColors, Layout (+5 more)

### Community 15 - "Book Detail & Spine"
Cohesion: 0.22
Nodes (14): BookDetailScreen(), styles, BookSpine(), BookSpineProps, FALLBACK_TONES, isDarkSpineColor(), SPINE_COLOR_BY_BOOK, spineColorForBook() (+6 more)

### Community 16 - "Quote & Verse Share"
Cohesion: 0.16
Nodes (8): CloseIcon(), CARD_WIDTH, quoteFontStyle(), ShareCard(), ShareCardScreen(), styles, Variant, VARIANTS

### Community 17 - "Saved Books & Tab Icons"
Cohesion: 0.18
Nodes (13): SavedBooksScreen(), styles, TabsLayout(), CheckIcon(), ChevronLeftIcon(), IconProps, LibraryIcon(), MoreHorizontalIcon() (+5 more)

### Community 18 - "NPM Scripts"
Cohesion: 0.14
Nodes (14): scripts, android, fetch:bible-nt, fetch:bible-ot, fetch:quran, ios, lint, reset-project (+6 more)

### Community 19 - "Flame Glow & Loading Screen"
Cohesion: 0.15
Nodes (12): FLAME_BBOX, FLAME_OPACITY, FlameGlow(), FlameGlowProps, GLOW_INTENSITY, PHASES, SCALE_X, SCALE_Y (+4 more)

### Community 20 - "Quran DB Repository"
Cohesion: 0.18
Nodes (12): getQuranReadingPosition(), highlightFromSqlRow(), listAllQuranHighlights(), listQuranSavedWords(), QuranHighlight, QuranHighlightSqlRow, QuranReadingPosition, QuranReadingPositionSqlRow (+4 more)

### Community 21 - "Reading Theme & Transition"
Cohesion: 0.27
Nodes (11): getReadingTheme(), listeners, ReadingTheme, setReadingTheme(), subscribe(), useReadingTheme(), registerThemeTransitionRunner(), requestThemeChange() (+3 more)

### Community 22 - "Confirm Dialog & Onboarding Illustrations"
Cohesion: 0.26
Nodes (11): ConfirmDialog(), ConfirmDialogProps, styles, AnimatedLine, FlashcardsIllustration(), LampGlowScene(), QuotesIllustration(), styles (+3 more)

### Community 23 - "Bible DB Repository"
Cohesion: 0.19
Nodes (11): BibleHighlight, BibleHighlightSqlRow, BibleReadingPositionSqlRow, BibleSavedWord, BibleSavedWordSqlRow, getBibleReadingPosition(), highlightFromSqlRow(), listAllBibleHighlights() (+3 more)

### Community 24 - "Bible NT Fetch Script"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), NT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 25 - "Bible OT Fetch Script"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), OT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 26 - "Vocabulary Tab & Flashcards"
Cohesion: 0.23
Nodes (9): FlashcardDeck(), SavedVerseEntry, shuffled(), styles, Tab, TABS, VocabularyScreen(), SkeletonRows() (+1 more)

### Community 27 - "Roadmap & Business Model"
Cohesion: 0.24
Nodes (11): Q&A: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, etc.?, Duolingo unlimited-core-lessons model (model to copy), Evernote 2-device sync limit (cautionary example), Free-tier philosophy: caps generous, not stingy, Phase 0 -- Alpha: 10-15 friend beta, Phase 1 -- Premium v1, Phase 2 -- AI Reading Companion (speculative), Phasing philosophy: ship smallest thing, additive-only schema (+3 more)

### Community 28 - "Word Tokenization"
Cohesion: 0.27
Nodes (8): cleanArabicWordForLookup(), TappableWords(), TappableWordsProps, cleanWordForLookup(), sentenceAtOffset(), sentenceContaining(), splitIntoSentences(), tokenizeParagraph()

### Community 29 - "Package Metadata"
Cohesion: 0.20
Nodes (9): devDependencies, @supabase/supabase-js, tsx, @types/react, typescript, main, name, private (+1 more)

### Community 30 - "Translation Provider"
Cohesion: 0.31
Nodes (8): cache, cacheKey(), cloudTranslationProvider, extractTranslatedText(), fetchTranslation(), LanguageCode, TranslationProvider, TranslationResult

### Community 31 - "Quran Fetch Script"
Cohesion: 0.39
Nodes (8): fetchJson(), fetchRaw(), fetchSurahList(), fetchSurahTafsir(), fetchSurahVerses(), OUT_DIR, sleep(), versesBySurah

### Community 32 - "Reset Project Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 33 - "TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, extends, include, @/*, @/assets/*

### Community 34 - "Page Turn Sound"
Cohesion: 0.39
Nodes (5): usePageTurnSound(), getPageTurnSoundEnabled(), listeners, subscribe(), usePageTurnSoundEnabled()

### Community 35 - "Bulk Catalog Sync Script"
Cohesion: 0.48
Nodes (6): fetchCursor(), fetchExistingHeroGutenbergIds(), run(), saveCursor(), supabase, toBulkRow()

### Community 36 - "Paywall Screen"
Cohesion: 0.29
Nodes (5): FEATURES, PaywallScreen(), Plan, styles, { width: screenWidth, height: screenHeight }

### Community 37 - "Shelf Editor Modal"
Cohesion: 0.29
Nodes (5): ShelfDraft, ShelfEditorModal(), ShelfEditorModalProps, styles, BookRow

### Community 38 - "Saved Words Repository"
Cohesion: 0.38
Nodes (5): fromSqlRow(), listSavedWords(), listSavedWordsForBook(), SavedWord, SavedWordSqlRow

### Community 39 - "Word Action Menu"
Cohesion: 0.29
Nodes (4): styles, { width: screenWidth, height: screenHeight }, WordActionMenu(), WordActionMenuProps

### Community 40 - "Tab Icon Assets"
Cohesion: 0.47
Nodes (6): Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default, Home Tab Icon (1x) - Unused Expo Default

### Community 41 - "README"
Cohesion: 0.33
Nodes (6): create-expo-app, ESLint + Prettier Setup, Expo Framework, File-based Routing, Jest Unit Testing, Expo App Setup (README)

### Community 42 - "Book Categories"
Cohesion: 0.40
Nodes (4): BOOK_CATEGORIES, BookCategory, BY_ID, categoryLabel()

### Community 43 - "Upload Ambience Script"
Cohesion: 0.67
Nodes (3): ensureBucket(), run(), supabase

## Knowledge Gaps
- **284 isolated node(s):** `{ defineConfig }`, `expoConfig`, `fs`, `path`, `readline` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseEpub()` connect `Content Parsing & Pagination` to `Data Layer & Library Sync`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Expo/React Dependencies` to `Content Parsing & Pagination`, `Package Metadata`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `jszip` connect `Content Parsing & Pagination` to `Expo/React Dependencies`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `{ defineConfig }`, `expoConfig`, `fs` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Layer & Library Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05365296803652968 - nodes in this community are weakly interconnected._
- **Should `App Shell, Settings & Translation Cap` be split into smaller, more focused modules?**
  _Cohesion score 0.05687645687645688 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._