# Lamplight — Latest Features Implementation Plan

## Purpose

This document specifies the next implementation work for:

1. Flashcard/review eligibility and the Notebook study experience.
2. Book-scoped quizzes.
3. Guest use, protected accounts, local-first sync, and recovery.
4. Offline feature availability, caching, storage pressure, and reconnection.
5. Premium entitlements, trials, promotions, and feature gating.
6. First-run onboarding and one-time What's New behavior.
7. A free/Premium split that demonstrates Premium value without weakening the reading experience.

It extends `polished_features.md`. If the two documents disagree, use this document for the features above and retain `polished_features.md` for selector, retention, and general sync principles.

No implementation should add a dependency, change native configuration, run EAS, or alter billing setup without explicit approval. All SQLite access must continue through `src/db/client.ts`.

---

## 1. Decisions and canonical terms

These decisions remove ambiguity for implementation.

### 1.1 Vocabulary rules

| Term | Exact meaning |
|---|---|
| **Review unlock threshold** | Five saved words across the whole local vocabulary collection. Constant: `MIN_REVIEW_WORDS = 5`. |
| **Review unlocked** | `totalSavedWordCount >= 5`. Once unlocked, it remains unlocked unless deletion reduces the collection below five. |
| **Due words** | Saved words whose `srs_due_date <= now`, including unscheduled legacy rows with `srs_due_date = 0`. |
| **Daily review prompt eligible** | Review is unlocked, at least one word is due, today's review checkpoint is incomplete, and the prompt has not already been dismissed today. |
| **Quiz book threshold** | Five saved words from one book. Constant: `MIN_QUIZ_WORDS_PER_BOOK = 5`. |
| **Quiz-eligible book** | A book whose current saved-word count is at least five. |
| **Quiz session size** | At most five questions, using the existing `QUIZ_QUESTION_LIMIT = 5`. |

The threshold is **not five newly saved words every day**. Requiring five new saves each day would repeatedly lock an already-earned learning feature and encourage low-quality saves. The daily behavior comes from SRS due dates and the daily checkpoint. The fifth total saved word unlocks Review immediately; the fifth saved word in a book unlocks that book in Quiz immediately.

Newly saved words may unlock the UI immediately, but the automatic daily prompt should prefer words saved before the current local day. This preserves the current principle that a word saved minutes ago is not meaningful delayed recall. Manual Review remains available after the global threshold is reached.

### 1.2 Identity terms

| Term | Exact meaning |
|---|---|
| **Guest identity** | The silently created Supabase anonymous user plus the device's local SQLite data. It is authenticated technically, but the reader has not created a recoverable account. |
| **Protected account** | A Supabase user with a verified email or linked OAuth identity that can sign in on another device. |
| **Local-first** | SQLite is the immediate UI source and accepts writes without a network connection. |
| **Sync** | Eventual upload/download of user-owned metadata. Sync never means reading directly from Supabase for ordinary screens. |
| **Entitlement** | Server-authoritative permission to use a Premium capability for a defined interval. |
| **Plan** | A product bundle such as `free` or `premium`; it is not itself proof of purchase. |
| **Grant** | One source of an entitlement: subscription, store trial, promo, beta, support, or admin. |

### 1.3 Lifecycle terms

| Term | Exact meaning |
|---|---|
| **First-run onboarding** | Splash/introduction/language/calibration screens shown only to a genuinely new local user. This is the requested “split screens” behavior. |
| **Release key** | A stable identifier for the installed native build or applied OTA update. |
| **What's New** | A release-specific overlay shown once on a device after that release is installed and applied. It is not onboarding. |

### 1.4 Offline terms

| Term | Exact meaning |
|---|---|
| **Offline-capable** | The action completes against local data without waiting for or requiring a network request. |
| **Offline-degraded** | The feature remains usable with cached/local content but cannot fetch fresh remote content. |
| **Network-required** | The action cannot truthfully complete without server/store/provider confirmation. |
| **Durable local data** | User-owned data retained until the reader explicitly deletes it, clears app data, or chooses account-data removal. It is not an evictable cache. |
| **Rebuildable cache** | Data that can be downloaded or generated again and may be evicted under the retention policy. |
| **Soft expiry** | Cached data may be displayed offline but should refresh opportunistically online. |
| **Hard expiry** | Cached data may no longer drive the affected feature; show a safe fallback or require reconnection. User-owned data never receives a hard expiry. |
| **Pending mutation** | A completed local write that has not yet been acknowledged by the server. |
| **Pending lookup** | A word/selection intentionally saved offline but still waiting for a translation/enrichment provider. It does not enter Review or Quiz until resolved. |

---

## 2. Current baseline and required corrections

### Existing foundations to reuse

- `src/app/(tabs)/vocabulary.tsx` already renders Words, Flashcards, Quotes, and Verses; runs SRS review; offers normal/fresh/synonym cloze modes; persists a daily checkpoint; and limits quizzes to five questions.
- `src/db/repositories/savedWords.ts` already supports total, per-book, due, and daily saved-word queries.
- `src/features/vocabulary/srsAlgorithm.ts` is the scheduling source of truth.
- `src/lib/supabaseAuth.ts` already creates and refreshes an anonymous Supabase session.
- `src/features/settings/onboardingStatus.ts` already persists first-run completion locally.
- `src/features/app-update/whatsNew.ts` and `src/components/WhatsNewOverlay.tsx` already implement a version-keyed overlay.
- `src/features/subscription/subscriptionState.ts` is deliberately a single Premium-state stub.
- `supabase/schema.sql` already has plans, profiles, subscriptions, library metadata, saved words, quiz attempts, preferences, analytics, and RLS foundations.

### Corrections required before release

1. The Flashcards screen currently accepts any non-empty collection. It must use the five-word rule.
2. Quiz is currently reached after a review session. It must also exist as a separate book-scoped Notebook destination.
3. `onboardingStatus.ts` has a development override. Production is safe because it is guarded by `__DEV__`, but automated tests must explicitly cover both override states.
4. The existing What's New helper treats a fresh install with no stored value as pending. A fresh install must seed the current release as already known so What's New does not impersonate onboarding.
5. `isPremiumUser()` always returns `false`; no UI should gain more one-off Premium checks before the entitlement layer replaces it.
6. The current `profiles` update policy allows the owner to update the row containing `plan_key`. Premium authority must not be client-writable. Restrict writable profile fields and make entitlement changes service-role/webhook/RPC-only.
7. Auth refresh credentials are stored in general SQLite settings. Move refresh credentials to secure device storage before shipping protected accounts or sync. This requires dependency/native approval first.
8. Local and cloud saved-word/SRS shapes differ. Align them before sync rather than translating inconsistently at every call site.

---

## 3. Review and Quiz product contract

### 3.1 One aggregate eligibility query

Add one repository query rather than recomputing counts in screens:

```ts
type VocabularyEligibility = {
  totalSaved: number;
  dueCount: number;
  reviewableBeforeTodayCount: number;
  savedTodayCount: number;
  perBook: Array<{
    bookId: string;
    savedCount: number;
    dueCount: number;
    latestSavedAt: number;
  }>;
};

getVocabularyEligibility(nowMs?: number): Promise<VocabularyEligibility>
```

Implementation requirements:

- Use aggregate SQL in `savedWords.ts`; do not load all word bodies merely to count them.
- Calculate day boundaries in local time because the daily checkpoint and user-facing day are local.
- Return books with at least one saved word so the locked Quiz state can show progress.
- Keep `listSavedWords()` for actual Review/Quiz payloads.
- Add focused repository tests for local-midnight, daylight-saving changes where supported, empty collections, and deletes.

### 3.2 Review state machine

```text
LOADING
  -> LOCKED              totalSaved < 5
  -> READY               totalSaved >= 5 and dueCount > 0
  -> CAUGHT_UP           totalSaved >= 5 and dueCount = 0
  -> COMPLETED_TODAY     today's checkpoint says review finished

READY -> IN_SESSION -> COMPLETED_TODAY
COMPLETED_TODAY -> READY when user explicitly chooses another available batch
Any state -> LOCKED if deletions reduce totalSaved below 5
LOCKED -> READY/CAUGHT_UP immediately when the fifth word is saved
```

Do not store `review_unlocked` as a separate boolean. It is derived from the saved-word count and therefore cannot drift.

### 3.3 Locked Review UX

The Review tab remains visible; tapping it never opens a one-card deck.

Show:

