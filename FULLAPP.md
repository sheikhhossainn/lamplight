# Lamplight Full-App Product and Implementation Plan

Status: implementation roadmap and product specification  
Repository: React Native + Expo SDK 57, Expo Router, TypeScript, expo-sqlite, Supabase  
Audience: engineers and coding agents implementing Lamplight in small, reviewable changes

## 1. Purpose and authority

This document describes:

- What Lamplight currently implements.
- Which current features are complete, partial, dormant, or infrastructure-only.
- The target product experience.
- The required security, authentication, synchronization, and reliability work.
- The implementation plan for reader, library, vocabulary, scripture, retention, analytics, and Premium features.
- The RevenueCat subscription architecture and release process.
- Completion criteria that must be satisfied before a feature is considered shipped.

This document does not override `AGENTS.md`, the design tokens, database-serialization rules, or deployment procedures. Every implementation must continue to obey the following repository rules:

1. Make the smallest change that completes the selected work item.
2. Reuse existing components and repositories before creating new ones.
3. Route every SQLite operation through `src/db/client.ts` and the serialized database API.
4. Request approval before adding a dependency or changing native configuration.
5. Do not run EAS build/update work without first reading `docs/deployment.md`.
6. Preserve the locked brand colors and the reading-body minimums defined by the design system.
7. Run `npx tsc --noEmit` after every implementation work item.
8. For visual or interactive work, verify Day and Lamp modes on a physical Android device and, when available, an iOS device.

## 2. How an implementation agent must use this document

Implement one work item at a time. Do not combine unrelated phases into one change.

For each work item:

1. Read its **Current state**, **Target behavior**, **Implementation**, **Telemetry**, **Tests**, and **Completion criteria** sections.
2. Read only the referenced source files and the applicable repository docs.
3. Confirm whether the work requires a new dependency, native configuration, Supabase migration, secret, or external dashboard action.
4. If it does, obtain the required approval before editing those areas.
5. Implement the smallest vertical slice that satisfies every completion criterion.
6. Add or update tests in the same work item.
7. Run TypeScript validation and the relevant focused tests.
8. Ask for on-device observations when the change is visual or interactive.
9. Stop after the selected work item is complete.

A work item is complete only when all of its completion criteria are demonstrably satisfied. A screen that renders without its backend, recovery states, telemetry, or tests is not complete.

## 3. Product definition

Lamplight is a private, candlelit reading sanctuary that helps readers understand and remember books and sacred texts. Its core loop is:

> Find a book → read → understand something → save it → review it later → return to the book.

The product must optimize this loop before expanding into additional content verticals.

### 3.1 Product principles

- Reading remains unrestricted. EPUB import, core reading, offline downloads, essential accessibility, and data export are never Premium gates.
- Premium improves understanding, memory, insight, atmosphere, and cross-device continuity.
- The visual identity remains tactile, warm, literary, restrained, and culturally aware.
- Retention comes from ownership and progress, not aggressive gamification.
- Notifications use calm, user-controlled language and respect quiet hours.
- AI output is server-mediated, rate-limited, attributable, and visibly distinct from primary-source text.
- Scripture answers prioritize verified citations and do not present AI-generated theological verdicts.
- Private reading is the default. Public social systems require an explicit product decision and moderation plan.

### 3.2 North-star metric

The primary product metric is:

> Weekly retained readers with at least two reading days and at least one memory action: a saved word, saved quote, saved verse, completed review, or completed quiz.

Supporting metrics are defined in Section 18.

## 4. Current feature inventory

This inventory reflects the current source code. It distinguishes wired features from dormant or incomplete infrastructure.

### 4.1 Onboarding and personalization

Implemented:

- Multi-step onboarding.
- Mother tongue selection: Bengali, Japanese, Korean, Arabic, and English/Other.
- Target reading language selection: English, Bengali, Japanese, and Korean.
- Independent translation target language with a broad language list.
- Literary theme selection.
- Vocabulary calibration and recommended starting book.
- A skip path for calibration and onboarding.
- Day and Lamp appearance modes.
- Cultural themes for Lamplight/classic, Bengali, Korean, Arabic, Japanese, and Western reading atmospheres.
- Manuscript, Classic Print, and Modern Clean page styles.
- Page-turn sound preference.
- Theme transitions and haptic feedback.

Polish gaps:

- Too many choices appear before the reader experiences the core reading loop.
- Calibration is valuable but should not delay first-page activation.
- Font size and line spacing are fixed rather than user-adjustable.
- Development guide flags force repeated guides in development, which weakens realistic usability testing.

### 4.2 Library and books

Implemented:

- English classics/Gutenberg content.
- Bengali literature content.
- Japanese Aozora Bunko content.
- Korean Gongu content.
- EPUB import from device.
- Local offline book downloads.
- Saved-books management.
- Search by title and author.
- Category and language filtering.
- Custom shelf creation, editing, renaming, deletion, and membership management.
- Add-to-shelf controls on book detail screens.
- Book detail pages with cover/spine presentation, synopsis, reading progress, chapter metadata, download state, saved vocabulary, quote count, and reading cadence.
- Storage usage reporting and rebuildable-cache cleanup.
- Background catalog synchronization.

Missing or partial:

- Favorites/wishlist distinct from downloads and shelves.
- Download queue, progress, pause, retry, and Wi-Fi-only controls.
- Personalized recommendation shelves.
- Rich edition metadata and reading-time estimates.
- User-imported EPUB file backup across devices.
- Complete shelf-membership synchronization.

### 4.3 Prose reader

Implemented:

- Device-aware, font-metric pagination.
- Animated page-turn treatment.
- Persisted reading position and exact resume behavior.
- Day and Lamp reading modes.
- Offline reading after download.
- Long-press word action menu.
- Word translation with a free daily cap.
- Full-page sentence translation.
- Pronunciation playback.
- Translation copying.
- Vocabulary saving with context and source position.
- Offline pending-lookup queue.
- Multi-page quote selection.
- Highlight persistence and quote-card sharing.
- Saved-word markers in reader text.
- Ambient sound playback.
- Page-turn sound and haptics.
- Reading-session tracking and milestone feedback prompts.

Missing or partial:

- Table of contents and chapter jump.
- A bookmark model independent of highlights.
- Private notes and annotations.
- In-book text search.
- Adjustable font size and line spacing.
- Full accessibility validation.
- Download progress and recoverable parsing failures.
- Consistent cross-device synchronization for imported content.

### 4.4 Vocabulary and learning

Implemented:

- Vocabulary notebook grouped by book.
- Saved quote and saved scripture verse tabs.
- Deep links from saved items back to their source.
- SRS flashcards with Again, Hard, Good, and Easy ratings.
- Due-today and mastered-word metrics.
- Daily review checkpoint persistence.
- Difficult-word retry flow.
- Book-scoped fill-in-the-blank quizzes.
- Original-context, fresh-sentence, and synonym/antonym quiz modes.
- AI-generated usage notes, synonyms, and antonyms.
- Pronunciation from vocabulary cards.
- Daily review prompt from the Library.
- Vocabulary calibration and starting-book recommendation.

Missing or partial:

- Advanced quiz modes now consult the central entitlement service; RevenueCat-backed purchase state and comprehensive entitlement tests are still pending.
- Review history and mastery explanations are not exposed clearly.
- Vocabulary growth chart code exists but is not connected to a visible screen.
- Custom decks and study filters are absent.
- Offline dictionary/language packs are absent.
- The AI-derived learning features need clearer entitlement and failure behavior.

### 4.5 Scriptures and comparative inquiry

Implemented:

- Quran reader with Arabic, English, transliteration, Al-Jalalayn tafsir, recitation, progress, translation, saved words, highlights, and sharing.
- Bible Old Testament reader with World English Bible text and JFB commentary.
- Bible New Testament reader with the same core reading tools.
- Torah entry backed by Genesis through Deuteronomy.
- Rigveda reader with ten Mandalas and 1,028 hymns.
- Verse-level progress, translation, saved words, highlights, and sharing.
- Comparative scripture inquiry with typed or spoken questions.
- Suggested topics, critical topics, recent inquiries, and local cache.
- AI citation candidates verified against bundled scripture data before display.
- Deep linking from inquiry results to exact verses.

Missing or partial:

- Mood-to-verse semantic search components and the Edge Function exist, but the visible Home and Library entry points now open comparative inquiry.
- The offline card-table experience is routable but not discoverable.
- Bible audio components exist but are not wired into the current Bible screens.
- Scripture positions, highlights, and saved words are not comprehensively included in cloud sync.
- Voice transcription currently relies on client-exposed public API-key environment variables and must move server-side.

### 4.6 Accounts, data, platform, and feedback

Implemented:

- Local-first SQLite storage.
- Serialized database access.
- Automatic anonymous Supabase authentication.
- Passwordless email OTP login and signup.
- Guest account protection through email linking.
- Existing-account merge with a merge journal and conflict rules.
- Profile editing, sign out, and account deletion.
- Local/cloud synchronization for several core entities.
- Profile reading statistics and seven-day activity rhythm.
- OTA update detection and installation prompt.
- What's New overlay.
- Data export.
- Privacy and terms screens.
- In-app star rating and structured feedback.
- Offline feedback outbox.
- Promo-code redemption.
- Server entitlement snapshots, offline grace handling, and clock-tamper checks.

Missing or partial:

- Authentication tokens are stored in ordinary SQLite settings rather than OS secure storage.
- RevenueCat client, paywall purchase/restore UI, and subscription-management entry point are implemented; store keys, catalog configuration, server deployment, and physical-device verification remain.
- The paywall contains claims that are not currently fulfilled.
- Premium feature flags are defined but only partially enforced.
- Remote app configuration exists in Supabase schema but has no app client.
- Analytics events are discarded while offline.
- There is no automated test suite.

### 4.7 Home, settings, support, and lifecycle

Implemented:

