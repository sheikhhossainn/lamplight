# Lamplight Session Handoff

Last updated: 2026-09-25

## Purpose and current direction

This handoff records the current working-tree state and the most useful next steps for continuing implementation against [`FULLAPP.md`](FULLAPP.md). The app is being tested as a React Native / Expo Android development build. The user has said not to prepare or publish to Google Play or the Apple App Store at this stage; keep work focused on the app and internal testing.

## Current repository state

- Current branch: `dev`.
- Work is local and uncommitted. Do not push. Preserve all existing edits and inspect before changing overlapping files.
- `npx tsc --noEmit` has passed after the recent feature work. `npx expo lint` was not available because ESLint is not installed; do not add dependencies without approval.
- `graphify-out/cache/stat-index.json` is modified as a side effect of an unsuccessful graphify update. It is generated/unrelated to the feature work; do not revert it without checking with the user.
- `.env.local` contains local configuration. Never copy secret values into this document, logs, or source control.

## Implemented in the current working tree

Treat these as implemented foundations, not as fully release-verified features:

- RevenueCat client billing foundation, a custom paywall, entitlement access checks, purchase/restore paths, and Test Store configuration support. The configured catalog is the `premium` entitlement with monthly and annual packages in the `default` offering; lifetime is intentionally excluded. The user configured the Test Store products and offering in the RevenueCat dashboard.
- Supabase migration and RevenueCat webhook Edge Function foundation for a server-side entitlement mirror. These are not yet deployed or production-verified.
- Reader table of contents, local in-book search with snippet highlighting and temporary fade highlight, private notes with notebook integration and markdown/json export, and bookmarks, backed by SQLite repositories and schema migrations.
- Reader typography and accessibility preferences with persistent font size (17–24px) and line-height ratio (1.85–2.15) clamping, preserving the Lora 17px/1.85 floors, accessible stepper controls, reading position preservation during font changes, and reduced motion integration.
- Library favorites, local discovery recommendations, and download-state tracking with automatic reconciliation on startup/saved-books visit, failed/interrupted download recovery, and Dismiss/Retry UI.
- Home screen first-book activation (LIB-01): Continue Reading is the sole dominant action when reading position exists. When no position exists, presents one recommended starting book ("Start Reading") and one "Explore Library" action, with optional calibration prompts delayed until after first reading value.
- Premium Entitlement & Feature Gate Audit completed across all 8 gates (`unlimited_learning`, `advanced_quiz`, `context_translation`, `reading_insights`, `cloud_sync`, `full_ambience`, `premium_quote_cards`, `ai_companion`):
  - `src/app/paywall.tsx`: Contextual feature details mapped to `feature` and `trigger` route params, prominent "ALWAYS FREE IN LAMPLIGHT" disclosure (core reading, offline downloads, EPUB import, bookmarks, notes, 30 words / 15 quotes remain free forever), auto-renewal terms under CTA, and scroll container.
  - `src/app/reader/[bookId].tsx`: 30-word and 15-quote limits now offer direct "View Premium" CTAs to `/paywall?feature=unlimited_learning`.
  - `src/features/ambience/AmbiencePicker.tsx` & `tracks.ts`: `rain-path` and `misty-rain` marked `isPremium: true` and gated on `canUse('full_ambience')` with paywall routing.
  - `src/features/reader/components/ShareCardScreen.tsx` & `quoteTemplates.ts`: Handcrafted templates segregated; export gated on `canUse('premium_quote_cards')` with unlock CTA.
  - `src/features/reader/components/WordTranslationPopup.tsx`: Daily 50-translation cap routes with `feature=unlimited_learning&trigger=daily_translation_cap`.
  - `src/app/(tabs)/vocabulary.tsx`: Weekly quiz sample limit routes with `feature=advanced_quiz&trigger=advanced_quiz_sample_used`.
  - `src/components/ReadingCadenceModal.tsx`: Adaptive Anti-Guilt pacing routes with `feature=reading_insights&trigger=adaptive_pacing`.