- Heading: `Build your first review set`
- Progress: `X of 5 words saved`
- Exact nudge: `Save {5 - totalSaved} more {word/words} while reading to start reviewing.`
- Primary action: `Continue reading` if a recent book exists; otherwise `Browse books`.
- A five-step visual progress indicator using existing tokens.
- No paywall and no Premium label. The threshold is pedagogical, not commercial.

When the fifth word is saved while the reader is already on the Notebook screen, reload eligibility and replace the locked state without requiring an app restart or tab switch.

### 3.4 Ready and caught-up Review UX

- `READY`: start with due words, ordered by SRS due date, then shuffled within equivalent due groups. Preserve the existing maximum batch of 20.
- `CAUGHT_UP`: show `You're caught up` and the next due time if known. Offer `Practice anyway` using a small shuffled sample; do not change SRS state unless the reader grades cards.
- `COMPLETED_TODAY`: retain the existing completion actions, difficult-word replay, and optional Quiz CTA.
- The automatic Library/home prompt appears only when `daily review prompt eligible` is true.
- Dismissing the automatic prompt writes `vocabulary.review_prompt_dismissed.YYYY-MM-DD = 1`; it may reappear the next local day if still eligible.
- Completing Review writes the existing daily checkpoint and suppresses the prompt for that day.

### 3.5 Notebook information architecture

Change the Notebook bar to:

```text
Words | Review | Quiz | Quotes | Verses
```

Use the user-facing label `Review`; the internal route parameter may continue accepting `tab=flashcards` for backward compatibility. Add `tab=quiz`. Do not break existing daily-prompt navigation.

Five segments must be validated at 320 dp width and with larger accessibility text. If equal-width labels clip, make only the segmented control horizontally scrollable; do not shrink text below the design token's supported size.

### 3.6 Quiz tab state machine

```text
NO_ELIGIBLE_BOOKS
  -> BOOK_PICKER          any book reaches 5 saved words
BOOK_PICKER
  -> MODE_PICKER          reader selects an eligible book
MODE_PICKER
  -> IN_QUIZ              reader selects an available quiz mode
IN_QUIZ
  -> RESULT
RESULT
  -> MODE_PICKER | BOOK_PICKER | Notebook
```

#### No eligible books

Show:

- `Save 5 words from one book to unlock its quiz.`
- Per-book progress rows for books with 1–4 saved words, ordered closest to five and then most recently saved.
- Copy per row: `{count}/5 words · save {remaining} more`.
- A row opens that book at its most recent saved-word location when possible.

#### Book picker

Show only books with `savedCount >= 5`, as requested. Each row contains:

- Existing cover/spine component.
- Book title and author.
- `{savedCount} saved words`.
- Due count when greater than zero.
- Most recent Quiz score when quiz history exists.

The selected book ID is explicit state. Never pass the full all-books word collection to a book-scoped quiz.

#### Mode picker

Reuse existing quiz engines and vocabulary:

| Label | Existing mode | Free/Premium recommendation |
|---|---|---|
| **From the book** | `normal` | Free; original context cloze. |
| **New sentence** | `fresh` | One free sample per week; otherwise Premium. |
| **Similar words** | `synonyms` | One free sample per week; otherwise Premium. If cluster data is incomplete, explain and offer `From the book`; never create fake distractors. |

The post-Review Quiz CTA should pass the reviewed words directly as it does now. The standalone Quiz tab uses only words from the selected book and samples up to five questions.

### 3.7 Quiz history

Add a local `quiz_attempts` table when account sync work begins; do not block the initial tab split on it.

```text
quiz_attempts
  id TEXT PRIMARY KEY
  book_id TEXT NOT NULL
  mode TEXT NOT NULL
  started_at INTEGER NOT NULL
  completed_at INTEGER
  correct_count INTEGER NOT NULL
  question_count INTEGER NOT NULL
  answers_json TEXT NOT NULL
  created_at INTEGER NOT NULL
  updated_at INTEGER NOT NULL
  deleted_at INTEGER
```

Question detail needs stable saved-word IDs, correctness, response latency, and whether generated enrichment was used. Never store generated book text beyond what the existing privacy policy permits.

### 3.8 Review/Quiz edge cases

- A duplicate spelling saved from two books counts twice for global Review because each occurrence preserves distinct context; it counts once in each relevant book.
- Deleting the fifth word relocks the affected book Quiz and may relock global Review. Finish an already-open session, then show the new state; do not eject mid-question.
- A removed book with retained saved words must show `Unknown book` only as a migration fallback. Normal book deletion should ask whether learning data is retained or deleted.
- Imported EPUBs and catalog books follow the same threshold rules.
- Scripture words need a stable source key before they can appear in book-scoped Quiz. Until that mapping is defined, keep their current shared Review behavior and omit them from the prose-book picker rather than guessing a `bookId` contract.
- Offline generation failure must fall back to original-context Quiz, never block the basic quiz.

---

## 4. Account and feature-access plan

### 4.1 Product principle

The app does not require a visible login to begin reading. A guest should reach the first useful reading action before seeing an account request. Account creation is presented as protection and continuity: **Protect and sync my library**.

Supabase anonymous users cannot recover the same identity after sign-out, reinstall, or moving devices. Linking an identity is therefore the boundary between temporary guest continuity and a recoverable account.

### 4.2 Access matrix

| Capability | Guest identity | Protected free account | Protected Premium account |
|---|---:|---:|---:|
| Onboarding, catalog, EPUB import, offline reading | Yes | Yes | Yes |
| Save/view words, quotes, notes locally | Yes | Yes | Yes |
| Basic Review after five words | Yes | Yes | Yes |
| Basic book Quiz after five words | Yes | Yes | Yes |
| Basic translations within free policy | Yes | Yes | Yes |
| Export personal data | Yes | Yes | Yes |
| Account deletion/privacy controls | N/A except clear local data | Yes | Yes |
| Manual metadata backup/restore | No | Yes; explicit action for words, highlights, progress, settings, review, and quiz history | Yes |
| Automatic live multi-device sync | No | No | Yes |
| Imported EPUB/cover cloud backup | No | No | Yes, opt-in |
| Subscription purchase | Yes, but immediately offer account protection | Yes | Already entitled |
| Restore store purchase | Yes on the store account; link afterward | Yes | Yes |
| First-party promo redemption | No; require account protection first | Yes | Yes, with stacking rules |
| Community/private circles later | No | Yes | Yes according to feature tier |

Free readers must never lose access to local reading, their existing saved material, export, privacy controls, or purchase restoration because Premium expired.

### 4.3 Account state machine

```text
BOOTSTRAPPING
  -> GUEST_LOCAL            anonymous identity available or network unavailable
  -> PROTECTED              verified recoverable identity restored

GUEST_LOCAL
  -> LINKING                email magic link / OTP or approved OAuth begins
LINKING
  -> PROTECTED              identity linked to the same anonymous Supabase user
  -> GUEST_LOCAL            canceled or recoverable error
  -> MERGE_REQUIRED         entered identity already belongs to another account

PROTECTED
  -> OFFLINE_PROTECTED      token cannot refresh but cached identity/data remain
  -> SIGNING_OUT
OFFLINE_PROTECTED
  -> PROTECTED              refresh succeeds
SIGNING_OUT
  -> GUEST_LOCAL            only after local-data choice is completed
```

Never silently create a second permanent account after a link conflict.

### 4.4 Protect-account flow

1. Explain the benefit before requesting credentials: backup, restore, and cross-device continuity.
2. Default to email OTP/magic link. Add Google/Apple only in a separately approved native-auth task.
3. Link the identity to the existing anonymous user when the address is new.
4. Preserve the same Supabase user ID, local database, outbox, and RevenueCat identity alias.
5. Mark the account protected only after verification and a fresh server session.
6. Run the first sync only after showing `Your library is safe on this device while sync finishes.`

### 4.5 Existing-account sign-in and merge

An email already belonging to another account cannot be linked to the current anonymous user. Use this explicit flow:

1. Snapshot pending local mutations and count local books, words, highlights, notes, and reviews.
2. Ask: `Merge this device's reading data into your existing account?`
3. On confirmation, sign into the existing account.
4. Pull its cloud data into staging, not directly over live local rows.
5. Merge cloud and local records using the rules in section 5.
6. Commit the merged local transaction.
7. Enqueue local-only records under the protected owner.
8. Keep a recoverable merge journal until the first successful push/pull completes.

