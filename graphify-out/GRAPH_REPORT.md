# Graph Report - LampLight  (2026-09-18)

## Corpus Check
- 251 files · ~5,063,686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2312 nodes · 4521 edges · 166 communities (127 shown, 39 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8fa325f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- client.ts
- WordTranslationPopup.tsx
- expo
- textParser.ts
- index.tsx
- dependencies
- ReaderPageView.tsx
- AmbiencePicker.tsx
- bible.ts
- library.tsx
- CLAUDE.md (Lamplight project instructions)
- languagePair.ts
- [surahNumber].tsx
- [bookId].tsx
- ThemeProvider.tsx
- homescreen.tsx
- ShareCardScreen.tsx
- icons.tsx
- scripts
- FlameGlow.tsx
- index.tsx
- readingTheme.ts
- NotebookIllustrations.tsx
- ScriptureTableDeck.tsx
- fetch-bible-nt.mjs
- fetch-bible-ot.mjs
- vocabulary.tsx
- Lamplight — Product Roadmap
- ClozeResultScreen.tsx
- package.json
- getDb
- fetch-quran.mjs
- reset-project.js
- tsconfig.json
- haptics.ts
- sync-bulk-catalog.mjs
- onboarding.tsx
- generateId
- savedWords.ts
- ScriptureInquiryModal.tsx
- Explore Tab Icon (1x) - Unused Expo Default
- create-expo-app
- scriptureInquiryApi.ts
- upload-ambience.mjs
- eslint.config.js
- settings.tsx
- 1. sheikhhossainn — Vocabulary, SRS & Translation
- Expo Icon Vector Symbol (Chevron/Mountain Path)
- Expo Icon Grid Background Texture
- Lamplight App Icon (Lamp/Flame SVG)
- Android Icon Background
- Android Icon Foreground (Flame Logo)
- Android Monochrome Adaptive Icon (Flame)
- App Favicon (favicon.png)
- Lamplight App Icon (Flame Mark)
- Splash Icon (Flame Logo)
- assets/sfx/page-turn.mp3 (bundled page-turn rustle SFX)
- architecture.md
- randomVerse.ts
- PageStyleSelectorModal.tsx
- ask.tsx
- useTheme
- FEELING Sanctuary — Architecture, Workflow & Extension Guide
- getSetting
- aiScriptureEngine.ts
- banglaApi.ts
- bookDownloader.ts
- Lamplight — Visual Blueprint & Context Guide
- 3.2 The Solution Architecture
- wordCache.ts
- seed-scripture-verses.mjs
- Core Features (Implemented)
- LampLight — Deep Feature Analysis & Real Improvements
- LampLight — Feature Implementation Checklist
- setSetting
- banglaDownloader.ts
- ClozeChallenge.tsx
- targetReadingLanguage.ts
- Lamplight — Reading App
- Lamplight — Reading App
- bibleData.ts
- japaneseApi.ts
- koreanApi.ts
- Scriptures — architecture reference
- Debugging — known pitfalls & workflow
- README.md
- Architecture
- Deployment — Preview builds & OTA (`eas update`)
- fetch-vedas.mjs
- ChevronRightIcon
- Context Verses — architecture reference
- Design system
- Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?
- Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?
- sync-korean-catalog.mjs
- index.ts
- upload-hero-covers.mjs
- Locked brand constants (Primary Dark, Flame Amber, Parchment, Lora reading floor)
- Channel→branch link gotcha (silent OTA failure)
- Design system source of truth (tokens.ts, typography.ts, ThemeProvider.tsx)
- Engineering rules (smallest diff, reuse before new, no new deps without asking)
- expo-sqlite Android serializing queue (db/client.ts)
- God-node files (useTheme, getDb, ReaderScreen, useTargetLanguage)
- Graphify-first context loading strategy
- Preview builds & OTA workflow (eas update, preview channel)
- runtimeVersion.policy = appVersion (orphaning risk)
- context.md (institutional memory / deep gotchas)
- Q&A: Does Codebase map (CLAUDE.md) reference all its listed theme files? (correction)
- ESLint + Prettier Setup
- Expo Framework
- File-based Routing
- Jest Unit Testing
- Expo App Setup (README)
- Duolingo unlimited-core-lessons model (model to copy)
- Evernote 2-device sync limit (cautionary example)
- Free-tier philosophy: caps generous, not stingy
- Phase 0 -- Alpha: 10-15 friend beta
- Phase 1 -- Premium v1
- Phase 2 -- AI Reading Companion (speculative)
- The Premium message: 'helps you remember what you read'
- Schema-to-feature map (quick reference table)
- supabase/schema.sql (DB schema, source of truth)
- Skill: High-Performance Animations
- Skill: Native Memory Management
- Skill: Threading Model
- literaryTheme.ts
- pronunciationEngine.ts
- translationUsageApi.ts
- Skill: Remote Chunk Loading
- Skill: Tree Shaking
- Skill: Measure TTI (Time to Interactive)
- Skill: Profile Native Code
- React Native Best Practices
- Skill: Concurrent React
- Skill: Higher-Order Lists
- Skill: View Flattening
- When to Load Reference Files
- Skill: Atomic State Management
- Skill: Bottom Sheet Best Practices
- Completed implementation work
- QuranRecitationButton.tsx
- ScriptureTableDeck.tsx
- Skill: Measure JS FPS
- Skill: Hunt JS Memory Leaks
- Skill: Uncontrolled Components
- Skill: Fast Native Modules
- ScriptureInquiryDeck.tsx
- ReaderMenuModal.tsx
- VerseDeckView.tsx
- Skill: Profile React Performance
- Feature validation checklist
- Skill: Native SDKs
- WordTranslationPopup.tsx
- Android 16 KB page size alignment
- Skill: Platform Differences
- bible.ts
- bibleNtData.ts
- BookPageFrame.tsx
- TappableWords.tsx
- interlinearParser.ts
- readingPosition.ts
- index.ts
- Summary of Work Done
- AddToShelfSheet.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 138 edges
2. `getDb()` - 100 edges
3. `ReaderScreen()` - 42 edges
4. `setSetting()` - 31 edges
5. `getSetting()` - 30 edges
6. `LibraryScreen()` - 29 edges
7. `BookDetailScreen()` - 28 edges
8. `FlashcardDeck()` - 25 edges
9. `useTargetLanguage()` - 25 edges
10. `ChevronLeftIcon()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `useAppUpdateBanner()` --references--> `updates`  [EXTRACTED]
  src/features/app-update/useAppUpdateBanner.ts → app.json
- `getCatalogCSV()` --references--> `jszip`  [EXTRACTED]
  scripts/sync-aozora-catalog.mjs → package.json
- `downloadAozoraBook()` --references--> `jszip`  [EXTRACTED]
  src/features/content-ingestion/aozoraDownloader.ts → package.json
- `parseEpub()` --references--> `jszip`  [EXTRACTED]
  src/features/content-ingestion/epubParser.ts → package.json
- `syncOneBook()` --calls--> `parseBookText()`  [EXTRACTED]
  scripts/sync-books.mjs → src/features/content-ingestion/textParser.ts

## Import Cycles
- None detected.

## Communities (166 total, 39 thin omitted)

### Community 0 - "client.ts"
Cohesion: 0.05
Nodes (39): 1. Word-selection handle audit, 2. What the learning system already does, 3.1 Extreme personalization, 3.2 First-session “Aha” moment, 3.3 Habit formation, 3.4 Community building, 3.5 Ethical switching value, 3. Retention system (+31 more)

### Community 1 - "WordTranslationPopup.tsx"
Cohesion: 0.19
Nodes (15): CapCheck, capFromUsed(), checkCachedTranslationCap(), checkTranslationCap(), recordTranslationUsage(), todayKey(), UsageSnapshot, cache (+7 more)

### Community 2 - "expo"
Cohesion: 0.05
Nodes (37): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 3 - "textParser.ts"
Cohesion: 0.09
Nodes (38): jszip, CURATED_COVERS, fetchExistingHeroIds(), getCatalogCSV(), parseCSVLine(), run(), supabase, CATALOG (+30 more)

### Community 4 - "index.tsx"
Cohesion: 0.17
Nodes (22): BibleBookListScreen(), styles, BibleNtBookListScreen(), styles, QuranSurahListScreen(), styles, styles, TORAH_BOOK_IDS (+14 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, expo, expo-asset, expo-audio, expo-clipboard, expo-constants, expo-device, expo-file-system (+31 more)

### Community 6 - "ReaderPageView.tsx"
Cohesion: 0.14
Nodes (21): useCurrentSpeechId(), directionForHandleDrag(), fractionAtCharIndex(), getTokens(), HandlePixel, lineStartOffsets(), locateOffsetPixel(), nearestSelectionBoundaryIndex() (+13 more)

### Community 7 - "AmbiencePicker.tsx"
Cohesion: 0.21
Nodes (13): VolumeSlider(), emit(), getAmbienceTrackId(), getAmbienceVolume(), listeners, setAmbienceVolume(), subscribe(), useAmbienceTrackId() (+5 more)

### Community 8 - "bible.ts"
Cohesion: 0.14
Nodes (33): BibleVerseReaderScreen(), FlatVerse, HeldWord, styles, verseKey(), BibleNtVerseReaderScreen(), FlatVerse, HeldWord (+25 more)

### Community 9 - "library.tsx"
Cohesion: 0.10
Nodes (35): BookDetailScreen(), styles, getShelfSubtitle(), LibraryScreen(), ROW_ROTATIONS, styles, { width: screenWidth }, ConfirmDialog() (+27 more)

### Community 11 - "languagePair.ts"
Cohesion: 0.16
Nodes (12): LanguagePicker(), LanguagePickerProps, styles, offerSpeechVoiceSetup(), BY_CODE, emit(), getTargetLanguage(), listeners (+4 more)

### Community 12 - "[surahNumber].tsx"
Cohesion: 0.13
Nodes (22): HeldWord, QuranVerseReaderScreen(), styles, WordLang, deleteQuranHighlight(), deleteQuranSavedWord(), getQuranReadingPosition(), highlightFromSqlRow() (+14 more)

### Community 13 - "[bookId].tsx"
Cohesion: 0.11
Nodes (24): ReaderChromeTouchTargetProps, ReaderMode, ReaderPageFrameProps, ReaderScreen(), READING_DARK_STOPS, selectedText(), styles, { width: screenWidth, height: screenHeight } (+16 more)

### Community 14 - "ThemeProvider.tsx"
Cohesion: 0.09
Nodes (26): ThemeSegmentedSwitch(), ToggleSwitch(), isRtlLiteraryTheme(), useLiteraryTheme(), LamplightTheme, LamplightThemeProvider(), ThemeContext, ArabicColor (+18 more)

### Community 15 - "homescreen.tsx"
Cohesion: 0.11
Nodes (28): EASE_OUT, getEnglishGenre(), getGreeting(), Homescreen(), LITERARY_SPARKS, LiterarySpark, styles, { width: screenWidth } (+20 more)

### Community 16 - "ShareCardScreen.tsx"
Cohesion: 0.12
Nodes (14): calculateQuoteStyles(), detectScript(), getLineHeightMultiplier(), getScriptFont(), ScriptType, ShareCard(), ShareCardScreen(), ShareCardScreenProps (+6 more)

### Community 17 - "icons.tsx"
Cohesion: 0.12
Nodes (18): TabsLayout(), { height: screenHeight }, HomeGuideModal(), HomeGuideModalProps, styles, ChevronDownIcon(), HomeIcon(), IconProps (+10 more)

### Community 18 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, android, fetch:bible-nt, fetch:bible-ot, fetch:quran, fetch:vedas, ios, lint (+10 more)

### Community 19 - "FlameGlow.tsx"
Cohesion: 0.07
Nodes (27): EASE_OUT, SplashScreen(), styles, { width: screenWidth, height: screenHeight }, FEATURES, PaywallScreen(), Plan, styles (+19 more)

### Community 20 - "index.tsx"
Cohesion: 0.08
Nodes (25): 1. Bundle Size Overhead, 2. Runtime Overhead, 3. Circular Dependencies, Common Pitfalls, Enforce with ESLint, Expo SDK 52+, Library-Specific Solutions, metro-serializer-esbuild (+17 more)

### Community 21 - "readingTheme.ts"
Cohesion: 0.27
Nodes (11): getReadingTheme(), listeners, ReadingTheme, setReadingTheme(), subscribe(), useReadingTheme(), registerThemeTransitionRunner(), requestThemeChange() (+3 more)

### Community 22 - "NotebookIllustrations.tsx"
Cohesion: 0.23
Nodes (13): SkeletonShelf(), EmptyPrompt(), AnimatedLine, FlashcardsIllustration(), LampGlowScene(), QuotesIllustration(), styles, useLoop() (+5 more)

### Community 23 - "ScriptureTableDeck.tsx"
Cohesion: 0.14
Nodes (17): fetchContextVerses(), parseRow(), CURATED_COMFORT_VERSES, CuratedComfortVerse, drawEmpatheticDeck(), EMOTIONAL_SIGNALS, scoreVerse(), shuffle() (+9 more)

### Community 24 - "fetch-bible-nt.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), NT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 25 - "fetch-bible-ot.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), OT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 26 - "vocabulary.tsx"
Cohesion: 0.05
Nodes (77): DailyReviewCheckpoint, FlashcardDeck(), localDateKey(), SavedVerseEntry, selectQuizWords(), srsSorted(), styles, Tab (+69 more)

### Community 27 - "Lamplight — Product Roadmap"
Cohesion: 0.25
Nodes (8): Free tier philosophy — why the caps are generous, not stingy **[added]**, Lamplight — Product Roadmap, Phase 0 — Alpha: the 10-15 friend beta (current target), Phase 1 — Premium, v1 (after beta feedback, not before), Phase 2 — AI Reading Companion (future, speculative), Phasing philosophy, Schema-to-feature map (quick reference), The Premium message

### Community 28 - "ClozeResultScreen.tsx"
Cohesion: 0.08
Nodes (25): 1. Enable R8, 2. Enable Resource Shrinking (Optional), 3. Configure ProGuard Rules (If Needed), 4. Build and Test, App Crashes After R8, Check APK Size, Common Library Rules, Common Pitfalls (+17 more)

### Community 29 - "package.json"
Cohesion: 0.18
Nodes (10): devDependencies, @huggingface/transformers, @supabase/supabase-js, tsx, @types/react, typescript, main, name (+2 more)

### Community 30 - "getDb"
Cohesion: 0.07
Nodes (47): backfillBootstrapCategories(), BOOTSTRAP_CATALOG, createQueue(), Enqueue, getDb(), migrate(), refreshFromRemoteInBackground(), seedBootstrapIfEmpty() (+39 more)

### Community 31 - "fetch-quran.mjs"
Cohesion: 0.39
Nodes (8): fetchJson(), fetchRaw(), fetchSurahList(), fetchSurahTafsir(), fetchSurahVerses(), OUT_DIR, sleep(), versesBySurah

### Community 32 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 33 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowImportingTsExtensions, paths, strict, exclude, extends, include, @/* (+1 more)

### Community 34 - "haptics.ts"
Cohesion: 0.22
Nodes (12): AmbiencePicker(), AmbiencePickerProps, styles, setAmbienceTrackId(), usePageTurnSound(), getPageTurnSoundEnabled(), listeners, setPageTurnSoundEnabled() (+4 more)

### Community 35 - "sync-bulk-catalog.mjs"
Cohesion: 0.48
Nodes (6): fetchCursor(), fetchExistingHeroGutenbergIds(), run(), saveCursor(), supabase, toBulkRow()

### Community 36 - "onboarding.tsx"
Cohesion: 0.10
Nodes (32): CoverageIllustration(), EASE_OUT, illustrationStyles, MemoryIllustration(), OnboardingScreen(), ReadIllustration(), Slide, SLIDES (+24 more)

### Community 37 - "generateId"
Cohesion: 0.24
Nodes (11): QuoteShareScreen(), styles, createHighlight(), fromSqlRow(), getHighlight(), Highlight, HighlightSqlRow, listAllHighlights() (+3 more)

### Community 38 - "savedWords.ts"
Cohesion: 0.08
Nodes (24): Analyze, bundle-stats / statoscope, Code Examples, Common Offenders, Comparing Bundles, For Expo Projects, For Non-Expo Projects, Generate Bundle with Source Map (+16 more)

### Community 39 - "ScriptureInquiryModal.tsx"
Cohesion: 0.11
Nodes (24): AskScriptureScreen(), MicrophoneIcon(), StopIcon(), CachedInquiryItem, clearInquiryCache(), getCachedInquiry(), getCacheFile(), getRecentInquiries() (+16 more)

### Community 40 - "Explore Tab Icon (1x) - Unused Expo Default"
Cohesion: 0.47
Nodes (6): Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default, Home Tab Icon (1x) - Unused Expo Default

### Community 42 - "scriptureInquiryApi.ts"
Cohesion: 0.14
Nodes (28): getSurahMeta(), matchCitationToCuratedQA(), normalizeCitationQuery(), NT_BOOK_MAP, OT_BOOK_MAP, parseCitation(), ParsedCitation, resolveDirectScriptureVerse() (+20 more)

### Community 43 - "upload-ambience.mjs"
Cohesion: 0.67
Nodes (3): ensureBucket(), run(), supabase

### Community 45 - "settings.tsx"
Cohesion: 0.11
Nodes (25): AnimatedPressable, GLIDE_EASING, SettingsScreen(), styles, updateStatusLabel(), AppUpdatePrompt(), CultureThemeWash(), EASE_OUT (+17 more)

### Community 46 - "1. sheikhhossainn — Vocabulary, SRS & Translation"
Cohesion: 0.07
Nodes (28): 1-A. Fix: Copy Button in Word Translation Popup — ✅ Completed, 1-B. Fix: Context Sentence Shown During SRS Review — ✅ Completed, 1-C. Fix: SRS Review Flood, 1-D. Fix: New Words Flooding Today's Review Queue, 1-E. Fix: getSpeechLocale Missing Languages, 1-F. Fix: Source Language Hardcoded to English, 1-G. Fix: Cap Check DB Read on Every Word Tap, 1-H. Build: Vocabulary Growth Graph (+20 more)

### Community 57 - "architecture.md"
Cohesion: 0.08
Nodes (24): 1. Compress Images, 2. Use Appropriate Formats, 3. Separate Bundled Assets from Remote Images, Android: Automatic Optimization, Asset Optimization Tips, Before/After Comparison, Common Pitfalls, Concept: Size Suffixes (+16 more)

### Community 58 - "randomVerse.ts"
Cohesion: 0.06
Nodes (48): buildQuranVerseEntries(), BibleBookMeta, BibleVerse, BOOK_MEANINGS, books, bookVersesCache, getBookVerses(), listBooks() (+40 more)

### Community 59 - "PageStyleSelectorModal.tsx"
Cohesion: 0.24
Nodes (12): PageStyleSelectorModal(), PageStyleSelectorModalProps, styles, PAGE_STYLE_LIST, PAGE_STYLES, PageStyleConfig, PageStyleId, getPageStyle() (+4 more)

### Community 60 - "ask.tsx"
Cohesion: 0.14
Nodes (8): formatRelativeTime(), ModalTab, styles, SUGGESTED_INQUIRIES, EmblemProps, IslamEmblem(), SACRED_TRADITION_EMBLEMS, ScalesOfJusticeIcon()

### Community 61 - "useTheme"
Cohesion: 0.17
Nodes (11): AozoraCatalogItem, GENRES, JapaneseLibraryScreen(), styles, { width: screenWidth }, GENRES, KoreanCatalogItem, KoreanLibraryScreen() (+3 more)

### Community 62 - "FEELING Sanctuary — Architecture, Workflow & Extension Guide"
Cohesion: 0.10
Nodes (19): 1. Vision & Core Philosophy, 2. File Map & Responsibilities, 3. End-to-End User Flow, 4. Voice Transcription & Speech-to-Text Pipeline, 5. Emotion Classification & Wild Card Deck Matching, 6. Verse Deck UI & Interactions, 7. Environment Variables, 8. How to Extend & Improve This Feature (+11 more)

### Community 63 - "getSetting"
Cohesion: 0.20
Nodes (17): AppShell(), RootLayout(), unstable_settings, styles, WhatsNewOverlay(), getSetting(), CHANGELOG, ChangelogEntry (+9 more)

### Community 64 - "aiScriptureEngine.ts"
Cohesion: 0.50
Nodes (4): fetchScripturalWebContext(), STOP_WORDS, WikiSearchItem, WikiSearchResponse

### Community 65 - "banglaApi.ts"
Cohesion: 0.16
Nodes (24): BanglaLibraryScreen(), styles, { width: screenWidth }, FilterIcon(), BanglaApiBookDetail, BanglaApiBookSummary, BanglaApiChapter, BanglaBookSummary (+16 more)

### Community 66 - "bookDownloader.ts"
Cohesion: 0.18
Nodes (16): SavedBooksScreen(), styles, createLocalBook(), listBooks(), deleteReadingPosition(), bookCache, booksDirectory, cacheImportedBook() (+8 more)

### Community 67 - "Lamplight — Visual Blueprint & Context Guide"
Cohesion: 0.12
Nodes (16): 1. The Soul & Identity of Lamplight, 2. Design System & Visual Tokens, 3. Screen Visualizations & ASCII Wireframes, 4. System Architecture & Boundaries, 5. Quick Reference for Implementing New Features, Anatomy of a BookSpine Component (`src/components/BookSpine.tsx`), Cloth Spine Color Palette, Core Philosophy (+8 more)

### Community 68 - "3.2 The Solution Architecture"
Cohesion: 0.12
Nodes (16): 1. Chapter-Scoped Lazy Loading (`getChapterVerses`), 1. Overview & High-Level Architecture, 2.1 Input Channels, 2.2 Emotion Classification & Verse Matching (`empatheticMatcher.ts`), 2.3 Interactive 3D Table Deck UI (`ScriptureTableDeck.tsx`), 2. The Feeling Mechanism: From Heart to Scripture, 2. Viewability-Driven Source of Truth (`onViewableItemsChanged`), 3.1 The Problem It Solved (Why Previous Scrolling Failed) (+8 more)

### Community 69 - "wordCache.ts"
Cohesion: 0.08
Nodes (24): Activity Recreation Test, Analyzing Allocations, Analyzing Results, Android, Android: Memory Profiler, Code Fixes by Pattern, Common Android Leak: Listener Not Removed, Common Native Leak: Missing Ownership (+16 more)

### Community 70 - "seed-scripture-verses.mjs"
Cohesion: 0.21
Nodes (13): ASSETS_DIR, chunk(), CURATED, CURATED_VEDAS, embedRows(), loadJson(), loadSources(), resolveAllCitations() (+5 more)

### Community 71 - "Core Features (Implemented)"
Cohesion: 0.15
Nodes (12): Core Features (Implemented), Directory Structure, Hard Engineering Constraints, Known Gaps (Priority Order), Language & Personalisation, Library, Overview & Product Vision, Reader (+4 more)

### Community 72 - "LampLight — Deep Feature Analysis & Real Improvements"
Cohesion: 0.17
Nodes (11): 1. Word Translation Popup (`WordTranslationPopup.tsx`), 2. Word Action Menu (`WordActionMenu.tsx`), 3. Pronunciation Engine (`pronunciationEngine.ts`), 4. Share Card Screen (`ShareCardScreen.tsx`), 5. Spaced Repetition System (SRS), 6. Translation Provider (`cloudTranslationProvider.ts`), 7. Scripture Q&A Engine, 8. Language Settings (`languagePair.ts`) (+3 more)

### Community 73 - "LampLight — Feature Implementation Checklist"
Cohesion: 0.18
Nodes (10): 📚 Book Library, 📖 Core Reader, LampLight — Feature Implementation Checklist, 🌐 Language & Translation, 🚀 Not Started — Hackathon Priorities, 🧭 Onboarding & Settings, 📜 Scripture, 📤 Social & Sharing (+2 more)

### Community 74 - "setSetting"
Cohesion: 0.60
Nodes (5): getReviewStats(), checkVocabReviewPrompt(), markVocabReviewPrompted(), startOfToday(), todayKey()

### Community 75 - "banglaDownloader.ts"
Cohesion: 0.17
Nodes (18): BanglaBookDetailScreen(), styles, { width: screenWidth }, isDarkSpineColor(), spineColorForBook(), TrashIcon(), markBanglaBookDownloaded(), saveBanglaChapters() (+10 more)

### Community 76 - "ClozeChallenge.tsx"
Cohesion: 0.09
Nodes (23): Code Examples, Common Pitfalls, Expected Performance Improvements, Expo, Incremental Adoption, Prerequisites, Quick Pattern, React Compiler Playground (+15 more)

### Community 77 - "targetReadingLanguage.ts"
Cohesion: 0.10
Nodes (21): After Adding, Before Adding Dependency, bundlephobia.com, Code Example: Optimizing Imports, Common Large Dependencies, Comparison Workflow, Decision Rule, Example Analysis (+13 more)

### Community 78 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 79 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 80 - "bibleData.ts"
Cohesion: 0.10
Nodes (20): Analyze, Android: Ruler (Spotify), CI Size Validation, Emerge Tools (Cross-Platform), Features, iOS: Xcode App Thinning, Key Metrics, Optimization Impact Example (+12 more)

### Community 81 - "japaneseApi.ts"
Cohesion: 0.25
Nodes (7): AOZORA_CHAPTER_TEXTS, AOZORA_JAPANESE_BOOKS, fetchJapaneseBookDetail(), fetchJapaneseChapterText(), JapaneseBookDetail, JapaneseBookSummary, JapaneseChapterMeta

### Community 82 - "koreanApi.ts"
Cohesion: 0.25
Nodes (7): fetchKoreanBookDetail(), fetchKoreanChapterText(), GONGU_CHAPTER_TEXTS, GONGU_KOREAN_BOOKS, KoreanBookDetail, KoreanBookSummary, KoreanChapterMeta

### Community 83 - "Scriptures — architecture reference"
Cohesion: 0.25
Nodes (8): Bible — New Testament, Bible — Old Testament, Library entry point, Quran, Running a fetch script, Scriptures — architecture reference, Shared UI, Vedas

### Community 84 - "Debugging — known pitfalls & workflow"
Cohesion: 0.29
Nodes (7): Debug workflow, Debugging — known pitfalls & workflow, Expo Router quirks, Expo SDK pin, expo-sqlite (Android), Fetch scripts — no port, don't kill the wrong Node process, OTA update "not arriving"

### Community 85 - "README.md"
Cohesion: 0.29
Nodes (6): Docs, Hard Rules, Project Structure, Running the App, Tech Stack, What makes it different

### Community 86 - "Architecture"
Cohesion: 0.33
Nodes (6): Architecture, Content pipelines — two distinct ones, Context verses (mood → verse search), Conventions, God-node files, Layout

### Community 87 - "Deployment — Preview builds & OTA (`eas update`)"
Cohesion: 0.22
Nodes (6): Deployment — Preview builds & OTA (`eas update`), On-device update state, OTA vs. rebuild, Publishing, runtimeVersion — do not bump `version` casually, Update never reaches the device — check channel→branch link FIRST

### Community 88 - "fetch-vedas.mjs"
Cohesion: 0.47
Nodes (5): BOOK_MEANINGS, decodeHtmlEntities(), fetchBook(), OUT_DIR, run()

### Community 89 - "ChevronRightIcon"
Cohesion: 0.11
Nodes (19): Applicability, Background, Check APK Contents, Common Pitfalls, Edit build.gradle, Expo Notes, Full Context, How Hermes Memory Mapping Works (+11 more)

### Community 90 - "Context Verses — architecture reference"
Cohesion: 0.33
Nodes (5): App, Context Verses — architecture reference, Embeddings, Supabase, Verse table deck (offline, blind, no citation ever)

### Community 91 - "Design system"
Cohesion: 0.29
Nodes (4): Design system, Identity, Locked constants, Source of truth (in order)

### Community 92 - "Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?, Source Nodes

### Community 93 - "Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?, Source Nodes

### Community 94 - "sync-korean-catalog.mjs"
Cohesion: 0.40
Nodes (3): KOREAN_CATALOG, KOREAN_COVERS, supabase

### Community 96 - "index.ts"
Cohesion: 0.40
Nodes (3): corsHeaders, embeddingModel, TRADITIONS

### Community 123 - "Skill: High-Performance Animations"
Cohesion: 0.11
Nodes (19): 1. Basic Animated Style (UI Thread), 2. Run Code on UI Thread with `scheduleOnUI`, 3. Call JS from UI Thread with `scheduleOnRN`, 4. Animation with Callback, Breaking Changes, Common Pitfalls, Key Concepts, Main Thread vs JS Thread (+11 more)

### Community 124 - "Skill: Native Memory Management"
Cohesion: 0.11
Nodes (19): 1. Forgetting to Delete (C++), 2. Reference Cycles (Swift/C++), 3. Unremoved Listeners (Kotlin), Best Practices Summary, Breaking Reference Cycles with `weak`, C++ Smart Pointers, Common Memory Leak Sources, Kotlin/Android GC (+11 more)

### Community 125 - "Skill: Threading Model"
Cohesion: 0.11
Nodes (19): Accessing UI from Background (Android), Accessing UI from Background (iOS), Android: Coroutines, Asynchronous Method Calls, Available Threads, Fabric (Native Views) Threading, Initialization, iOS: DispatchQueue (+11 more)

### Community 126 - "literaryTheme.ts"
Cohesion: 0.17
Nodes (16): WoodenPlank(), CultureEditionBanner(), LANGUAGE_BY_THEME, styles, CultureMotif(), CultureMotifProps, emit(), getLiteraryThemeOption() (+8 more)

### Community 127 - "pronunciationEngine.ts"
Cohesion: 0.16
Nodes (14): getSpeechLocale(), hasSpeechVoiceForLanguage(), listeners, notifySpeechListeners(), RATE_VALUES, speakWord(), SPEECH_LOCALES, SpeechRate (+6 more)

### Community 128 - "translationUsageApi.ts"
Cohesion: 0.20
Nodes (15): AIResponseSchema, requestScriptureInquiry(), ScriptureInquiryRateLimitError, Cache, getCachedTodayUsageCount(), getTodayUsageCount(), incrementTodayUsage(), readCache() (+7 more)

### Community 129 - "Skill: Remote Chunk Loading"
Cohesion: 0.11
Nodes (18): 1. Create Split Point with React.lazy, 2. Wrap with Suspense, 3. Configure Chunk Loading, 4. Build and Deploy Chunks, Caching Strategy, Common Pitfalls, Complete Example, Hermes Memory Mapping (+10 more)

### Community 130 - "Skill: Tree Shaking"
Cohesion: 0.11
Nodes (18): 1. Enable Import Support, 2. Enable Tree Shaking, Common Pitfalls, ESM Imports Required, Platform Shaking, Platform Support, Quick Config, Related Skills (+10 more)

### Community 131 - "Skill: Measure TTI (Time to Interactive)"
Cohesion: 0.11
Nodes (18): 1. Detect Cold Start, 2. Check Foreground State, 3. Set Up Performance Markers, 4. Mark Screen Interactive (JavaScript), 5. Collect and Report Metrics, Built-in Markers, Common Pitfalls, Listening to Native Events (+10 more)

### Community 132 - "Skill: Profile Native Code"
Cohesion: 0.11
Nodes (18): Analyzing Results, Analyzing Time Profiler Results, Android Profiling with Android Studio, Common Findings, CPU Profiling, Deep Profiling: Instruments, Expo Notes, iOS Profiling with Xcode (+10 more)

### Community 133 - "React Native Best Practices"
Cohesion: 0.11
Nodes (18): Attribution, Bundling (`bundle-*`), Critical: Bundle Size, Critical: FPS & Re-renders, High: Native Performance, High: TTI Optimization, JavaScript/React (`js-*`), Native (`native-*`) (+10 more)

### Community 134 - "Skill: Concurrent React"
Cohesion: 0.12
Nodes (17): Automatic Batching (React 18+), Code Examples, Common Pitfalls, Concept Overview, Important Considerations, Pattern 1: Defer Expensive Rendering with `useDeferredValue`, Pattern 2: Show Stale Content While Loading, Pattern 3: Transition Non-Critical Updates with `useTransition` (+9 more)

### Community 135 - "Skill: Higher-Order Lists"
Cohesion: 0.12
Nodes (17): 1. Identify the Problem, 2. Replace with FlatList, 3. Optimize FlatList with getItemLayout, 4. Upgrade to FlashList, 5. Evaluate Legend List, Code Examples, Common Pitfalls, Decision Matrix (+9 more)

### Community 136 - "Skill: View Flattening"
Cohesion: 0.12
Nodes (17): Android Studio, Code Examples, Common Pitfalls, Debugging Checklist, Debugging View Hierarchy, Forcing a View to Stay, Preventing Flattening with `collapsable`, Quick Pattern (+9 more)

### Community 137 - "When to Load Reference Files"
Cohesion: 0.12
Nodes (15): Analyze Bundle Size, Attribution, Bundle & App Size (`bundle-*`), FPS & Re-renders, JavaScript/React Performance (`js-*`), Measure TTI, Native Performance, Native Performance (`native-*`) (+7 more)

### Community 138 - "Skill: Atomic State Management"
Cohesion: 0.12
Nodes (16): 1. Create Store, 1. Define Atoms, 2. Use Atoms in Components, 2. Use Selectors, Common Pitfalls, Comparison, Prerequisites, Problem Description (+8 more)

### Community 139 - "Skill: Bottom Sheet Best Practices"
Cohesion: 0.12
Nodes (16): 1. Convert Gesture-Driven State to SharedValue, 2. Drive Sheet-Index Visibility via `useAnimatedReaction`, 3. Keep Scroll-Driven Logic off the JS Thread, 4. Use Library-Provided Components and Props, 5. BottomSheetModal Setup, 6. Keyboard Handling, Common Pitfalls, Derived Animations with `animatedPosition` (+8 more)

### Community 140 - "Completed implementation work"
Cohesion: 0.12
Nodes (15): Ask Scriptures and Supabase, Completed implementation work, Current verification checklist, Guardrails for remaining changes, Next product-quality focus, Onboarding and app entry, Product direction, Quran reader and recitation (+7 more)

### Community 141 - "QuranRecitationButton.tsx"
Cohesion: 0.26
Nodes (13): QuranRecitationButton(), QuranRecitationButtonProps, styles, BIBLE_AUDIO_STEMS, downloadQuranSurahRecitation(), isQuranSurahRecitationDownloaded(), QURAN_SURAH_VERSE_COUNTS, quranAyahRecitationFile() (+5 more)

### Community 142 - "ScriptureTableDeck.tsx"
Cohesion: 0.13
Nodes (10): drawTableDeck(), CARD_ROTATIONS, EASE_IN_OUT, EASE_OUT, ScriptureTableDeck(), ScriptureTableDeckProps, styles, TRADITION_SCRIPTS (+2 more)

### Community 143 - "Skill: Measure JS FPS"
Cohesion: 0.13
Nodes (15): Code Examples, Common Pitfalls, Flashlight CI Integration, Identify FPS Drop Source, Important: Disable Dev Mode, Interpreting Results, Method 1: React Perf Monitor (Quick Check), Method 2: Flashlight (Automated Benchmarking) (+7 more)

### Community 144 - "Skill: Hunt JS Memory Leaks"
Cohesion: 0.13
Nodes (15): 1. Open Memory Profiler, 2. Record Memory Allocations, 3. Analyze the Timeline, 4. Investigate Leaking Objects, 5. Verify the Fix, Code Examples, Common Leak Patterns, Common Pitfalls (+7 more)

### Community 145 - "Skill: Uncontrolled Components"
Cohesion: 0.13
Nodes (15): 1. Identify Controlled TextInput, 2. Convert to Uncontrolled, 3. Use Ref for Programmatic Control, Code Examples, Common Pitfalls, Decision Matrix, Full Migration Example, Prerequisites (+7 more)

### Community 146 - "Skill: Fast Native Modules"
Cohesion: 0.14
Nodes (14): 1. Scaffold with Builder Bob, 2. Run on Background Thread (iOS), 3. Run on Background Thread (Android), 4. Use C++ for Cross-Platform Code, Code Example: Complete Async Operation, Common Pitfalls, Language Interop Costs, Prerequisites (+6 more)

### Community 147 - "ScriptureInquiryDeck.tsx"
Cohesion: 0.18
Nodes (8): ScriptureQAVerse, ScriptureInquiryDeck(), ScriptureInquiryDeckProps, styles, PHASES, ScriptureInquirySpinner(), ScriptureInquirySpinnerProps, styles

### Community 148 - "ReaderMenuModal.tsx"
Cohesion: 0.16
Nodes (12): MoonIcon(), SoundWaveIcon(), SunIcon(), TranslateIcon(), { height: screenHeight }, ReaderGuideModal(), ReaderGuideModalProps, styles (+4 more)

### Community 149 - "VerseDeckView.tsx"
Cohesion: 0.21
Nodes (11): createQuranHighlight(), logEvent(), TRADITION_LABELS, buildVerseTable(), TableVerseCard, Reaction, styles, VerseDeckView() (+3 more)

### Community 150 - "Skill: Profile React Performance"
Cohesion: 0.15
Nodes (13): 1. Connect React Native DevTools, 2. Record a Profiling Session, 3. Analyze Results, 4. Profile JavaScript CPU, Common Pitfalls, Interpreting Results, Prerequisites, Quick Command (+5 more)

### Community 151 - "Feature validation checklist"
Cohesion: 0.15
Nodes (12): 1-A — Copy translated text, 1-B — SRS context and hints, 1-C — SRS review batches, 1-D — New-word scheduling, 1-E — Speech-language coverage, 1-F — Book source language, 1-G — Translation-cap responsiveness, 1-H — Vocabulary growth chart (+4 more)

### Community 152 - "Skill: Native SDKs"
Cohesion: 0.17
Nodes (12): 1. Remove Unnecessary Intl Polyfills, 2. Use Native Crypto, 3. Use Native Stack Navigator, 4. Use Native Bottom Tabs, Common Pitfalls, Decision Matrix, Quick Pattern, Recommended Native Libraries (+4 more)

### Community 153 - "WordTranslationPopup.tsx"
Cohesion: 0.18
Nodes (8): ReloadIcon(), LoadState, MAX_CARD_WIDTH, styles, { width: screenWidth, height: screenHeight }, WordTranslationPopupProps, isPremiumUser(), hapticSaveWord()

### Community 155 - "Android 16 KB page size alignment"
Cohesion: 0.20
Nodes (10): Android 16 KB page size alignment, CI Integration, Common Pitfalls, Fixing Alignment Issues, Quick Command, Quick Reference, Related Skills, Step-by-Step (+2 more)

### Community 156 - "Skill: Platform Differences"
Cohesion: 0.20
Nodes (10): Android (Gradle), Common Commands, Dependency Management, iOS (CocoaPods), JavaScript (npm/yarn/pnpm/bun), Quick Reference, Related Skills, Skill: Platform Differences (+2 more)

### Community 157 - "bible.ts"
Cohesion: 0.24
Nodes (9): BibleHighlight, BibleHighlightSqlRow, BibleReadingPositionSqlRow, BibleSavedWord, BibleSavedWordSqlRow, highlightFromSqlRow(), listAllBibleHighlights(), listBibleSavedWords() (+1 more)

### Community 158 - "bibleNtData.ts"
Cohesion: 0.22
Nodes (8): BibleNtBookMeta, BibleNtVerse, BOOK_MEANINGS, books, bookVersesCache, RawBibleBookMeta, rawBooks, verses

### Community 159 - "BookPageFrame.tsx"
Cohesion: 0.25
Nodes (7): ANTIQUE_PAPER_DAY, BookPageFrame(), BookPageFrameProps, DAY_TONES, NIGHT_TONES, styles, LamplightColor

### Community 160 - "TappableWords.tsx"
Cohesion: 0.36
Nodes (6): TappableWords(), TappableWordsProps, getSegmenter(), segmenterCache, segmentWords(), WordSegment

### Community 161 - "interlinearParser.ts"
Cohesion: 0.32
Nodes (6): tokenizeParagraph(), batchTranslateSentences(), InterlinearSentence, InterlinearWord, parseParagraphToInterlinear(), splitSentences()

### Community 162 - "readingPosition.ts"
Cohesion: 0.43
Nodes (6): fromSqlRow(), getReadingPosition(), listActiveReadingPositions(), listAllReadingPositions(), ReadingPosition, ReadingPositionSqlRow

### Community 163 - "index.ts"
Cohesion: 0.33
Nodes (4): corsHeaders, GROQ_API_KEY, InquiryRequest, SlotResult

### Community 164 - "Summary of Work Done"
Cohesion: 0.33
Nodes (5): 1. Premium Quote Sharing Cards Revamp & Expansion, 2. Museum-Grade Scripture Book Covers, 3. Team Contribution & Roadmap Audit, 4. Culture-Matched Reading Themes (Feature 3-A), Summary of Work Done

### Community 165 - "AddToShelfSheet.tsx"
Cohesion: 0.40
Nodes (4): AddToShelfSheet(), AddToShelfSheetProps, styles, CheckIcon()

## Knowledge Gaps
- **1173 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+1168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `NotebookIllustrations.tsx` to `index.tsx`, `ReaderPageView.tsx`, `AmbiencePicker.tsx`, `bible.ts`, `library.tsx`, `languagePair.ts`, `[surahNumber].tsx`, `[bookId].tsx`, `ThemeProvider.tsx`, `homescreen.tsx`, `ShareCardScreen.tsx`, `icons.tsx`, `QuranRecitationButton.tsx`, `FlameGlow.tsx`, `ReaderMenuModal.tsx`, `ScriptureInquiryDeck.tsx`, `ScriptureTableDeck.tsx`, `VerseDeckView.tsx`, `WordTranslationPopup.tsx`, `vocabulary.tsx`, `haptics.ts`, `onboarding.tsx`, `generateId`, `AddToShelfSheet.tsx`, `ScriptureInquiryModal.tsx`, `settings.tsx`, `PageStyleSelectorModal.tsx`, `ask.tsx`, `useTheme`, `getSetting`, `banglaApi.ts`, `bookDownloader.ts`, `banglaDownloader.ts`, `literaryTheme.ts`, `pronunciationEngine.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `jszip` connect `textParser.ts` to `dependencies`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `parseEpub()` connect `textParser.ts` to `bookDownloader.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _1180 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `textParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08585858585858586 - nodes in this community are weakly interconnected._