- Time-aware Home greetings and culturally themed presentation.
- A three-door starter-book choice for gentle, balanced, or deep reading.
- Language-aware starter recommendations.
- Currently Reading and exact Continue Reading entry points.
- Ability to hide a book from Currently Reading without deleting it.
- Reading-cadence goal setup and pacing display.
- Daily Literary Spark content.
- Home and reader guides.
- Settings for Day/Lamp mode, literary theme, page-turn sound, mother tongue, and translation pair.
- Saved-book storage reporting and temporary translation/cover cache clearing.
- Guest, protected-account, and entitlement status presentation.
- Manual cloud backup, restore, and sync status for protected accounts.
- Copyable support ID.
- JSON reading-data export.
- Promo-code redemption.
- Profile editing and reading-statistics entry.
- Sign out and account deletion paths.
- Structured support and feedback entry.
- App version and OTA update status with restart-to-install behavior.
- Terms, privacy, and regional privacy disclosures.

Missing or partial:

- Cadence goals do not schedule real notifications.
- Home and reader guides can be forced repeatedly by development flags.
- The empty profile-statistics state uses invented sample values.
- RevenueCat controls are present, but remain unavailable until a platform SDK key and current offering are configured.
- Storage management has no download queue or per-book failure recovery.
- Update, feedback, sync, and entitlement failures need one consistent recoverable status language.

## 5. Current-state classification

| Area | Status | Required decision |
|---|---|---|
| Core prose reading | Shipped, needs polish | Improve navigation, accessibility, and recovery without redesigning it |
| EPUB import/offline reading | Shipped | Keep free permanently |
| Vocabulary and basic SRS | Shipped | Keep a useful free experience |
| Advanced quizzes | Partial Premium sample | Correct entitlement behavior and expose limits clearly |
| Scripture readers | Shipped, uneven feature parity | Decide which audio and sync features each tradition supports |
| Comparative scripture inquiry | Shipped, AI-assisted | Harden server security, attribution, rate limits, and feedback |
| Mood-to-verse flow | Dormant | Either restore a clear entry point or remove its release claims |
| Reading cadence | UI/data only | Add real local notification scheduling |
| Cloud sync | Partial | Complete entity coverage and define free backup versus Premium multi-device sync |
| Authentication | Implemented | Secure token storage and complete end-to-end testing |
| Entitlements/promos | Infrastructure implemented; RevenueCat bridge added | Make the server webhook and store state authoritative |
| Billing | Client foundation implemented | Configure products, keys, webhook secrets, and store sandbox verification |
| Remote feature flags | Schema only | Add a cached app-config client |
| Public book reviews | Not implemented | Keep private unless moderation and community scope are approved |

## 6. Authentication and account continuity

### 6.1 Current state

Authentication is implemented through plain Supabase Auth REST calls in `src/lib/supabaseAuth.ts`. Root startup calls `getSession()`, which restores, refreshes, or creates an anonymous session. The app also supports email OTP, anonymous-to-email linking, existing-account merge, profile management, sign out, and deletion.

### 6.2 Target behavior

- Every install receives a stable anonymous Supabase user without blocking onboarding.
- A reader can protect the current library with email without losing the anonymous user ID.
- A reader can sign into an existing account and merge local data predictably.
- Authentication continues to work offline using the last valid local session where possible.
- Credentials are stored using OS-backed secure storage.
- Sign out cleanly separates the old account, RevenueCat identity, sync state, and new guest identity.
- Account deletion removes cloud data, local tokens, RevenueCat association on the device, and optional local reading data.

### 6.3 Implementation plan

#### AUTH-01: Move credentials to secure storage

Requires approval for a new dependency such as `expo-secure-store`.

Implementation:

1. Add a small credential-store module under `src/features/account/` or `src/lib/`.
2. Store access token, refresh token, user ID, email, anonymous flag, and expiration in secure storage.
3. Keep non-sensitive display preferences in `app_settings`.
4. On first launch after the change, migrate existing values from `app_settings` into secure storage.
5. Delete the migrated sensitive SQLite values only after all secure writes succeed.
6. Make migration idempotent and safe when interrupted.
7. Update `supabaseAuth.ts` to depend on the credential-store interface rather than `appSettings` directly.

Tests:

- Fresh anonymous session.
- Migration from existing SQLite credentials.
- Interrupted migration.
- Expired access token with valid refresh token.
- Invalid refresh token.
- Secure storage unavailable or temporarily failing.

Completion criteria:

- No access or refresh token is written to `app_settings`.
- Existing users retain their user ID after upgrade.
- Failed migration leaves the old usable session intact.
- TypeScript and focused auth tests pass.

#### AUTH-02: Unify account-entry flows

Implementation:

1. Treat Account Protection as the primary guest-upgrade flow.
2. Use Login only for an existing protected account.
3. Use Signup only when product copy genuinely needs a separate entry; otherwise route both entry points through one passwordless email flow.
4. Before switching to an existing account, create a local snapshot and merge journal.
5. Show the merge summary before confirmation: books, words, quotes, shelves, and reviews that will be combined.
6. After verification, refresh entitlements and trigger a forced sync.
7. Surface recoverable failure states instead of leaving the reader between identities.

Completion criteria:

- Guest upgrade preserves the current library and, where Supabase permits, the same auth user ID.
- Existing-account login completes or rolls back as one recoverable operation.
- Duplicate books, saved words, highlights, and shelves follow documented conflict rules.
- Account UI always reports the correct guest/protected/Premium state.

#### AUTH-03: Complete sync identity transitions

Implementation:

1. Add one account-session coordinator responsible for auth transition side effects.
2. When the Supabase user ID changes, update RevenueCat identity, sync cursors, pending outbox ownership, and entitlement state in that order.
3. Preserve pending local mutations during an account merge.
4. On sign out, finish or pause the current sync, clear account-bound cursors, create the new anonymous Supabase session, and initialize a matching RevenueCat identity.
5. Record `account_protected`, `account_login_completed`, `account_merge_completed`, `account_merge_failed`, and `account_signed_out` events without logging email addresses.

Completion criteria:

- No mutation is uploaded under the wrong owner ID.
- A sign-out/sign-in cycle cannot show the previous user's entitlement or sync status.
- Account transitions survive app termination and resume from the merge journal.

## 7. Security and reliability foundation

### 7.1 SEC-01: Move voice transcription server-side

Current risk: `src/features/scripture-verses/voiceTranscriber.ts` reads `EXPO_PUBLIC_GROQ_API_KEY` or `EXPO_PUBLIC_OPENAI_API_KEY`. Expo public environment values are embedded in the client and cannot protect provider secrets.

Implementation:

1. Add a Supabase Edge Function dedicated to transcription.
2. Require a valid Supabase bearer token.
3. Apply per-user and per-device rate limits.
4. Validate MIME type, duration, and upload size.
5. Store no audio after the request completes unless an explicit privacy policy is approved.
6. Keep Groq/OpenAI keys only in Edge Function secrets.
7. Return normalized text and a structured error code.
8. Update the app to upload audio to the Edge Function instead of the provider.
9. Remove all client references to provider API keys.

Completion criteria:

- The built app contains no Groq or OpenAI secret.
- Oversized, unsupported, unauthenticated, and rate-limited requests fail safely.
- Temporary audio is deleted after processing.
- Privacy copy discloses that spoken queries are transmitted for transcription.

### 7.2 REL-01: Establish test infrastructure

Adding a test runner or device-test dependency requires approval.

Required test layers:

- Pure TypeScript tests for pagination helpers, SRS scheduling, entitlement evaluation, cap policy, recommendation scoring, and conflict rules.
- SQLite repository integration tests for migrations and CRUD behavior.
- Supabase SQL tests or scripted verification for RLS, RPCs, webhook idempotency, and ownership.
- Component tests for paywall, account protection, review cards, and offline/error states.
- Device smoke tests for the complete activation and purchase journeys.

The minimum smoke journey is:

1. Fresh install.
2. Complete or skip onboarding.
3. Open/download/import a book.
4. Read and persist progress.
5. Translate and save a word.
6. Save and share a quote.
7. Complete a review and quiz.
8. Protect the account.
9. Trigger sync.
10. Reinstall or use another device and restore supported data.
11. Purchase and restore Premium in sandbox.

Completion criteria:

- Database migrations run against an empty database and the oldest supported database fixture.
- Critical auth, entitlement, sync, and purchase cases have automated coverage.
- A release checklist records results for Android and iOS.

### 7.3 REL-02: Add remote feature flags

Implementation:

1. Add an `appConfig` client that reads public `app_config` values from Supabase.
2. Persist the last known configuration in SQLite.
3. Define typed keys for only the flags the app consumes.
4. Apply conservative defaults when offline or malformed.
5. Initial flags should cover Premium visibility, AI companion visibility, scripture inquiry availability, mood-deck entry point, and emergency provider kill switches.
6. Never use remote flags to bypass entitlement checks.

Completion criteria:

- Every flag has a typed default.
- The app starts offline using cached/default configuration.
- A malformed remote value cannot crash navigation.
- Kill switches can disable paid network features without disabling core reading.

### 7.4 REL-03: Queue analytics offline

Implementation:

1. Add a local analytics outbox using the existing sync-outbox pattern or a dedicated serialized repository.
2. Generate a stable event ID for idempotency.
3. Record timestamps locally and upload them without rewriting event time.
4. Batch uploads and cap retained events to a documented size.
5. Exclude email, raw book text, raw questions, translation content, and note content from analytics payloads.

Completion criteria:

- Airplane-mode events upload after connectivity returns.
- Duplicate retries do not create duplicate remote events.
- The queue has an explicit retention and size policy.

## 8. Core reader implementation plan

### 8.1 READER-01: Table of contents and chapter navigation

Current state: parsed prose books already expose chapters, and pagination records chapter indexes, but the reader has no visible table of contents.

Target behavior:

- The reader menu contains a Contents action.
- A sheet lists every parsed chapter title.
- The current chapter is identified.
- Selecting a chapter closes the sheet, jumps to its first page, saves the new position, and announces the destination for screen readers.

Implementation:

1. Reuse the `IngestedBook.chapters` structure loaded by the reader.
2. Build a chapter-index-to-first-global-page-index map after pagination.
3. Add a `TableOfContentsSheet` under `src/features/reader/components/` only if no current modal can host the list cleanly.
4. Use theme tokens, existing modal patterns, safe-area padding, and minimum touch targets.
5. For books with missing chapter titles, display `Chapter N` rather than an empty row.
6. Disable the action while pagination is incomplete.
7. Persist the new position through the existing reading-position repository.

