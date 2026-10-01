# Lamplight — Comprehensive Testing & QA Audit

> **Purpose**: What needs to be tested, why, and in what priority order.
> This is a read-only audit — no fixes applied.

---

## Priority Legend

| Tag | Meaning |
|-----|---------|
| 🔴 **P0** | Blocks alpha launch. Data loss, crashes, or broken core flows. |
| 🟠 **P1** | High-impact UX or correctness issues your 10–15 beta testers will hit immediately. |
| 🟡 **P2** | Polish, consistency, and robustness. Should be fixed before wider rollout. |
| 🟢 **P3** | Nice-to-have. Won't block anything but improves quality. |

---

## 1. Core Reading Flow (The Make-or-Break Path)

This is the single most important flow. If reading feels broken, nothing else matters.

### 🔴 P0 — Reader Stability & Data Integrity

| # | What to Test | Why |
|---|---|---|
| 1.1 | **Open a Gutenberg book → read 10+ pages → background the app → reopen** | Reading position must survive app backgrounding. If `reading_positions` loses progress, users lose trust instantly. Verify `percent_complete` uses `MAX()` and never regresses. |
| 1.2 | **Open a Bangla / Japanese / Korean book → read through chapters** | CJK and Bengali text rendering with correct fonts (NotoSerifJP, NotoSerifKR, AnekBangla, Amiri) and line-height buffers (+2.5px for kanji/furigana). A rendering crash here blocks an entire language vertical. |
| 1.3 | **Open an imported EPUB → paginate through** | User-imported EPUBs are the only truly "unlimited free forever" feature. If EPUB import or rendering breaks, the core value prop dies. |
| 1.4 | **Read a chapter → force-kill the app mid-page → relaunch** | `reading_sessions` must record partial sessions. The resume card on Homescreen must point to the correct chapter and page. |
| 1.5 | **Rapid page turns (spam swipe 20+ times fast)** | Android SQLite serialization queue (`db/client.ts`) must not deadlock or drop position writes under rapid mutation pressure. |
| 1.6 | **Open Reader → toggle Day ↔ Lamp mode → continue reading** | Theme transition must not cause layout reflow, font size jump, or page position loss. The 200ms bezier transition should be smooth. |
| 1.7 | **Tap a word → view translation → save word → verify highlight in text** | This is the reading-to-learning loop. If any step breaks (translation API fails, word doesn't save, highlight doesn't render), the core vocabulary acquisition flow is dead. |
| 1.8 | **Read offline (airplane mode) for 30 minutes, then reconnect** | All position writes, saved words, and highlights must be queued in `sync_outbox` and flush correctly on reconnect. |

### 🟠 P1 — Reader UX Quality

| # | What to Test | Why |
|---|---|---|
| 1.9 | **Typography controls: change font size and line spacing** | Must respect the floor rule: Lora ≥ 17px, line-height ≥ 1.85. If the slider allows going below, it violates a locked design constraint. |
| 1.10 | **Ambient audio: toggle Rain → toggle Crickets → switch chapters** | Audio must loop, respect device volume, and clean up on Reader unmount. Leaked audio players are a common React Native bug. |
| 1.11 | **Page turn sound + haptics** | Verify `usePageTurnSound` fires correctly and respects the `soundPrefs` toggle in Settings. |
| 1.12 | **Reader bottom bar auto-hide after 2 seconds (`chromeAutoHideMs: 2000`)** | Chrome must fade after 2s of no interaction and reappear on tap. Broken auto-hide makes the reader feel janky. |
| 1.13 | **RTL reading (Arabic books / Quran verses)** | The entire reader must mirror — text alignment, page direction, swipe direction. `isRTL` from ThemeProvider drives this. |
| 1.14 | **Deep-link from saved word back to exact sentence in book** | Vocabulary tab → tap word → jump to `reader/[bookId]` with `jumpChapter` and `jumpVerse` params. If the anchor math is wrong, the feature is useless. |

---

## 2. Authentication & Session Management

### 🔴 P0 — Auth Correctness