- Unified Account-Entry & Protection Flows (AUTH-02 / FULLAPP.md §6.3):
  - `src/app/signup.tsx`: Supports `mode === 'protect'` parameter with dedicated title ("Protect Your Library") and reassuring copy explaining that reading progress is backed up without data loss.
  - Displays high-clarity merge preview card (`styles.mergePreviewCard`) in OTP step when guest reader has local reading data (positions, saved words, quotes, shelves) to confirm safe merging before OTP code entry.
  - After verification, refreshes entitlements (`refreshEntitlements('account_protect' | 'account_signup')`) and triggers forced immediate sync.
  - `src/app/login.tsx`: Displays local reading merge preview card before OTP confirmation, calls `refreshEntitlements('account_login')`, and forces sync.
  - `src/app/profile.tsx`:
    - Guest readers: prominent "Protect Library" action routing to `/signup?mode=protect` (primary guest-upgrade flow) and "Sign in" routing to `/login` for existing accounts.
    - Protected readers: "Sign Out" row in Data & Account Privacy prompting whether to keep local downloaded books/history or clear device data, invoking `signOutUser(keepLocalData)`, resetting entitlements via `resetEntitlementsToFree()`, and re-initializing a fresh anonymous guest session.
  - Unit tests in `tests/authUnify.test.ts` (151/151 tests passing across test suite).
- Account-Session Coordinator & Sync Identity Transitions (AUTH-03 / FULLAPP.md §6.4):
  - Centralized coordinator `src/features/account/accountSessionCoordinator.ts` executing auth identity transitions in strict order per FULLAPP §6.4 item 2: RevenueCat identity -> reset sync cursors -> pending outbox ownership -> refresh entitlements -> forced immediate sync -> telemetry event.
  - Outbox ownership preservation: preserves pending local mutations during guest account protection or cloud merges (`preserveOutbox: true`), while purging stale unmerged outbox mutations on clean logins (`preserveOutbox: false`) to guarantee no mutation is ever uploaded under the wrong owner ID.
  - Graceful sync abortion: `pauseOrFinishSync` in `src/features/sync/syncWorker.ts` cleanly pauses running sync loops and clears pending debounced timers before identity teardowns.
  - Clean sign-out coordination: `coordinateSignOut` pauses sync, clears account-bound cursors, executes session cleanup / optional table wipe, re-initializes anonymous session, configures matching RevenueCat anonymous identity, resets entitlements to free, and logs `account_signed_out`.
  - Cold-start merge journal recovery: `reconcilePendingMergeJournals` integrated into `src/app/_layout.tsx` launch hydration, detecting incomplete journals surviving app termination and marking them failed with telemetry (`recovered_incomplete_journal_after_restart`) so readers never get stuck.
  - Telemetry without email leaks: records `account_protected`, `account_login_completed`, `account_merge_completed`, `account_merge_failed`, and `account_signed_out` strictly omitting email addresses.
  - Unit tests in `tests/accountSessionCoordinator.test.ts` (155/155 tests passing across test suite).