If any step fails, restore the pre-merge local view and leave the guest session recoverable. Never replace the local database wholesale.

### 4.6 Settings account surface

Show one Account card:

- Guest: `Your library is only on this device` and `Protect and sync`.
- Protected free: masked email, `Protected`, last backup/sync state, upgrade entry.
- Premium: masked email, `Premium until {date}` or `Renews {date}`, sync state, manage subscription, restore purchases.
- Always show a copyable support/user ID.
- Provide `Sync now`, `Restore purchases`, `Export my data`, `Sign out`, and `Delete account` where applicable.

Sign-out must ask whether to keep personal data locally or remove it from this device. Default nothing silently. Account deletion must state what is deleted remotely, what remains in device downloads, and any store subscription that must be canceled separately.

---

## 5. Local-first sync contract

### 5.1 Source of truth

- SQLite is the UI source of truth.
- Supabase is the durability and cross-device exchange layer.
- Network operations never sit inside a press handler's success path for local reading actions.
- Every syncable local mutation and its outbox item commit in one serialized SQLite transaction.

### 5.2 Required local tables

```text
sync_outbox
  id, entity_type, entity_id, operation, payload_json,
  idempotency_key, created_at, attempt_count, next_attempt_at, last_error_code

sync_cursor
  entity_type, last_server_revision, last_synced_at

cloud_library_map
  local_book_id, library_item_id, content_fingerprint, updated_at

sync_merge_journal
  id, started_at, prior_account_id, target_account_id,
  state, backup_reference, completed_at

review_events
  id, saved_word_id, grade, reviewed_at, prior_state_json,
  resulting_state_json, device_id, created_at
```

Use a schema migration in `src/db/schema.ts`; all queries remain behind repositories and `db/client.ts`.

### 5.3 Cloud changes

Before enabling sync:

1. Add `updated_at`, `deleted_at`, and a server-assigned revision to every mutable sync table.
2. Align local and cloud SRS field names/types.
3. Add append-only `review_events` and `quiz_attempts` tables with owner RLS.
4. Add scripture-specific user-state tables or a documented stable polymorphic source contract.
5. Add an idempotent batch mutation RPC/Edge Function and incremental pull endpoint.
6. Add owner-only Storage policies for opted-in EPUB/cover backup.
7. Restrict profile writes so `plan_key`, beta flags, and entitlement fields are server-only.
8. Add RLS integration tests for anonymous, protected-free, Premium, and service roles.

### 5.4 Stable identifiers

- Generate UUIDs on the client before local insert.
- Preserve IDs through sync.
- Use `content_fingerprint` for imported-book equivalence; never deduplicate only by title/author.
- Use a stable device UUID for diagnostics, not as ownership proof.
- The server derives `owner_id` from `auth.uid()`; it never trusts an owner ID supplied in a payload.

### 5.5 Push/pull order

1. Account profile and preferences.
2. Library metadata and local/cloud book mapping.
3. Shelves and membership.
4. Reading positions.
5. Saved words.
6. Review events and derived SRS state.
7. Highlights, quotes, and notes.
8. Quiz attempts.
9. Scripture state.
10. Optional aggregate learning reports.

Each batch is idempotent. Pull after push so server revisions and conflict results settle locally.

### 5.6 Conflict rules

| Entity | Rule |
|---|---|
| Reading location | Latest actual reading activity sets resume location; `furthestPercent` is the maximum ever reached. |
| Saved word | Union by UUID. For independently created semantic duplicates, compare book fingerprint + normalized word + context location; retain the richer row and alias IDs. |
| SRS | Merge append-only review events by event UUID and recompute card state deterministically. Device timestamps order events only after server skew checks. |
| Quiz attempt | Append-only by attempt UUID. Incomplete attempts remain local unless product analytics explicitly needs them. |
| Highlight/note | Newer tombstone beats older edit. Concurrent note edits preserve a conflict copy. |
| Shelf | Field-level last-write wins; membership rows merge independently. |
| Preference | Field-level timestamp wins. Device-only presentation state stays local. |
| Onboarding | `completed` is monotonic true. Never sync it back to false. |
| What's New | Device-local; do not sync. It corresponds to an installed release on that device. |
| Entitlement | Never merged from client data. Refresh from the authoritative server/store state. |

### 5.7 Sync triggers

- Initial bootstrap after account protection or sign-in merge.
- App foreground when the last successful sync is stale.
- Debounced after local mutations while online.
- Reader exit for position updates.
- Manual `Sync now`.
- OS background execution only in a future separately approved native task.

For protected free accounts, expose `Back up now` and `Restore backup`; run the same safe sync engine only from those explicit actions. Premium enables the automatic foreground/debounced/reader-exit triggers and imported-file backup. This keeps recovery available to free accounts while Premium sells continuous multi-device convenience rather than ownership of the reader's data.

Use exponential backoff with jitter. Display only `Synced`, `Syncing`, `Offline—changes saved`, or `Needs attention`. Routine offline state is not an error dialog.

### 5.8 Offline product promise

Lamplight is a local reading app first. Losing connectivity must not eject the reader from an already downloaded book, erase progress, block saved material, or prevent local learning. Network loss changes freshness and availability; it does not change ownership.

Model runtime connectivity as:

```text
UNKNOWN     app has not attempted a relevant request yet
ONLINE      a recent relevant request succeeded
DEGRADED    internet may exist, but a required provider/server is failing or timing out
OFFLINE     recent requests failed with an offline/unreachable signal
```

Connectivity state is a hint, not permission. A reported network connection can still be captive or unable to reach Supabase/provider endpoints. The result of the real request is authoritative.

No connectivity package is currently installed. Initial implementation should use request results, timeouts, foreground events, and explicit retry. Adding `expo-network` or another listener requires dependency approval; if approved, use it only to schedule work earlier, never to bypass request error handling.

Do not show a permanent global offline banner merely because one background refresh failed. Show an unobtrusive status when:

- An action needs the network.
- The user has pending account changes and opens sync/account status.
- Cached data is materially stale for the screen being viewed.
- A download or restore is interrupted.

### 5.9 Offline feature availability matrix

| Feature/action | Offline behavior | User-facing result |
|---|---|---|
| Open a downloaded catalog book | Fully available from `Paths.document/books`. | Open normally; no offline warning. |
| Open an imported EPUB | Fully available from its durable parsed file. | Open normally. Imported content is never auto-evicted. |
| Open a catalog book never downloaded | Network-required. | `Download this book when you're online.` Keep the detail screen usable from cached metadata. |
| Browse/search/filter existing catalog | Offline-degraded from the latest SQLite catalog snapshot. | Show results normally with a subtle `Offline · showing saved catalog` status only when relevant. |
| Discover books added after the last refresh | Unavailable. | Offer `Try again` without clearing the existing catalog. |
| Read bundled scripture | Fully available. | Open normally. |
| Mood/semantic scripture search | Use a valid cached result if present; new semantic search is network-required. | Offer bundled scripture browsing/random local verses as fallback. |
| Save/delete words, highlights, notes, shelves, and reading positions | Fully available. | Commit locally immediately; queue account mutation when applicable. |
| Review saved words | Fully available after the five-word threshold. | Use local words/SRS state; enqueue review events. |
| `From the book` Quiz | Fully available. | Build from local contexts and local distractor logic. |
| `New sentence` / `Similar words` Quiz | Available only when the required generated data is cached. | Fall back to `From the book`; label unavailable modes `Connect once to prepare` rather than failing mid-quiz. |
| Cached word translation/enrichment | Available while retained and schema-compatible. | Show cached result and its offline/stale state only when materially useful. |
| New uncached translation | Network-required with an offline save-for-later option. | `Save for later` creates a pending lookup; do not show a fake/empty translation. |
| Pronunciation | Use device TTS only when the language voice is installed; cached audio may play if later added. | `Voice isn't available offline on this device` when no local voice exists. |
| Downloaded ambience | Available. | Play normally. |
| Undownloaded ambience | Network-required. | Show download requirement; never stream repeatedly after a failed attempt. |
| Account creation/protection or existing-account sign-in | Network-required. | Keep guest data local and offer retry. |
| Local account session already established | Local reading remains available even if refresh fails. | Show `Offline—changes saved` in Account, not a blocking auth screen. |
| Manual backup, restore, automatic sync | Network-required. | Queue local changes; restore waits for explicit retry. |
| Store purchase, restore purchase, promo redemption | Network-required. | Keep the current entitlement snapshot and explain that verification needs a connection. |
| Existing Premium features | Available according to the cached entitlement/expiry/grace contract in section 6.3. | Never downgrade merely because one refresh request failed. |
| What's New for the installed release | Available because its copy ships with the release. | Show according to the local lifecycle rules; no network fetch is needed. |