| # | What to Test | Why |
|---|---|---|
| 2.1 | **Fresh install → app opens → verify anonymous `auth.uid()` is created** | The entire data model depends on every row having a real user ID from moment one. If anonymous signup fails silently, all writes are orphaned. |
| 2.2 | **Guest → tap "Protect Account" → enter email → receive OTP → verify → confirm `auth.uid()` is unchanged** | The seamless upgrade must NOT change the user ID. If it does, all reading positions, saved words, and highlights become inaccessible. |
| 2.3 | **Guest → protect with an email that already has an account → merge flow triggers** | `accountMergeService.ts` must snapshot local data, fetch cloud data, and merge in a single SQLite transaction. Test: does it keep the furthest `percent_complete`? Does it union words without duplicates? |
| 2.4 | **Google OAuth sign-in → PKCE flow completes → tokens stored in SecureStore** | Test on both Android and iOS. The PKCE exchange (`expo-web-browser` + `expo-linking`) is notoriously fragile on Android with deep link interception. |
| 2.5 | **Token refresh after 1+ hour idle** | Supabase access tokens expire. `refreshSession()` must silently refresh via `/auth/v1/token?grant_type=refresh_token` without user intervention. If it fails, every API call 401s. |
| 2.6 | **Sign out → choose "Keep local data" → verify anonymous session reinitializes** | After sign-out, the app must remain fully functional with a new anonymous session. No crash, no blank screens. |
| 2.7 | **Sign out → choose "Wipe local data" → verify clean slate** | All SQLite tables must be cleared. `sync_outbox` must be purged. App must restart cleanly as if fresh install. |
| 2.8 | **Legacy credential migration (`migrateLegacyCredentials`)** | Users updating from older versions may have tokens in SQLite `app_settings`. Migration must move them to SecureStore and purge SQLite. Test with a simulated legacy DB state. |

### 🟠 P1 — Auth Edge Cases

| # | What to Test | Why |
|---|---|---|
| 2.9 | **App crash during account merge (kill app mid-merge)** | `reconcilePendingMergeJournals()` must detect the incomplete merge on next launch and mark it `failed` without data corruption. |
| 2.10 | **Network loss during OTP verification** | User types correct OTP but network drops. Error must be clear ("Network error, try again") not cryptic. |
| 2.11 | **Double-tap on Google Sign-In button** | Must not open two browser sessions or fire two PKCE exchanges. |

---

## 3. Guest Mode → Free → Premium Tier Gates

This is the monetization funnel. Every gate must feel fair, not broken.

### 🔴 P0 — Tier Enforcement Correctness

| # | What to Test | Why |
|---|---|---|
| 3.1 | **Guest: save 16th word on a single book** | Must hit the 15-word cap and trigger `AccountProtectionModal` with messaging about upgrading to Free (30 words). Must NOT silently drop the word. |
| 3.2 | **Guest: save 6th quote on a single book** | Must hit the 5-quote cap. Same gate behavior. |
| 3.3 | **Guest: perform 21st translation in a day** | Must hit the 20/day rate limit. Translation popup must show a clear "daily limit reached" message, not a generic error. |
| 3.4 | **Free user: save 31st word on a single book** | Must hit the 30-word cap and prompt upgrade to Premium (unlimited). |
| 3.5 | **Free user: save 16th quote on a single book** | Must hit the 15-quote cap. |
| 3.6 | **Free user: perform 51st translation in a day** | Must hit the 50/day cap. |
| 3.7 | **Premium user: verify all caps are removed** | Unlimited words, quotes, translations. No gate should ever appear. |
| 3.8 | **Free user: try to start a weekly quiz** | Free tier gets 1 free sample quiz. Second attempt should push to `/paywall` or show `AccountProtectionModal`. Verify `evaluateQuizGate` logic. |

### 🟠 P1 — Anti-Tamper & Security

| # | What to Test | Why |
|---|---|---|
| 3.9 | **Manually edit SQLite entitlement rows on a rooted device** | `entitlementCrypto.ts` uses HMAC-SHA256 verification. Modified rows must fail integrity check and downgrade to Free. |
| 3.10 | **Roll device clock back 1 hour during a trial** | Monotonic clock defense should detect the backward roll (> 5 min threshold) and flag `clockTampered = true`. |
| 3.11 | **Subscription expires while offline for 48 hours** | The 72-hour offline grace period must keep Premium active. At 73 hours, it must downgrade gracefully. |
| 3.12 | **RevenueCat webhook fires subscription cancellation** | `revenuecat-webhook` Edge Function must update `profiles.plan_key` to `'free'` and `subscriptions.status` to `'cancelled'`. |

### 🟡 P2 — Paywall UX

