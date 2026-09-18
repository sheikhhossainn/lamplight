# Lamplight — Polished Features Plan

## Product direction

Lamplight should be a reading app that quietly turns a book into a personal language course. The retention loop should come from visible progress, remembered context, and a library that becomes more useful over time—not from anxiety, punishment, or artificial notification pressure.

The recommended order is:

1. Make word and quote selection feel native.
2. Deliver the first useful learning result in the first reading session.
3. Turn saved words into a short, adaptive daily practice.
4. Make the reader's library, memory history, and preferences continuous across devices.
5. Add social features only after the private learning loop is strong.

---

## 1. Word-selection handle audit

### Decision: block the current interaction from being considered polished

The handles are visually close to a phone selector, but the interaction is not using the same architecture as a native selector. The drag is processed on the JavaScript thread, every movement updates React state, and the hit test estimates character positions from glyph widths. That combination explains both symptoms: delayed motion and the wrong boundary being selected.

### Findings

| Before | After | Why |
|---|---|---|
| `PanResponder` runs every drag event on the JS thread (`ReaderPageView.tsx:693`, `:707`). | Use Gesture Handler `Gesture.Pan()` with Reanimated shared values. | Direct manipulation stays responsive even while React or the reader is busy. Both libraries are already installed. |
| Every move calls the parent and `setSelection` (`[bookId].tsx:1128`). | Move the handle every frame on the UI thread; notify JS only when the nearest word boundary changes and commit the final range on release. | Removes a parent/page/highlight render from most pointer frames. |
| Handle movement changes `left` and `top` (`ReaderPageView.tsx:935`, `:948`). | Keep a fixed absolute origin and move with `translateX` / `translateY`. | Transforms avoid Yoga layout work and are GPU-friendly. |
| Every hit test rebuilds line offsets and character-width arrays (`ReaderPageView.tsx:161`, `:235`, `:261`). | Build one immutable geometry cache after text layout and reuse it for the life of the rendered page. | Drag work becomes a small nearest-line/nearest-token lookup instead of repeated O(n) string work. |
| Horizontal location is inferred from per-character advance estimates. | Select from measured word/token rectangles and use the tokenizer's real `start` and `end` offsets. | Kerning, ligatures, grapheme clusters, Bengali conjuncts, Arabic shaping, and CJK make proportional character math inaccurate. |
| The callback claims it receives a word boundary but actually receives an arbitrary character offset. | Start handle always emits `token.start`; end handle always emits `token.end`. | Selection cannot stop in the middle of a word or split a grapheme. |
| `lineStartOffsets()` finds rendered line text with repeated `indexOf` calls. | Calculate the paragraph-to-line mapping once; retain the previous matched end while building the cache. | Prevents repeated phrases or platform trimming from mapping to the wrong occurrence. |
| Approximate fallback positions are shown before layout (`ReaderPageView.tsx:738`). | Hide/disable a handle until its measured geometry is ready, or retain the last valid measured position during a page turn. | A selectable-looking handle should never start at a fabricated coordinate. |
| Local `targetX/targetY` and global `pageX/pageY` are mixed for page-edge detection. | Convert the gesture to one documented coordinate space at gesture start and use it for hit testing and edge zones. | Removes offset errors caused by padding, safe areas, and chapter-title height. |

### Target interaction architecture

```text
finger (UI thread)
  -> Gesture.Pan translation
  -> visual handle transform at display refresh rate
  -> nearest measured token rectangle
  -> boundary changed?
       no: no JS or React work
       yes: one throttled selection-range update + one light selection haptic
  -> release: commit final selection to React/SQLite action flow
```

### Geometry model

Create a page-scoped `SelectionGeometry` after `onTextLayout` and token layout are ready:

```ts
type SelectionTokenRect = {
  paragraphIndex: number;
  tokenIndex: number;
  start: number;
  end: number;
  lineIndex: number;
  xStart: number;
  xEnd: number;
  top: number;
  bottom: number;
};
```

The existing paragraph renderer already creates an inline `Text` target for each word. During selection mode, measure those token targets and combine their rectangles with the paragraph and line layouts. Keep this geometry in refs/shared values; do not put every rectangle in React state.

For a wrapped word, store one rectangle per visual fragment with the same token range. For RTL text, compare physical rectangles but preserve logical `start`/`end` offsets. Never split an extended grapheme cluster.

### Gesture behavior