Telemetry:

- `reader_contents_opened`
- `reader_chapter_jumped` with book ID, source chapter index, and destination chapter index

Tests:

- One-chapter book.
- Book with missing titles.
- Very long table of contents.
- Jump after changing page style.
- Restored position after app restart.

Completion criteria:

- Every parsed chapter is reachable.
- The selected chapter opens at its first page.
- No raw SQLite call is introduced.
- Day, Lamp, small screen, and large-text layouts are usable.

### 8.2 READER-02: Real bookmarks

Current state: highlights and quotes can mark text, but there is no lightweight page bookmark.

Data model:

- Local `bookmarks` table: `id`, `book_id`, `chapter_index`, `page_index`, optional `label`, `created_at`, `updated_at`, and optional `deleted_at` for sync tombstones.
- Remote `bookmarks` table with `owner_id`, `library_item_id`, matching position fields, timestamps, and RLS.

Implementation:

1. Add a versioned SQLite migration.
2. Add `src/db/repositories/bookmarks.ts` with list, create, rename, and delete operations.
3. Enqueue sync mutations from the repository.
4. Add a bookmark toggle to the reader chrome.
5. Add a Bookmarks section to the book detail screen or vocabulary notebook.
6. Deep link each bookmark to its exact page.
7. Preserve bookmarks when a downloaded catalog file is removed.
8. Delete bookmarks only when the user explicitly deletes them or deletes local personal data.

Completion criteria:

- Bookmarking requires one tap and does not create a quote.
- Duplicate bookmarks at one location are prevented.
- Bookmarks survive download removal, restart, sync, and account merge.

### 8.3 READER-03: Private notes and annotations

Target behavior:

- A reader can attach a private note to a selected quote or current position.
- Notes appear in a Notes notebook grouped by book.
- Selecting a note returns to its source.
- Notes remain private and are not included in analytics payloads.

Data model:

- Local `reading_notes`: `id`, `book_id`, `chapter_index`, `page_index`, optional paragraph/range fields, `quoted_text`, `note_text`, `created_at`, `updated_at`, and `deleted_at`.
- Remote table mirrors the durable fields and uses owner-scoped RLS.

Implementation:

1. Add migrations and a serialized repository.
2. Extend the existing selection action flow with `Add note`.
3. Reuse the quote-selection range rather than adding a second selection engine.
4. Use a dedicated editor modal with explicit Save and Cancel actions.
5. Add a Notes tab only after the repository and reader flow are complete.
6. Add export support in Markdown and JSON.
7. Enforce a reasonable per-note length locally and remotely.

Completion criteria:

- Notes can be created, edited, deleted, exported, synced, and reopened at source.
- Note content is absent from analytics and crash breadcrumbs.
- Concurrent edits follow the sync conflict policy in Section 15.

### 8.4 READER-04: In-book search

Target behavior:

- Search returns chapter-aware snippets.
- Selecting a result jumps to the corresponding page and visually marks the match temporarily.
- Search runs locally and works offline.

Implementation:

1. Search normalized chapter text from the already ingested book.
2. Debounce input and require at least two visible characters.
3. Cap initial results and provide deterministic ordering.
4. Store each result's chapter index and character offset.
5. Extend pagination output with enough source offset information to map a match to a page.
6. Avoid persisting the search query unless the user explicitly chooses search history later.
7. For CJK and Bengali scripts, use Unicode-aware normalization and avoid English-only token assumptions.

Completion criteria:

- Search works offline for English, Bengali, Japanese, and Korean content.
- A selected result lands on the containing page.
- Searching a large book does not block page turns.
- No query content is sent to analytics.

### 8.5 READER-05: Adjustable typography and accessibility

Target behavior:

- Users can adjust body size and line spacing without violating design floors.
- Pagination reflows deterministically and preserves the nearest reading location.
- Reader controls remain understandable with screen readers and reduced motion.

Constraints:

- Font size range: 17px minimum; recommended maximum 24px.
- Line-height ratio: 1.85 minimum; recommended maximum 2.15.
- Script-specific fonts remain authoritative.
- Page style controls font family and ornament; size/spacing are independent user preferences.

Implementation:

1. Extend `readingPrefs.ts` with persisted, clamped scale values.
2. Expose controls in the page-style modal.
3. Store an anchor based on chapter and source-text offset before repagination.
4. Recompute pages and restore the nearest page containing that anchor.
5. Add Reset to recommended settings.
6. Respect system Reduce Motion by simplifying page-turn transforms and card transitions.
7. Audit accessibility labels, roles, states, focus order, contrast, and touch size.

Completion criteria:

- Settings remain within the locked reading floor.
- Changing typography does not return the user to the beginning of a chapter.
- Reader actions are operable with VoiceOver/TalkBack.
- Reduced Motion removes nonessential 3D and repeated animation.

### 8.6 READER-06: Failure and recovery polish

Implementation:

1. Define typed reader failure states: missing download, network failure, malformed EPUB, empty chapters, translation failure, and pagination failure.
2. Give each state a recovery action: retry, re-download, choose file again, report issue, or return to Library.
3. Preserve reading data when a catalog download is deleted or replaced.
4. Log error codes rather than raw book text.
5. Add progress feedback for long parsing and pagination operations.

Completion criteria:

- Every known failure state has a visible, actionable screen.
- Retrying cannot create duplicate book records.
- Personal data remains intact when rebuildable content is removed.

## 9. Library and discovery implementation plan

### 9.1 LIB-01: Faster first-book activation

Implementation:

1. Make Continue Reading the dominant Home action when a position exists.
2. When no position exists, show one recommended starting book and one Explore Library action.
3. Delay optional theme and vocabulary calibration prompts until after first reading value.
4. Keep comparative scripture inquiry visually secondary to the current reading task.
5. Preserve current design tokens and components rather than redesigning the Home screen.

Completion criteria:

- A new user can reach a readable page in under two minutes without completing calibration.
- A returning user can reopen the current book in one tap.
- Home never presents two equally dominant primary actions.

### 9.2 LIB-02: Favorites and wishlist

Target behavior:

- Favorites represent intent to read, independent of download state and custom shelf membership.
- A Favorites shelf is visible near the top of the Library.

Implementation:

1. Add a `favorite_books` local mapping table and remote equivalent.
2. Add repository methods and sync mutations.
3. Add a favorite toggle on book details and search results.
4. Reuse BookSpine and current shelf presentation.
5. Do not overload downloaded state or a user-renamable shelf to represent favorites.

Completion criteria:

- Favorites persist and sync independently of downloads.
- Removing a download does not remove a favorite.

### 9.3 LIB-03: Download manager

Target behavior:

- Readers can see queued, downloading, paused, failed, and ready states.
- A failed download can resume or restart without corrupting the cached book.

Implementation:

1. Extend the downloader with explicit state and progress callbacks.
2. Continue using partial files and atomic replacement.
3. Add a persistent lightweight download-state repository if downloads must survive process termination.
4. Add retry and cancel actions to Saved Books.
5. Add a Wi-Fi-only preference only after a reliable network-type API is approved.
6. Keep scripture bundles separate because they ship with the app.

Completion criteria:

- Canceling or failing never replaces a valid cached book with a partial file.
- Saved Books accurately reflects disk state after restart.
- Progress UI remains responsive during large EPUB imports.

### 9.4 LIB-04: Local recommendation engine

Start with transparent local heuristics before introducing an AI recommender.

Inputs:

- Target reading language.
- Completed and abandoned books.
- Categories and authors read.
- Saved vocabulary difficulty.
- Recent session duration.
- Favorites and shelves.

Outputs:

- `Because you finished…`
- `A shorter read for tonight`
- `Continue this author`
- `Practice-friendly books at your level`

Implementation:

1. Create a pure scoring module with deterministic weights.
2. Exclude unavailable or already completed books where appropriate.
3. Expose a short explanation for every recommendation.
4. Log impression, open, and dismiss events.
5. Revisit weights only after sufficient beta data exists.

Completion criteria:

- Every recommendation has an explainable reason.
- The system works offline using local catalog and history.
- Dismissed recommendations do not immediately return.

## 10. Vocabulary and learning implementation plan

### 10.1 LEARN-01: Correct Premium quiz gates

Current problem: advanced quiz modes use a weekly sample key without consistently checking the active Premium entitlement.

Implementation:

1. Use `canUse('advanced_quiz')` or the shared gate service before sample logic.
2. Premium users receive unrestricted advanced quiz sessions within service rate limits.
3. Free users receive one clearly described weekly advanced sample.
4. Offline behavior uses cached word clusters where possible and explains when generation requires a connection.
5. Replace direct paywall navigation with a shared gate result so auth-required, offline-required, and subscription-required states differ.

Completion criteria:

- Premium users never consume or hit the free sample key.
- Free sample use is deterministic across restart.
- Offline cached challenges remain usable.
- Paywall telemetry records the triggering quiz mode.

### 10.2 LEARN-02: Review history and mastery clarity

Implementation:

1. Add a word detail view with review count, last review, next due date, current interval, lapse count, and source context.
2. Present mastery as a plain-language state derived from the existing SRS fields.
3. Add filters for due, difficult, new, learning, and mastered.
4. Connect the existing vocabulary growth chart to a real repository query.
5. Never imply scientifically exact memory probability when only heuristic SRS state exists.

Completion criteria:

- Every mastery label can be explained from stored fields.
- Growth data uses real saved/review timestamps and shows an empty state when unavailable.
- Filters remain book-aware.

### 10.3 LEARN-03: Custom decks

Target behavior:

- Premium readers can create named study decks spanning books.
- Basic per-book review remains free.

Data model:

- `vocabulary_decks`: ID, owner, name, created/updated timestamps.
- `vocabulary_deck_items`: deck ID, saved-word ID, added timestamp.

Implementation:

1. Add local and remote migrations with owner-scoped RLS.
2. Add repositories and sync support.
3. Add Add to deck from word detail and multi-select notebook mode.
4. Reuse the existing flashcard and quiz engines with a deck-supplied word list.
5. Gate deck creation and cross-book review, not the user's saved words.

Completion criteria:

- Removing a deck does not delete saved words.
- Deleting a saved word removes orphaned deck membership.
- Decks restore on another Premium device.