| # | What to Test | Why |
|---|---|---|
| 3.13 | **Paywall screen: verify dynamic copy matches trigger** | Opening `/paywall?feature=unlimited_learning&trigger=vocab_limit` must show vocabulary-specific copy, not generic text. |
| 3.14 | **Paywall remote kill-switch** | If `useAppFlag('premium_visibility_enabled')` returns `false`, the entire paywall must be hidden. Settings must not show upgrade banners. |
| 3.15 | **Restore purchases flow** | RevenueCat `restore()` must re-grant entitlements for users who reinstalled the app. |
| 3.16 | **Promo code redemption** | `RedeemPromoModal` → enter code → Supabase RPC `redeem_promo` → verify plan upgrades. Also test rate-limiting (lockout timer after failed attempts). |

---

## 4. Onboarding Flow

### 🔴 P0 — First Impression

| # | What to Test | Why |
|---|---|---|
| 4.1 | **Fresh install → complete all 7 onboarding slides → land on Homescreen** | If onboarding breaks or loops, the user can never reach the app. This is the absolute first impression. |
| 4.2 | **Select mother tongue (Bengali) → verify literary theme auto-suggests Bengali** | The culture-matching suggestion is a key UX moment. Wrong suggestion breaks the "this app understands me" feeling. |
| 4.3 | **Skip vocabulary calibration → verify 3-Door Starter appears on Homescreen** | Skipping must not crash. Homescreen must show gentle/balanced/deep starter selector instead of a specific book recommendation. |
| 4.4 | **Complete calibration → verify specific starting book recommendation appears** | The calibrated word count must drive the book recommendation algorithm correctly. |
| 4.5 | **Hardware back button during onboarding (Android)** | Must navigate between slides, not exit the app. The custom `BackHandler` logic must work. |

### 🟠 P1 — Onboarding Edge Cases

| # | What to Test | Why |
|---|---|---|
| 4.6 | **Kill app mid-onboarding → relaunch** | Must resume onboarding, not skip to Homescreen with no languages set. `hasCompletedOnboarding()` must only return `true` after the final slide. |
| 4.7 | **Select Arabic as mother tongue → verify RTL layout activates** | `isRTL` must propagate immediately. If it doesn't, all subsequent screens are misaligned. |

---

## 5. Navigation & Page Flow

### 🟠 P1 — Tab & Stack Navigation

| # | What to Test | Why |
|---|---|---|
| 5.1 | **Tap each of the 4 tabs rapidly** | Tab switching uses `animation: 'none'`. Rapid taps must not cause blank screens or double-mounts. |
| 5.2 | **Home → Library → tap book → Book Detail → Read → back → back → back → Home** | Full forward-backward stack traversal. Each `router.back()` must return to the correct screen with preserved scroll position. |
| 5.3 | **Deep link: vocabulary word → jump to reader → back** | `router.push({ pathname: '/reader/[bookId]', params: { jumpChapter, jumpVerse } })` must navigate correctly AND return to vocabulary on back. |
| 5.4 | **Homescreen → Sacred Inquiries (`/mood-verses/ask`) → submit query → inquiry result → back → back** | The mood-verses sub-stack (`ask` → `inquiry` → `reflect` → `table`) must navigate cleanly without orphaned screens. |
| 5.5 | **Open paywall as modal → close → verify previous screen state is preserved** | Paywall uses `presentation: 'modal'`. Closing it must not reset the parent screen's state (scroll position, form inputs). |
| 5.6 | **Profile → Delete Account → type "DELETE" → confirm → verify redirect to fresh state** | Account deletion must wipe data, sign out, and redirect to root without crashes. |

### 🟡 P2 — Navigation Edge Cases

| # | What to Test | Why |
|---|---|---|
| 5.7 | **Open 5+ nested screens → Android system back button behavior** | Each press must go back one screen. The last press from the tab root should not exit the app unexpectedly. |
| 5.8 | **Torah index → tap Genesis → verify it routes to `/bible/[bookId]`** | Torah is a filtered view of Bible OT. The routing must correctly resolve to the Bible reader, not a 404. |
| 5.9 | **Rotate device (if rotation unlocked) on any screen** | Layout should not break. Not a primary concern for a reading app (usually portrait-locked), but worth a quick check. |

---

## 6. Library & Content Management

### 🟠 P1 — Catalog & Shelves