- AI Reading Companion (COMPANION-01 / FULLAPP.md §16):
  - Protected Supabase Edge Function actions in `supabase/functions/literary-ai/index.ts`: `companion_explain`, `companion_simplify`, `companion_summary`, `companion_recap_characters`, `companion_reflective_questions`, and `companion_report_feedback`.
  - Server-side security and entitlement enforcement: requests checked against `is_premium_user(user.id)` and `ai_companion` entitlement; non-entitled requests rejected with 403 `requiresPremium: true`.
  - Rate limiting and usage quota accounting: `companion_usage` table with atomic RPC `increment_companion_usage`, enforcing a 60 request/day quota for Premium subscribers.
  - Cost control and caching: `companion_cache` table caching stable responses by deterministic SHA-256 hash (`action:excerpt_hash:lang:model_version`), eliminating redundant Groq token spend.
  - Telemetry: `companion_request_logs` recording action, token estimate, book ID, and success status without logging copyrighted literary excerpts.
  - User feedback & spoiler reporting: `companion_feedback` table allowing readers to report incorrect answers, hallucinations, or spoiler leaks (`reportCompanionFeedback`).
  - Strict spoiler prevention: prompt framing strictly bounding context to chapters <= current reading position. `extractPriorText` programmatically isolates preceding chapter text, strictly omitting subsequent chapters.
  - Human-readable scope labeling: `computeScopeLabel` displaying clear scope banner (`Scope: Chapter 3: The Gathering Storm (Page 5 of 24) · Spoiler-Safe Scope`).
  - Client service `src/features/companion/readingCompanionService.ts` providing pure text bounding, prior chapter extraction, and error-resilient API integration.
  - Modern bottom-sheet UI `src/features/companion/ReadingCompanionModal.tsx` matching Lamplight's design system: Day/Lamp theme support, Lora reading typography floor (17px, 1.85 line-height), tabbed navigation (Passage / Allusions / Simplify for text selections; Summary / Characters / Reflections for chapters), and upgrade CTA for Free tier readers.
  - Integrated into Reader (`src/app/reader/[bookId].tsx`): accessible from the selection action bar ("Ask AI") and the vertical tools menu ("Reading Companion").
  - 7 comprehensive unit tests in `tests/readingCompanion.test.ts` verifying scope labeling, excerpt bounding, and strict spoiler isolation.
- Test runner foundation: Native `node:test` + `tsx` test suite (`npm test`) with 147 unit tests across typography bounds, anti-tamper cryptography, text ingestion, notes export, entitlement gates, weekly reading digest, vocabulary mastery clarity, milestone celebrations, gentle lapse recovery, custom vocabulary decks, calendar reading heatmap, context-aware translation, offline analytics queue, remote feature flags, scripture mood/inquiry separation, full sync outbox coverage, local recommendations, library favorites, advanced quiz entitlement gates, multi-script quote cards, EPUB cloud backup, and AI reading companion with zero new dependencies.
- Premium Quote Cards (SHARE-01 / FULLAPP.md §14.2):
  - Multi-script typography and script detection engine in `src/features/reader/components/quoteTemplates.ts` supporting Bengali (Atma), Arabic (Amiri + RTL), Devanagari (Kalam), Japanese (system CJK sans), Korean (system CJK sans), and Latin (Lora serif) with exact line-height multipliers.
  - Long quote handling: automatic detection of quotes > 340 chars and excessive passages > 550 chars, dynamic font sizing, compact line-height adjustments, and alternate "Condensed layout" mode supporting up to 16 lines without text truncation.
  - Interactive length notice badge and explanation modal on `ShareCardScreen.tsx` guiding users on optimal excerpt lengths.
  - High-definition export: `getQuoteCardExportResolution` scaling to 1080p full HD for users with `canUse('premium_quote_cards')` while maintaining exact preview aspect ratio, standard 720p resolution for free users.
  - Deep-link metadata: `buildQuoteCardDeepLink` generating `lamplight://book/[bookId]` attached to card citations and share dialogs.
  - Custom preset persistence: last-used template saved and restored via SQLite `app_settings.preferred_quote_template`.
  - Comprehensive unit test coverage in `tests/quoteCardShare.test.ts`.
- Imported EPUB Cloud Backup & Restore Reconciliation (SYNC-02 & SYNC-03 / FULLAPP.md §15.4 & §15.5):
  - Supabase Storage migration `supabase/migrations/20260925_user_epub_backup.sql` provisioning private `user_epubs` bucket with 25MB individual file limits and strict owner RLS policies (`auth.uid()::text = (storage.foldername(name))[1]`).
  - Pure backup engine `src/features/sync/epubBackupService.ts`: SHA-256 checksum computation via Web Crypto `crypto.subtle.digest`, quota validator capping file size at 25MB and account storage at 250MB (guaranteeing quota failures never damage local reading), and checksum integrity verification.
  - Conflict resolution engine implementing FULLAPP §15.3: furthest progress wins by chapter/page, newest location breaks ties, preventing newer local reading positions from being overwritten by older cloud records.
  - Integrated into `src/features/content-ingestion/epubImporter.ts` (asynchronous background backup upon import for users with `canUse('cloud_sync')`) and `src/db/repositories/books.ts` (`deleteImportedBook` cleans up remote storage objects).
  - Comprehensive unit test coverage in `tests/epubBackupSync.test.ts`.