### 10.4 LEARN-04: Context-aware translation

Free translation remains the existing literal provider. Premium context translation interprets a word or phrase using its surrounding sentence.

Server request shape:

- Source word or phrase.
- Context sentence.
- Source and target languages.
- Optional book metadata without raw chapters.

Server response shape:

- Contextual translation.
- Concise definition.
- Part of speech where reliable.
- Explanation of why the meaning fits the sentence.
- Up to three synonyms and antonyms when appropriate.
- Optional grammar or idiom note.
- Provider/model version for cache invalidation.

Implementation:

1. Add a `context_translate` action to the server-side literary AI function.
2. Validate entitlement and rate limits on the server.
3. Limit input lengths and reject chapter-sized payloads.
4. Cache results by normalized phrase, context hash, language pair, and model version.
5. Extend `WordTranslationPopup` with a Premium enrichment section.
6. Keep literal translation visible so users can compare it with contextual meaning.
7. Allow reporting an incorrect translation without placing raw context in analytics.

Completion criteria:

- Server rejects non-entitled requests.
- Client failure falls back to literal translation without blocking reading.
- Cached results display offline.
- Provider keys remain server-only.

### 10.5 LEARN-05: Offline dictionary and language packs

This is a later Premium feature because it introduces large downloadable assets and licensing requirements.

Implementation requirements:

1. Select dictionaries with redistribution rights for each language pair.
2. Publish versioned, checksummed pack manifests.
3. Download packs into app storage with resumable progress.
4. Verify checksum before activation.
5. Add storage estimates and removal controls.
6. Route lookup through local pack first when offline.
7. Keep basic online translation available to free users.

Completion criteria:

- Every pack has documented license and attribution.
- Interrupted downloads cannot activate corrupt data.
- Removing a pack does not remove saved vocabulary.

## 11. Reading goals, reminders, and retention

### 11.1 RET-01: Real cadence notifications

Current state: reading goals and reminder preferences are stored, and notification copy can be generated, but no device notification is scheduled.

Requires approval for `expo-notifications` and any native configuration it needs.

Implementation:

1. Request notification permission only after the user explicitly enables reminders.
2. Schedule local notifications using the saved preferred hour and minute.
3. Include book ID in notification data and deep link to the reader.
4. Cancel and reschedule when the goal changes, the book completes, reminders are disabled, or the book is deleted.
5. Add quiet hours and a global pause.
6. Use local scheduling for cadence and SRS reminders; no server is required for the first version.
7. On app launch, reconcile scheduled notifications against current goals.

Telemetry:

- `reminder_permission_requested`
- `reminder_permission_result`
- `reading_reminder_scheduled`
- `reading_reminder_opened`
- `reading_reminder_disabled`

Completion criteria:

- Enabling reminders schedules exactly one active cadence reminder per goal.
- Disabling or completing a goal removes its notification.
- Tapping a notification opens the correct book.
- Denied permission leaves the saved goal usable without repeated prompts.

### 11.2 RET-02: SRS reminders

Implementation:

1. Query due words after a review session and at app backgrounding.
2. Schedule one daily reminder at a user-selected time when due words exist.
3. Deep link to the Review tab.
4. Cancel the reminder when the due queue becomes empty.
5. Cap reminders to one learning notification per day.

Completion criteria:

- Reminder counts match the due queue at scheduling time.
- Completing review removes or updates the pending reminder.
- No raw word content appears on the lock screen by default.

### 11.3 RET-03: Weekly reading digest

Free digest:

- Reading minutes.
- Reading days.
- Pages read.
- Current book progress.
- Words saved and reviewed.

Premium digest:

- Speed trend.
- Vocabulary growth.
- Completion forecast.
- Most productive time of day.
- Adaptive next-week goal.

Implementation:

1. Build the digest from local reading sessions and review events.
2. Show it in-app before adding notification delivery.
3. Never fabricate defaults when no data exists; display an honest empty state.
4. Save generated report metadata, not a duplicated copy of all source data.

Completion criteria:

- Values reconcile with the Profile statistics.
- Partial weeks and timezone changes are handled.
- Premium rows are hidden or previewed accurately for free users.

### 11.4 RET-04: Milestones and account protection

Implementation:

1. Define meaningful milestones: first saved word, first imported book, first completed review, first completed book, seven reading days, and first thirty reading minutes.
2. Celebrate once with restrained animation and haptics.
3. After an ownership milestone, offer account protection as a secondary action.
4. After a positive milestone and only when appropriate, offer the platform store-review prompt.
5. Keep internal feedback separate from public store review.

Completion criteria:

- Each milestone is idempotent.
- Dismissal is respected.
- Account protection never interrupts the reader mid-page.
- Store review prompts follow platform availability and cooldown rules.

### 11.5 RET-05: Lapse recovery

Implementation:

1. Detect three, seven, and fourteen days without a reading session locally.
2. Choose at most one relevant return action: current book, short recommended reading, or due review.
3. Use calm copy without guilt or lost-progress threats.
4. Stop reactivation prompts when notifications are paused.
5. Measure opens and resulting reading sessions.

Completion criteria:

- No more than one lapse notification is active.
- The destination remains valid if the book was removed.
- Users can disable reactivation separately from goal reminders.

## 12. Reading insights

### 12.1 Current state

The Profile screen already computes total reading time, streaks, books completed/in progress, saved/mastered words, highlights, top books, session averages, pages per hour, favorite reading time, and seven-day activity.

The current stats engine substitutes example-like defaults for some empty metrics. This must be removed before presenting insights as authoritative.

### 12.2 Free insights

- Total reading time.
- Current and longest streak.
- Books completed and in progress.
- Saved and mastered words.
- Seven-day reading rhythm.
- Current book progress.

### 12.3 Premium insights

- Calendar activity heatmap.
- Reading speed trend by book and language.
- Vocabulary growth and mastery trend.
- Monthly and annual reports.
- Completion forecast.
- Reading-time distribution.
- Goal adherence and adaptive pacing.
- Exportable report card.

### 12.4 Implementation

1. Split pure aggregation functions from UI formatting.
2. Use actual zero/unknown states instead of invented defaults.
3. Define timezone and day-boundary behavior.
4. Add efficient repository queries for date ranges rather than loading unlimited session history into UI memory.
5. Gate only Premium panels, not the underlying personal data or basic stats.
6. Cache expensive aggregates with a source-version timestamp and invalidate when sessions/reviews change.

Completion criteria:

- Every displayed number is traceable to persisted sessions or reviews.
- Empty accounts show empty states.
- Heatmap and reports remain responsive with multiple years of data.

## 13. Scripture and inquiry implementation plan

### 13.1 SCRIPTURE-01: Feature parity matrix

Before adding new scripture content, document and test the capabilities of each current tradition.

| Capability | Quran | Bible OT | Bible NT | Torah | Rigveda |
|---|---:|---:|---:|---:|---:|
| Bundled text | Yes | Yes | Yes | Uses OT subset | Yes |
| Commentary/tafsir | Yes | Yes | Yes | Uses OT commentary | No verified commentary |
| Recitation/audio | Yes | Not wired | Not wired | Not wired | No verified recording |
| Progress | Yes | Yes | Yes | Through Bible data | Yes |
| Word translation | Yes | Yes | Yes | Through Bible reader | Yes |
| Saved words | Yes | Yes | Yes | Through Bible repository | Yes |
| Verse highlights | Yes | Yes | Yes | Through Bible repository | Yes |
| Verse sharing | Yes | Yes | Yes | Through Bible reader | Yes |
| Cloud sync | Incomplete | Incomplete | Incomplete | Incomplete | Incomplete |

Implementation:

1. Add shared behavior tests for progress, translate, save, highlight, share, and deep link.
2. Keep tradition-specific screens where the current architecture deliberately prefers sibling verticals.
3. Extract only stable, already-shared UI behavior; do not force every scripture into the prose reader.
4. Wire audio only when the recording is rights-safe, complete enough, and matches the bundled edition.

Completion criteria:

- Every visible control is supported for that tradition.
- Unavailable audio/commentary controls are absent rather than disabled without explanation.
- Shared behavior works identically where parity is promised.

### 13.2 SCRIPTURE-02: Decide the mood experience

Current state: semantic mood search, deck UI, and an offline table deck exist, but the main entry points route to comparative inquiry.

Recommended product decision:

- Keep **Ask the Scriptures** as comparative research.
- Restore **A verse for this moment** as a separate emotional-support flow.
- Do not label comparative inquiry as a mood recommendation.

Implementation:

1. Add two distinct Library actions with unambiguous labels.
2. Route emotional text to the context-verses Edge Function and `VerseDeckView`.
3. Route factual/comparative questions to `ScriptureInquiryDeck`.
4. Preserve the offline table deck as an explicit offline/random option.
5. Add error, offline, and rate-limit states for each flow.
6. Update What's New copy to describe only discoverable features.

Completion criteria:

- Each visible entry point leads to the experience its copy promises.
- Mood reactions and inquiry history are stored separately.
- Offline users have a clear fallback.

### 13.3 SCRIPTURE-03: Inquiry safety and source integrity

Implementation:

1. Continue treating AI output as citation candidates rather than source text.
2. Hydrate every displayed citation from bundled or approved canonical data.
3. Display the translation/edition and commentary source.
4. Mark generated historical context as AI-assisted.
5. Add `Report citation/context issue` to each result.
6. Rate-limit arbitrary AI queries server-side by user and IP/device signals.
7. Log cost and model version without logging full sensitive questions by default.
8. Add regression tests for malformed, nonexistent, cross-tradition, and adversarial citations.

Completion criteria:

- An unverified citation cannot render as scripture text.
- The app clearly separates scripture, commentary, and generated context.
- Reported issues can be traced to model version and citation IDs.

## 14. Atmosphere, sharing, and visual polish

### 14.1 ATM-01: Ambient sound catalog

Free:

- Keep at least two complete, high-quality soundscapes.

Premium:

- Heavy rain.
- Rain on a window.
- Fireplace.
- Forest birds.
- Wind through trees.
- Ocean waves.
- Distant thunder.
- Quiet café.
- Old library ambience.
- Victorian study room.
- Snowstorm.
- Midnight forest.

Implementation:

1. Extend track metadata with tier, duration, file size, version, and attribution/license.
2. Gate playback and offline download through `full_ambience` entitlement.
3. Permit a short Premium preview without silently starting a subscription.
4. Add sleep timer and stop-on-reader-close preferences.
5. Cache only successfully downloaded tracks and expose removal controls.
6. Keep the catalog nature/ambient only unless the product direction changes explicitly.

Completion criteria:

- Every track has documented rights and attribution.
- Free tracks remain usable offline after caching.
- Premium expiration prevents new Premium playback while handling an already-playing track gracefully.

### 14.2 SHARE-01: Premium quote cards

Free:

- Three curated themes.
- Standard-resolution share/export.
- Lamplight attribution.

Premium:

- Additional culturally aligned themes.
- Approved font and color choices.
- High-resolution export.
- Optional book cover and citation layout.
- Saved custom presets.

Implementation:

1. Create a data-driven theme registry using design tokens.
2. Keep export rendering separate from the interactive editor.
3. Validate contrast and text overflow across scripts.
4. Gate Premium themes and HD export, not sharing itself.
5. Add deep-link metadata when the source is publicly available in Lamplight.

Completion criteria:

- Long quotes fail gracefully with a length explanation or alternate layout.
- Bengali, Japanese, Korean, Arabic, and Latin scripts render correctly.
- Exported images match the preview.

### 14.3 POLISH-01: UI consistency audit

Audit every primary screen for:

- Loading state.
- Empty state.
- Error state.
- Offline state.
- Permission-denied state.
- Free-limit state.
- Premium-locked state.
- Success confirmation.
- Destructive-action confirmation.
- Keyboard and small-screen behavior.
- Day and Lamp theme behavior.
- Reduced Motion behavior.
- VoiceOver/TalkBack labels and order.

Completion criteria:

- Every primary route has all applicable states.
- No paid or network feature fails silently.
- No screen invents colors, fonts, spacing, or shadows already available as tokens.

## 15. Cloud sync, backup, and restore

### 15.1 Product boundary

Recommended model:

- Free protected account: essential disaster-recovery backup for reading position, saved words, quotes, bookmarks, notes, and shelves on the same primary device/account.
- Premium: active multi-device synchronization, imported-EPUB private backup, richer history, and restore controls.

This boundary supports retention by protecting ownership while preserving a meaningful Premium benefit.

### 15.2 SYNC-01: Complete entity coverage

The sync entity registry must cover:

- Library items and cloud/local book mapping.
- Reading positions.
- Saved words and SRS state.
- Highlights and quotes.
- Bookmarks.
- Notes.
- Shelves and shelf items.
- Favorites.
- Review events.
- Quiz attempts.
- Reading sessions.
- Reading goals.
- User preferences.
- Quran positions, highlights, and saved words.
- Bible/Torah/Vedas positions, highlights, and saved words.

Implementation:

1. Define one typed entity-name union used by repositories and the sync worker.
2. Require every durable repository mutation to enqueue its matching sync mutation.
3. Add remote schema and RLS for entities not yet represented.
4. Add incremental pull cursors per entity.
5. Add tombstones for user-deleted durable records.
6. Upload in dependency order: library item before its positions/words/highlights; shelf before shelf items.
7. Pull in the same dependency-aware order.
8. Add retry classification for network, authentication, validation, conflict, and permanent failures.

Completion criteria:

- A repository coverage test lists every durable mutation and its sync behavior.
- Deletes propagate without resurrecting records.
- A failed entity does not block unrelated entities forever.
- Sync status explains whether data is synced, saved offline, or needs attention.

### 15.3 Conflict policy

| Entity | Conflict rule |
|---|---|
| Reading position | Furthest progress wins; newest location breaks ties |
| Saved word | Union by stable ID; preserve the newest translation edit and highest coherent SRS history |
| Highlight/bookmark | Union by stable ID; explicit deletion wins after its timestamp |
| Note | Latest `updated_at` wins; retain a conflict copy if both sides changed after last sync |
| Shelf | Latest name wins; membership is a union minus timestamped removals |
| Reading goal | Latest explicit edit wins |
| Review event/session/quiz attempt | Append-only, deduplicated by ID |
| Preferences | Latest field-level update wins where field timestamps exist |

All server timestamps used in conflict resolution must be normalized. Device clock alone must not determine paid entitlement or destructive conflict resolution.

### 15.4 SYNC-02: Imported EPUB backup

Premium implementation:

1. Create a private Supabase Storage bucket for user uploads.
2. Store objects under the authenticated owner ID.
3. Enforce object-size and account-storage quotas.
4. Upload the original EPUB or a documented normalized artifact, not an unversioned ad hoc format.
5. Store checksum, size, original filename, content type, and parser version in `library_items` metadata.
6. Use resumable or recoverable uploads for large files.
7. Restore the file before restoring dependent reading positions.
8. Delete remote objects when the user permanently deletes the imported book, subject to a short recoverable retention window if approved.
9. Explain that users are responsible for rights to uploaded content.

Completion criteria:

- Bucket policies prevent cross-user reads.
- Restore verifies checksum before parsing.
- Quota failures do not damage the local book.
- Account deletion removes uploaded objects.

### 15.5 SYNC-03: Restore experience

Implementation:

1. Add a restore status screen showing books, reading progress, learning data, and failures.
2. Restore small metadata first so the Library becomes useful quickly.
3. Download book files lazily or through an explicit queue.
4. Allow retry of one failed item.
5. Never replace newer local progress with older cloud progress.

Completion criteria:

- A user understands what has restored and what remains.
- Partial restore is usable.
- Recovery can resume after process termination.

## 16. AI Reading Companion

This is a later Premium phase. It must not launch before billing, entitlements, server security, and usage accounting are stable.

### 16.1 Initial features

- Explain a difficult passage.
- Explain a literary or historical reference.
- Simplify a sentence while preserving meaning.
- Summarize the current chapter without future spoilers.
- Recap named characters encountered up to the current position.
- Generate reflective questions about the current chapter.

### 16.2 Server architecture

1. Add actions to a protected Supabase Edge Function.
2. Require Supabase authentication and the `ai_companion` entitlement.
3. Send only the smallest necessary excerpt and metadata.
4. Apply per-user daily/monthly limits and cost budgets.
5. Store provider credentials in server secrets.
6. Return model/version, structured output, and safety/error codes.
7. Log request type, token/cost estimate, book ID, and success state without logging full copyrighted excerpts by default.
8. Cache stable explanations by excerpt hash, action, language, and model version.

### 16.3 Spoiler control

- Every request includes current chapter and source location.
- Chapter summaries receive only the current chapter unless the user explicitly selects a larger scope.
- Character recap receives text only up to the saved reading position.
- The UI labels the selected scope before submission.

### 16.4 Completion criteria

- Non-entitled requests are rejected server-side.
- Provider secrets never reach the client.
- A user can report an incorrect or spoiler-containing answer.
- Cost per action and per active Premium user is measurable.
- AI failure never blocks reading or removes source text.

## 17. Premium product definition

### 17.1 Features that remain free

- Unlimited core reading.
- EPUB import.
- Offline book downloads.
- Basic search and shelves.
- Essential accessibility and typography controls.
- Basic highlights, bookmarks, and notes.
- Basic vocabulary review and book-context quiz.
- Basic reading statistics.
- Data export.
- Account protection and essential backup.
- Core scripture reading.

### 17.2 Premium feature bundles

#### Remember more

- Unlimited saved words and quotes.
- Advanced SRS history and filters.
- Custom decks.
- Fresh-context and synonym/antonym quizzes without the free sample limit.
- Difficult-word study plans.

#### Understand more

- Unlimited translations.
- Sentence-aware translation.
- Grammar, idiom, synonym, and antonym enrichment.
- Offline dictionary/language packs.

#### See your reading life

- Activity heatmaps.
- Reading speed and vocabulary trends.
- Monthly and annual reports.
- Completion forecasts.
- Adaptive reading cadence.

#### Keep everything with you

- Multi-device synchronization.
- Imported-EPUB private backup.
- Restore history and richer recovery controls.

#### Shape the atmosphere

- Full ambient sound library.
- Offline ambience packs and sleep timer.
- Premium quote-card themes and HD export.

#### Read with a companion

- Passage explanations.
- Literary-reference explanations.
- Spoiler-aware chapter and character recaps.
- Reflective prompts.

### 17.3 Paywall rules

- Show a paywall at a value boundary, not at app launch.
- Name the exact feature that triggered it.
- Describe what remains free.
- Use the current RevenueCat Offering price strings; never hardcode storefront prices.
- Show billing period, trial terms, renewal behavior, and cancellation route.
- Include Restore Purchases, Terms, and Privacy.
- Do not claim offline packs, sounds, sync, or AI features until each is available.
- Do not show a purchase CTA when RevenueCat has no valid current Offering.

## 18. Analytics and experimentation

### 18.1 Event taxonomy

Activation:

- `onboarding_started`
- `onboarding_step_completed`
- `onboarding_complete`
- `first_book_opened`
- `first_page_completed`
- `first_translation_completed`
- `first_word_saved`
- `first_review_completed`

Reading:

- `book_opened`
- `book_download_started`
- `book_download_completed`
- `book_download_failed`
- `reading_session_started`
- `reading_session_completed`
- `book_completed`
- `reader_search_used`
- `bookmark_created`
- `note_created`

Learning:

- `translate_tap`
- `translate_page`
- `word_saved`
- `review_started`
- `review_completed`
- `quiz_started`
- `quiz_completed`
- `mastery_milestone`

Retention:

- `reading_goal_created`
- `reminder_scheduled`
- `reminder_opened`
- `weekly_digest_viewed`
- `lapse_prompt_opened`
- `account_protected`

Reliability:

- `download_recovered`
- `sync_completed`
- `sync_failed`
- `auth_refresh_failed`
- `translation_failed`
- `edge_function_failed`

Revenue:

- `paywall_viewed`
- `offering_loaded`
- `purchase_started`
- `purchase_completed`
- `purchase_failed`
- `purchase_cancelled`
- `restore_started`
- `restore_completed`
- `entitlement_changed`

### 18.2 Event privacy