- Preserve the finger-to-handle offset captured on touch-down so the handle does not jump underneath the finger.
- Use at least a 48 dp hit target while keeping the visible knob small.
- Follow the finger 1:1. Do not tween while the finger is down.
- Add 6 dp of boundary hysteresis around the current token midpoint to prevent flickering between adjacent words.
- Fire selection haptics only when the logical token changes, never on every frame.
- Keep handles from crossing. When they meet, select one whole token instead of producing a zero-width selection.
- Page turns should begin only after the handle remains in an edge zone for 300 ms; leaving the zone cancels the timer.
- If a release needs visual settling, use a 120 ms ease-out or a no-overshoot spring. Most releases should need no animation because the handle is already on a measured boundary.
- Ignore extra pointers once a handle owns the gesture.

### Implementation sequence

#### Selector P0-A — correctness first

1. Extract and cache line-start mapping per paragraph/layout revision.
2. Produce measured token rectangles from the existing tokenized runs.
3. Snap start/end handles to token boundaries.
4. Remove fabricated fallback coordinates.
5. Normalize all calculations to page-content coordinates.

#### Selector P0-B — native-feeling motion

1. Replace both `PanResponder`s with Gesture Handler pans.
2. Render each handle as an `Animated.View` driven by shared-value transforms.
3. Keep the draft handle location and token index on the UI thread.
4. Cross to JavaScript only when the token changes, the edge zone changes, or the gesture ends.
5. Memoize the page/highlight render path so a boundary update does not repaginate or rerender unrelated pages.

#### Selector P0-C — validation

Test on a lower-end physical Android device with:

- English punctuation, contractions, and repeated phrases.
- Bengali conjuncts and vowel marks.
- Arabic RTL text and diacritics.
- Japanese/Korean text where whitespace cannot be assumed.
- A word wrapping across a line, first/last word on a page, and overlapping handles.
- 0.85× and 1.15× font settings, Day/Lamp transitions, and a busy JS thread.
- Slow drags across lines and fast diagonal drags toward both page edges.

Acceptance criteria:

- The visible handle remains under the finger with no obvious frame drops.
- A handle never lands inside a token or grapheme cluster.
- The highlighted word is the one nearest the handle in all supported scripts.
- Page turning never triggers from ordinary near-edge word selection.
- No selection move causes pagination or a full FlatList update.

---

## 2. What the learning system already does

The app is not limited to translation, pronunciation, synonyms, antonyms, and a quiz. The current code already contains:

- Mother-tongue and target-language onboarding.
- A vocabulary calibration that estimates a learner tier and recommends a comfortable first book.
- Long-press word lookup with translation and context.
- Saved words with source book, sentence, chapter, page, and paragraph location.
- Pronunciation playback and phonetic display where available.
- Vocabulary growth history.
- A four-grade SM-2-style spaced-repetition engine: Again, Hard, Good, Easy.
- Due-word batches, difficult-word replay, mastery stages, and a daily checkpoint.
- Context hints that preserve active recall before revealing the answer.
- Generated usage notes, mother-tongue meanings, synonyms, and antonyms with a local cache.
- Fill-in-the-blank quizzes, fresh-sentence variants, and related-word distractors.

There is documentation drift: `ROADMAP.md` still describes spaced repetition as unbuilt, while the SQLite schema, repository, and vocabulary screen now implement it. Update that roadmap when this plan moves into implementation.

### What is still missing

The current loop mostly teaches recognition: “I have seen this word and can choose it.” Useful language growth also needs production, listening, pattern recognition, comprehension, and transfer to new contexts.

| Gap | User value | Recommended feature |
|---|---|---|
| Productive recall | Proves the learner can produce a word, not only recognize it. | Type-the-word and mother-tongue-to-target prompts with tolerant normalization. |
| Listening | Connects spelling to real comprehension. | Hear a word or sentence, then type/select what was heard; reuse on-device TTS first. |
| Pronunciation feedback | Playback teaches a model but does not show whether the learner can say it. | Record-and-compare flow later, with explicit privacy and a validated speech-scoring provider. Do not fake a score from volume/duration. |
| Grammar and patterns | A translation does not explain why a sentence is structured that way. | Tap a sentence for a concise grammar/pattern card tied to the exact book context. |
| Collocations and word families | Individual definitions do not teach natural use. | Show common neighbors, inflections, roots, and word-family links; review them as a cluster. |
| Reading comprehension | Vocabulary can improve while story understanding remains weak. | End-of-chapter recap, 2–3 spoiler-safe questions, and “explain this passage.” |
| Transfer | Memorizing the original sentence can inflate mastery. | Test the word in one unseen sentence before marking it mastered. |
| Adaptive book guidance | Onboarding recommends once, then stops learning from behavior. | Continuously estimate coverage from lookups, reading speed, abandoned chapters, and review success. |
| Goal and progress clarity | Counts do not answer “am I getting better?” | Weekly report: reading consistency, words retained, lookup rate falling, and next recommended action. |
| Script-specific help | Bengali, Arabic, Japanese, and Korean have different learning problems. | Pluggable language modules for transliteration, morphology, tokenization, and script practice. |