- Remote Feature Flags & App Configuration (REL-02 / FULLAPP.md §7.3):
  - Pure configuration engine `src/features/config/appConfigEngine.ts` defining typed feature flags (`premium_visibility_enabled`, `ai_companion_enabled`, `literary_ai_translation_enabled`, `voice_transcription_enabled`, `scripture_inquiry_enabled`, `mood_deck_entry_enabled`, `ambient_sounds_enabled`, `weekly_quiz_enabled`) with conservative offline defaults and malformed payload protection.
  - Client module `src/features/config/appConfig.ts` with local SQLite caching (`app_settings.remote_app_config_cache`), public Supabase `app_config` REST polling, and `useSyncExternalStore` reactive state hooks (`useAppConfig`, `useAppFlag`, `getAppFlag`).
  - App lifecycle integration in `src/app/_layout.tsx`: cold-start SQLite hydration and background remote refresh on launch and foregrounding.
  - Emergency kill-switch enforcement without overriding core reading:
    - `AmbiencePicker.tsx`: respects `ambient_sounds_enabled` kill switch with service maintenance notice.
    - `vocabulary.tsx`: respects `weekly_quiz_enabled` kill switch with maintenance alert.
    - `contextTranslation.ts`: respects `literary_ai_translation_enabled` kill switch with graceful literal translation fallback.
    - `voiceTranscriber.ts`: respects `voice_transcription_enabled` kill switch.
    - `paywall.tsx`: respects `premium_visibility_enabled` with calm store maintenance screen.
  - Unit test coverage in `tests/appConfig.test.ts`.
- Offline Analytics Event Queue (REL-03 / FULLAPP.md §7.4 & §18.2):
  - SQLite schema v24 migration creating `analytics_queue` with `id`, `event_type`, `payload_json`, `occurred_at`, `created_at`, `attempt_count`, `last_attempt_at`, and `last_error`.
  - Pure sanitization and retention engine `src/features/analytics/analyticsQueue.ts` strictly stripping sensitive properties (email, raw book text, note text, raw questions, transcripts, translation context) and redacting embedded email patterns from telemetry payloads.
  - Generates stable `event_id` attached to both queue item and payload for backend idempotency.
  - Bounded storage policy capping local queue to 1,000 events, 30 days retention cutoff, and 5 max retry attempts before pruning dead entries.
  - SQLite serialized repository `src/db/repositories/analyticsQueue.ts` with batch query, deletion, and retry accounting.
  - Non-blocking dispatcher in `src/features/analytics/analytics.ts` that immediately enqueues offline events to SQLite and debounces background flushes in 50-item batches to Supabase `/rest/v1/analytics_events`.
  - App lifecycle integration in `src/app/_layout.tsx` triggering automatic queue flushing on cold start and foreground activation.
  - Unit test coverage in `tests/analyticsQueue.test.ts`.
- Context-Aware Translation (LEARN-04 / FULLAPP.md §10.4):
  - Pure literary context extraction engine `src/features/translation/sentenceSplitter.ts` and `src/features/translation/contextTranslation.ts` supporting char-offset sentence localization and literary context boundaries.
  - Server-side literary translation enrichment in Supabase Edge Function `supabase/functions/literary-ai/index.ts` with `context_translate` action (part of speech, grammatical role, literary tone, nuanced context definition, literary example, synonyms/antonyms). Server-side gated on `isPremium`.
  - SQLite local caching in `persistent_translation_cache` to eliminate redundant AI calls.
  - Reader popup enrichment in `src/features/reader/components/WordTranslationPopup.tsx`: expandable literary context card with nuanced definition, role badge, and contextual examples.
  - Reader screen integration in `src/app/reader/[bookId].tsx` extracting sentence at tap offset and passing book metadata.
  - Unit test coverage in `tests/contextTranslation.test.ts`.