- Use stable IDs, not email addresses.
- Do not send book text, note text, raw scripture questions, voice transcripts, or translation context in general analytics.
- Keep diagnostic content opt-in and clearly disclosed.
- Apply retention and deletion policies consistent with account deletion.

### 18.3 Product dashboards

Required dashboards:

1. Activation funnel: onboarding → first book → first page → first understanding action → first memory action.
2. D1, D7, and D30 retention segmented by content source, reading language, prose/scripture usage, and protected account state.
3. Reading health: session length, reading days, completion, abandonment chapter, download failures.
4. Learning health: save-to-review conversion, due completion, difficult words, quiz completion.
5. Sync/auth health: protected-account conversion, sync success, merge failures, restore success.
6. Revenue: paywall trigger, purchase conversion, trial conversion, renewal, cancellation, billing issue, and Premium feature usage.

### 18.4 Experiment guardrails

- Run one major activation or paywall experiment at a time.
- Define success and failure metrics before release.
- Keep free-core access constant between variants.
- Avoid experiments that manipulate streak loss, fear of data loss, or religious content.
- Require enough observations before promoting a result.

## 19. Feedback and public ratings

### 19.1 Current internal feedback

The current feedback system supports star ratings, categories, tags, messages, book targets, offline queueing, and Supabase analytics views. Keep this as the private product-feedback channel.

Improvements:

1. Add an admin workflow for `new`, `reviewed`, and `resolved` states.
2. Add app-version and release-channel filters.
3. Add a response/contact path only when the user explicitly opts in.
4. Add an issue fingerprint for repeated technical failures.
5. Connect positive internal feedback to an optional store-review prompt after submission, subject to platform rules.

### 19.2 Public book reviews

Public reviews should be a later, separately approved feature because anonymous authentication creates moderation and abuse risks.

Before implementation, define:

- Display-name and profile policy.
- Spoiler marking.
- Reporting and blocking.
- Moderation queue.
- Rate limits and anti-spam signals.
- Review editing/deletion.
- Book-edition identity.
- Community guidelines and enforcement.

Private reading reflections and share cards should be improved before building a public feed.

## 20. RevenueCat subscription and payment implementation

### 20.1 Billing decisions

RevenueCat is the subscription SDK, receipt-validation service, and cross-store entitlement source. The implementation must use this fixed model:

| Item | Decision |
|---|---|
| Entitlement | `premium` |
| Offering | `default`, marked Current |
| Launch packages | Monthly and annual auto-renewing subscriptions |
| Access check | `CustomerInfo.entitlements.active.premium` |
| Billing identity | Current Supabase Auth user UUID |
| Immediate device state | RevenueCat `CustomerInfo` |
| Backend authorization | Server-maintained Supabase entitlement mirror |
| Restore policy | User-triggered restore; use RevenueCat's transfer-to-new-user behavior unless product policy changes |
| Lifetime product | Not at launch |
| Trial | Only after renewal, expiration, eligibility, and disclosure behavior pass on both stores |

All products must attach to the single `premium` entitlement. Application code must use Offerings and Packages rather than raw product identifiers. Store-provided localized price strings are the only source for prices displayed to users.

Official model: [RevenueCat products, entitlements, and offerings](https://www.revenuecat.com/docs/projects/configuring-products), [displaying products](https://www.revenuecat.com/docs/getting-started/displaying-products).

### 20.2 Dependency and Expo constraints

Current implementation package:

```sh
npx expo install react-native-purchases
```

Lamplight currently keeps its custom paywall, so `react-native-purchases-ui` is intentionally not installed. Add it only if the product later chooses RevenueCat Paywalls or Customer Center.

These packages contain native code. Real purchases cannot be validated in a normal Expo Go workflow; use an Expo development build and later store-distributed sandbox builds. Adding the packages and creating a development build requires explicit approval under this repository's engineering rules. Before any EAS command, read `docs/deployment.md`. Do not change `app.json`, `ios/`, or `android/` without approval.

Sources: [Expo in-app-purchase guide](https://docs.expo.dev/guides/in-app-purchases/), [RevenueCat Expo guide](https://www.revenuecat.com/docs/getting-started/installation/expo).

### 20.3 RevenueCat and store configuration

Create one RevenueCat project with Apple, Google, and RevenueCat Test Store app configurations. Confirm Lamplight's exact iOS bundle ID and Android application ID before creating permanent products.

Recommended product identifiers:

```text
com.lamplight.premium.monthly
com.lamplight.premium.annual
```

Configure platform-specific public keys:

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY
```

Public SDK keys may be present in the application. RevenueCat secret API keys, webhook secrets, Apple keys, and Google service-account credentials must never use an `EXPO_PUBLIC_` variable and must never be bundled with the client. Choose Test Store versus real store through an explicit build-profile/channel setting; do not infer this solely from `__DEV__`.

Apple setup:

1. Accept paid-app agreements and complete tax and banking.
2. Match the App Store Connect bundle ID to the Expo app.
3. Enable the In-App Purchase capability through the approved native/EAS configuration path.
4. Create one subscription group and the monthly and annual products.
5. Complete pricing, localization, screenshots, and review metadata.
6. Upload the required In-App Purchase Key and any App Store Connect API key to RevenueCat.
7. Route App Store Server Notifications through RevenueCat.
8. Test with Sandbox and TestFlight.

Google setup:

1. Match the Play application ID to the Expo app.
2. Upload a signed AAB to an internal or closed testing track.
3. Create the subscription and activate monthly and annual base plans.
4. Create the RevenueCat service account with only the required Play permissions and upload its JSON credential to RevenueCat.
5. Route Google Real-Time Developer Notifications through RevenueCat.
6. Add license and track testers, have them opt in, and install the Play-distributed build.
7. Verify the generated Android Activity uses `standard` or `singleTop`; `singleTask` can break bank-verification returns.

Sources: [Apple credentials](https://www.revenuecat.com/docs/store-configuration/app-store/service-credentials-index), [Apple subscription requirements](https://developer.apple.com/app-store/subscriptions/), [Google credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials), [Google subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533).

### 20.4 Application-owned billing module

Keep the vendor SDK behind a narrow interface. Proposed files:

```text
src/features/billing/constants.ts
src/features/billing/billingTypes.ts
src/features/billing/revenueCatClient.ts
src/features/billing/BillingProvider.tsx
src/features/billing/useBilling.ts
src/features/billing/__tests__/
```

Required public contract:

```ts
type BillingStatus =
  | { state: 'loading' }
  | { state: 'free'; lastCheckedAt: number | null }
  | {
      state: 'premium';
      expiresAt: string | null;
      willRenew: boolean;
      productId: string;
      managementURL: string | null;
    }
  | { state: 'error'; hasCachedPremium: boolean; message: string };

type BillingApi = {
  status: BillingStatus;
  refresh(): Promise<void>;
  getPackages(): Promise<ReadonlyArray<PremiumPackage>>;
  purchase(packageId: string): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  openManagement(): Promise<void>;
};
```

Only this module maps RevenueCat objects into application state. Feature code calls a central selector or entitlement policy; it must not import `react-native-purchases`, inspect product IDs, or maintain a separate Premium boolean.

Initialization requirements:

1. Wait for Supabase to restore or create a session and provide a UUID.
2. Configure RevenueCat exactly once per application process with the correct platform key and `appUserID` equal to that UUID.
3. Register one CustomerInfo listener in `BillingProvider`; remove it on unmount.
4. Fetch CustomerInfo on startup, after identity changes, after purchase/restore, and when the app returns to the foreground.
5. Map active `premium` entitlement state, expiration, renewal, product, store, environment, billing issue, and management URL.
6. Reduce or disable debug billing logs in production.
7. Provide an adapter/mock so unit tests never require the native SDK.

A canceled subscription remains Premium until expiry. A grace-period entitlement remains active. Account hold and expired entitlements are inactive. Do not revoke already-downloaded local content merely because an offline verification attempt failed.

### 20.5 Supabase and RevenueCat identity contract

Use the Supabase user UUID from the first anonymous session:

```text
RevenueCat App User ID = Supabase auth.users.id
```

This ID is non-PII, non-guessable, and shared by billing, profiles, webhooks, and support. Never use an email address as the RevenueCat ID.

| Supabase transition | RevenueCat action |
|---|---|
| Restored session with same UUID | Keep configuration; refresh CustomerInfo |
| New anonymous session | Configure with its UUID |
| Guest links a new email and UUID stays the same | No identity switch; refresh CustomerInfo |
| User signs into an existing account with another UUID | Call `Purchases.logIn(targetUuid)` and use returned CustomerInfo |
| User signs out and a new anonymous Supabase user is created | Call `Purchases.logIn(newAnonymousUuid)` |
| Auth is unavailable | Do not create a RevenueCat anonymous identity; show cached/indeterminate billing state |

Do not call `Purchases.logOut()` in the normal Lamplight flow: it creates an unrelated RevenueCat anonymous ID. Moving between two custom IDs does not merge their RevenueCat customers. After signing into an existing Supabase account, offer a visible, user-triggered Restore Purchases action if Premium is absent. Do not silently call `syncPurchases` during ordinary login because it can transfer or alias receipts.

Sources: [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers), [Supabase RLS and authenticated anonymous users](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 20.6 Purchase, restore, and management behavior

Paywall loading:

1. Call `Purchases.getOfferings()`.
2. Render `offerings.current.availablePackages`.
3. Use the SDK product's localized title, period, introductory offer, and `priceString`.
4. If the current offering or packages are empty, show a retryable configuration/network error; do not invent fallback prices.

Purchase flow:

1. Disable the selected CTA while purchase is in flight.
2. Call `Purchases.purchasePackage(selectedPackage)`.
3. Unlock only if the returned CustomerInfo contains active `premium`.
4. Treat user cancellation as neutral, without an error toast.
5. Treat store completion without the entitlement as a refresh/support state, not success.
6. Refresh the application's entitlement policy and server mirror.
7. Log safe funnel events without receipts, payment data, keys, or full CustomerInfo.

Restore flow:

1. Put **Restore Purchases** on the paywall and in Settings.
2. Run `Purchases.restorePurchases()` only after a user taps it.
3. Distinguish restored, nothing found, offline, credentials canceled, and technical failure states.
4. Update local billing state only from returned CustomerInfo.

Management flow:

1. Put **Manage Subscription** in Settings for subscribers.
2. Open `CustomerInfo.managementURL` when present.
3. Provide a store-specific help fallback when it is absent.
4. Before account deletion, warn that deleting Lamplight data does not cancel store billing and present the management action.

The paywall must display subscription name, included benefits, billing duration, full renewal price, trial conversion terms if applicable, auto-renewal language, Terms of Use, Privacy Policy, restore, and sign-in/account recovery. Do not advertise any benefit that has not shipped.

Sources: [making purchases](https://www.revenuecat.com/docs/getting-started/making-purchases), [restoring purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases), [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info).

### 20.7 Supabase entitlement mirror and secure webhook

Client CustomerInfo is used for immediate interface state. A server-managed mirror is required for Premium Edge Functions, quotas, support, analytics, and recovery. The client must never write the authoritative entitlement.

Adapt the following to the repository's existing subscription tables rather than creating a second competing source of truth:

```sql
create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  environment text not null,
  app_user_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  processing_error text
);

create table if not exists public.billing_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id text not null,
  is_active boolean not null default false,
  product_id text,
  store text,
  environment text,
  period_type text,
  will_renew boolean,
  purchased_at timestamptz,
  expires_at timestamptz,
  unsubscribe_detected_at timestamptz,
  billing_issue_detected_at timestamptz,
  revenuecat_updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, entitlement_id)
);
```

Enable RLS. Users may read only their own normalized entitlement. Client roles must not insert, update, or delete billing rows or read webhook payloads. Only an Edge Function using server-side credentials may mutate them.

Create `supabase/functions/revenuecat-webhook/index.ts`. External webhooks do not have a Supabase JWT, so disable gateway JWT verification only for this function and perform RevenueCat authentication inside it. Keep these as Edge Function secrets:

```text
REVENUECAT_WEBHOOK_HMAC_SECRET
REVENUECAT_WEBHOOK_AUTH_TOKEN
REVENUECAT_SECRET_API_KEY
REVENUECAT_PROJECT_ID
```

Webhook algorithm:

1. Accept `POST` only and read the exact raw body before parsing JSON.
2. Validate the configured authorization header.
3. Verify RevenueCat's timestamped HMAC-SHA256 signature over `timestamp + "." + rawBody` using constant-time comparison and a short replay window.
4. Parse and validate API version, event ID/type, app ID, environment, timestamps, and identity fields.
5. Reject unknown RevenueCat app IDs.
6. Insert `event.id` into the event table. If it was already processed, return `200`; if its prior processing is incomplete, retry it.
7. Treat the webhook as a refresh signal. Call RevenueCat's server-only `GET /subscribers` endpoint and normalize the canonical subscription snapshot.
8. Resolve valid Supabase UUIDs from `app_user_id`, `original_app_user_id`, aliases, and transfer fields. Record but never cast `$RCAnonymousID` values to UUID.
9. Keep sandbox and production separate; sandbox events can never grant production Premium.
10. Upsert with source timestamps so a delayed event cannot overwrite newer state.
11. Mark the event processed and return promptly. On failure, store a sanitized bounded error and return a retryable non-2xx status.
12. Add scheduled reconciliation for incomplete events and stale active entitlements.

RevenueCat webhooks are a Pro integration, and the current Pro plan is free up to the documented monthly tracked-revenue threshold. Confirm current pricing before launch. If webhooks are unavailable at first release, Premium server endpoints must perform an authenticated server-side subscriber lookup and cache only a bounded result; they must not trust the client.

Every Premium Edge Function uses one shared authorization helper. Production endpoints accept only a production `premium` entitlement. When the mirror is stale or ambiguous, refresh server-side before granting costly work.

Sources: [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks), [event fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields), [Supabase Function authorization](https://supabase.com/docs/guides/functions/auth-headers), [Supabase API key security](https://supabase.com/docs/guides/getting-started/api-keys).

### 20.8 Integrate billing with the existing entitlement system

Create a single declarative policy layer, adapting the existing entitlement and promo infrastructure:

```ts
type PremiumFeature =
  | 'unlimited_translation'
  | 'unlimited_vocabulary'
  | 'advanced_quizzes'
  | 'multi_device_sync'
  | 'reading_insights'
  | 'premium_ambience'
  | 'premium_quote_cards';