### The “book becomes a course” model

Each active book should automatically produce a lightweight course:

1. **Read:** continue from the exact page.
2. **Notice:** translate or inspect a word/sentence without leaving the page.
3. **Save:** keep the word with its real sentence and location.
4. **Recall:** review only due items in a 3–5 minute session.
5. **Use:** answer one productive or listening prompt.
6. **Understand:** complete a short chapter check.
7. **Reflect:** see what became easier and receive the next best action.

This is more defensible than a generic flashcard app because every lesson retains the emotional and narrative context in which the learner discovered it.

---

## 3. Retention system

### Retention principle

Optimize for learners returning because Lamplight preserves momentum and demonstrates improvement. Avoid loss-framed streaks, notification spam, infinite feeds, deceptive scarcity, or making export deliberately difficult.

### 3.1 Extreme personalization

The app already knows mother tongue, target language, calibration level, selected theme, books, saved words, due dates, and reading position. Add only a few high-signal choices:

- Primary goal: enjoy literature, build vocabulary, pass an exam, read scripture, or maintain a language.
- Comfortable daily commitment: 5, 10, 20, or 30 minutes.
- Preferred balance: mostly reading, balanced, or intensive study.
- Optional reminder window, never enabled by default without consent.

Build a local `NextBestAction` selector that chooses one action from current state:

- Resume a book when there is reading momentum and few due words.
- Run a 3-minute review when due words are accumulating.
- Offer a chapter check after a chapter is completed.
- Recommend an easier book when lookup density and abandonment are high.
- Recommend a harder book when coverage and recall are consistently strong.

Do not use opaque “AI personalization” for this first version. Deterministic rules are testable, offline, and easy to explain to the learner.

### 3.2 First-session “Aha” moment

Target: value within five minutes, before asking for an account upgrade or notification permission.

1. Use calibration to open the recommended book at a real passage.
2. Coach one long-press without blocking the page.
3. Show the translation, pronunciation, and a one-line contextual explanation.
4. Save the word and immediately create a three-card micro-lesson from that same sentence.
5. Finish with a tangible result: “You understood this sentence and started your first book deck.”
6. Return directly to the exact line in the book.

Activation event: `first_context_word_saved` followed by either `first_micro_lesson_completed` or `first_book_resumed` within 24 hours.

### 3.3 Habit formation

Create one calm daily ritual, **Today by Lamplight**, containing only what is due:

- Resume reading for the user's chosen duration.
- Review a maximum of 5–20 due words, based on backlog and commitment.
- Use one word in a new context or answer one listening prompt.
- Optionally revisit one saved quote.

Supporting mechanics:

- A consistency streak based on completing either meaningful reading or due review—not opening the app.
- One grace day per seven-day period; never reset long-term progress or use shame copy.
- A visible “memory strength” trend based on actual recall, separate from the streak.
- Weekly reflection: pages/minutes read, words retained, lookup rate, strongest book, and one suggested adjustment.
- Contextual reminders such as “6 words are ready to review” instead of generic “Come back!” messages.

### 3.4 Community building

Community is Phase 3, after private retention works. Start with low-moderation, book-centered actions:

1. Private reading circles with an invite link.
2. Share a quote card or chapter milestone to a circle.
3. Opt-in monthly reading challenges measured by meaningful reading days, not time spent staring at a screen.
4. Friends-only progress and encouragement.
5. Curated public book discussions later, only after moderation, reporting, blocking, and spoiler controls exist.

Never expose raw highlights, vocabulary weaknesses, scripture activity, or reading history publicly by default.

### 3.5 Ethical switching value

The strongest reason to stay should be an increasingly valuable personal archive:

- Reading positions and completion history.
- Saved words with their original sentences and book locations.
- Recall history and a personal mastery model.
- Highlights, quote cards, notes, and chapter reflections.
- Personalized book-fit history and weekly learning reports.
- Shelves, themes, language preferences, and daily-plan preferences.

This value must sync reliably and remain exportable. High switching value should come from continuity and accumulated insight, not data hostage-taking.

### Retention metrics

Measure outcomes rather than raw screen time:

- Activation: first contextual save and first completed micro-lesson.
- D1 / D7 / D30 retained learners, segmented by goal and target language.
- Weekly retained readers: at least two meaningful reading/review days.
- Book-resume rate and chapter completion rate.
- Due-review completion rate and median due backlog.
- Recall rate after 1, 7, and 30 days.
- Lookup density per 1,000 words and whether it declines without comprehension dropping.
- Percentage of mastered words recalled in a new sentence.
- Sync success rate, conflict rate, and restore completion rate.

Do not optimize for session length alone; a focused five-minute review can be more successful than a long, confused session.

---

## 4. Cross-device sync plan

### Current state

- The app is offline-first and user data is stored in SQLite.
- Supabase anonymous auth already creates a stable `auth.uid()` and RLS policies protect per-user rows.
- Cloud tables exist for library items, shelves, positions, saved words, highlights, and preferences.
- The client currently sends analytics events but does not push or pull reading data.
- Local IDs and cloud relationships do not yet align: local records use `book_id`, while cloud records reference a `library_item_id` UUID.
- Several cloud user-data tables lack `updated_at` and deletion tombstones.
- Local and cloud SRS column names/shapes have diverged.
- Scripture reading positions, saved words, and highlights do not yet have corresponding per-user cloud sync tables.
- Auth tokens are currently stored in the general SQLite settings table. Before sync is shipped, move refresh credentials to secure device storage; adding that dependency/configuration requires a separate approval.

### Sync contract

SQLite remains the immediate UI source. The network never blocks reading, selecting, saving, reviewing, or changing a setting.

Every syncable record needs:

- A stable client-generated UUID.
- `owner_id` in the cloud.
- `created_at` and `updated_at` timestamps.
- `deleted_at` tombstone instead of an immediate hard delete.
- A monotonic server revision or server timestamp for incremental pull.
- A schema version for payload migrations.

Add local tables:

```text
sync_outbox
  id, entity_type, entity_id, operation, payload_json,
  created_at, attempt_count, next_attempt_at

sync_cursor
  entity_type, last_server_revision, last_synced_at

cloud_library_map
  local_book_id, library_item_id, content_fingerprint
```

All writes still pass through `db/client.ts`. A repository mutation and its outbox entry must be created in the same serialized transaction so a local change cannot be missed by sync.

### Entity order

Push/pull in dependency order:

1. Profile and user preferences.
2. Library metadata and local-to-cloud library mapping.
3. Shelves and shelf membership.
4. Reading positions.
5. Saved words and SRS state/review events.
6. Highlights, quotes, and notes.
7. Quran/Bible reading state, highlights, and saved words.
8. Learning reports and optional analytics aggregates.

Catalog text stays downloadable from its canonical source. For imported EPUBs, sync the file only when cloud backup is enabled: upload by content hash, store the Storage path in `library_items`, and download on demand on a new device. Do not put binary book data into Postgres rows.

### Authentication and account recovery

Anonymous auth is useful for frictionless onboarding but is not enough for cross-device recovery. Add an explicit **Protect and sync my library** flow:

1. Start anonymous as today.
2. Offer email magic link first; Apple/Google can follow.
3. Link the permanent identity to the existing anonymous user so all current rows keep the same owner.
4. Show whether the library is protected, last synced, and whether any change is waiting.
5. Never create a second account silently when linking fails; stop and offer recovery.

### Conflict rules

| Entity | Merge rule |
|---|---|
| Reading position | Latest reading activity wins for resume location; keep `furthest_percent` as a separate max value so rereading an earlier page is not overwritten. |
| SRS | Store review actions as append-only events with stable IDs; recompute card state deterministically. Until events exist, newest `last_reviewed_at` wins. |
| Saved word / highlight / note | Union by stable UUID. A newer tombstone beats an older edit. Concurrent edits to notes should preserve both versions for recovery. |
| Shelves | Last write wins per shelf field; membership rows merge independently with tombstones. |
| Preferences | Newest field-level timestamp wins, not one timestamp for the entire preference object. |
| Imported book | Deduplicate by normalized content hash; never by title alone. |