- Scripture Mood vs Comparative Inquiry Experience (SCRIPTURE-02 / FULLAPP.md §13.2):
  - Decoupled comparative scripture research inquiry from personal emotional comfort into dedicated routes: `/mood-verses/reflect` (emotional comfort with preset moments, free-text feeling composer, empathetic deck drawing, and Sacred Table link) and `/mood-verses/inquiry` (factual inquiry deck).
  - Restored Sacred Table 5-tradition deck route `/mood-verses/table` utilizing `ScriptureTableDeck`.
  - Registered route `/mood-verses/inquiry` in `src/app/_layout.tsx`.
  - Unit test coverage in `tests/scriptureMoodExperience.test.ts`.
- Complete Cloud Sync Entity Coverage (SYNC-01 / FULLAPP.md §15.2):
  - Added `bookmark`, `reader_note`, `reading_goal`, and `book_favorite` to `OutboxEntityType` union.
  - Wired `enqueueMutation` across 27 mutations in 8 repository files: `bookmarks.ts`, `readerNotes.ts`, `shelves.ts`, `readingSessions.ts`, `readingGoals.ts`, `books.ts`, `bible.ts`, and `quran.ts`.
  - Extended delete and upsert compaction logic in `syncOutbox.ts` and updated batch fetch ordering for deterministic dependency resolution.
- Local Recommendation Engine (LIB-04 / FULLAPP.md §9.4):
  - Pure scoring engine in `src/features/discovery/localRecommendations.ts` evaluating target reading language, finished/abandoned books, categories, authors read, session duration patterns, and shelf/favorite status.
  - Explainable deterministic output reasons: `Because you finished [Book Title]`, `A shorter read for tonight`, `Continue this author`, `Practice-friendly books at your level`.
  - Excludes unavailable, completed, and currently active reading books.
  - Dismiss support: 14-day dismissal cooldown stored in `app_settings`, close button on cards, and full telemetry logging (`recommendation_impression`, `recommendation_opened`, `recommendation_dismissed`).
  - Unit test coverage in `tests/localRecommendations.test.ts`.
- Favorites and Wishlist (LIB-02 / FULLAPP.md §9.2):
  - Dedicated Favorites shelf near the top of the Library (`src/app/(tabs)/library.tsx`), positioned prominently under Continue Reading and above the main catalog.
  - Interactive search result cards with immediate favorite toggle buttons (`BookmarkIcon`) with restrained haptic feedback.
  - Complete independence from download status: removing a book cache or download leaves its favorite intent completely intact.
  - Full cloud sync outbox integration: toggling favorite state enqueues `book_favorite` upsert/delete mutations.
  - Unit test coverage in `tests/libraryFavorites.test.ts`.
- Correct Premium Quiz Gates (LEARN-01 / FULLAPP.md §10.1):
  - Shared evaluation service `src/features/vocabulary/quizGateService.ts` checking `canUse('advanced_quiz')` prior to sample tracking.
  - Premium users receive unrestricted access to all advanced quiz modes (`fresh`, `synonyms`) and never consume or hit the free weekly sample key.
  - Free users receive one deterministic weekly sample stored under `vocabulary.advanced_quiz_sample.<ISO-week>`, persisting across restarts.
  - Structured gate results distinguishing `allowed` (with source `free_mode`, `premium`, or `weekly_sample`), `subscription_required` (with trigger and triggering quiz mode), `offline_unavailable` (cached challenges remain playable), and `service_disabled` (kill switch).
  - Wired into both Book Quiz flow (`startMode`) and Flashcard challenge deck (`startQuiz`) in `src/app/(tabs)/vocabulary.tsx`.
  - Telemetry payload includes triggering `quiz_mode` on `paywall_viewed`.
  - Unit test coverage in `tests/quizGate.test.ts`.
