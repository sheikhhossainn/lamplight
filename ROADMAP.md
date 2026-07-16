# Lamplight — Product Roadmap

Source of truth for what ships when. The full Free/Premium feature list lives
in this doc (adapted from the original spec, with a few additions/changes
called out inline as **[added]** / **[changed]**). The DB shape backing all of
this is `supabase/schema.sql`.

## Phasing philosophy

Ship the smallest thing that lets 10-15 friends actually read books and lets
you actually measure what they do — before building a single Premium feature.
Everything Premium-shaped in the schema exists so that _adding_ those features
later is additive (new code reading existing columns/tables), never a
migration that risks the data you've already collected.

**[kept from your spec]** Don't gate EPUB import, reading, or offline
downloads. Those are the core experience — limits belong on learning/
enhancement features (translation, vocabulary capacity, review, insights, AI),
which is what makes upgrading feel like unlocking more, not removing a wall.

### Free tier philosophy — why the caps are generous, not stingy **[added]**

The free tier's job isn't to ration usage — it's to let a real habit form
(and the "look how much I've saved" ownership that comes with it) *before*
anyone hits a wall. A cap that bites too early kills the habit before it
forms — Evernote's infamous 2-device sync limit is the textbook cautionary
tale; Duolingo's opposite bet (core lessons unlimited forever, monetize on
removing friction, not core value) is the one worth copying. The right cap
sits *above* what a normal engaged reader hits in their first 2-4 weeks, so
the wall only shows up once someone's already dependent — at which point
"go unlimited" reads as relief, not punishment. That user is also, by
definition, your best conversion target.

`translations_per_day` is treated differently from the two per-book caps:
it's a daily *rate limit*, not a collection size, and it's the one most
likely to interrupt an immersive session — a hard chapter, a run of unknown
words — which is the fastest way to break first-session trust. It's set more
generously for that reason.