### 5.10 Offline save-for-later lookup

The current translation provider cache is memory-only, so it disappears when the app process ends. Add a persistent cache before claiming offline translation support.

When an uncached lookup is attempted offline, offer `Save for later` and write:

```text
pending_word_lookups
  id TEXT PRIMARY KEY
  book_id TEXT NOT NULL
  source_word TEXT NOT NULL
  source_lang TEXT NOT NULL
  target_lang TEXT NOT NULL
  context_sentence TEXT NOT NULL
  chapter_index INTEGER NOT NULL
  page_index INTEGER NOT NULL
  paragraph_index INTEGER NOT NULL
  requested_at INTEGER NOT NULL
  attempt_count INTEGER NOT NULL DEFAULT 0
  next_attempt_at INTEGER
  last_error_code TEXT
  status TEXT NOT NULL  -- pending | resolving | failed
```

Rules:

- A pending lookup is user-owned intent and remains until resolved or explicitly deleted.
- It does not count toward Review or book Quiz thresholds because no answer exists yet.
- Display it in Words as `Waiting for translation`, separate from ready vocabulary.
- Retry automatically only when the app is foregrounded and a real network request has recently succeeded. Respect provider cap/entitlement rules at resolution time.
- On success, insert the ready `saved_words` row with the same stable ID and original `requested_at` as `created_at`, delete the pending row, and enqueue the normal sync mutation in the same serialized transaction.
- Permanent provider errors move to `failed` with `Try again` and `Remove`; authentication/rate-limit/network errors remain retryable.
- Never continuously retry while the reader is reading.

Selection/page translation is not queued automatically because the reader may no longer want a transient result later. Queue only an explicit `Save for later` action.

### 5.11 Cache classes and exact retention

`created_at`, `last_accessed_at`, cache schema/provider version, and byte size must be recorded for evictable persistent caches. Update `last_accessed_at` at most once per 24 hours per item to avoid write amplification.

| Data class | Examples | Soft expiry / refresh | Hard retention / eviction |
|---|---|---|---|
| User-owned durable data | Saved words, highlights, notes, shelves, positions, review events, quiz attempts, pending lookups, unacknowledged outbox | No expiry | Keep until explicit delete/account-data removal. Never evict for storage pressure. |
| Imported books | Parsed imported EPUB content and its metadata | No expiry | Keep until explicit `Remove download/book`. Never auto-evict. |
| Downloaded catalog books | Parsed Gutenberg/Bangla/Japanese/Korean content | No time expiry | Keep until explicit removal. May be offered to the user for cleanup, never silently removed. |
| In-memory parsed book | `bookCache` map | Current process | Release on process death; bound future prefetching to current + adjacent reading unit. |
| Catalog metadata | SQLite `books` snapshot | Refresh after 24 hours when online; also refresh on manual action | Retain the latest valid snapshot indefinitely so offline Library never becomes empty. Server-deleted rows referenced by user data become unavailable/tombstoned, not immediately removed. |
| Base word translation | Source/target pair without sentence-specific context | Soft refresh after 90 days when online | Evict after 365 days if not used for 180 days; stale value may be used offline before hard expiry. |
| Context/sentence translation | Text + language pair + context/provider version | Soft refresh after 30 days | Evict after 180 days if not accessed for 90 days. |
| Generated cloze question | `cloze_cache` | Soft refresh after 90 days or when generator version changes | Evict after 365 days if not used for 180 days. Original-context Quiz remains the fallback. |
| Usage note / word cluster | `usage_note_cache`, `word_cluster_cache` | Soft refresh after 90 days or when mother tongue/model version changes | Evict after 365 days if not used for 180 days. |
| Cover/image cache | Remote book covers and presentation images | Revalidate after 30 days when online | LRU eviction after 90 days unused; target budget below. Bundled assets are excluded. |
| Mood/AI response cache | User-approved non-sensitive derived response | Soft refresh after 7 days | Evict after 30 days unless the user explicitly saved the result. Saved content becomes durable data. |
| Plans and remote feature config | Free limits, flags, kill switches | Refresh after 6 hours or on foreground when older | Keep last valid value for 7 days. After that use conservative bundled defaults; a safety kill switch can fail closed only for the affected remote/costly feature, never for reading. |
| Entitlement snapshot | Premium capabilities | Refresh on foreground when older than 24 hours and at purchase/restore | Known expiry plus the defined 72-hour paid grace. Clear immediately on confirmed account change. |
| Auth access token | Short-lived access credential | Refresh before expiry | Store according to auth lifetime; refresh credential belongs only in approved secure storage. Never copy to analytics/cache tables. |
| Changelog/onboarding/settings | Small local state | No background refresh unless account preference sync applies | Retain until explicit reset, account-data removal, or superseding schema migration. |
| Sync cursor | Per-entity server revision | Update only after a successful local merge commit | Retain indefinitely; replace only with a server-confirmed cursor. |
| Sync staging/inbox | Downloaded batch not yet committed | None | Delete immediately after successful commit; clean abandoned batches after 7 days. |
| Merge recovery journal | Account-merge recovery data | None | Delete 30 days after verified successful merge; retain failed journals until resolved/exported. |
| Analytics outbox | Non-sensitive events waiting to send | Retry for 14 days | Cap at 5,000 events or 5 MB; drop oldest non-critical analytics first. Never compete with user data. |
| Failed partial downloads | `.partial` temporary files | Resume when supported | Delete after 24 hours with no active download record. |

Expiry is evaluated lazily on read and during bounded maintenance; do not run a full cache scan on every launch.

### 5.12 Persistent cache metadata and validation

Use a shared metadata contract for rebuildable entries:

```text
cache_entries
  key TEXT PRIMARY KEY
  cache_type TEXT NOT NULL
  owner_scope TEXT              -- shared | guest:<id> | account:<id>
  schema_version INTEGER NOT NULL
  provider_version TEXT
  content_hash TEXT
  byte_size INTEGER NOT NULL
  created_at INTEGER NOT NULL
  updated_at INTEGER NOT NULL
  last_accessed_at INTEGER NOT NULL
  soft_expires_at INTEGER
  hard_expires_at INTEGER
  state TEXT NOT NULL           -- ready | partial | invalid
```

The payload may live in SQLite or a file; `cache_entries` records policy and integrity.

- Translation cache keys include normalized source text, source/target languages, context hash when relevant, and provider/schema version.
- Generated Quiz keys include saved-word ID, mother tongue, mode, and generator version.
- File downloads write to a temporary file, verify parse/checksum, then atomically promote to the final path. Never overwrite the last valid book with an unverified response.
- JSON parse failure, impossible shape, checksum mismatch, or schema-version mismatch marks rebuildable data invalid and schedules deletion/refetch. It must not crash the reader.
- A cache refresh that fails keeps the last valid soft-expired entry. It never replaces valid content with an error/empty payload.
- Do not use user-owned data tables as general response caches.

### 5.13 Storage budgets and cleanup

Separate **My downloads** from **Temporary app cache** in Settings.

Default budgets:

- User-owned SQLite data: no automatic size cap.
- Imported/downloaded books: no automatic cap; show total size and per-book removal controls.
- Rebuildable derived cache: target 100 MB; begin LRU cleanup above 125 MB and reduce to 75 MB.
- Cover/image cache within the derived-cache budget: target maximum 40 MB.
- Analytics outbox: maximum 5 MB or 5,000 events.

Cleanup order under pressure:

1. Expired partial downloads.
2. Hard-expired images/mood responses.
3. Least-recently-used covers/images.
4. Hard-expired generated enrichment.
5. Hard-expired translations.
6. Old non-critical analytics.

Never automatically delete user-owned data, imported books, downloaded books, pending mutations, pending lookups, sync cursors, the active entitlement snapshot, or the latest valid catalog snapshot.

When free device space is critically low:

- Stop prefetch and new background downloads.
- Run bounded derived-cache cleanup.
- Preserve the current open book and all user data.
- Show `Storage is low` with `Manage downloads`; do not claim a save succeeded if SQLite/file commit fails.

Storage accounting should run at most once per day, after a large download, or when a write reports insufficient space. Do not recursively scan the document directory on every app open.

### 5.14 Offline mutations and outbox optimization

