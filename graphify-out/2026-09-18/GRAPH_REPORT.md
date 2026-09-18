# Graph Report - LampLight  (2026-09-16)

## Corpus Check
- 204 files · ~4,572,352 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1561 nodes · 3559 edges · 123 communities (84 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efff57c7`
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
- AppUpdatePrompt.tsx
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 126 edges
2. `getDb()` - 98 edges
3. `ReaderScreen()` - 43 edges
4. `setSetting()` - 29 edges
5. `BookDetailScreen()` - 28 edges
6. `getSetting()` - 28 edges
7. `LibraryScreen()` - 27 edges
8. `ChevronLeftIcon()` - 24 edges
9. `useTargetLanguage()` - 23 edges
10. `Homescreen()` - 19 edges

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

## Communities (123 total, 39 thin omitted)

### Community 0 - "client.ts"
Cohesion: 0.13
Nodes (21): backfillBootstrapCategories(), BOOTSTRAP_CATALOG, createQueue(), Enqueue, migrate(), refreshFromRemoteInBackground(), seedBootstrapIfEmpty(), SERIALIZED_METHODS (+13 more)

### Community 1 - "WordTranslationPopup.tsx"
Cohesion: 0.08
Nodes (35): ReloadIcon(), logEvent(), LoadState, MAX_CARD_WIDTH, styles, { width: screenWidth, height: screenHeight }, WordTranslationPopup(), WordTranslationPopupProps (+27 more)

### Community 2 - "expo"
Cohesion: 0.05
Nodes (37): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 3 - "textParser.ts"
Cohesion: 0.09
Nodes (38): jszip, CURATED_COVERS, fetchExistingHeroIds(), getCatalogCSV(), parseCSVLine(), run(), supabase, CATALOG (+30 more)

### Community 4 - "index.tsx"
Cohesion: 0.20
Nodes (17): BibleBookListScreen(), styles, BibleNtBookListScreen(), styles, styles, TORAH_BOOK_IDS, TorahIndexScreen(), styles (+9 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, expo, expo-asset, expo-audio, expo-clipboard, expo-constants, expo-device, expo-file-system (+31 more)

### Community 6 - "ReaderPageView.tsx"
Cohesion: 0.10
Nodes (39): getSpeechLocale(), listeners, notifySpeechListeners(), RATE_VALUES, speakWord(), SpeechRate, stopSpeech(), toggleSpeech() (+31 more)

### Community 7 - "AmbiencePicker.tsx"
Cohesion: 0.16
Nodes (19): AmbiencePicker(), AmbiencePickerProps, styles, VolumeSlider(), emit(), getAmbienceTrackId(), getAmbienceVolume(), listeners (+11 more)

### Community 8 - "bible.ts"
Cohesion: 0.06
Nodes (54): BibleVerseReaderScreen(), estimateBibleVerseOffset(), FlatVerse, HeldWord, styles, verseKey(), BibleNtVerseReaderScreen(), estimateBibleVerseOffset() (+46 more)

### Community 9 - "library.tsx"
Cohesion: 0.11
Nodes (35): BookDetailScreen(), styles, getShelfSubtitle(), LibraryScreen(), ROW_ROTATIONS, styles, { width: screenWidth }, deleteImportedBook() (+27 more)

### Community 11 - "languagePair.ts"
Cohesion: 0.17
Nodes (13): LanguagePicker(), LanguagePickerProps, styles, BY_CODE, emit(), getTargetLanguage(), hydrateTargetLanguage(), listeners (+5 more)

### Community 12 - "[surahNumber].tsx"
Cohesion: 0.10
Nodes (30): estimateQuranVerseOffset(), HeldWord, QuranVerseReaderScreen(), styles, WordLang, buildQuranVerseEntries(), deleteQuranHighlight(), deleteQuranSavedWord() (+22 more)

### Community 13 - "[bookId].tsx"
Cohesion: 0.11
Nodes (25): AnimatedPressable, ReaderMode, ReaderPageFrameProps, ReaderScreen(), READING_DARK_STOPS, selectedText(), styles, { width: screenWidth, height: screenHeight } (+17 more)

### Community 14 - "ThemeProvider.tsx"
Cohesion: 0.15
Nodes (16): ANTIQUE_PAPER_DAY, BookPageFrame(), BookPageFrameProps, DAY_TONES, NIGHT_TONES, styles, LamplightTheme, ThemeContext (+8 more)

### Community 15 - "homescreen.tsx"
Cohesion: 0.11
Nodes (32): BanglaLibraryScreen(), styles, { width: screenWidth }, BanglaBookDetailScreen(), styles, { width: screenWidth }, getEnglishGenre(), getGreeting() (+24 more)

### Community 16 - "ShareCardScreen.tsx"
Cohesion: 0.19
Nodes (7): CARD_WIDTH, quoteFontStyle(), ShareCard(), ShareCardScreen(), styles, Variant, VARIANTS

### Community 17 - "icons.tsx"
Cohesion: 0.13
Nodes (18): { height: screenHeight }, HomeGuideModal(), HomeGuideModalProps, styles, BookmarkIcon(), CloseIcon(), HomeIcon(), IconProps (+10 more)

### Community 18 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, android, fetch:bible-nt, fetch:bible-ot, fetch:quran, fetch:vedas, ios, lint (+10 more)

### Community 19 - "FlameGlow.tsx"
Cohesion: 0.08
Nodes (22): FEATURES, PaywallScreen(), Plan, styles, { width: screenWidth, height: screenHeight }, CORE_OPACITY, CORE_PHASES, CORE_SCALE_X (+14 more)

### Community 20 - "index.tsx"
Cohesion: 0.48
Nodes (6): QuranSurahListScreen(), styles, getLatestQuranReadingPosition(), listQuranReadingPositions(), readingPositionFromSqlRow(), listSurahs()

### Community 21 - "readingTheme.ts"
Cohesion: 0.27
Nodes (11): getReadingTheme(), listeners, ReadingTheme, setReadingTheme(), subscribe(), useReadingTheme(), registerThemeTransitionRunner(), requestThemeChange() (+3 more)

### Community 22 - "NotebookIllustrations.tsx"
Cohesion: 0.23
Nodes (10): AnimatedLine, FlashcardsIllustration(), LampGlowScene(), QuotesIllustration(), styles, useLoop(), WordsIllustration(), styles (+2 more)

### Community 23 - "ScriptureTableDeck.tsx"
Cohesion: 0.05
Nodes (41): createBibleHighlight(), createQuranHighlight(), ScriptureInquiryDeck(), ScriptureInquiryDeckProps, styles, PHASES, ScriptureInquirySpinner(), ScriptureInquirySpinnerProps (+33 more)

### Community 24 - "fetch-bible-nt.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), NT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 25 - "fetch-bible-ot.mjs"
Cohesion: 0.20
Nodes (9): books, booksPath, fetchChapterCommentary(), fetchJson(), OT_BOOK_IDS, OUT_DIR, sleep(), versesByBook (+1 more)

### Community 26 - "vocabulary.tsx"
Cohesion: 0.15
Nodes (18): EmptyPrompt(), FlashcardDeck(), SavedVerseEntry, srsSorted(), styles, Tab, TAB_KEYS, TABS (+10 more)

### Community 27 - "Lamplight — Product Roadmap"
Cohesion: 0.25
Nodes (8): Free tier philosophy — why the caps are generous, not stingy **[added]**, Lamplight — Product Roadmap, Phase 0 — Alpha: the 10-15 friend beta (current target), Phase 1 — Premium, v1 (after beta feedback, not before), Phase 2 — AI Reading Companion (future, speculative), Phasing philosophy, Schema-to-feature map (quick reference), The Premium message

### Community 28 - "ClozeResultScreen.tsx"
Cohesion: 0.28
Nodes (8): getWordCluster(), sentenceAtOffset(), sentenceContaining(), splitIntoSentences(), ClozeResultScreen(), MissedWordCard(), Props, s

### Community 29 - "package.json"
Cohesion: 0.18
Nodes (10): devDependencies, @huggingface/transformers, @supabase/supabase-js, tsx, @types/react, typescript, main, name (+2 more)

### Community 30 - "getDb"
Cohesion: 0.10
Nodes (35): QuoteShareScreen(), getDb(), BanglaChapterRow, BanglaChapterSqlRow, BookSqlRow, fromSqlRow(), getBook(), JapaneseChapterRow (+27 more)

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
Cohesion: 0.33
Nodes (7): usePageTurnSound(), getPageTurnSoundEnabled(), listeners, subscribe(), usePageTurnSoundEnabled(), hapticPageTurn(), hapticSaveWord()

### Community 35 - "sync-bulk-catalog.mjs"
Cohesion: 0.48
Nodes (6): fetchCursor(), fetchExistingHeroGutenbergIds(), run(), saveCursor(), supabase, toBulkRow()

### Community 36 - "onboarding.tsx"
Cohesion: 0.11
Nodes (28): CoverageIllustration(), illustrationStyles, MemoryIllustration(), OnboardingScreen(), ReadIllustration(), Slide, SLIDES, styles (+20 more)

### Community 37 - "generateId"
Cohesion: 0.17
Nodes (11): ShelfDraft, ShelfEditorModal(), ShelfEditorModalProps, styles, BookRow, createLocalBook(), createHighlight(), saveWord() (+3 more)

### Community 38 - "savedWords.ts"
Cohesion: 0.16
Nodes (14): countSavedWordsForBook(), fromSqlRow(), listDueWords(), listSavedWords(), listSavedWordsForBook(), SavedWord, SavedWordSqlRow, calculateNextSrsState() (+6 more)

### Community 39 - "ScriptureInquiryModal.tsx"
Cohesion: 0.13
Nodes (22): AskScriptureScreen(), CachedInquiryItem, clearInquiryCache(), getCachedInquiry(), getCacheFile(), getRecentInquiries(), loadDiskCache(), memoryCache (+14 more)

### Community 40 - "Explore Tab Icon (1x) - Unused Expo Default"
Cohesion: 0.47
Nodes (6): Explore Tab Icon (2x) - Unused Expo Default, Explore Tab Icon (3x) - Unused Expo Default, Explore Tab Icon (1x) - Unused Expo Default, Home Tab Icon (2x) - Unused Expo Default, Home Tab Icon (3x) - Unused Expo Default, Home Tab Icon (1x) - Unused Expo Default

### Community 42 - "scriptureInquiryApi.ts"
Cohesion: 0.16
Nodes (25): matchCitationToCuratedQA(), normalizeCitationQuery(), NT_BOOK_MAP, OT_BOOK_MAP, parseCitation(), ParsedCitation, resolveDirectScriptureVerse(), CONTROVERSIAL_QUESTIONS (+17 more)

### Community 43 - "upload-ambience.mjs"
Cohesion: 0.67
Nodes (3): ensureBucket(), run(), supabase

### Community 45 - "settings.tsx"
Cohesion: 0.12
Nodes (24): AnimatedPressable, DAY_COLORS, GLIDE_EASING, LAMP_COLORS, SettingsScreen(), styles, ThemeSegmentedSwitch(), ToggleSwitch() (+16 more)

### Community 46 - "1. sheikhhossainn — Vocabulary, SRS & Translation"
Cohesion: 0.07
Nodes (28): 1-A. Fix: Copy Button in Word Translation Popup — ✅ Completed, 1-B. Fix: Context Sentence Shown During SRS Review — ✅ Completed, 1-C. Fix: SRS Review Flood, 1-D. Fix: New Words Flooding Today's Review Queue, 1-E. Fix: getSpeechLocale Missing Languages, 1-F. Fix: Source Language Hardcoded to English, 1-G. Fix: Cap Check DB Read on Every Word Tap, 1-H. Build: Vocabulary Growth Graph (+20 more)

### Community 58 - "randomVerse.ts"
Cohesion: 0.12
Nodes (24): getBookVerses(), getBookVerses(), scoreScriptureVerse(), searchInternalScriptureDatasets(), pick(), PICKERS, randomBibleNtVerse(), randomBibleOtVerse() (+16 more)

### Community 59 - "PageStyleSelectorModal.tsx"
Cohesion: 0.14
Nodes (21): MoonIcon(), SoundWaveIcon(), SunIcon(), PageStyleSelectorModal(), PageStyleSelectorModalProps, styles, ReaderMenuModal(), ReaderMenuModalProps (+13 more)

### Community 60 - "ask.tsx"
Cohesion: 0.10
Nodes (13): formatRelativeTime(), ModalTab, styles, SUGGESTED_INQUIRIES, MicrophoneIcon(), StopIcon(), checkAIRateLimit(), RateLimitStatus (+5 more)

### Community 61 - "useTheme"
Cohesion: 0.12
Nodes (18): AozoraCatalogItem, GENRES, JapaneseLibraryScreen(), styles, { width: screenWidth }, GENRES, KoreanCatalogItem, KoreanLibraryScreen() (+10 more)

### Community 62 - "FEELING Sanctuary — Architecture, Workflow & Extension Guide"
Cohesion: 0.10
Nodes (19): 1. Vision & Core Philosophy, 2. File Map & Responsibilities, 3. End-to-End User Flow, 4. Voice Transcription & Speech-to-Text Pipeline, 5. Emotion Classification & Wild Card Deck Matching, 6. Verse Deck UI & Interactions, 7. Environment Variables, 8. How to Extend & Improve This Feature (+11 more)

### Community 63 - "getSetting"
Cohesion: 0.20
Nodes (16): AppShell(), RootLayout(), unstable_settings, styles, WhatsNewOverlay(), getSetting(), CHANGELOG, ChangelogEntry (+8 more)

### Community 64 - "aiScriptureEngine.ts"
Cohesion: 0.16
Nodes (17): getChapterVerses(), AICitation, AIResponseSchema, AITraditionBlock, askAIScriptureInquiry(), callLLMEndpoint(), extractJSON(), GROQ_MODELS (+9 more)

### Community 65 - "banglaApi.ts"
Cohesion: 0.22
Nodes (18): BanglaApiBookDetail, BanglaApiBookSummary, BanglaApiChapter, BanglaBookDetail, BanglaChapterMeta, BASE_URL, CatalogCache, cleanBookTitle() (+10 more)

### Community 66 - "bookDownloader.ts"
Cohesion: 0.18
Nodes (15): SavedBooksScreen(), styles, ConfirmDialog(), ConfirmDialogProps, styles, TrashIcon(), listBooks(), deleteReadingPosition() (+7 more)

### Community 67 - "Lamplight — Visual Blueprint & Context Guide"
Cohesion: 0.12
Nodes (16): 1. The Soul & Identity of Lamplight, 2. Design System & Visual Tokens, 3. Screen Visualizations & ASCII Wireframes, 4. System Architecture & Boundaries, 5. Quick Reference for Implementing New Features, Anatomy of a BookSpine Component (`src/components/BookSpine.tsx`), Cloth Spine Color Palette, Core Philosophy (+8 more)

### Community 68 - "3.2 The Solution Architecture"
Cohesion: 0.12
Nodes (16): 1. Chapter-Scoped Lazy Loading (`getChapterVerses`), 1. Overview & High-Level Architecture, 2.1 Input Channels, 2.2 Emotion Classification & Verse Matching (`empatheticMatcher.ts`), 2.3 Interactive 3D Table Deck UI (`ScriptureTableDeck.tsx`), 2. The Feeling Mechanism: From Heart to Scripture, 2. Viewability-Driven Source of Truth (`onViewableItemsChanged`), 3.1 The Problem It Solved (Why Previous Scrolling Failed) (+8 more)

### Community 69 - "wordCache.ts"
Cohesion: 0.21
Nodes (13): ClozeQuestion, getUsageNoteCache(), setUsageNoteCache(), WordCluster, WordRelated, callGroq(), generateClozeQuestion(), generateFreshClozeQuestion() (+5 more)

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
Cohesion: 0.35
Nodes (8): setSetting(), getReviewStats(), markOnboardingComplete(), resetOnboardingForTesting(), checkVocabReviewPrompt(), markVocabReviewPrompted(), startOfToday(), todayKey()

### Community 75 - "banglaDownloader.ts"
Cohesion: 0.31
Nodes (10): markBanglaBookDownloaded(), saveBanglaChapters(), upsertBanglaBook(), cleanBanglaText(), fetchBanglaChapterText(), banglaRawDirectory, booksDirectory, downloadBanglaBook() (+2 more)

### Community 76 - "ClozeChallenge.tsx"
Cohesion: 0.25
Nodes (10): getClozeCache(), setClozeCache(), ClozeChallenge(), Props, QuizItem, s, shuffle(), SingleQuestion() (+2 more)

### Community 77 - "targetReadingLanguage.ts"
Cohesion: 0.25
Nodes (10): emit(), getTargetReadingLanguage(), getTargetReadingLanguageOption(), hydrateTargetReadingLanguage(), listeners, setTargetReadingLanguage(), TARGET_READING_LANGUAGES, TargetReadingLanguageCode (+2 more)

### Community 78 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 79 - "Lamplight — Reading App"
Cohesion: 0.20
Nodes (9): Context budget, Context loading — graphify, scoped, Design system, Docs — read on demand, don't preload, Engineering rules, Hard constraints, Implementation workflow, Lamplight — Reading App (+1 more)

### Community 80 - "bibleData.ts"
Cohesion: 0.22
Nodes (8): BibleBookMeta, BibleVerse, BOOK_MEANINGS, books, bookVersesCache, RawBibleBookMeta, rawBooks, verses

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
Cohesion: 0.33
Nodes (6): Deployment — Preview builds & OTA (`eas update`), On-device update state, OTA vs. rebuild, Publishing, runtimeVersion — do not bump `version` casually, Update never reaches the device — check channel→branch link FIRST

### Community 88 - "fetch-vedas.mjs"
Cohesion: 0.47
Nodes (5): BOOK_MEANINGS, decodeHtmlEntities(), fetchBook(), OUT_DIR, run()

### Community 89 - "ChevronRightIcon"
Cohesion: 0.40
Nodes (5): SplashScreen(), styles, { width: screenWidth, height: screenHeight }, ChevronRightIcon(), hasCompletedOnboarding()

### Community 90 - "Context Verses — architecture reference"
Cohesion: 0.40
Nodes (5): App, Context Verses — architecture reference, Embeddings, Supabase, Verse table deck (offline, blind, no citation ever)

### Community 91 - "Design system"
Cohesion: 0.40
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

### Community 95 - "AppUpdatePrompt.tsx"
Cohesion: 0.60
Nodes (3): AppUpdatePrompt(), AppUpdateStatus, useAppUpdateBanner()

### Community 96 - "index.ts"
Cohesion: 0.40
Nodes (3): corsHeaders, embeddingModel, TRADITIONS

## Knowledge Gaps
- **632 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+627 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `WordTranslationPopup.tsx`, `index.tsx`, `ReaderPageView.tsx`, `AmbiencePicker.tsx`, `bible.ts`, `library.tsx`, `languagePair.ts`, `[surahNumber].tsx`, `[bookId].tsx`, `ThemeProvider.tsx`, `homescreen.tsx`, `ShareCardScreen.tsx`, `icons.tsx`, `FlameGlow.tsx`, `index.tsx`, `NotebookIllustrations.tsx`, `ScriptureTableDeck.tsx`, `vocabulary.tsx`, `ClozeResultScreen.tsx`, `onboarding.tsx`, `generateId`, `ScriptureInquiryModal.tsx`, `settings.tsx`, `PageStyleSelectorModal.tsx`, `ask.tsx`, `getSetting`, `bookDownloader.ts`, `ClozeChallenge.tsx`, `ChevronRightIcon`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `jszip` connect `textParser.ts` to `dependencies`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `parseEpub()` connect `textParser.ts` to `generateId`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _639 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `WordTranslationPopup.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._