- Custom Vocabulary Study Decks (LEARN-03):
  - SQLite schema v23 migrations for `vocabulary_decks` and `vocabulary_deck_items` with remote Supabase migration and RLS policies.
  - Repository `src/db/repositories/vocabularyDecks.ts` with deck CRUD, safe name validation (50 chars max, trimmed), batch word assignment, and dynamic DB/outbox loading for headless Node tests.
  - Sync outbox extended with `vocabulary_deck` and `vocabulary_deck_item` entity types.
  - Deletion isolation: removing a deck preserves underlying words; deleting a saved word removes orphaned deck memberships.
  - UI components: `AddToDeckModal` with deck list selection, paywall lock indicators, and "+ New Deck" creation dialog.
  - WordDetailModal updated with "✦ Deck" action button.
  - Vocabulary Notebook (`src/app/(tabs)/vocabulary.tsx`) updated with horizontal Study Decks filter bar, multi-select mode (select all, batch add to deck), active deck banner with direct "Study Deck →" bypass (ignoring 5-word minimum), and deck deletion.
  - Premium gating: `canUse('unlimited_learning')` gates custom deck creation, cross-book deck review, and adding words to decks; basic per-book review remains 100% free.
  - Unit test coverage in `tests/vocabularyDecks.test.ts`.
- Gentle Lapse Recovery (RET-05):
  - Local absence detection engine in `src/features/retention/lapseRecovery.ts` for 3, 7, and 14+ days without a reading session.
  - Zero guilt, zero streak shame: completely eliminates anxiety-inducing vocabulary like 'lost', 'behind', 'broken', 'streak', or 'expire'.
  - Contextual return action prioritization: current book (verified against library to guarantee valid destination even if book was removed), due vocabulary review, or library exploration.
  - Homescreen return card `src/components/LapseReturnCard.tsx` with smooth entry/exit animations, calm messaging, direct return routing, and 24-hour dismissal cooldown.
  - Independent toggle "Gentle return prompts" in `src/app/(tabs)/settings.tsx` under Reading, allowing users to disable lapse recovery separately from goal reminders.
  - Telemetry: `lapse_recovery_displayed`, `lapse_recovery_opened`, `lapse_recovery_dismissed`, `lapse_recovery_preference_changed`.
  - Comprehensive unit test coverage in `tests/lapseRecovery.test.ts`.
- Milestones & Account Protection (RET-04):
  - Milestone engine in `src/features/milestones/milestoneService.ts` defining 6 required milestones (`first_saved_word`, `first_imported_book`, `first_completed_review`, `first_completed_book`, `seven_reading_days`, `first_thirty_reading_minutes`).
  - Idempotent SQLite persistence via `app_settings` (`milestone.<id>`), pure evaluator functions decoupled from native SQLite for test runner compatibility.
  - Quiet celebratory modal `src/components/MilestoneCelebrationModal.tsx` with restrained success haptics, celebratory medallion, and calm secondary account protection action (`/signup`) for guest users.
  - Readers are never interrupted mid-page: word saving and reading stats evaluate on natural boundaries (return to Homescreen, book completion, review completion, or book import).
  - Integration with `feedbackService.ts` for quiet positive milestone store rating triggers (respecting 60-day cooldown).
  - Unit test coverage in `tests/milestones.test.ts`.
- Calendar Reading Heatmap (INSIGHT-01 / FULLAPP.md §12.3 & §12.4):
  - Pure calculation engine `src/features/analytics/calendarHeatmap.ts` providing 52-week grid transformation, 5-level intensity mapping (0-4), local-calendar day boundary normalization, streak calculations (current and longest), and peak reading day detection.
  - Bounded SQLite range query `getSessionsInDateRange(startTimestamp, endTimestamp)` in `src/db/repositories/readingSessions.ts` for multi-year scalability without unlimited memory loading.
  - Interactive UI card `src/components/CalendarHeatmapCard.tsx` with horizontal week scrolling, weekday headers (M, W, F), month label alignment, day tap inspection with duration/pages/session count, Day/Lamp theme color ramps, and 5-stage intensity legend.
  - Premium gate: `canUse('reading_insights')` displays full annual heatmap; unentitled users see preview with unlock CTA to `/paywall?feature=reading_insights&trigger=calendar_heatmap`.
  - Comprehensive unit test coverage (6 tests) in `tests/calendarHeatmap.test.ts`. Total test suite at 64 passing tests.