Every user-visible write follows:

```text
serialized SQLite transaction
  -> apply local record/tombstone
  -> append/update sync_outbox item when account scope allows
commit
  -> update UI as successful
network worker later
```

Compaction rules:

| Mutation type | Outbox behavior |
|---|---|
| Reading position | Keep only the newest unsent position per book, while preserving local `furthestPercent`. |
| Preference | Keep newest unsent value per field. |
| Shelf rename | Keep latest unsent field state. |
| Saved word/highlight/note create/edit/delete | Preserve stable ID and final tombstone. A create followed by delete before any push can collapse to no remote operation. |
| Review event | Append-only; never compact distinct reviews. |
| Quiz attempt | Append-only after completion. |
| Analytics | Separate low-priority outbox; never share user-data retry limits. |
| Imported file | Outbox contains metadata/reference only. Binary upload uses a resumable file job, not JSON payload. |

Additional rules:

- Outbox items remain until acknowledged; time does not expire them.
- Batch a maximum of 50 mutations or 256 KB, whichever comes first.
- Use stable idempotency keys so timeout-after-server-commit is safe to retry.
- One sync worker owns the queue. Foreground, manual, and connectivity triggers coalesce into the same single-flight run.
- Exponential backoff: 5 seconds, 30 seconds, 2 minutes, 10 minutes, then 1 hour maximum, with jitter. A new foreground/manual retry may bypass the remaining delay once.
- Stop a batch on auth failure and refresh once. Continue past an isolated permanent record error by marking it `Needs attention`; never spin on it.

### 5.15 Reconnection and old-cache reconciliation

Run one single-flight reconnect cycle:

1. Confirm the app is foregrounded unless the user explicitly started backup/restore.
2. Refresh the protected session if needed. Guest/local operation continues if auth refresh fails.
3. Clear any entitlement snapshot belonging to a different account; fetch current entitlement/config when possible.
4. Resolve explicit pending lookups in small batches after account/sync work, respecting caps.
5. Push outbox mutations in the dependency order in section 5.5.
6. Pull server changes after the stored cursor, paginated and bounded.
7. Merge into staging, validate relationships/schema, then commit through the database queue.
8. Advance the cursor only after the merge transaction commits.
9. Refresh UI from SQLite; do not replace screen state directly from network payloads.
10. Schedule optional imported-file uploads last and only under the user's allowed network policy.

If offline for a long time:

- Reauthenticate first.
- Ask the server whether the cursor is still valid.
- If invalid, perform a full metadata reconciliation into staging. Never clear local tables first.
- Preserve local tombstones and append-only review events until reconciliation acknowledges them.
- Compare against server time/revision rather than trusting a drifted device clock.

#### Guest cache becomes a protected account

- User-owned guest rows become merge candidates after explicit account protection/sign-in consent.
- Rebuildable shared catalog/book/cover caches may be reused without upload.
- Derived word/Quiz caches may be reused locally only when languages, source IDs, schema, and provider versions match. They are not account truth and do not need cloud sync.
- Guest outbox entries are rewritten/claimed only through the authenticated merge flow; never upload them under an unrelated owner automatically.
- Account cursors, entitlement snapshots, private response caches, and merge journals are namespaced by account ID.

#### Sign-out or account switch

- Stop the sync worker and finish/rollback the active local transaction.
- Clear access/refresh credentials and the active entitlement snapshot.
- Never let the next account inherit the previous account's outbox, cursors, pending restore, private AI responses, or Premium state.
- If the reader chooses `Remove account data from this device`, remove personal SQLite rows/private caches after a verified sync/export warning. Shared catalog metadata and explicitly retained public downloads may stay.
- If the reader chooses `Keep on this device`, detach into a guest-local namespace and require an explicit merge before a future account receives it.

### 5.16 Offline UX and performance rules

- Render cached/local content immediately; start refresh after paint.
- Check persistent cache before network and deduplicate identical in-flight requests by cache key.
- Do not poll for connectivity, sync, catalog, or entitlements while the reader is idle in a book.
- Do not hold the SQLite serial queue during fetch, upload, backoff, JSON generation, or file hashing. Queue only bounded DB transactions.
- Paginate pulls and process large payloads in chunks so a reconnect does not freeze the JS thread.
- Limit concurrent downloads to two; use one for low-memory devices if device testing shows pressure.
- Do not preload entire libraries or all parsed books into memory. Keep the current book and only the minimal adjacent reading data.
- Move large cache maintenance out of app startup. Startup may perform only cheap metadata checks and schedule bounded work.
- Use stale-while-revalidate: valid cached data wins the first render, then a successful refresh updates SQLite and subscribers.
- Do not retry on every component mount. Repositories/services own retry and single-flight state.
- Downloads are explicit by default. Any future automatic prefetch requires a setting and approved network-type detection; default it to unmetered connections.
- Background execution is a separate native-capability project. Until approved, promise foreground reconciliation only.

Recommended copy:

| Situation | Copy |
|---|---|
| Local write waiting to sync | `Saved on this device · sync pending` |
| General offline account state | `Offline—changes saved` |
| Cached catalog | `Offline · showing saved catalog` |
| Book not downloaded | `Connect to download this book` |
| Advanced Quiz cache missing | `Connect once to prepare this quiz` |
| Pending word | `Waiting for translation` |
| Reconnect active | `Syncing your latest changes…` |
| Permanent conflict/error | `One item needs attention` with a details/retry path |

### 5.17 Privacy, security, and recovery offline

- SQLite and document files are app-private but not a substitute for encryption. Do not claim they are encrypted.
- Refresh credentials go only to approved secure storage before protected accounts ship.
- Book text, word context, highlights, and notes stay on-device unless the reader enables the relevant backup/sync feature.
- Avoid storing plaintext promo codes, auth headers, provider secrets, or email addresses in general caches/logs.
- Cache keys must not expose sensitive sentence text in filenames; use a content hash.
- Do not upload derived caches merely to save regeneration cost unless privacy terms explicitly cover it.
- Database migrations run transactionally. A migration failure must preserve the prior database and show recovery/export guidance; never “fix” it by silently deleting the database.
- Keep a last-known-valid file until a replacement has parsed and committed.
- Add `Clear temporary cache` separately from `Remove downloads` and `Delete local personal data`; the scopes must never be conflated.
- Platform backup behavior for database/documents must be reviewed before release. Any native backup exclusion or encryption change requires approval and must not strand restore users.

### 5.18 Sync and offline completion criteria

- No local mutation is lost when the app terminates immediately after the local UI updates.
- Two devices editing offline converge under every conflict rule.
- A downloaded/imported book opens after seven days offline and after a process restart.
- Review and original-context Quiz complete offline and later sync their events exactly once.
- An uncached word can be saved as pending offline and resolves once when connectivity returns.
- A soft-expired cache is usable offline; a hard-expired cache produces the documented fallback rather than stale Premium/network output.
- Reconnect never blocks reader interaction or holds the DB queue during network waits.
- Account switching cannot leak the previous user's mutations, entitlements, or private caches.
- Storage cleanup stays within the derived-cache budget without deleting user data or downloads.
- A fresh protected-free device can restore its latest manual metadata backup; a Premium device can also download opted-in imported content on demand.
- A failed merge can be rolled back without deleting guest data.
- Beta sync batches achieve at least 99.5% success excluding deliberate offline attempts.

---

## 6. Premium entitlement architecture

### 6.1 One gate, many sources

Replace the boolean stub with one observable entitlement service. Components request capabilities; they do not inspect `profiles.plan_key`, subscription rows, or promo tables directly.

```ts
type PremiumFeature =
  | 'unlimited_learning'
  | 'advanced_quiz'
  | 'context_translation'
  | 'reading_insights'
  | 'cloud_sync'
  | 'full_ambience'
  | 'premium_quote_cards'
  | 'ai_companion';

type EntitlementSnapshot = {
  status: 'free' | 'trial' | 'premium' | 'grace' | 'expired' | 'unknown';
  features: Record<PremiumFeature, boolean>;
  source: 'subscription' | 'store_trial' | 'promo' | 'beta' | 'support' | 'none';
  startsAt: number | null;
  expiresAt: number | null;
  lastVerifiedAt: number | null;
};
```

Required API:

```text
hydrateEntitlements()
refreshEntitlements(reason)
getEntitlementSnapshot()
subscribeToEntitlements(listener)
canUse(feature)
requireFeature(feature, context) -> allowed or paywall reason
```