Current free-tier values (`supabase/schema.sql`'s `plans` seed row):

| Cap | Value |
|---|---|
| Vocabulary words / book | 30 |
| Quotes / book | 15 |
| Translations / day | 25 |

---

## Phase 0 — Alpha: the 10-15 friend beta (current target)

Goal: friends can read, the app is stable, and you can see what they actually
did without having to ask them.

**Ship:**

- Reading: unlimited EPUB import, Gutenberg catalog browse/download, offline
  reading, 1890s reading experience, font size + line spacing, progress
  tracking, bookmarks. _(Import from device already scoped separately from
  the Gutenberg pipeline — see `library_items.source_type = 'user_upload'`.)_
- Library: bookshelf UI, custom shelves, search, filter by author/language/category.
- **[added]** Per-book "Add to shelf" — a button on the book detail screen to
  add/remove that one book from any shelf, creating a new shelf inline if none
  exist yet. Complements the shelf-centric editor (pick books for a shelf)
  with the inverse flow (pick shelves for a book).
- Translation: tap a word → its translation, 25/day cap. **[clarified]** This
  is the *action*, ephemeral unless saved — see below for how it differs from
  Vocabulary, and Phase 1 for the context-aware upgrade.
- Vocabulary: the *saved result* of a translation — save (free-tier cap
  30/book), view per book, jump back to the exact sentence, in-book highlight.
  Every save implies a translation happened first; not every translation gets
  saved.
- **[added]** Flashcard review: shuffled deck of saved vocabulary with
  flip-to-reveal, a below-threshold nudge ("read N more to test your memory")
  instead of dropping into a too-small deck, and a daily review prompt
  surfaced from the Library screen.
- Quotes: save (cap 15/book), jump to location, in-book highlight, share as a
  quote card (3 free themes).
- Weekly quiz: basic score/progress only.
- Reading atmosphere: free tier only — Gentle Rain, Night Crickets.
- Stats: books completed, reading streak, total reading time.
- **[added]** Anonymous auth (Supabase anonymous sign-in) the moment the app
  first opens — no signup screen for your friends, but every row is already
  keyed by a real `auth.users.id` that can later be upgraded to an email/
  OAuth account with zero data migration.
- **[added]** `reading_sessions` + `analytics_events` populated from day one —
  this _is_ the "analyze their activity" ask. Concretely: start/end a session
  on reader-screen focus/blur, log `analytics_events` for quote saved, word
  saved, quiz completed, ambient sound played, shelf created, book imported.
- **[added]** `profiles.is_beta_tester = true` for all 10-15 friends, set once,
  by hand or by a one-line script — so every future analytics query can say
  "beta cohort vs. everyone else" forever, not just during this phase.
- **[added]** In-app feedback capture (`public.feedback`) — a simple "Send
  feedback" entry point in Settings beats relying on friends to remember to
  message you. Bug vs. feature-request vs. general, freeform text is enough
  for 15 people.
- **[added]** Scripture readers — Quran and Bible (Old Testament + New
  Testament), full reader verticals reusing the same word-tap, vocabulary,
  and highlight machinery as EPUB books. Not in the original spec; added
  because scripture reading-with-translation is the same core loop as any
  other book.
- **[added]** Onboarding flow that gates first app open on picking a
  source/target language pair, before any book is opened.
- **[added]** Saved-books screen for managing on-device EPUB downloads
  separately from the catalog browse view.
- **[added]** In-app update banner surfacing OTA (`eas update`) check/
  downloading/ready/error state, so a stalled update is visible instead of
  silent.

**Explicitly not built yet:** billing/subscriptions, spaced repetition,
adaptive quizzes, reading insights/heatmap, cloud sync/backup, premium
ambient sounds, premium quote themes/fonts/colors, AI companion. The schema
has room for all of it; the app doesn't read/write those parts yet.

**What to actually look at after ~2-4 weeks with friends:**

- Session length distribution and time-of-day (from `reading_sessions`).
- D1/D7 retention — did they come back a second/eighth day.
- Completion rate — % of started books that reach `completed_at`.
- Vocabulary/quote saves per session — signals whether "remember what you
  read" resonates enough to make Premium's pitch land later.
- Which `analytics_events.event_type`s barely fire at all — tells you what to
  cut or redesign before building the Premium version of it.
- Feedback table, read weekly, not just at the end.

---

## Phase 1 — Premium, v1 (after beta feedback, not before)

Re-validate against real feedback before committing to this list as-is —
priority order below is a suggestion, not a promise.

**Unlimited Learning:** unlimited vocabulary, quotes, translations — flip by
changing `plans.free.*_limit` columns to non-null values... no wait, the
free plan keeps its caps; a user's `profiles.plan_key` moves to `'premium'`,
whose `plans` row already has every limit column `null` (= unlimited).

**Smart Learning:** spaced repetition, adaptive quizzes, mastery levels,
difficult-word review, vocabulary history. All read/write against
`saved_words.srs_*` and `weekly_quizzes.quiz_type = 'adaptive'`, both already
in the schema.

**Context-Aware Translation** **[added]** — free stays as today's bare
word-for-word lookup; Premium upgrades the *translation step itself*:
- Meaning informed by the surrounding sentence, not just the bare word
  (the same word can translate differently depending on context — free's
  word-for-word lookup can't tell the difference, Premium's can).
- Similar words (near-synonyms in the target language).
- Antonyms.

This is a translation-provider upgrade (a richer lookup, likely a different
API/model than the free word-for-word one), not new persisted state — nothing
in `saved_words` needs to change to support it; a saved word already keeps its
`context_sentence`, so a Premium user re-viewing a saved word can still be
shown this enrichment after the fact, computed on demand rather than stored.

**Reading Insights:** speed, habits, vocabulary growth, monthly reports,
activity heatmap — all derived from `reading_sessions` + `analytics_events`,
no new tables needed, "just" query/dashboard work.

**Premium reading atmosphere:** the full ambient set (Heavy Rain, Rain on
Window, Fireplace, Forest Birds, Wind Through Trees, Ocean Waves, Distant
Thunder, Quiet Café, Old Library Ambience, Victorian Study Room, Snowstorm,
Midnight Forest). **[kept]** nature/ambient only, no music — fits the
1890s/candlelit identity far better and avoids a licensing headache.

**Cloud features:** backup, cross-device sync, restore purchases/library —
this is the first phase that actually needs `user_preferences` and
`library_items`/`reading_positions` etc. to be _read back_ on a new device,
not just written to.

**Premium quote cards:** more themes, custom fonts/colors, HD export.

**Billing:** `subscriptions` table + whichever of RevenueCat/Stripe/native IAP
you pick — provider-agnostic by design, so the choice doesn't touch any other
table.

---

## Phase 2 — AI Reading Companion (future, speculative)

Explain difficult passages / literary references, simplify complex sentences,
character summaries, spoiler-aware chapter summaries. **[added]** Whatever
ships first should log through `analytics_events` (`event_type =
'ai_companion_query'`, payload = feature/book/cost) before it gets its own
table — you'll want per-request cost visibility before this is a stable
enough shape to warrant a dedicated schema.

---

## The Premium message

**[kept, this is the right call]** Don't market Premium as "unlimited
translations." Market it as:

> Lamplight Premium helps you remember what you read.

Vocabulary, quotes, spaced repetition, and reading insights are all in
service of that one sentence — the feature list is a menu, that sentence is
the pitch.

---

## Schema-to-feature map (quick reference)

| Feature                               | Table(s)                                      |
| ------------------------------------- | --------------------------------------------- |
| Catalog browse/filter                 | `books`                                       |
| EPUB import                           | `library_items` (`source_type='user_upload'`) |
| Shelves                               | `shelves`, `shelf_items`                      |
| Reading progress / streak / completed | `reading_positions`, `reading_sessions`       |
| Vocabulary (+ future SRS)             | `saved_words`                                 |
| Quotes / quote cards                  | `highlights`                                  |
| Translation cap                       | `translation_usage`, `plans`                  |
| Weekly quiz (+ future adaptive)       | `weekly_quizzes`                              |
| Free vs. Premium limits               | `plans`, `profiles.plan_key`                  |
| Billing state                         | `subscriptions`                               |
| Cross-device preferences              | `user_preferences`                            |
| Beta cohort tracking                  | `profiles.is_beta_tester`                     |
| Activity analytics                    | `reading_sessions`, `analytics_events`        |
| Feedback                              | `feedback`                                    |
| Remote feature flags                  | `app_config`                                  |