- Weekly Reading Digest & Habit Insights (RET-03):
  - Pure computation engine `src/features/analytics/weeklyDigest.ts` calculating weekly reading time, active days, pages read, active book progress, words saved/reviewed, speed trend, vocabulary growth, completion forecast, peak window, and gentle adaptive goals without fabricating data.
  - Profile screen integration in `src/app/profile.tsx` with honest empty states, 4-metric summary grid, active book progress bar, premium habit insights gated by `canUse('reading_insights')`, and contextual paywall routing.
  - Comprehensive unit test coverage in `tests/weeklyDigest.test.ts`.
- Vocabulary Review History & Mastery Clarity (LEARN-02):
  - Derives transparent plain-language mastery states (`new`, `learning`, `reviewing`, `mastered`, `difficult`, `due`) without implying false scientific certainty.
  - Integrated `VocabularyGrowthChart` querying real `listSavedWordCountsByDay(30)` activity.
  - Book-aware mastery filter bar (`All`, `Due`, `Learning`, `Mastered`, `Difficult`, `New`) with real-time word counts.
  - `WordDetailModal` displaying full SRS metrics (repetitions, review intervals, recall lapses, ease factors, next due dates), literary context sentence with chapter/page citation, pronunciation audio, and direct "Read in Book" jumping.
  - Unit test coverage in `tests/mastery.test.ts`.
- Reader failure messaging and retry/recovery behavior; malformed cached content is cleaned up when detected.
- Profile empty-state statistics no longer invent reading activity.
- Voice transcription now calls a Supabase Edge Function instead of a provider directly from the client; authentication/validation protections and privacy disclosure are included in the current implementation.
- `expo-dev-client` is installed for the native development build workflow.

Important limitations: bookmarks, notes, favorites, and download state are local-only; download progress is coarse rather than byte-accurate and there is no full pause/cancel/queue manager. Do not describe these as complete sync or production-ready download features.

## External setup and build status