### 6.2 Authority and security

- Store receipts/subscription providers and trusted server grants are authoritative.
- RevenueCat is the recommended normalization layer for App Store/Play subscriptions, subject to dependency/native approval.
- RevenueCat webhook events update server subscription/grant records idempotently.
- `profiles.plan_key` may remain a server-maintained cache for analytics, but the client cannot write it and does not treat it as purchase proof.
- Verify webhook signatures and deduplicate event IDs.
- Never place service-role keys, webhook secrets, promo secrets, or receipt-validation secrets in the app.
- RLS lets users read their effective entitlements and subscription summary, not create/update them.

### 6.3 Offline behavior

- Cache the last verified snapshot locally.
- Honor access until its known `expiresAt`.
- If verification is temporarily unavailable after expiry, allow a maximum 72-hour `grace` for previously verified paid subscriptions; record that the state needs refresh.
- Time-limited admin/promo grants stop at their known expiry unless the server extends them.
- Free/local features continue when entitlement state is `unknown`.
- Never delete Premium-created data when access expires. Disable new Premium actions, keep owned data readable/exportable, and explain how to regain editing/sync.

### 6.4 Billing implementation boundary

In-app purchase libraries require a development build and native configuration; they do not work in Expo Go. Treat billing as a dedicated milestone:

1. Approve RevenueCat versus direct `expo-iap`.
2. Create store products and one logical Premium entitlement.
3. Add the approved native package/config plugin.
4. Create sandbox products and tester accounts.
5. Implement purchase, restore, manage-subscription, grace, cancellation, refund, expiration, and reinstall cases.
6. Add backend webhook processing before enabling the paywall CTA.
7. Replace hard-coded paywall prices/discount text with localized store offering data.

The app must use store billing for in-app digital Premium purchases unless a specific storefront program and legal review authorize another flow.

---

## 7. Trials, offers, and promo codes

### 7.1 Recommended hierarchy

1. **Store-native introductory offers/trials** for normal acquisition.
2. **Store-native offer/promo codes** for public campaigns and win-back offers.
3. **First-party server grants** only for beta testers, support recovery, press/review access, education partnerships, or other no-payment cases reviewed for store compliance.

Do not build a custom code system that sells or routes payment around the stores.

### 7.2 First-party grant schema

```text
entitlement_grants
  id UUID PRIMARY KEY
  owner_id UUID NOT NULL
  feature_bundle TEXT NOT NULL
  source_type TEXT NOT NULL  -- beta | promo | support | admin
  source_id UUID
  starts_at TIMESTAMPTZ NOT NULL
  ends_at TIMESTAMPTZ
  revoked_at TIMESTAMPTZ
  metadata JSONB
  created_at TIMESTAMPTZ NOT NULL

promo_campaigns                  -- service-role only
  id UUID PRIMARY KEY
  code_hash TEXT UNIQUE NOT NULL
  label TEXT NOT NULL
  feature_bundle TEXT NOT NULL
  duration_days INTEGER NOT NULL
  starts_at TIMESTAMPTZ NOT NULL
  redeem_by TIMESTAMPTZ NOT NULL
  max_redemptions INTEGER NOT NULL
  per_user_limit INTEGER NOT NULL DEFAULT 1
  eligible_audience JSONB
  disabled_at TIMESTAMPTZ

promo_redemptions
  id UUID PRIMARY KEY
  campaign_id UUID NOT NULL
  owner_id UUID NOT NULL
  redeemed_at TIMESTAMPTZ NOT NULL
  grant_id UUID NOT NULL
  UNIQUE(campaign_id, owner_id)
```

Store only a normalized salted hash of first-party codes. Plain codes appear only at issuance/import time.

### 7.3 Redemption RPC/Edge Function

`redeem_promo(code)` must:

1. Require a protected account.
2. Normalize the code server-side.
3. Rate-limit attempts per account, installation, and IP where available.
4. Lock the campaign row during redemption.
5. Check campaign window, disabled state, audience, global limit, and per-user limit.
6. Create redemption and grant atomically.
7. Return the effective entitlement snapshot and a user-safe message.
8. Be idempotent: redeeming the same valid campaign twice returns the existing grant, not a second duration.
9. Log success/failure reason without logging plaintext codes.

Default stacking rule: grants overlap; they do not add durations together. Effective access ends at the latest active source expiry. Only a campaign explicitly marked `stackable` may extend another grant.

### 7.4 Trial timing

Do not start a trial on install. Offer it after the reader has experienced the core loop, preferably after one of:

- First Review completed.
- First book Quiz completed.
- First request for a Premium mode.
- Reader has used the app meaningfully on three separate days.

Recommended initial test: seven days of full Premium, once per protected account, started by explicit confirmation. On expiry, local data remains intact and the app returns to free limits.

### 7.5 Promo UX

- Settings entry: `Redeem an offer`.
- Paywall secondary action: `Redeem code` only when platform policy and implementation support it.
- Explain benefit, start/end date, renewal behavior, and whether payment details are required before confirmation.
- Store-native codes launch the platform redemption UI/deep link.
- First-party grants show `Premium access until {date}` and never claim to be a store subscription.

---

## 8. Free and Premium feature strategy

### 8.1 Features that remain free

These are necessary to trust Lamplight as a reading app:

- Unlimited reading of downloaded/imported books.
- Offline reading and reading-position persistence on the device.
- Basic word lookup/translation within a generous operational cap.
- Saving, viewing, and exporting personal reading data within the published free policy.
- The five-word Review unlock and a useful basic review loop.
- `From the book` Quiz for quiz-eligible books.
- Account protection, purchase restoration, privacy controls, account deletion, and data export.
- Core accessibility, language, scripture, and theme behavior.

Never paywall accessibility, account security, data export, or access to data the reader already created.

### 8.2 Recommended Premium bundle

#### Learn deeply

- Full daily due queue and larger/custom review sessions.
- Adaptive prioritization and difficult-word targeting.
- `New sentence` and `Similar words` Quiz without free-frequency limits.
- Productive recall, listening prompts, word families, collocations, and transfer tests.
- Context-aware meaning, synonyms, antonyms, and usage notes.

#### See progress

- Full reading insights, long-range history, heatmap, retained-word trends, and weekly/monthly reports.
- Book-level course progress: read, saved, reviewed, retained, and chapter comprehension.

#### Continue everywhere

- Cross-device sync and restore.
- Optional imported EPUB/cover backup.
- Synced preferences and learning history.

#### Personalize the ritual

- Full ambient library.
- Premium quote-card themes, custom typography/colors, and HD export.
- Future AI companion quota after cost/privacy validation.

### 8.3 Free Premium tastes

Use durable samples rather than fake locked cards everywhere:

| Premium value | Free taste |
|---|---|
| Context-aware translation | Three enriched lookups per day, then fall back to basic translation. |
| Advanced Quiz | One `New sentence` or `Similar words` session per week. |
| Reading insights | Seven-day summary; Premium unlocks longer history and comparisons. |
| Quote-card customization | Preview all themes; export three free themes and one watermarked Premium preview. |
| Ambience | Keep the existing basic tracks free; allow a short preview before selecting a Premium track. |
| Full Premium | One explicit seven-day trial after activation, not at install. |

Do not “taste” cloud sync by silently uploading personal data. Sync starts only after account protection and clear consent. If a trial ends, pause future cloud changes but retain readable local data and a server-side retention window disclosed to the user.

### 8.4 Features that need polish before monetization

Do not put these behind a paywall until the stated bar is met:

| Feature | Required polish |
|---|---|
| Advanced Quiz | Every mode must be visibly different, use valid distractors, work offline with a fallback, and preserve book scope. |
| Context translation | Show which sentence informed the meaning, cache results, provide a basic fallback, and measure incorrect-result feedback. |
| Reading insights | Every metric needs a plain-language explanation and a recommended action; avoid decorative charts with no decision value. |
| Sync | Pass the two-device conflict matrix with no data loss and clear offline status. |
| Premium ambience | Reliable looping, interruption handling, audio focus, download size disclosure, and licensing records. |
| Quote cards | Export must match preview, respect safe areas, and remain readable across scripts. |
| AI companion | Add spoiler scope, source/citation behavior, privacy disclosure, request cap, cost telemetry, and safe failure copy. |

### 8.5 High-value additions worth considering

Prioritize additions that strengthen the “book becomes a course” promise:

1. Productive recall: type the target word with tolerant normalization.
2. Listening recall using existing on-device TTS.
3. Book-course dashboard showing coverage, due words, and retention.
4. Chapter comprehension with spoiler boundary.
5. Word-family/collocation practice.
6. Weekly learning report with one next-best action.

Defer pronunciation scoring until a validated model, explicit voice consent, retention policy, and provider cost are approved.

---

## 9. Onboarding and What's New

### 9.1 First-run onboarding contract

Store locally:

```text
onboarding.completed = true | false
onboarding.schema_version = integer
onboarding.completed_at = epoch_ms
installation.id = uuid
installation.first_release_key = string
```

Use `profiles.onboarded_at` as the protected-account monotonic cloud marker.

Launch decision:

```text
if local onboarding.completed:
  skip first-run screens
else if protected account is already known and profile.onboarded_at exists:
  mark local complete and skip first-run screens
else:
  show first-run onboarding
```

On completion, write all local fields in one settings transaction and enqueue `onboarded_at` when a protected account exists. Never reset completion during an OTA update, native update, sign-in refresh, or ordinary preference migration.

An uninstall by an unprotected guest removes the only durable marker, so a reinstall is a new local user and shows onboarding again. This is unavoidable without a protected identity and should be documented rather than hidden.

Settings may provide `Run setup again`, but that opens onboarding as an explicit editable flow; it does not clear first-run completion or show the splash introduction on the next launch.

### 9.2 Development/testing behavior

- Keep any always-show override inside `__DEV__`.
- Default the override to `false` for ordinary developer runs after this behavior is verified.
- Provide an explicit test helper or dev menu action to reset onboarding.
- Production tests must assert that the development override cannot affect release builds.

### 9.3 Release key contract

Prefer:

1. `expo-updates` applied `updateId` for OTA releases.
2. Native application version + build number when no OTA update ID exists.

Do not use a manually bumped changelog integer as proof that an update is installed. Detect the applied release from the runtime release key; use the separate announcement ID only to choose and deduplicate user-visible notes.

### 9.4 What's New state

Store per device:

```text
whats_new.install_release_key
whats_new.last_observed_release_key
whats_new.last_seen_announcement_id
whats_new.pending_announcement_id
```

Each changelog entry has a developer-authored `announcementId` such as `2026-09-study-tabs`; it does not need to know an OTA `updateId` before publication. The runtime release key proves that a different build/update was actually applied, while the announcement ID determines whether that release contains new user-visible notes.

Behavior:

1. Fresh install: set install/last-observed to the current release and last-seen to the current announcement ID. Show onboarding, not What's New.
2. Existing install, same runtime release key: show nothing.
3. Existing install, different applied release key and a new announcement ID: set pending and show once after the home shell is ready.
4. Existing install, different release key but the same/no announcement ID: advance last-observed silently.
5. Dismiss with `Got it`: atomically mark that announcement seen and clear pending.
6. App killed before dismissal: show again because it was not actually acknowledged.
7. Several skipped updates: show only the newest applicable summary, never a backlog.

Do not display What's New over onboarding, account merge, restore, paywall, or a reader that was resumed from a deep link. Queue it until the Home/Library surface is stable.

What's New state is device-local. A different device should see the notes when that update is installed there.

### 9.5 Changelog discipline

- Add entries only for user-visible changes.
- Write outcomes, not internal implementation language.
- Maximum five bullets.
- Include a direct CTA only if the destination exists and is safe to open.
- Add the changelog/release mapping in the same pull request as the user-visible feature.

---

## 10. Analytics and privacy

### Required events

```text
review_locked_viewed          { total_saved, remaining }
review_unlocked               { total_saved, trigger }
review_prompt_shown           { due_count }
review_prompt_dismissed       { due_count }
review_started                { source, due_count, batch_size }
review_completed              { reviewed, difficult, duration_ms }
quiz_book_picker_viewed       { eligible_book_count }
quiz_book_selected            { book_id, saved_count }
quiz_started                  { book_id, mode, question_count, entitlement_source }
quiz_completed                { book_id, mode, correct, total, duration_ms }
account_protection_started    { method }
account_protection_completed  { method, had_local_data }
account_merge_outcome         { outcome, entity_counts, duration_ms }
sync_batch_outcome            { direction, counts, duration_ms, outcome, error_code }
offline_action_blocked        { feature, cache_state }
pending_lookup_created        { source_type }
pending_lookup_resolved       { age_ms, attempt_count, outcome }
cache_maintenance_completed   { bytes_before, bytes_after, entries_removed, reason }
download_outcome              { source_type, bytes, duration_ms, outcome, error_code }
storage_pressure_shown        { app_bytes, free_bytes_bucket }
entitlement_changed           { from, to, source }
premium_sample_used           { feature }
paywall_viewed                { trigger, feature }
trial_started                 { trigger }
promo_redeemed                { campaign_id, outcome }
onboarding_completed          { schema_version }
whats_new_shown               { release_key, announcement_id }
whats_new_acknowledged        { release_key, announcement_id }
```

Rules:

- Never log word text, context sentences, quotes, notes, book file contents, auth tokens, email addresses, or promo plaintext.
- Hashing sensitive content does not automatically make it safe analytics data.
- Record book IDs only where they refer to public catalog IDs; use a coarse source type for private imports.
- Feature exposure events are required before conversion conclusions are trusted.

### Success metrics

- Percentage of readers reaching five saved words.
- Review start/completion rate after unlock.
- D1/D7 recall after first Review.
- Percentage of books reaching Quiz eligibility.
- Quiz selection/completion by mode.
- Account-protection conversion after value moments.
- Sync success, conflict, and recovery rate.
- Premium sample-to-trial and trial-to-paid conversion.
- Paywall dismiss rate by trigger.
- Onboarding repeat rate in production: target zero unless explicitly reopened.
- What's New repeat acknowledgement per release/device: target one.
- Percentage of reading/review sessions completed entirely offline.
- Pending-lookup resolution rate and median time to resolution.
- Outbox age, retry count, and oldest unacknowledged user mutation.
- Cache hit rate by cache class, bytes reclaimed, and corrupt-entry rate.
- Download success/resume rate and storage-pressure frequency.

---

## 11. Delivery plan

Each phase is independently shippable behind remote flags. Do not begin billing before account and entitlement authority are safe.

### Phase A — Review threshold and Quiz tab

Files likely involved:

- `src/db/repositories/savedWords.ts`
- `src/app/(tabs)/vocabulary.tsx`
- `src/features/vocabulary/reviewPrompt.ts`
- Library/home prompt call site identified through graphify
- Focused vocabulary tests

Tasks:

1. Add shared constants and aggregate eligibility query.
2. Add Review locked/ready/caught-up/completed states.
3. Rename the visible Flashcards label to Review while preserving old route params.
4. Add Quiz tab, filtered book picker, and mode picker.
5. Scope standalone Quiz words by selected book.
6. Recompute on focus, save, and delete.
7. Add analytics events and accessibility labels.

Exit criteria: 0–4 words can never start Review; the fifth word changes the Notebook immediately; only books with five words appear in Quiz; all existing post-Review quiz flows still work.

### Phase B — Lifecycle correctness

Files likely involved:

- `src/features/settings/onboardingStatus.ts`
- `src/app/index.tsx`
- `src/app/_layout.tsx`
- `src/features/app-update/whatsNew.ts`
- `src/components/WhatsNewOverlay.tsx`

Tasks:

1. Replace the single booleans/versions with the lifecycle contract in section 9.
2. Prevent What's New on fresh install.
3. Bind changelog entries to actual applied release keys.
4. Queue the overlay until an allowed route is stable.
5. Add fresh-install, upgrade, interrupted-dismissal, and reinstall tests.

Exit criteria: production onboarding appears once per new local user; each relevant installed update produces at most one acknowledged What's New overlay per device.

### Phase C — Protected account foundation

Approval gate: secure credential storage dependency and any OAuth/native configuration.

Tasks:

1. Move refresh credentials to approved secure storage.
2. Implement account state service and email OTP/magic-link protection flow.
3. Add conflict-safe existing-account merge UX.
4. Add Account settings surface, export, sign-out choices, and deletion flow.
5. Protect server-controlled profile columns.

Exit criteria: guest use remains frictionless; a linked identity retains the same user ID; existing-account sign-in cannot overwrite local data.

### Phase D — Offline reliability and sync foundation

Tasks:

1. Add persistent translation/cache metadata and `pending_word_lookups` with migrations.
2. Implement offline fallbacks and the feature-availability copy in section 5.9.
3. Add storage accounting, bounded LRU maintenance, partial-download cleanup, and separate cache/download controls.
4. Align local/cloud models and migrations.
5. Add outbox, cursors, mappings, merge journal, review events, and quiz attempts.
6. Add batched idempotent backend mutations and incremental pulls.
7. Implement entity order, compaction, reconnect, account namespace, and conflict rules.
8. Add manual free backup/restore, Premium automatic sync, and Settings status.
9. Run the storage-pressure, long-offline, account-switch, and two-device matrices.

Exit criteria: downloaded reading and local learning work after a week offline; cache cleanup deletes no owned data; reconnect remains responsive and idempotent; no data is lost in interruption/conflict tests; beta sync target is met.

### Phase E — Entitlements and billing

Approval gate: RevenueCat/direct-IAP choice, development build, native config, store products, pricing, privacy, and review notes.

Tasks:

1. Build entitlement service and cached snapshot.
2. Restrict plan/subscription writes server-side.
3. Add provider webhook processing and effective-entitlement endpoint.
4. Replace every Premium boolean with named feature gates.
5. Wire localized offerings, purchase, restore, manage, grace, and expiration.
6. Update paywall copy to the actual bundle and trigger context.

Exit criteria: sandbox purchase lifecycle passes on iOS and Android; changing a server entitlement updates gates without an app release; no client can self-upgrade.

### Phase F — Samples, trials, and offers

Tasks:

1. Add usage policies for Premium samples.
2. Add explicit post-value trial trigger.
3. Integrate store-native offers/codes.
4. Add first-party grants only for approved no-payment cases.
5. Add redemption rate limits, idempotency, audit logs, and support tooling.
6. Experiment with one variable at a time: trigger, sample allowance, trial duration, or message.

Exit criteria: terms are clear; grants expire correctly offline/online; campaign limits cannot be bypassed; trial expiry never removes user data.

---

## 12. Validation matrix

### Review and Quiz

- 0, 1, 4, 5, and 6 total saved words.
- Fifth word saved while Notebook is open.
- Fifth word deleted while a session is open and after it ends.
- Five words spread across five books: Review unlocked, no book Quiz eligible.
- Five words in one book: that book alone appears.
- Multiple eligible books with identical word spellings.
- Due count 0, 1, 5, and more than 20.
- Daily checkpoint before/after local midnight.
- Normal, fresh, and synonym modes offline and online.
- 320 dp width, largest supported font scale, screen reader, reduced motion.

### Account and sync

- First launch offline, then anonymous auth succeeds later.
- Guest protects a month-old local library.
- Guest enters an email belonging to an existing account and declines/accepts merge.
- Two devices edit/save/delete the same entity offline and reconnect in both orders.
- Token expires during push/pull.
- App terminates after local commit but before network push.
- Reinstall with guest identity versus protected account.
- Sign out and choose keep/remove local data.
- Account deletion with an active store subscription.
- Device clock skew of at least ±24 hours.

### Offline, cache, and storage

- Fresh install launched with no network: onboarding/local bootstrap succeeds and network-required actions explain themselves.
- Downloaded catalog book and imported EPUB open after process restart and seven days offline.
- Non-downloaded book cannot open but cached detail/catalog remain usable.
- Save/delete words, highlights, shelves, positions, Review grades, and Quiz attempts offline; reconnect sends each logical mutation exactly once.
- Uncached translation offers `Save for later`; pending lookup survives restart and resolves once online.
- Cached base/context translation before soft expiry, after soft expiry offline, after soft expiry online, and after hard expiry.
- Generated Quiz cache missing, soft-expired, hard-expired, corrupt JSON, wrong schema version, and wrong mother tongue/provider version.
- Catalog refresh times out while an older snapshot exists; the existing snapshot remains intact.
- Download interrupted before and after temporary-file validation; no corrupt final book replaces a valid one.
- Derived cache at 75 MB, 100 MB, 125 MB, and critically low device storage.
- Cleanup order verified; imported/downloaded books, outbox, pending lookups, cursors, and owned rows are untouched.
- 5,001 analytics events or more than 5 MB: oldest non-critical telemetry evicts without affecting sync.
- Connectivity flaps repeatedly; only one sync worker runs and backoff does not become a retry storm.
- Reconnect with 1, 50, 51, and thousands of mutations; batching and UI responsiveness remain correct.
- Reconnect after server cursor invalidation performs staged full reconciliation without clearing local tables.
- Sign out/account switch with pending mutations, cached Premium, private derived data, and an interrupted merge.
- Access token expires offline; local reading continues and auth refresh waits until a network action.
- Entitlement expires during a long offline period and follows exact known-expiry/grace rules.
- Low-memory session does not retain every parsed book or preload the full library.

### Entitlements

- New purchase, renewal, cancellation, refund, billing issue, grace, expiration, resubscribe.
- Purchase before account protection, then link.
- Restore on a fresh install.
- Offline before and after known expiry and after 72-hour grace.
- Overlapping subscription and promo grant.
- Revoked promo, exhausted campaign, duplicate redemption, brute-force attempts.
- Free sample counter across local midnight and across two devices.
- Server says free while stale local cache says Premium; authoritative refresh wins.

### Onboarding and updates

- Fresh native install.
- Fresh install whose bundle already includes the newest changelog.
- OTA downloaded but not yet applied.
- First launch after OTA applies.
- App killed before and after What's New acknowledgement.
- Two updates skipped.
- Update with no user-visible changelog.
- Protected returning user on a new device.
- Guest uninstall/reinstall.
- Development reset helper cannot affect production.

---

## 13. Agent execution guide

Use this sequence for every phase so a less-capable implementation agent does not widen scope.

1. Read `AGENTS.md` and only the documentation named for the phase.
2. Run graphify staleness check. Query the exact feature; read only returned files needed for the change.
3. Restate the phase's state transitions and completion criterion in the task notes.
4. Inspect `src/theme/tokens.ts`, `typography.ts`, and `ThemeProvider.tsx` only when creating/changing UI values. Reuse tokens and components.
5. Add or update tests for the state transition before changing the screen when practical.
6. Make the smallest implementation diff. Keep database calls inside repositories and `db/client.ts`.
7. Add analytics without sensitive payloads.
8. Run focused tests, then `npx tsc --noEmit`.
9. For visual/interactive work, run on a physical device and ask what the user sees. Do not claim visual completion from TypeScript alone.
10. Stop when the phase exit criteria pass. Do not begin the next phase automatically.

### Mandatory stop/approval points

Stop and ask before:

- Adding secure storage, RevenueCat, IAP, OAuth, or any new package.
- Changing `app.json`, iOS, Android, config plugins, or native build settings.
- Running EAS build/update or changing versions.
- Choosing store products, prices, trial terms, refund policy, or regional billing programs.
- Uploading EPUBs, voice, book text, highlights, or notes to a new provider.
- Changing the five-word thresholds or the free/Premium access matrix.

### Definition of done for each task

- The exact state transitions in this document are implemented.
- Empty, loading, offline, retry, and deletion states are covered.
- Existing route parameters and local data migrate safely.
- No unrelated refactor or redesign is included.
- TypeScript passes.
- Relevant repository/unit/integration tests pass.
- Physical-device behavior is verified for visual/interactive changes.
- Analytics and privacy rules are satisfied.
- User-visible copy matches the plan or an explicitly approved revision.

---

## 14. Primary external references for implementation

- Expo: in-app purchases require a development build and native library/configuration: <https://docs.expo.dev/guides/in-app-purchases/>
- Supabase: anonymous users can later link an identity, but cannot recover after sign-out/reinstall without one: <https://supabase.com/docs/guides/auth/auth-anonymous>
- RevenueCat: anonymous and custom App User ID merge/alias behavior: <https://www.revenuecat.com/docs/customers/identifying-customers>
- RevenueCat webhook lifecycle and entitlement events: <https://www.revenuecat.com/docs/integrations/webhooks/event-flows>
- Apple offer-code redemption: <https://developer.apple.com/documentation/storekit/supporting-offer-codes-in-your-app>
- Apple App Review Guidelines, including in-app digital feature purchase rules: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play promo codes: <https://developer.android.com/google/play/billing/promo>
- Google Play payments policy: <https://support.google.com/googleplay/android-developer/answer/9858738>

Store policy and billing APIs change. Re-check these primary sources immediately before billing implementation and store submission.