Avoid using device time as the sole authority because clocks drift. The server should assign the revision used for pull order.

### Sync triggers and behavior

- Initial bootstrap after an account is linked.
- On app foreground if the last sync is stale.
- Debounced after local mutations while online.
- On reader exit for the latest position.
- Manual **Sync now** and **Restore library** actions.
- Batched push, incremental pull, exponential backoff with jitter, and idempotency keys.
- A compact state in Settings: `Synced`, `Syncing`, `Offline—changes saved`, or `Needs attention`.
- Never show routine offline failures as destructive errors.

### Backend changes required before client sync

1. Align SRS fields between SQLite and Supabase, preferably around append-only review events plus derived card state.
2. Add `updated_at` and `deleted_at` to mutable cloud records.
3. Add user-owned scripture state tables and RLS.
4. Add an RPC or endpoint for idempotent batched mutations and incremental changes.
5. Define the catalog-book to `library_items` mapping response so the client never guesses UUIDs.
6. Add Storage policies for owner-only imported EPUB and cover files.
7. Add integration tests for every RLS policy before enabling sync.

### Sync validation matrix

- Offline edits on two devices, then reconnect in both orders.
- Save, edit, and delete the same entity on different devices.
- Re-read an earlier chapter after progressing further.
- Review the same SRS card on two devices.
- Link an anonymous account after months of local use.
- Expired/rotated refresh token and interrupted bootstrap.
- Partial batch failure and app termination mid-sync.
- Large imported library and missing local EPUB file.
- Device clock skew of at least ±24 hours.
- Sign-out, account deletion, and clean local-data removal.

---

## 5. Delivery roadmap

### Phase 0 — instrument and stabilize (1–2 weeks)

- Implement Selector P0-A and P0-B.
- Add selector performance/correctness test cases for all supported scripts.
- Reconcile `ROADMAP.md` with the already-shipped learning features.
- Add missing events: review started/completed, quiz completed, chapter completed, recommendation opened, sync outcome.
- Define a meaningful-session event and baseline D1/D7 retention before changing the loop.

Exit criteria: native-feeling selection on physical Android and trustworthy baseline metrics.

### Phase 1 — immediate value and daily loop (2–4 weeks)

- Ship the first-session contextual micro-lesson.
- Add **Today by Lamplight** with deterministic next-best-action rules.
- Add productive recall and listening questions using existing saved-word data and TTS.
- Add weekly progress reflection and a non-punitive consistency streak.
- Feed actual review success and lookup density back into book-fit recommendations.

Exit criteria: improved activation, D7 retention, and 7-day recall without increasing notification opt-outs.

### Phase 2 — sync foundation (3–5 weeks)

- Complete schema alignment, tombstones, revisions, scripture state, and Storage policies.
- Add secure credential storage after dependency approval.
- Build outbox/cursor/library mapping and repository transaction hooks.
- Ship account linking, bootstrap restore, sync status, and conflict tests.
- Roll out behind a remote feature flag to the beta cohort first.

Exit criteria: two-device offline conflict suite passes; no lost local data; at least 99.5% successful sync batches in beta.

### Phase 3 — deeper learning (3–6 weeks)

- Grammar/pattern cards and word-family/collocation clusters.
- Chapter comprehension and spoiler-safe explanations.
- Transfer tests using unseen sentences before mastery.
- Script-specific learning modules.
- Pronunciation recording/scoring only after privacy, provider accuracy, and cost are validated.

Exit criteria: learners can demonstrate production and transfer, not only recognition.

### Phase 4 — community experiments

- Private reading circles, quote sharing, and opt-in challenges.
- Moderation, reporting, block controls, and privacy review before public discussion.
- Evaluate community retention separately from the private learning loop.

Exit criteria: the social layer improves retained reading days without increasing abuse/privacy incidents.

---

## 6. Guardrails

- Keep reading available offline and never block it on a sync/auth failure.
- Do not place the core reading, import, or data-export experience behind a retention trick.
- Ask before adding a native dependency or changing Expo/native configuration.
- Never claim pronunciation accuracy without a validated speech model.
- Do not send book text, highlights, scripture activity, or recorded voice to a model/provider without explicit disclosure and consent.
- Respect reduced motion and avoid decorative motion in the reader.
- Keep reminders opt-in, time-windowed, and easy to disable.
- Provide export and account deletion before marketing cloud sync as protection.