type FeatureDecision = {
  allowed: boolean;
  reason: 'premium' | 'promotion' | 'free_limit' | 'limit_reached' | 'verification_required';
  remaining: number | null;
  requiresServerVerification: boolean;
};
```

Precedence is:

1. Active RevenueCat `premium`.
2. Valid server-issued promotional entitlement.
3. Documented offline/grace policy.
4. Free allowance.

All gates, usage recording, and paywall reasons go through this policy. Core reading, owned/imported books, essential accessibility, account deletion, restore, and subscription management are never gated.

### 20.9 Billing test matrix and completion criteria

Automated tests must cover loading/free/Premium transitions, listener updates, same-ID account upgrades, different-ID switches, cancellation, purchase without entitlement, empty offerings, offline cached state, grace period, canceled-but-active, expiration, and the rule that only the billing module imports RevenueCat.

Webhook tests must cover valid and invalid signatures, replay expiry, duplicate IDs, out-of-order events, unknown app IDs, invalid user IDs, sandbox isolation, transfers, RLS reads, denied client writes, and secret redaction.

On physical devices, test monthly and annual purchase, cancellation with remaining access, renewal, expiration, billing retry/grace, restore after reinstall, restore after account switching, cross-device login, refund/revocation, localized disclosures, and accessibility. Android testing must include leaving the app for bank verification and returning. Production paywalls remain disabled until the complete [RevenueCat launch checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist) and Section 24 release gates pass.

The detailed research and source index are preserved in `docs/revenuecat-research.md`.

## 21. Delivery roadmap and dependency order

The following sequence minimizes rework. Each phase is independently releasable except Phase 0, which prepares the foundation.

### Phase 0: security, truth, and testability

Deliver first:

1. AUTH-01 secure session storage.
2. SEC-01 server-side voice transcription.
3. REL-01 test infrastructure.
4. REL-02 remote feature flags.
5. Fix development guides that are forced to display.
6. Correct fabricated empty-state statistics.
7. Define the one entitlement policy used by existing gates and future RevenueCat state.

Exit criteria: no client-shipped provider secret, auth restoration still works, critical repositories have tests, production guides are not forced, and empty states never present invented activity.

### Phase 1: complete the free reading core

Deliver:

1. READER-01 table of contents.
2. READER-02 bookmarks.
3. READER-03 private notes.
4. READER-04 in-book search.
5. READER-05 adjustable typography.
6. READER-06 recovery states.
7. LIB-01 activation improvements.
8. LIB-02 favorites.
9. LIB-03 download manager.

Exit criteria: a new user can import or select a book, resume reliably, navigate, search, annotate, and recover from failures without creating an account or buying Premium.

### Phase 2: close learning and scripture gaps

Deliver:

1. LEARN-01 correct quiz entitlement checks.
2. LEARN-02 review history and mastery clarity.
3. LEARN-03 custom decks.
4. LEARN-04 context-aware translation.
5. Scripture capability parity and deliberate mood-flow routing.
6. Inquiry safety and citation hardening.

Exit criteria: learning features are understandable and testable, Premium preview limits cannot be bypassed, and every scripture route accurately represents its available capabilities.

### Phase 3: retention foundation

Deliver:

1. RET-01 cadence notifications.
2. RET-02 SRS reminders.
3. RET-03 weekly digest.
4. RET-04 milestones and account protection.
5. RET-05 lapse recovery.
6. Local recommendation rails.
7. Offline analytics queue and product dashboards.

Exit criteria: reminders are consent-based and cancelable, the weekly digest uses real data, lapse messaging is non-punitive, and D1/D7/D30 behavior can be measured without collecting reading content.

### Phase 4: RevenueCat and Premium launch

Deliver in this order:

1. Approve dependency/native changes, pricing, limits, restore policy, and trial policy.
2. Configure Test Store, entitlement, products, offering, and packages.
3. Add the billing adapter/provider and Supabase identity integration.
4. Implement paywall, purchase, restore, management, and legal disclosures.
5. Connect one low-risk Premium feature end to end.
6. Add the Supabase mirror and secure webhook or the documented server-lookup fallback.
7. Apply entitlement policy to every advertised Premium feature.
8. Configure Apple and Google products, credentials, and server notifications.
9. Pass physical-device store sandbox tests.
10. Stage rollout and monitor billing/support dashboards.

Exit criteria: all advertised benefits exist, no core/free data is trapped, restore works across reinstall and account transition, and backend-cost features reject forged client state.

### Phase 5: Premium depth

Deliver after purchase reliability is proven:

1. Advanced reading insights.
2. Multi-device sync and imported EPUB backup.
3. Offline dictionary/language packs.
4. Expanded ambient sound catalog.
5. Premium quote-card templates.
6. AI Reading Companion with strict server quotas and spoiler boundaries.

Do not launch all Phase 5 capabilities simultaneously. Instrument adoption, ship the smallest coherent bundle, and retire benefits that add maintenance but not retention or willingness to pay.

## 22. Prioritized implementation backlog

| Priority | Work | Why now | Depends on |
|---|---|---|---|
| P0 | Secure auth token storage | Protects persistent sessions | Approved secure-storage dependency if absent |
| P0 | Move transcription keys server-side | Removes exposed paid-provider credentials | Supabase Edge Function |
| P0 | Test foundation | Makes every later migration safer | None |
| P0 | Entitlement policy consolidation | Prevents Premium bypass and inconsistent gates | Existing entitlement audit |
| P0 | Correct forced guides and fake stats | Removes misleading production behavior | None |
| P1 | TOC, bookmarks, notes, search | Completes expected reader basics | Reader location model |
| P1 | Reader typography and recovery | Improves accessibility and trust | Theme and reader preferences |
| P1 | Download manager and favorites | Improves return behavior | Library repositories |
| P1 | Real reminders and SRS notifications | Creates useful return triggers | Notification approval and scheduling |
| P1 | RevenueCat purchase/restore foundation | Enables honest monetization | Approved native changes and product decisions |
| P1 | Billing server authorization | Protects paid server operations | RevenueCat identity and Supabase schema |
| P1 | Complete sync mutation coverage | Prevents silent cross-device gaps | Auth identity and conflict policy |
| P2 | Custom decks and learning insights | Deepens learning habit | Vocabulary history |
| P2 | Weekly digest and milestones | Reinforces progress | Reliable stats and analytics |
| P2 | Scripture parity and mood-flow decision | Removes confusing navigation | Product decision and content audit |
| P2 | Premium ambience and quote cards | Adds low-risk perceived value | Entitlement policy |
| P2 | EPUB cloud backup | Makes Premium sync meaningful | Object storage and restore UX |
| P3 | AI Reading Companion | High value but costly and safety-sensitive | Server auth, quotas, context model |
| P3 | Public book reviews | Moderation-heavy; not required for core value | Trust/safety policy and admin tooling |

## 23. Data, module, and migration map

Implementation agents must verify existing names before adding anything and extend current tables/repositories when they already represent the domain.

| Domain | Likely change | Required rule |
|---|---|---|
| Auth | secure session adapter and migration marker | Never log or sync raw refresh/access tokens |
| Bookmarks | local table/repository plus sync mutation | Store a stable location anchor, not only a page index |
| Notes | local table/repository plus sync mutation | Private by default; sanitize shared/exported content |
| Favorites | local book preference plus sync mutation | Preserve offline behavior |
| Downloads | explicit state/progress/error metadata | File state and database state must reconcile after crashes |
| Reader preferences | persisted typography/accessibility settings | Enforce the Lora 17px and 1.85 line-height floors |
| Cadence | reminder configuration and scheduling metadata | Store intent even when notification permission is denied |
| Learning | deck membership and review history | Keep scheduling deterministic and timezone-safe |
| Analytics | outbox with retry metadata | Never enqueue private content text |
| Billing | provider adapter and normalized entitlement | Only the billing module knows RevenueCat types |
| Billing server | webhook event and entitlement mirror | Server-only writes, idempotent processing, environment isolation |
| Sync | mutation producers for every synced entity | All SQLite operations use the serializing queue in `db/client.ts` |
| EPUB backup | object metadata and signed transfer flow | Encrypt transport; never expose a public bucket |
| AI | conversation/session metadata and quota ledger | Book/scripture text sent only as bounded necessary context |

Migration rules:

1. Every schema change has forward migration, indexes, constraints, and a tested path from the current database version.
2. Migrations are retry-safe and do not erase user data on partial failure.
3. New repositories follow existing serialization and transaction conventions.
4. Syncable records use stable IDs, `created_at`, `updated_at`, and tombstones where deletion must propagate.
5. UTC is used for storage; local timezone is used only for presentation and daily-goal boundaries.
6. Sensitive fields are excluded from analytics, logs, crash reports, and generic sync payloads.

## 24. Verification and release gates

### 24.1 Required checks for every implementation task

1. Read the exact referenced section and its dependencies.
2. Use graphify for unfamiliar implementation locations only after checking graph freshness.
3. Make the smallest scoped change and reuse existing components/repositories.
4. Run `npx tsc --noEmit`.
5. Run focused automated tests for the changed domain.
6. Run lint/format checks already defined by the project.
7. For SQLite changes, test upgrade from the prior schema and forced interruption/retry.
8. For sync changes, test offline creation, reconnection, duplicate delivery, conflict, and deletion.
9. For visual or interactive changes, verify Day and Lamp themes, small and large text, keyboard/screen-reader behavior, loading/empty/error states, and ask the user what they see on-device.
10. Record which acceptance criteria passed and any explicitly deferred item. Never mark an untested condition complete.

### 24.2 Product release gates

A release is not ready when any applicable item is false:

- No crash or data loss in open, resume, bookmark, note, download, and sync paths.
- All local database calls use the serialized database client.
- Anonymous users retain the complete free reading path.
- Account linking preserves local data and identity.
- Account deletion is accessible and accurately explains billing consequences.
- Premium checks cannot be bypassed through an alternate route.
- Paywall copy matches the capabilities actually shipped.
- Purchase, restore, renewal, cancellation, grace, expiration, refund, and account-switch tests pass.
- Public SDK keys are separated by platform/environment; no secret is bundled in the app.
- Remote flags can disable new server-cost or high-risk features.
- Analytics excludes book text, notes, raw queries, transcripts, and payment data.
- Accessibility floors and reduced-motion behavior are preserved.
- Offline functionality degrades deliberately rather than showing false success.
- Store disclosures, Privacy Policy, Terms, Data Safety, and review notes are current.

### 24.3 Retention success measures

Measure each feature against a defined behavior rather than raw screen views:

| Area | Primary outcome | Guardrail |
|---|---|---|
| Activation | First meaningful reading session within 24 hours | No increase in onboarding abandonment |
| Reader core | More users resume within seven days | No rise in crash or recovery failures |
| Vocabulary | Saved word followed by completed review | Translation latency remains acceptable |
| Reminders | Reminder-opened session completed | Opt-out and notification-disable rates remain healthy |
| Weekly digest | Next-week reading-day lift | No invented or guilt-driven messaging |
| Sync | Successful second-device resume | No local data loss or unexpected overwrite |
| Premium | Trial/purchase followed by benefit usage | Refunds, restore failures, and support contacts stay low |
| AI Companion | Questions leading back to reading | Cost per active subscriber stays within budget |

## 25. Definition of Done for lower-model agents

A feature is complete only when all applicable statements are true:

- The implemented behavior matches this document and existing design tokens.
- Acceptance criteria are encoded in tests where deterministic.
- Loading, empty, offline, error, retry, and success states are handled.
- Screen-reader labels, focus order, touch targets, text scaling, and reduced motion are verified.
- Day and Lamp themes are verified without hardcoded token values.
- Database access follows the serialized queue and migrations preserve existing data.
- Authentication and sync behavior are covered for anonymous and protected accounts.
- Premium behavior uses the central policy and cannot be unlocked by a local boolean.
- Analytics contains no private reading or payment content.
- No new dependency, native configuration, or EAS action was introduced without approval.
- `npx tsc --noEmit` and focused tests pass.
- Relevant docs are updated without duplicating contradictory policy.
- No unrelated cleanup or refactor is included.

When an agent cannot satisfy an item because a product decision, store credential, approval, or device test is missing, it must stop at that boundary, state the exact blocker, and leave the feature disabled behind a flag. It must not guess the missing policy or claim completion.

## 26. Explicit non-goals and product guardrails

- Do not turn Lamplight into a social feed before private reading and learning are excellent.
- Do not gate imported books, basic reading, accessibility, account deletion, purchase restoration, or subscription management.
- Do not use streak loss, shame, or religious content to pressure engagement or payment.
- Do not add AI merely to generate summaries; it must return users to the text with bounded, attributable context.
- Do not upload private reading content by default.
- Do not create separate Premium truth in UI, SQLite, RevenueCat, and Supabase. RevenueCat/customer server state and the central policy must reconcile them.
- Do not use email, device ID, or a RevenueCat anonymous ID when a Supabase UUID exists.
- Do not hardcode store prices, trial eligibility, or subscription-management URLs.
- Do not advertise cloud backup until both database records and imported EPUB files can be restored reliably.
- Do not ship dormant navigation, false stats, forced development guides, or controls that only simulate work.

## 27. Repository references and maintenance

The following files are the local sources of truth and must be read only when the task touches their area:

- `src/theme/tokens.ts`, `typography.ts`, and `ThemeProvider.tsx` for visual tokens and themes.
- `docs/architecture.md` for boundaries and conventions.
- `docs/design.md` for detailed interaction and visual rules.
- `docs/APP_VISUAL_BLUEPRINT.md` for current screen intent.
- `docs/scriptures.md` for scripture data and reader behavior.
- `docs/context-verses.md` for mood-to-verse semantics and Edge Function design.
- `docs/deployment.md` before any EAS, build, update, or release action.
- `docs/debugging.md` for Router, SQLite, SDK, and fetch-script pitfalls.
- `ROADMAP.md` for existing phase and schema context.
- `docs/revenuecat-research.md` for the payment research, full test matrix, pitfalls, and official source index.

Update this document when a product decision changes a free limit, Premium benefit, identity rule, sync conflict policy, schema contract, or release gate. Preserve the status labels in Section 5 so the inventory does not silently describe planned work as shipped work.

## 28. Implementation ticket template

Create one ticket per work-item ID. Copy this structure and replace every field with concrete information from the applicable section; do not leave placeholders in an implementation ticket that is marked ready.

```md
# <WORK-ID>: <Outcome-oriented title>