- An Android EAS development build was authorized by the user. Last reported build: [`80b5c3a0-3bdf-4487-a2a6-16a42ddbb17d`](https://expo.dev/accounts/sheikhhossainns-team/projects/lamplight/builds/80b5c3a0-3bdf-4487-a2a6-16a42ddbb17d), last known status `IN_QUEUE`.
- A later attempt to refresh the build status failed because the CLI could not reach Expo through the configured network proxy (`ECONNREFUSED 127.0.0.1:9`). Recheck the build when network access works; do not assume it completed or failed.
- RevenueCat Test Store SDK configuration is present locally. Real Apple/Google store credentials and products are intentionally out of scope until the user decides to pursue store distribution.
- Supabase deployment is still pending. The `transcribe-audio` function needs its provider API key set as a Supabase Edge Function secret, then deployed and tested with an authenticated session. Keep provider secrets server-side; remove any obsolete `EXPO_PUBLIC_*` provider key from local config if one remains, without printing it.
- The RevenueCat webhook needs a configured shared authorization secret and deployed function/migration before the backend entitlement mirror can be relied on. A RevenueCat secret API key is for server-side RevenueCat API operations only; never place it in the app or `.env.local` public Expo variables.

## Remaining work, in recommended order

### 1. Re-establish the baseline

1. Check `git status --short` and preserve the current user working tree.
2. Run `npm test` and `npx tsc --noEmit` after any code changes; all passed (20 tests passed, zero TS errors).
3. Check the EAS build page/CLI and record whether the Android development build is ready. If ready, install/open it on the user's phone and validate the app flows there.

### 2. Finish security and reliability foundations (P0)

1. Deploy and validate the Supabase `transcribe-audio` function after the user configures provider secrets in Supabase. Verify authenticated success, invalid/oversized audio failures, and that the built client contains no provider secret.
2. Secure Supabase session tokens with OS-backed storage. Current auth is implemented (anonymous session, email OTP/linking, restore/refresh, profile/sign-out/delete flows), but token persistence is not yet OS-secure. `FULLAPP.md` calls for a secure-storage dependency such as `expo-secure-store`; repository rules require asking before adding dependencies. Obtain that approval before implementation and expect a new native development build afterward.
3. Test suite established (`npm test`). Continue expanding unit and repository tests for critical billing and reading cadence math.
4. Audit the single entitlement policy and all Premium gates against `FULLAPP.md`; client RevenueCat state is for immediate UI, not authority for server-protected operations.
5. Verify there are no forced onboarding/development guides and no fabricated empty-state stats (the profile stats fix is already in the working tree).

### 3. Complete the free reader and library core (P1)

1. Validate TOC, bookmarks, notes, search, favorites, and reader recovery on-device; fix concrete bugs before adding more surface area.
2. Typography, accessibility preferences, search highlighting, and Unicode matching completed and verified.
3. Notes integration into notebook completed with book grouping, deep linking, deletion, and Markdown/JSON export.
4. Download reconciliation completed: records synced with disk on startup and in storage manager, with Dismiss and Retry actions.
5. First-book activation completed (LIB-01): Home prioritizes Continue Reading when an active position exists, and presents one clear recommended starter + Explore Library when no position exists.

### 4. Finish billing backend readiness (P1, still test-only)

1. Review the existing RevenueCat migration/webhook against the project's current Supabase schema before applying it.
2. Configure the webhook authorization secret in RevenueCat and Supabase, deploy the migration and webhook, and verify idempotent sandbox/Test Store events.
3. Test purchase, cancellation/expiration, restore, sign-out/sign-in identity changes, and no-offering/error states using the Android development build and RevenueCat Test Store.
4. Ensure every advertised Premium capability has a real implementation and a consistent entitlement gate. Do not claim the server mirror is authoritative until deployment and end-to-end verification pass.

### 5. Retention and learning work (P2)

- Gentle lapse recovery (RET-05) completed with local absence detection (3, 7, 14 days), calm anti-guilt copy, valid destination fallback, Homescreen return card, and independent settings toggle. Remaining retention work: consent-based reading cadence notifications and SRS reminders.
- Milestones & account protection (RET-04) completed with 6 idempotent milestones, quiet celebrations, restrained haptics, and non-interruptive guest account protection.
- Weekly reading digest (RET-03) completed with SQLite sessions, active book progress, and premium habit insights.
- Custom decks (LEARN-03) completed with SQLite persistence, outbox sync, batch assignment, and paywalled deck review. Remaining learning work: context-aware translation (LEARN-04), and offline dictionary packs (LEARN-05).
- Defer costly/safety-sensitive AI companion work and public reviews until the foundations, quotas, moderation, and product decisions are ready.

## Suggested next session opening

Start by checking the build status and running the TypeScript check against the existing working tree. Then choose the next independently actionable P0 item: validate/deploy transcription if Supabase secrets are available, or continue an unblocked local reader task. Pause before adding a native dependency or changing native config and get the user's approval. Keep all implementation local; no store publishing or Git push is requested.

## Source documents

- [`FULLAPP.md`](FULLAPP.md): detailed feature inventory, implementation contracts, priorities, and acceptance criteria.
- [`ROADMAP.md`](ROADMAP.md): product phases and free-tier boundaries.
- [`docs/deployment.md`](docs/deployment.md): EAS/OTA constraints; read before any EAS build/update/release command.
- [`docs/revenuecat-research.md`](docs/revenuecat-research.md): RevenueCat integration research.
