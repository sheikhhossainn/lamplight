# Graph Report - .  (2026-09-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2361 nodes · 4646 edges · 168 communities (128 shown, 40 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8940df6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [slug].tsx
- icons.tsx
- vocabulary.tsx
- aiScriptureEngine.ts
- expo
- bible.ts
- [surahNumber].tsx
- [bookId].tsx
- settings.tsx
- syncWorker.ts
- onboarding.tsx
- dependencies
- ScriptureTableDeck.tsx
- [id].tsx
- library.tsx
- 1. sheikhhossainn — Vocabulary, SRS & Translation
- FlameGlow.tsx
- getSetting
- getDb
- ReaderPageView.tsx
- Skill: Avoid Barrel Exports
- Skill: R8 Code Shrinking
- cloudTranslationProvider.ts
- ThemeProvider.tsx
- Skill: Analyze JS Bundle Size
- Skill: Native Assets
- Skill: Hunt Native Memory Leaks
- textParser.ts
- scriptureInquiryApi.ts
- Skill: React Compiler
- ChevronLeftIcon
- CloseIcon
- LanguagePicker.tsx
- WordTranslationPopup.tsx
- ShareCardScreen.tsx
- ScriptureInquiryDeck.tsx
- setSetting
- Skill: Analyze App Bundle Size
- Skill: Determine Library Size
- homescreen.tsx
- Skill: Disable JS Bundle Compression
- Skill: High-Performance Animations
- Skill: Native Memory Management
- Skill: Remote Chunk Loading
- Skill: Tree Shaking
- Skill: Measure TTI (Time to Interactive)
- Skill: Profile Native Code
- React Native Best Practices
- scripts
- ScriptureInquiryModal.tsx
- useTheme
- Skill: Concurrent React
- Skill: Higher-Order Lists
- Skill: Threading Model
- Skill: View Flattening
- Lamplight — Visual Blueprint & Context Guide
- ask.tsx
- Homescreen
- client.ts
- savedWords.ts
- ambiencePreference.ts
- When to Load Reference Files
- Skill: Atomic State Management
- Skill: Bottom Sheet Best Practices
- PageStyleSelectorModal.tsx
- Skill: Measure JS FPS
- Skill: Hunt JS Memory Leaks
- Skill: Uncontrolled Components
- VocabularyScreen
- enqueueMutation
- Skill: Fast Native Modules
- seed-scripture-verses.mjs
- Skill: Profile React Performance
- Core Features (Implemented)
- highlights.ts
- MotherTonguePicker.tsx
- BookRow
- curatedScriptureQA.ts
- Skill: Native SDKs
- LampLight — Deep Feature Analysis & Real Improvements
- package.json
- fetch-bible-nt.mjs
- fetch-bible-ot.mjs
- LampLight — Feature Implementation Checklist
- inquiryCache.ts
- Lamplight — Reading App
- Android 16 KB page size alignment
- Skill: Platform Differences
- Lamplight — Reading App
- tsconfig.json
- Deployment — Preview builds & OTA (`eas update`)
- fetch-quran.mjs
- reset-project.js
- LiteraryThemePicker.tsx
- bibleData.ts
- Scriptures — architecture reference
- Lamplight — Product Roadmap
- VocabularyGrowthChart.tsx
- librarySync.ts
- BookPageFrame.tsx
- glyphWidths.ts
- interlinearParser.ts
- storageManager.ts
- Design system
- Debugging — known pitfalls & workflow
- README.md
- sync-aozora-catalog.mjs
- sync-books.mjs
- sync-bulk-catalog.mjs
- WordActionMenu.tsx
- readingTheme.ts
- Explore Tab Icon (1x) - Unused Expo Default
- Architecture
- Context Verses — architecture reference
- fetch-vedas.mjs
- bookCategories.ts
- soundPrefs.ts
- index.ts
- Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?
- Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?
- sync-korean-catalog.mjs
- scriptureWebSearch.ts
- index.ts
- jszip
- upload-ambience.mjs
- upload-hero-covers.mjs
- eslint.config.js
- koreanDownloader.ts
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
- CLAUDE.md (Lamplight project instructions)
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
- create-expo-app
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
- The Premium message: 'helps you remember what you read'
- Schema-to-feature map (quick reference table)
- MIN_DECK_SIZE
- supabase/schema.sql (DB schema, source of truth)

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 152 edges
2. `getDb()` - 140 edges
3. `ReaderScreen()` - 35 edges
4. `setSetting()` - 34 edges
5. `getSetting()` - 33 edges
6. `BookDetailScreen()` - 28 edges
7. `LibraryScreen()` - 25 edges
8. `useTargetLanguage()` - 25 edges
9. `Homescreen()` - 24 edges
10. `VocabularyScreen()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `parseEpub()` --references--> `jszip`  [EXTRACTED]
  src/features/content-ingestion/epubParser.ts → package.json
- `getCatalogCSV()` --references--> `jszip`  [EXTRACTED]
  scripts/sync-aozora-catalog.mjs → package.json
- `PaywallScreen()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/paywall.tsx → src/theme/ThemeProvider.tsx
- `ShelfEditorModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ShelfEditorModal.tsx → src/theme/ThemeProvider.tsx
- `useAppUpdateBanner()` --references--> `updates`  [EXTRACTED]
  src/features/app-update/useAppUpdateBanner.ts → app.json

## Import Cycles
- None detected.

## Communities (168 total, 40 thin omitted)

### Community 0 - "[slug].tsx"
Cohesion: 0.05
Nodes (66): BanglaLibraryScreen(), styles, { width: screenWidth }, BanglaBookDetailScreen(), styles, { width: screenWidth }, GENRES, KoreanCatalogItem (+58 more)

### Community 1 - "icons.tsx"
Cohesion: 0.05
Nodes (48): styles, TabIcon, TabsLayout(), ThemeAwareTabBarBackground(), ThemeAwareTabIcon(), ThemeAwareTabLabel(), ThemeAwareTabLabelProps, ThemeAwareTabVisualProps (+40 more)

### Community 2 - "vocabulary.tsx"
Cohesion: 0.07
Nodes (54): DailyReviewCheckpoint, EmptyPrompt(), FlashcardDeck(), localDateKey(), LockedReview(), QuizMode, QuizState, QuizTab() (+46 more)

### Community 3 - "aiScriptureEngine.ts"
Cohesion: 0.07
Nodes (50): buildQuranVerseEntries(), getBookVerses(), getChapterVerses(), listBooks(), BibleNtBookMeta, BibleNtVerse, BOOK_MEANINGS, books (+42 more)

### Community 4 - "expo"
Cohesion: 0.05
Nodes (43): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+35 more)

### Community 5 - "bible.ts"
Cohesion: 0.11
Nodes (40): BibleVerseReaderScreen(), FlatVerse, HeldWord, styles, verseKey(), BibleNtVerseReaderScreen(), FlatVerse, HeldWord (+32 more)

### Community 6 - "[surahNumber].tsx"
Cohesion: 0.08
Nodes (36): QuranSurahListScreen(), styles, HeldWord, QuranVerseReaderScreen(), styles, WordLang, createQuranHighlight(), deleteQuranHighlight() (+28 more)

### Community 7 - "[bookId].tsx"
Cohesion: 0.07
Nodes (33): AnimatedPressable, ANTIQUE_PAPER_DAY, CHROME_EASING, READER_THEME_EASING, ReaderChromeTouchTargetProps, ReaderMode, ReaderPageCell, ReaderPageCellProps (+25 more)

### Community 8 - "settings.tsx"
Cohesion: 0.10
Nodes (37): AnimatedPressable, GLIDE_EASING, SettingsScreen(), styles, syncStatusLabel(), updateStatusLabel(), RedeemPromoModal(), RedeemPromoModalProps (+29 more)

### Community 9 - "syncWorker.ts"
Cohesion: 0.08
Nodes (38): CloudLibraryMapSqlRow, getLibraryItemId(), resolveLibraryItemId(), setLibraryMapping(), getAllCursors(), getCursor(), resetCursors(), SyncCursor (+30 more)

### Community 10 - "onboarding.tsx"
Cohesion: 0.08
Nodes (37): CoverageIllustration(), EASE_OUT, illustrationStyles, MemoryIllustration(), MotherTongueSlide(), OnboardingScreen(), ReadIllustration(), Slide (+29 more)

### Community 11 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, expo, expo-asset, expo-audio, expo-clipboard, expo-constants, expo-device, expo-file-system (+31 more)

### Community 12 - "ScriptureTableDeck.tsx"
Cohesion: 0.07
Nodes (28): fetchContextVerses(), parseRow(), CURATED_COMFORT_VERSES, CuratedComfortVerse, drawEmpatheticDeck(), drawTableDeck(), EMOTIONAL_SIGNALS, scoreVerse() (+20 more)

### Community 13 - "[id].tsx"
Cohesion: 0.12
Nodes (29): BookDetailScreen(), styles, LibraryScreen(), AddToShelfSheet(), AddToShelfSheetProps, styles, CheckIcon(), deleteImportedBook() (+21 more)

### Community 14 - "library.tsx"
Cohesion: 0.12
Nodes (25): getShelfSubtitle(), ROW_ROTATIONS, SkeletonShelf(), styles, { width: screenWidth }, WoodenPlank(), CultureEditionBanner(), styles (+17 more)

### Community 15 - "1. sheikhhossainn — Vocabulary, SRS & Translation"
Cohesion: 0.07
Nodes (28): 1-A. Fix: Copy Button in Word Translation Popup — ✅ Completed, 1-B. Fix: Context Sentence Shown During SRS Review — ✅ Completed, 1-C. Fix: SRS Review Flood, 1-D. Fix: New Words Flooding Today's Review Queue, 1-E. Fix: getSpeechLocale Missing Languages, 1-F. Fix: Source Language Hardcoded to English, 1-G. Fix: Cap Check DB Read on Every Word Tap, 1-H. Build: Vocabulary Growth Graph (+20 more)

### Community 16 - "FlameGlow.tsx"
Cohesion: 0.08
Nodes (24): EASE_OUT, SplashScreen(), styles, { width: screenWidth, height: screenHeight }, FEATURES, PaywallScreen(), Plan, styles (+16 more)

### Community 17 - "getSetting"
Cohesion: 0.14
Nodes (24): AppShell(), RootLayout(), unstable_settings, styles, WhatsNewOverlay(), getSetting(), CHANGELOG, ChangelogEntry (+16 more)

### Community 18 - "getDb"
Cohesion: 0.13
Nodes (26): getDb(), deleteBibleSavedWord(), BanglaChapterRow, BanglaChapterSqlRow, BookSqlRow, fromSqlRow(), JapaneseChapterRow, JapaneseChapterSqlRow (+18 more)

### Community 19 - "ReaderPageView.tsx"
Cohesion: 0.12
Nodes (25): useCurrentSpeechId(), charIndexAtFraction(), charInLine(), fractionAtCharIndex(), getTokens(), HandlePixel, lineStartOffsets(), locateOffsetPixel() (+17 more)

### Community 20 - "Skill: Avoid Barrel Exports"
Cohesion: 0.08
Nodes (25): 1. Bundle Size Overhead, 2. Runtime Overhead, 3. Circular Dependencies, Common Pitfalls, Enforce with ESLint, Expo SDK 52+, Library-Specific Solutions, metro-serializer-esbuild (+17 more)

### Community 21 - "Skill: R8 Code Shrinking"
Cohesion: 0.08
Nodes (25): 1. Enable R8, 2. Enable Resource Shrinking (Optional), 3. Configure ProGuard Rules (If Needed), 4. Build and Test, App Crashes After R8, Check APK Size, Common Library Rules, Common Pitfalls (+17 more)

### Community 22 - "cloudTranslationProvider.ts"
Cohesion: 0.15
Nodes (20): buildTranslationCacheKey(), evictExpiredTranslations(), getCachedTranslation(), getUtf8ByteSize(), PersistentTranslationRow, setCachedTranslation(), CapCheck, capFromUsed() (+12 more)

### Community 23 - "ThemeProvider.tsx"
Cohesion: 0.10
Nodes (23): getPageStyleConfig(), isRtlLiteraryTheme(), LamplightTheme, LamplightThemeProvider(), ThemeContext, ArabicColor, ArabicColorDark, BengaliColor (+15 more)

### Community 24 - "Skill: Analyze JS Bundle Size"
Cohesion: 0.08
Nodes (24): Analyze, bundle-stats / statoscope, Code Examples, Common Offenders, Comparing Bundles, For Expo Projects, For Non-Expo Projects, Generate Bundle with Source Map (+16 more)

### Community 25 - "Skill: Native Assets"
Cohesion: 0.08
Nodes (24): 1. Compress Images, 2. Use Appropriate Formats, 3. Separate Bundled Assets from Remote Images, Android: Automatic Optimization, Asset Optimization Tips, Before/After Comparison, Common Pitfalls, Concept: Size Suffixes (+16 more)

### Community 26 - "Skill: Hunt Native Memory Leaks"
Cohesion: 0.08
Nodes (24): Activity Recreation Test, Analyzing Allocations, Analyzing Results, Android, Android: Memory Profiler, Code Fixes by Pattern, Common Android Leak: Listener Not Removed, Common Native Leak: Missing Ownership (+16 more)

### Community 27 - "textParser.ts"
Cohesion: 0.17
Nodes (21): chapterTitleFromHtml(), decodeEntities(), firstMatch(), htmlToParagraphs(), ParsedEpub, parseEpub(), resolvePath(), BookChapter (+13 more)

### Community 28 - "scriptureInquiryApi.ts"
Cohesion: 0.16
Nodes (20): askAIScriptureInquiry(), normalizeTraditionKey(), matchCitationToCuratedQA(), normalizeCitationQuery(), NT_BOOK_MAP, OT_BOOK_MAP, parseCitation(), ParsedCitation (+12 more)

### Community 29 - "Skill: React Compiler"
Cohesion: 0.09
Nodes (23): Code Examples, Common Pitfalls, Expected Performance Improvements, Expo, Incremental Adoption, Prerequisites, Quick Pattern, React Compiler Playground (+15 more)

### Community 30 - "ChevronLeftIcon"
Cohesion: 0.21
Nodes (17): BibleBookListScreen(), styles, BibleNtBookListScreen(), styles, styles, TORAH_BOOK_IDS, TorahIndexScreen(), styles (+9 more)

### Community 31 - "CloseIcon"
Cohesion: 0.10
Nodes (20): AozoraCatalogItem, GENRES, JapaneseLibraryScreen(), styles, { width: screenWidth }, CloseIcon(), MenuIcon(), MoonIcon() (+12 more)

### Community 32 - "LanguagePicker.tsx"
Cohesion: 0.10
Nodes (16): LanguagePickerProps, styles, AmbiencePicker(), AmbiencePickerProps, styles, VolumeSlider(), EASE_IN, EASE_OUT (+8 more)

### Community 33 - "WordTranslationPopup.tsx"
Cohesion: 0.12
Nodes (19): LanguagePicker(), getSpeechLocale(), hasSpeechVoiceForLanguage(), listeners, notifySpeechListeners(), offerSpeechVoiceSetup(), RATE_VALUES, speakWord() (+11 more)

### Community 34 - "ShareCardScreen.tsx"
Cohesion: 0.12
Nodes (14): calculateQuoteStyles(), detectScript(), getLineHeightMultiplier(), getScriptFont(), ScriptType, ShareCard(), ShareCardScreen(), ShareCardScreenProps (+6 more)

### Community 35 - "ScriptureInquiryDeck.tsx"
Cohesion: 0.12
Nodes (11): ScriptureQAVerse, ScriptureInquiryDeck(), ScriptureInquiryDeckProps, styles, PHASES, ScriptureInquirySpinner(), ScriptureInquirySpinnerProps, styles (+3 more)

### Community 36 - "setSetting"
Cohesion: 0.21
Nodes (16): setSetting(), logEvent(), markOnboardingComplete(), resetOnboardingForTesting(), Cache, getCachedTodayUsageCount(), getTodayUsageCount(), incrementTodayUsage() (+8 more)

### Community 37 - "Skill: Analyze App Bundle Size"
Cohesion: 0.10
Nodes (20): Analyze, Android: Ruler (Spotify), CI Size Validation, Emerge Tools (Cross-Platform), Features, iOS: Xcode App Thinning, Key Metrics, Optimization Impact Example (+12 more)

### Community 38 - "Skill: Determine Library Size"
Cohesion: 0.11
Nodes (20): After Adding, Before Adding Dependency, bundlephobia.com, Code Example: Optimizing Imports, Common Large Dependencies, Comparison Workflow, Decision Rule, Example Analysis (+12 more)

### Community 39 - "homescreen.tsx"
Cohesion: 0.12
Nodes (17): EASE_OUT, getEnglishGenre(), getGreeting(), LITERARY_SPARKS, LiterarySpark, styles, { width: screenWidth }, QuestionIcon() (+9 more)

### Community 40 - "Skill: Disable JS Bundle Compression"
Cohesion: 0.11
Nodes (19): Applicability, Background, Check APK Contents, Common Pitfalls, Edit build.gradle, Expo Notes, Full Context, How Hermes Memory Mapping Works (+11 more)

### Community 42 - "Skill: High-Performance Animations"
Cohesion: 0.11
Nodes (19): 1. Basic Animated Style (UI Thread), 2. Run Code on UI Thread with `scheduleOnUI`, 3. Call JS from UI Thread with `scheduleOnRN`, 4. Animation with Callback, Breaking Changes, Common Pitfalls, Key Concepts, Main Thread vs JS Thread (+11 more)

### Community 43 - "Skill: Native Memory Management"
Cohesion: 0.11
Nodes (19): 1. Forgetting to Delete (C++), 2. Reference Cycles (Swift/C++), 3. Unremoved Listeners (Kotlin), Best Practices Summary, Breaking Reference Cycles with `weak`, C++ Smart Pointers, Common Memory Leak Sources, Kotlin/Android GC (+11 more)

### Community 44 - "Skill: Remote Chunk Loading"
Cohesion: 0.11
Nodes (18): 1. Create Split Point with React.lazy, 2. Wrap with Suspense, 3. Configure Chunk Loading, 4. Build and Deploy Chunks, Caching Strategy, Common Pitfalls, Complete Example, Hermes Memory Mapping (+10 more)

### Community 45 - "Skill: Tree Shaking"
Cohesion: 0.11
Nodes (18): 1. Enable Import Support, 2. Enable Tree Shaking, Common Pitfalls, ESM Imports Required, Platform Shaking, Platform Support, Quick Config, Related Skills (+10 more)

### Community 46 - "Skill: Measure TTI (Time to Interactive)"
Cohesion: 0.11
Nodes (18): 1. Detect Cold Start, 2. Check Foreground State, 3. Set Up Performance Markers, 4. Mark Screen Interactive (JavaScript), 5. Collect and Report Metrics, Built-in Markers, Common Pitfalls, Listening to Native Events (+10 more)

### Community 47 - "Skill: Profile Native Code"
Cohesion: 0.11
Nodes (18): Analyzing Results, Analyzing Time Profiler Results, Android Profiling with Android Studio, Common Findings, CPU Profiling, Deep Profiling: Instruments, Expo Notes, iOS Profiling with Xcode (+10 more)

### Community 48 - "React Native Best Practices"
Cohesion: 0.11
Nodes (18): Attribution, Bundling (`bundle-*`), Critical: Bundle Size, Critical: FPS & Re-renders, High: Native Performance, High: TTI Optimization, JavaScript/React (`js-*`), Native (`native-*`) (+10 more)

### Community 49 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, android, fetch:bible-nt, fetch:bible-ot, fetch:quran, fetch:vedas, ios, lint (+10 more)

### Community 50 - "ScriptureInquiryModal.tsx"
Cohesion: 0.13
Nodes (11): MicrophoneIcon(), StopIcon(), CATEGORIES, formatRelativeTime(), ModalTab, ScriptureInquiryModal(), ScriptureInquiryModalProps, styles (+3 more)

### Community 51 - "useTheme"
Cohesion: 0.19
Nodes (15): AnimatedLine, FlashcardsIllustration(), LampGlowScene(), QuotesIllustration(), styles, useLoop(), WordsIllustration(), styles (+7 more)

### Community 52 - "Skill: Concurrent React"
Cohesion: 0.12
Nodes (17): Automatic Batching (React 18+), Code Examples, Common Pitfalls, Concept Overview, Important Considerations, Pattern 1: Defer Expensive Rendering with `useDeferredValue`, Pattern 2: Show Stale Content While Loading, Pattern 3: Transition Non-Critical Updates with `useTransition` (+9 more)

### Community 53 - "Skill: Higher-Order Lists"
Cohesion: 0.12
Nodes (17): 1. Identify the Problem, 2. Replace with FlatList, 3. Optimize FlatList with getItemLayout, 4. Upgrade to FlashList, 5. Evaluate Legend List, Code Examples, Common Pitfalls, Decision Matrix (+9 more)

### Community 54 - "Skill: Threading Model"
Cohesion: 0.12
Nodes (17): Accessing UI from Background (iOS), Android: Coroutines, Available Threads, Fabric (Native Views) Threading, Initialization, iOS: DispatchQueue, Module Invalidation, Moving Work to Background (+9 more)

### Community 55 - "Skill: View Flattening"
Cohesion: 0.12
Nodes (17): Android Studio, Code Examples, Common Pitfalls, Debugging Checklist, Debugging View Hierarchy, Forcing a View to Stay, Preventing Flattening with `collapsable`, Quick Pattern (+9 more)

### Community 56 - "Lamplight — Visual Blueprint & Context Guide"
Cohesion: 0.12
Nodes (16): 1. The Soul & Identity of Lamplight, 2. Design System & Visual Tokens, 3. Screen Visualizations & ASCII Wireframes, 4. System Architecture & Boundaries, 5. Quick Reference for Implementing New Features, Anatomy of a BookSpine Component (`src/components/BookSpine.tsx`), Cloth Spine Color Palette, Core Philosophy (+8 more)

### Community 57 - "ask.tsx"
Cohesion: 0.14
Nodes (10): AskScriptureScreen(), formatRelativeTime(), ModalTab, styles, SUGGESTED_INQUIRIES, TAB_KEYS, CachedInquiryItem, ScalesOfJusticeIcon() (+2 more)

### Community 58 - "Homescreen"
Cohesion: 0.17
Nodes (15): SavedBooksScreen(), styles, Homescreen(), TrashIcon(), listBooks(), deleteReadingPosition(), fromSqlRow(), hideFromContinueReading() (+7 more)

### Community 59 - "client.ts"
Cohesion: 0.16
Nodes (14): backfillBootstrapCategories(), BOOTSTRAP_CATALOG, createQueue(), Enqueue, migrate(), refreshFromRemoteInBackground(), seedBootstrapIfEmpty(), SERIALIZED_METHODS (+6 more)

### Community 60 - "savedWords.ts"
Cohesion: 0.18
Nodes (15): countSavedWordsForBook(), fromSqlRow(), getReviewStats(), listDueWords(), listSavedWordCountsByDay(), listSavedWords(), SavedWordSqlRow, saveWord() (+7 more)

### Community 61 - "ambiencePreference.ts"
Cohesion: 0.21
Nodes (13): emit(), getAmbienceTrackId(), getAmbienceVolume(), listeners, setAmbienceTrackId(), setAmbienceVolume(), subscribe(), useAmbienceTrackId() (+5 more)

### Community 62 - "When to Load Reference Files"
Cohesion: 0.12
Nodes (15): Analyze Bundle Size, Attribution, Bundle & App Size (`bundle-*`), FPS & Re-renders, JavaScript/React Performance (`js-*`), Measure TTI, Native Performance, Native Performance (`native-*`) (+7 more)

### Community 63 - "Skill: Atomic State Management"
Cohesion: 0.12
Nodes (16): 1. Create Store, 1. Define Atoms, 2. Use Atoms in Components, 2. Use Selectors, Common Pitfalls, Comparison, Prerequisites, Problem Description (+8 more)

### Community 64 - "Skill: Bottom Sheet Best Practices"
Cohesion: 0.12
Nodes (16): 1. Convert Gesture-Driven State to SharedValue, 2. Drive Sheet-Index Visibility via `useAnimatedReaction`, 3. Keep Scroll-Driven Logic off the JS Thread, 4. Use Library-Provided Components and Props, 5. BottomSheetModal Setup, 6. Keyboard Handling, Common Pitfalls, Derived Animations with `animatedPosition` (+8 more)

### Community 65 - "PageStyleSelectorModal.tsx"
Cohesion: 0.22
Nodes (13): PageStyleSelectorModal(), PageStyleSelectorModalProps, styles, PAGE_STYLE_LIST, PAGE_STYLES, PageStyleConfig, PageStyleId, getPageStyle() (+5 more)

### Community 66 - "Skill: Measure JS FPS"
Cohesion: 0.13
Nodes (15): Code Examples, Common Pitfalls, Flashlight CI Integration, Identify FPS Drop Source, Important: Disable Dev Mode, Interpreting Results, Method 1: React Perf Monitor (Quick Check), Method 2: Flashlight (Automated Benchmarking) (+7 more)

### Community 67 - "Skill: Hunt JS Memory Leaks"
Cohesion: 0.13
Nodes (15): 1. Open Memory Profiler, 2. Record Memory Allocations, 3. Analyze the Timeline, 4. Investigate Leaking Objects, 5. Verify the Fix, Code Examples, Common Leak Patterns, Common Pitfalls (+7 more)

### Community 68 - "Skill: Uncontrolled Components"
Cohesion: 0.13
Nodes (15): 1. Identify Controlled TextInput, 2. Convert to Uncontrolled, 3. Use Ref for Programmatic Control, Code Examples, Common Pitfalls, Decision Matrix, Full Migration Example, Prerequisites (+7 more)

### Community 69 - "VocabularyScreen"
Cohesion: 0.17
Nodes (14): VocabularyScreen(), listAllBibleHighlights(), deleteHighlight(), BACKOFF_SCHEDULE_MS, calculateBackoff(), countPendingLookups(), CreatePendingLookupInput, deletePendingLookup() (+6 more)

### Community 70 - "enqueueMutation"
Cohesion: 0.17
Nodes (13): createQuizAttempt(), fromSqlRow(), getLatestQuizScoreForBook(), listQuizAttemptsForBook(), QuizAnswerDetail, QuizAttempt, QuizAttemptSqlRow, fromSqlRow() (+5 more)

### Community 71 - "Skill: Fast Native Modules"
Cohesion: 0.14
Nodes (14): 1. Scaffold with Builder Bob, 2. Run on Background Thread (iOS), 3. Run on Background Thread (Android), 4. Use C++ for Cross-Platform Code, Code Example: Complete Async Operation, Common Pitfalls, Language Interop Costs, Prerequisites (+6 more)

### Community 72 - "seed-scripture-verses.mjs"
Cohesion: 0.21
Nodes (13): ASSETS_DIR, chunk(), CURATED, CURATED_VEDAS, embedRows(), loadJson(), loadSources(), resolveAllCitations() (+5 more)

### Community 73 - "Skill: Profile React Performance"
Cohesion: 0.15
Nodes (13): 1. Connect React Native DevTools, 2. Record a Profiling Session, 3. Analyze Results, 4. Profile JavaScript CPU, Common Pitfalls, Interpreting Results, Prerequisites, Quick Command (+5 more)

### Community 74 - "Core Features (Implemented)"
Cohesion: 0.15
Nodes (12): Core Features (Implemented), Directory Structure, Hard Engineering Constraints, Known Gaps (Priority Order), Language & Personalisation, Library, Overview & Product Vision, Reader (+4 more)

### Community 75 - "highlights.ts"
Cohesion: 0.26
Nodes (11): QuoteShareScreen(), styles, getBook(), fromSqlRow(), getHighlight(), Highlight, HighlightSqlRow, listAllHighlights() (+3 more)

### Community 76 - "MotherTonguePicker.tsx"
Cohesion: 0.19
Nodes (11): WordRowCluster(), getLanguageScriptGlyph(), LanguageBadge(), LanguageBadgeProps, styles, MotherTonguePicker(), MotherTonguePickerProps, styles (+3 more)

### Community 77 - "BookRow"
Cohesion: 0.21
Nodes (9): ShelfDraft, ShelfEditorModal(), ShelfEditorModalProps, styles, BookRow, createLocalBook(), cacheImportedBook(), importEpubFromFile() (+1 more)

### Community 78 - "curatedScriptureQA.ts"
Cohesion: 0.26
Nodes (10): CONTROVERSIAL_QUESTIONS, ControversialQuestion, ControversyDossier, ContextStatusType, CRITICAL_CONTROVERSIES, CriticalControversyVerse, escapeRegex(), findCriticalControversy() (+2 more)

### Community 79 - "Skill: Native SDKs"
Cohesion: 0.17
Nodes (12): 1. Remove Unnecessary Intl Polyfills, 2. Use Native Crypto, 3. Use Native Stack Navigator, 4. Use Native Bottom Tabs, Common Pitfalls, Decision Matrix, Quick Pattern, Recommended Native Libraries (+4 more)

### Community 80 - "LampLight — Deep Feature Analysis & Real Improvements"
Cohesion: 0.17
Nodes (11): 1. Word Translation Popup (`WordTranslationPopup.tsx`), 2. Word Action Menu (`WordActionMenu.tsx`), 3. Pronunciation Engine (`pronunciationEngine.ts`), 4. Share Card Screen (`ShareCardScreen.tsx`), 5. Spaced Repetition System (SRS), 6. Translation Provider (`cloudTranslationProvider.ts`), 7. Scripture Q&A Engine, 8. Language Settings (`languagePair.ts`) (+3 more)

### Community 81 - "package.json"
Cohesion: 0.17
Nodes (11): devDependencies, @expo/ngrok, @huggingface/transformers, @supabase/supabase-js, tsx, @types/react, typescript, main (+3 more)

### Community 82 - "fetch-bible-nt.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), NT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 83 - "fetch-bible-ot.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), OT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 85 - "LampLight — Feature Implementation Checklist"
Cohesion: 0.18
Nodes (10): 📚 Book Library, 📖 Core Reader, LampLight — Feature Implementation Checklist, 🌐 Language & Translation, 🚀 Not Started — Hackathon Priorities, 🧭 Onboarding & Settings, 📜 Scripture, 📤 Social & Sharing (+2 more)

### Community 86 - "inquiryCache.ts"
Cohesion: 0.38
Nodes (10): clearInquiryCache(), getCachedInquiry(), getCacheFile(), getRecentInquiries(), loadDiskCache(), memoryCache, normalizeInquiryQuery(), persistDiskCache() (+2 more)

### Community 87 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 88 - "Android 16 KB page size alignment"
Cohesion: 0.20
Nodes (10): Android 16 KB page size alignment, CI Integration, Common Pitfalls, Fixing Alignment Issues, Quick Command, Quick Reference, Related Skills, Step-by-Step (+2 more)

### Community 89 - "Skill: Platform Differences"
Cohesion: 0.20
Nodes (10): Android (Gradle), Common Commands, Dependency Management, iOS (CocoaPods), JavaScript (npm/yarn/pnpm/bun), Quick Reference, Related Skills, Skill: Platform Differences (+2 more)

### Community 90 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 91 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowImportingTsExtensions, paths, strict, exclude, extends, include, @/* (+1 more)

### Community 92 - "Deployment — Preview builds & OTA (`eas update`)"
Cohesion: 0.33
Nodes (6): Deployment — Preview builds & OTA (`eas update`), On-device update state, OTA vs. rebuild, Publishing, runtimeVersion — do not bump `version` casually, Update never reaches the device — check channel→branch link FIRST

### Community 93 - "fetch-quran.mjs"
Cohesion: 0.39
Nodes (8): fetchJson(), fetchRaw(), fetchSurahList(), fetchSurahTafsir(), fetchSurahVerses(), OUT_DIR, sleep(), versesBySurah

### Community 94 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 95 - "LiteraryThemePicker.tsx"
Cohesion: 0.22
Nodes (5): LiteraryThemeIcon(), LiteraryThemePicker(), LiteraryThemePickerProps, styles, LiteraryThemeOption

### Community 96 - "bibleData.ts"
Cohesion: 0.22
Nodes (8): BibleBookMeta, BibleVerse, BOOK_MEANINGS, books, bookVersesCache, RawBibleBookMeta, rawBooks, verses

### Community 97 - "Scriptures — architecture reference"
Cohesion: 0.25
Nodes (8): Bible — New Testament, Bible — Old Testament, Library entry point, Quran, Running a fetch script, Scriptures — architecture reference, Shared UI, Vedas

### Community 98 - "Lamplight — Product Roadmap"
Cohesion: 0.25
Nodes (8): Free tier philosophy — why the caps are generous, not stingy **[added]**, Lamplight — Product Roadmap, Phase 0 — Alpha: the 10-15 friend beta (current target), Phase 1 — Premium, v1 (after beta feedback, not before), Phase 2 -- AI Reading Companion (speculative), Phasing philosophy, Schema-to-feature map (quick reference), The Premium message

### Community 99 - "VocabularyGrowthChart.tsx"
Cohesion: 0.43
Nodes (6): DailySavedWordCount, dateKey(), fillGrowthSeries(), formatDateLabel(), styles, VocabularyGrowthChart()

### Community 100 - "librarySync.ts"
Cohesion: 0.39
Nodes (7): beginLibrarySync(), emit(), endLibrarySync(), getSyncing(), listeners, subscribe(), useLibrarySyncing()

### Community 101 - "BookPageFrame.tsx"
Cohesion: 0.25
Nodes (7): ANTIQUE_PAPER_DAY, BookPageFrame(), BookPageFrameProps, DAY_TONES, NIGHT_TONES, styles, LamplightColor

### Community 102 - "glyphWidths.ts"
Cohesion: 0.29
Nodes (4): charAdvance(), FALLBACK, fallbackAdvance(), GLYPH_MEASURE_TEXT

### Community 103 - "interlinearParser.ts"
Cohesion: 0.32
Nodes (6): tokenizeParagraph(), batchTranslateSentences(), InterlinearSentence, InterlinearWord, parseParagraphToInterlinear(), splitSentences()

### Community 104 - "storageManager.ts"
Cohesion: 0.43
Nodes (7): booksDirectory, cleanupPartialDownloads(), clearTemporaryCache(), evictCacheDownTo(), getStorageUsage(), performMaintenanceIfUnderPressure(), StorageUsage

### Community 105 - "Design system"
Cohesion: 0.40
Nodes (4): Design system, Identity, Locked constants, Source of truth (in order)

### Community 106 - "Debugging — known pitfalls & workflow"
Cohesion: 0.29
Nodes (7): Debug workflow, Debugging — known pitfalls & workflow, Expo Router quirks, Expo SDK pin, expo-sqlite (Android), Fetch scripts — no port, don't kill the wrong Node process, OTA update "not arriving"

### Community 107 - "README.md"
Cohesion: 0.29
Nodes (6): Docs, Hard Rules, Project Structure, Running the App, Tech Stack, What makes it different

### Community 108 - "sync-aozora-catalog.mjs"
Cohesion: 0.43
Nodes (6): CURATED_COVERS, fetchExistingHeroIds(), getCatalogCSV(), parseCSVLine(), run(), supabase

### Community 109 - "sync-books.mjs"
Cohesion: 0.33
Nodes (6): CATALOG, findBook(), rows, supabase, syncOneBook(), SYNOPSES

### Community 110 - "sync-bulk-catalog.mjs"
Cohesion: 0.48
Nodes (6): fetchCursor(), fetchExistingHeroGutenbergIds(), run(), saveCursor(), supabase, toBulkRow()

### Community 111 - "WordActionMenu.tsx"
Cohesion: 0.29
Nodes (3): styles, { width: screenWidth, height: screenHeight }, WordActionMenuProps

### Community 112 - "readingTheme.ts"
Cohesion: 0.38
Nodes (5): getReadingTheme(), listeners, ReadingTheme, subscribe(), useReadingTheme()

### Community 113 - "Explore Tab Icon (1x) - Unused Expo Default"
Cohesion: 0.47
Nodes (6): Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default, Home Tab Icon (1x) - Unused Expo Default

### Community 114 - "Architecture"
Cohesion: 0.33
Nodes (6): Architecture, Content pipelines — two distinct ones, Context verses (mood → verse search), Conventions, God-node files, Layout

### Community 115 - "Context Verses — architecture reference"
Cohesion: 0.40
Nodes (5): App, Context Verses — architecture reference, Embeddings, Supabase, Verse table deck (offline, blind, no citation ever)

### Community 116 - "fetch-vedas.mjs"
Cohesion: 0.47
Nodes (5): BOOK_MEANINGS, decodeHtmlEntities(), fetchBook(), OUT_DIR, run()

### Community 117 - "bookCategories.ts"
Cohesion: 0.40
Nodes (4): BOOK_CATEGORIES, BookCategory, BY_ID, categoryLabel()

### Community 118 - "soundPrefs.ts"
Cohesion: 0.47
Nodes (4): getPageTurnSoundEnabled(), listeners, subscribe(), usePageTurnSoundEnabled()

### Community 119 - "index.ts"
Cohesion: 0.33
Nodes (4): corsHeaders, GROQ_API_KEY, InquiryRequest, SlotResult

### Community 120 - "Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?, Source Nodes

### Community 121 - "Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?, Source Nodes

### Community 122 - "sync-korean-catalog.mjs"
Cohesion: 0.40
Nodes (3): KOREAN_CATALOG, KOREAN_COVERS, supabase

### Community 123 - "scriptureWebSearch.ts"
Cohesion: 0.50
Nodes (4): fetchScripturalWebContext(), STOP_WORDS, WikiSearchItem, WikiSearchResponse

### Community 124 - "index.ts"
Cohesion: 0.40
Nodes (3): corsHeaders, embeddingModel, TRADITIONS

### Community 125 - "jszip"
Cohesion: 0.67
Nodes (3): jszip, downloadAozoraBook(), parseAozoraText()

### Community 126 - "upload-ambience.mjs"
Cohesion: 0.67
Nodes (3): ensureBucket(), run(), supabase

## Knowledge Gaps
- **1144 isolated node(s):** `{ defineConfig }`, `expoConfig`, `fs`, `path`, `readline` (+1139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `[slug].tsx`, `icons.tsx`, `vocabulary.tsx`, `expo`, `bible.ts`, `[surahNumber].tsx`, `[bookId].tsx`, `settings.tsx`, `onboarding.tsx`, `ScriptureTableDeck.tsx`, `[id].tsx`, `library.tsx`, `FlameGlow.tsx`, `getSetting`, `ReaderPageView.tsx`, `ThemeProvider.tsx`, `ChevronLeftIcon`, `CloseIcon`, `LanguagePicker.tsx`, `WordTranslationPopup.tsx`, `ShareCardScreen.tsx`, `ScriptureInquiryDeck.tsx`, `homescreen.tsx`, `ScriptureInquiryModal.tsx`, `ask.tsx`, `Homescreen`, `PageStyleSelectorModal.tsx`, `VocabularyScreen`, `highlights.ts`, `MotherTonguePicker.tsx`, `BookRow`, `LiteraryThemePicker.tsx`, `VocabularyGrowthChart.tsx`, `WordActionMenu.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `parseEpub()` connect `textParser.ts` to `jszip`, `BookRow`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `jszip` connect `jszip` to `textParser.ts`, `dependencies`, `sync-aozora-catalog.mjs`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `{ defineConfig }`, `expoConfig`, `fs` to the rest of the system?**
  _1151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `[slug].tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050239234449760764 - nodes in this community are weakly interconnected._
- **Should `icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05017921146953405 - nodes in this community are weakly interconnected._
- **Should `vocabulary.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06949152542372881 - nodes in this community are weakly interconnected._