## User outcome
One sentence describing what the reader can accomplish after this work.

## Current evidence
- Existing route/component/repository:
- Current behavior or failure:
- Existing tests:

## In scope
- Exact behavior included in this ticket.

## Out of scope
- Related behavior intentionally deferred.

## Dependencies and approvals
- Product decisions already resolved:
- Dependency/native/config approval required:
- Migration or external dashboard action required:

## Data and interface contract
- Inputs and outputs:
- Persisted fields and migration:
- Offline behavior:
- Sync and conflict behavior:
- Entitlement behavior:
- Analytics events and prohibited payload data:

## Implementation sequence
1. First smallest verifiable change.
2. Repository/domain change.
3. UI integration using existing components and tokens.
4. Recovery and accessibility states.
5. Tests and verification.

## Acceptance criteria
- Observable criterion written as pass/fail behavior.

## Verification evidence
- `npx tsc --noEmit` result:
- Focused test result:
- Migration/offline/sync result when applicable:
- Day/Lamp and accessibility result when applicable:
- Physical-device/store result when applicable:
```

Before implementing, the assigned agent must replace the angle-bracket fields and convert the relevant completion criteria from this document into explicit pass/fail items. If it cannot identify the existing owner files, it must use the repository's scoped graphify workflow rather than inventing a parallel module. If a required approval or product decision is missing, it must leave the feature disabled and report that exact boundary.

This plan is complete enough to decompose into implementation tickets. It is not authorization to add dependencies, change native configuration, run EAS, create store products, handle production secrets, or push Git changes; those actions still require the approvals defined by the repository rules.