| # | What to Test | Why |
|---|---|---|
| 6.1 | **Library loads with local SQLite first, then background remote refresh** | The 2-phase loading strategy must show instant cached content, then silently update. No blank screen while waiting for network. |
| 6.2 | **Create a custom shelf → add 3 books → verify shelf appears in Library** | End-to-end shelf management. Both "shelf-first" and "book-first" flows (from Book Detail's "Add to shelf" button). |
| 6.3 | **Delete a shelf → verify books are NOT deleted, only the shelf** | Shelf deletion must cascade `shelf_items` but never touch `books` or `reading_positions`. |
| 6.4 | **Import a local EPUB file → verify it appears in Library and Saved Books** | `source_type = 'user_upload'` must be set. The book must be readable offline immediately. |
| 6.5 | **Delete an imported EPUB from Saved Books → verify storage is reclaimed** | `deleteImportedBook` must remove the file from the filesystem and the row from SQLite. |
| 6.6 | **Filter library by language pills (English → 日本語 → 한국어 → বাংলা)** | Each filter must instantly narrow the catalog. Switching between filters must not cause stale results. |
| 6.7 | **Search library → type partial title → verify results update live** | Search must be responsive (< 200ms per keystroke). Empty results must show a proper empty state, not a blank screen. |

### 🟡 P2 — Download & Cache

| # | What to Test | Why |
|---|---|---|
| 6.8 | **Download a Gutenberg book → go to Saved Books → verify size shown** | `download_states` must track lifecycle (queued → downloading → ready). |
| 6.9 | **Download fails mid-way (simulate network drop) → verify retry UI** | `download_states` must show `failed` state with a retry button. |
| 6.10 | **Clear cache from Settings → verify books are removed from Saved Books but metadata persists in Library** | Cache clearing must not delete the book catalog entry — only the downloaded content. |

---

## 7. Scripture Verticals

### 🟠 P1 — Per-Tradition Testing

| # | What to Test | Why |
|---|---|---|
| 7.1 | **Quran: open Surah Al-Fatiha → read Arabic text → tap word → view Arabic + English lookup** | Arabic rendering with Amiri font, RTL layout, tashkeel diacritics. If any of this breaks, the Quran vertical is unusable. |
| 7.2 | **Quran: expand Tafsir commentary on a verse** | Tafsir is expandable content below each verse. Must not break verse layout. |
| 7.3 | **Quran: play audio recitation (`QuranRecitationButton`)** | Streaming audio must play the correct Surah, handle buffering, and stop cleanly on navigation. |
| 7.4 | **Bible OT: open Genesis → navigate chapters → verify continue reading card updates** | `bible_reading_position` must track per-book progress. |
| 7.5 | **Bible NT: verify Greek/English interlinear display** | The NT reader has interlinear mode. Greek text must render with correct Unicode and alignment. |
| 7.6 | **Vedas: open Mandala 1 → read hymns → verify Sanskrit transliteration** | Sanskrit text rendering with devanagari/IAST transliteration. |
| 7.7 | **Torah: verify it correctly filters to Genesis–Deuteronomy only** | Torah index must show exactly 5 books, not the full OT. |
| 7.8 | **Save a scripture verse → verify it appears in Vocabulary → Verses tab** | Cross-vertical: saved Quran/Bible verses must aggregate in the Notebook's Verses sub-tab. |
| 7.9 | **Share a scripture verse → verify verse-share card generates correctly** | `router.push({ pathname: '/verse-share', params: { text, attribution } })` must produce a shareable image. |

---

## 8. Vocabulary & Learning Features

### 🟠 P1 — Flashcards & Quizzes

| # | What to Test | Why |
|---|---|---|
| 8.1 | **Save 5+ words → open Review tab → verify flashcard deck loads** | Below-threshold nudge: if words < threshold, must show "read N more to test your memory" instead of launching cards. |
| 8.2 | **Flashcard flip animation → tap to reveal → rate difficulty (5-button Leitner)** | The SRS review must update `srs_stage`, `srs_interval_days`, `srs_ease_factor`, `srs_due_date` correctly. |
| 8.3 | **Complete a cloze quiz → verify results breakdown** | Fill-in-the-blank quiz must pull from literary context. Results must show correct/incorrect with explanations. |
| 8.4 | **Create a custom vocabulary deck → add words → review deck** | `vocabulary_decks` and `vocabulary_deck_items` must cascade correctly. Deleting a deck must not delete the words. |
| 8.5 | **Export notes as Markdown and JSON** | `readerNotes.ts` export must produce valid, downloadable files. |
| 8.6 | **Daily review prompt on Library screen** | `VocabReviewPrompt` must appear once-a-day when SRS reviews are due, then dismiss for 24 hours. |

### 🟡 P2 — Quote Sharing

| # | What to Test | Why |
|---|---|---|
| 8.7 | **Save a quote → open quote-share → select theme → export image** | Quote card generation with 3 free themes. Image must render typography correctly (Lora, culture-matched fonts). |
| 8.8 | **Quote with cloud translation** | `quote-share/[highlightId].tsx` supports optional translation. Verify it fetches and renders without timeout. |
| 8.9 | **Guest: verify limited to 3 free quote card themes** | Must not expose premium themes without subscription. |

---

## 9. Settings & Preferences

### 🟠 P1 — Settings Persistence

| # | What to Test | Why |
|---|---|---|
| 9.1 | **Change Day → Lamp → kill app → relaunch → verify Lamp persists** | `useReadingTheme()` must persist to `app_settings` via `useSyncExternalStore`. Cold start must restore the correct scheme. |
| 9.2 | **Change literary theme (Bengali → Japanese → Korean) → verify entire app recolors** | Every screen using `useTheme()` must pick up the new culture palette. Verify Homescreen banner, Library shelf materials, Reader background all change. |
| 9.3 | **Change mother tongue → verify UI translations, monograms, and companion shelf update** | `useMotherTongue()` drives greeting text, script monograms in `CultureEditionBanner`, and companion literature shelf in Library. |
| 9.4 | **Change target reading language → verify Homescreen spotlight and vocabulary calibration reset** | `useTargetReadingLanguage()` drives the primary curated shelves and reading recommendations. |
| 9.5 | **Translation usage meter in Settings** | Must show accurate `X/50` (free) or `X/20` (guest) daily usage. Must reset at midnight. |
| 9.6 | **Cloud sync: force sync → verify data appears on second device** | For authenticated users, `triggerSync({ forceImmediate: true })` must push all `sync_outbox` items. |
| 9.7 | **Clear storage cache → verify reclaimed space number is accurate** | `cache_entries` LRU cache must report correct sizes. |

---

## 10. Sync & Offline Data Layer

### 🔴 P0 — Data Integrity

| # | What to Test | Why |
|---|---|---|
| 10.1 | **Read offline for 1 hour → reconnect → verify sync_outbox flushes** | All queued mutations (positions, words, highlights, shelves) must sync without loss. Compaction must collapse redundant writes. |
| 10.2 | **Edit on Device A → edit same book on Device B → sync → verify conflict resolution** | Reading positions: latest timestamp + furthest progress wins. Words: union by `book_id + source_word`. Highlights: union by ID. |
| 10.3 | **Outbox compaction: save word → delete same word → sync** | The delete must cancel the unpushed upsert. Net result: 0 mutations sent to server. |
| 10.4 | **Offline translation → queued in `pending_word_lookups` → reconnect → verify auto-resolution** | Exponential backoff (5s → 30s → 2m → 10m → 1h) must work. Resolved lookups must auto-promote to `saved_words`. |

### 🟠 P1 — Cloud Restore

| # | What to Test | Why |
|---|---|---|
| 10.5 | **Restore screen: verify per-item progress indicators** | `restore.tsx` shows itemized recovery (shelves, positions, words, notes, catalog). Each item must show progress and handle failures with retry. |
| 10.6 | **Guest tries to restore → must prompt sign-in** | `isAuthenticatedAccount()` gate must prevent restore for anonymous users. |

---

## 11. UI/UX Consistency & Design Token Compliance

### 🟡 P2 — Hardcoded Values Audit

These are design-system violations that make the app feel inconsistent. **All should be fixed before beta.**

| # | What to Fix | Where | Why |
|---|---|---|---|
| 11.1 | **Hardcoded `#FFFFFF`** | `AuthCard.tsx` (L228, L351), `AccountProtectionModal.tsx` (L306) | Should use `colors.card` or a semantic white token. Breaks if you ever adjust card surface colors. |
| 11.2 | **Hardcoded dark surfaces** | `AuthCard.tsx` (`#1B1A1E`, `#232026`, `#1E1B22`), `AddToDeckModal.tsx` (`#262224`), `CalendarHeatmapCard.tsx` (`#232026`), `ReadingCadenceModal.tsx` (`#232023`) | 5 different shades of near-black that should all be `colors.card` or `colors.ember`. Looks inconsistent in Lamp mode. |
| 11.3 | **Hardcoded `#F5A623` in SVG** | `PaywallModal.tsx` (L33) | Should use `colors.flameAmber`. If the brand color ever shifts, this SVG won't update. |
| 11.4 | **Hardcoded font family** | `AccountProtectionModal.tsx` (L579): `'Manrope_600SemiBold'` | Should use `FontFamily.manropeSemiBold` or typography tokens. |
| 11.5 | **Default icon color `#000`** | `icons.tsx`: `ShieldIcon` (L669), `CompanionIcon` (L690) | Pure black is never used in the design system (`primaryDark` is `#1C1B1E`). These will look wrong on any non-white surface. |
| 11.6 | **Inconsistent button heights** | Multiple components use `height: 44` or `height: 48` | Design system defines `Layout.buttonHeight = 52`. Inconsistent button sizes make the app feel unpolished. |
| 11.7 | **Inconsistent padding/margins** | Many components hardcode `20`, `22` instead of `Layout.screenMargin` (24) or `Spacing.lg` (20) / `Spacing.xl` (24) | Use tokens for consistent spatial rhythm. |
| 11.8 | **Scattered `rgba(245, 166, 35, *)` amber tints** | 10+ modal/card files | Consolidate into semantic token helpers (e.g., `colors.flameAmber15`, `colors.flameAmber25`). |

---

## 12. Accessibility (Critical Gap)

> [!CAUTION]
> **Only 6 out of 30 shared components have any accessibility attributes.** This is the single largest quality gap in the entire app.

### 🟡 P2 — Accessibility Compliance

| # | What to Add | Affected Components | Why |
|---|---|---|---|
| 12.1 | **`accessibilityRole="button"` on all `<Pressable>` elements** | 24 of 30 components | Screen readers cannot identify interactive elements. Blind users literally cannot use the app. |
| 12.2 | **`accessibilityLabel` on all interactive elements** | Buttons in: `AddToShelfSheet`, `BookSpine`, `ConfirmDialog`, `FeedbackModal`, `HomeGuideModal`, `MilestoneCelebrationModal`, `MotherTonguePicker`, `PaywallModal`, `ReadingCadenceModal`, `RedeemPromoModal`, `ShelfEditorModal`, `VocabReviewPrompt`, `WhatsNewOverlay` | Without labels, screen readers announce "button" with no context. |
| 12.3 | **`accessibilityViewIsModal` on all `<Modal>` components** | Every modal/sheet in the app | Without this, screen readers can focus on content behind the modal, causing confusion. |
| 12.4 | **`accessibilityLiveRegion="polite"` on error/status messages** | `AccountProtectionModal`, `AddToDeckModal`, `AuthCard`, `FeedbackModal`, `RedeemPromoModal` | Error messages must be announced to screen readers when they appear. |
| 12.5 | **`accessibilityElementsHidden={true}` on decorative animations** | `FlameGlow`, `AuthBackgroundAnimation`, `NotebookIllustrations`, `CultureMotif` | Decorative elements must be hidden from the accessibility tree. |
| 12.6 | **`accessibilityRole="tab"` + `accessibilityState={{ selected }}` on tab segments** | `AuthCard` (Sign In / Create Account tabs), `LiteraryThemePicker` theme cards | Tab-like UI must announce selection state. |
| 12.7 | **`accessibilityLabel` on `LanguageBadge` script glyphs** | `LanguageBadge.tsx` | Glyphs like 'অ', 'あ', '책' are meaningless to screen readers without a label like "Bengali". |
| 12.8 | **`accessibilityLabel` on `CalendarHeatmapCard` day cells** | `CalendarHeatmapCard.tsx` | 365+ individual pressable cells with no labels. Each needs "September 29: 15 minutes read". |
| 12.9 | **`accessibilityRole="progressbar"` on `SkeletonRows`** | `SkeletonRows.tsx` | Loading placeholders should be announced as loading indicators. |

---

## 13. Empty States, Loading States & Error Handling

### 🟠 P1 — State Coverage Gaps

| # | What to Test | Why |
|---|---|---|
| 13.1 | **Library with zero books (fresh install, no network)** | Must show `ScreenStateView` with `type='empty'` and a CTA to browse catalogs or import EPUB. Not a blank screen. |
| 13.2 | **Vocabulary tab with zero saved words** | Must show `WordsIllustration` (animated turning page). Not a blank list. |
| 13.3 | **Flashcards with zero words** | Must show `FlashcardsIllustration`. Not an empty deck. |
| 13.4 | **Quotes tab with zero highlights** | Must show `QuotesIllustration`. Not a blank list. |
| 13.5 | **CalendarHeatmapCard with no reading data** | Returns `null` — verify the profile screen still renders correctly without it. |
| 13.6 | **Book Detail for a book whose cover CDN URL fails** | Must fall back to painted cloth spine (`coverFailed` state in `BookSpine`). Must NOT show a broken image placeholder. |
| 13.7 | **Translation API failure (Groq AI down)** | Word-tap popup must show a clear error state, not crash or freeze. |
| 13.8 | **Supabase completely unreachable (no EXPO_PUBLIC_SUPABASE_URL)** | App must degrade gracefully to local-only SQLite mode. No crashes, no error modals on every screen. |
| 13.9 | **Context verses search with no results** | Mood-verses screens must show a "no matching verses" state, not an infinite spinner. |
| 13.10 | **`ScreenStateView` — test every type** | Verify all 7 states render correctly: `loading`, `empty`, `error`, `offline`, `permission_denied`, `free_limit`, `premium_locked`. |

---

## 14. Mood Verses & Sacred Inquiries

### 🟠 P1 — AI-Powered Features

| # | What to Test | Why |
|---|---|---|
| 14.1 | **Type a mood query → verify pgvector search returns relevant verses** | The core semantic search must work. Verify the Edge Function uses `Supabase/gte-small` (384-dim) — never a different model. |
| 14.2 | **Voice input (microphone button) → transcription → query submission** | `useAudioRecorder` + `transcribeAudioUri` (Whisper). Test on both platforms. Microphone permissions must be requested correctly. |
| 14.3 | **Rate limiting (`checkAIRateLimit`)** | Must prevent abuse without blocking normal use. Verify error message is user-friendly. |
| 14.4 | **Sacred Inquiries: multi-tradition comparative answers** | `ScriptureInquiryDeck` must show balanced answers from Islam, Christianity, Judaism, and Hinduism without favoritism. |
| 14.5 | **Reflect deck: swipeable verse cards** | `VerseDeckView` with preset moods (Anxiety, Burnout, Grief, Peace, Guidance, Gratitude). Each preset must return relevant results. |

---

## 15. OTA Updates & App Lifecycle

### 🟡 P2 — Update Flow

| # | What to Test | Why |
|---|---|---|
| 15.1 | **OTA update available → in-app banner appears → user taps "Update" → app reloads** | `useAppUpdateBanner` states: checking → downloading → ready → error. Each must render correctly. |
| 15.2 | **OTA update while in Reader** | `AppUpdatePrompt` hides when pathname includes `/reader/`. Must not interrupt reading. |
| 15.3 | **Database migration after OTA update** | If a new `user_version` migration exists (v1 → v24), it must run idempotently. `PRAGMA table_info` checks must handle missing columns gracefully. |
| 15.4 | **WhatsNewOverlay on version bump** | Must show once per version, then never again. `hydrateWhatsNewStatus()` must track correctly. |

---

## 16. Platform-Specific Issues

### 🟠 P1 — Android

| # | What to Test | Why |
|---|---|---|
| 16.1 | **SQLite concurrent query crash** | The serializing queue in `db/client.ts` must prevent `NativeDatabase.prepareAsync cannot be cast to NativeStatement`. Test by rapid-fire reading + saving words simultaneously. |
| 16.2 | **Cover image CDN multi-hop redirects** | Open Library / Wikimedia thumbs fail on Android `expo-image` due to multi-hop redirects returning 1x1 transparent pixels. All covers must come from Supabase CDN or fall back to cloth spine. |
| 16.3 | **Google OAuth deep link interception** | Android app links can be intercepted by other apps. Verify the PKCE callback returns to Lamplight, not Chrome. |
| 16.4 | **System back button behavior on every screen** | Must navigate correctly, never exit the app unexpectedly from a nested screen. |
| 16.5 | **Root layout background flicker** | `SystemUI.setBackgroundColorAsync` in `_layout.tsx` must prevent the white flash between fragment transitions. |

### 🟠 P1 — iOS

| # | What to Test | Why |
|---|---|---|
| 16.6 | **SecureStore Keychain access after app update** | `expo-secure-store` tokens must survive app updates. If they don't, the user is silently signed out. |
| 16.7 | **Keyboard avoidance on login/signup screens** | `KeyboardAvoidingView` must not push content off-screen when the keyboard appears. Test with different iPhone sizes (SE, Pro Max). |
| 16.8 | **Safe area insets on notched devices** | All screens must respect safe areas (top notch, bottom home indicator). |

---

## 17. Analytics & Telemetry

### 🟡 P2 — Event Tracking

| # | What to Test | Why |
|---|---|---|
| 17.1 | **Verify `analytics_queue` logs key events** | Events: quote saved, word saved, quiz completed, ambient sound played, shelf created, book imported. Each must appear in the queue. |
| 17.2 | **Analytics queue caps (max 500 items, 30-day pruning)** | Queue must not grow unbounded. Old items must be pruned. |
| 17.3 | **Reading session tracking** | Reader focus → blur must create a `reading_sessions` row with correct duration. |
| 17.4 | **Beta tester flag** | `profiles.is_beta_tester = true` must be set for your 10–15 friends. Verify the cohort tracking works. |

---

## 18. Missing Primitives (Architecture Debt)

These aren't bugs, but structural gaps that will cause inconsistency as the app grows.

### 🟢 P3 — Component Architecture

| # | Observation | Recommendation | Why |
|---|---|---|---|
| 18.1 | **No generic `<Button>` primitive** | Every component builds buttons ad-hoc with `<Pressable>` + inline styles | Inconsistent touch targets (44, 48, 52px), inconsistent accessibility, inconsistent feedback. A single `<LamplightButton>` would fix 24 components at once. |
| 18.2 | **No generic `<Card>` primitive** | Every surface uses raw `<View>` with manual `backgroundColor`, `borderRadius`, `borderColor` | One token change requires editing dozens of files. A `<LamplightCard>` would centralize surface styling. |
| 18.3 | **Backdrop opacity inconsistency** | Modals use 6 different backdrop opacities: `0.55`, `0.58`, `0.62`, `0.65`, plus one at `rgba(28,27,30,0.55)` | Pick one (e.g., `0.6`) and make it a token. |
| 18.4 | **No semantic amber tint tokens** | `rgba(245, 166, 35, 0.15)` appears in 10+ files with varying opacities | Add `flameAmber12`, `flameAmber15`, `flameAmber25`, etc. to `tokens.ts`. |

---

## 19. Testing Priority Summary

### What to test FIRST (blocks alpha):

```
🔴 P0 — 18 items
├── Reader stability (8 items: position save, crash recovery, offline, rapid turns)
├── Auth correctness (8 items: anonymous signup, account upgrade, merge, OAuth, refresh)
├── Tier enforcement (2 items: word/quote/translation caps per tier)
└── Onboarding completion (2 items: full flow, skip calibration)
```

### What to test NEXT (beta testers will hit):

```
🟠 P1 — 42 items
├── Reader UX quality (6 items: typography, ambient audio, RTL, deep-links)
├── Auth edge cases (3 items: crash during merge, network loss, double-tap)
├── Tier gates & anti-tamper (4 items: rooted device, clock roll, offline grace)
├── Navigation flow (6 items: tab switching, stack traversal, deep links)
├── Library & content (7 items: catalog loading, shelves, EPUB, search)
├── Scripture verticals (9 items: Quran, Bible, Vedas, Torah, verse sharing)
├── Vocabulary & learning (6 items: flashcards, quizzes, decks, review prompts)
├── Sync & offline (6 items: outbox flush, conflict resolution, restore)
├── Settings persistence (7 items: theme, language, mother tongue, sync)
├── AI features (5 items: mood search, voice input, rate limiting)
└── Platform-specific (8 items: Android SQLite, iOS Keychain, keyboard)
```

### What to fix for polish:

```
🟡 P2 — 25 items
├── Design token violations (8 items: hardcoded colors, fonts, spacing)
├── Accessibility (9 items: roles, labels, live regions, modal focus)
├── Empty/error state coverage (10 items: every screen's zero-state)
├── OTA update flow (4 items: banner, migration, WhatsNew)
└── Paywall UX (4 items: dynamic copy, kill-switch, restore, promo)

🟢 P3 — 4 items
└── Missing primitives (Button, Card, backdrop token, amber tints)
```

---

> **Recommended approach**: Walk through all P0 items on a physical Android device first (Android has the most platform-specific gotchas — SQLite locking, deep link interception, cover CDN redirects, back button). Then repeat on iOS. P1 items can be distributed across your beta testers as structured test scenarios.
