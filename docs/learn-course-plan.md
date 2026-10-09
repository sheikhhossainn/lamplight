# Learn Course — Implementation Plan

Status: proposal · Working branch: `feature/learner-parallel-text`, which holds the reader's sticky
page translation, the onboarding level step and the Stage 1 letters screen. All of it is
uncommitted, plus a temporary onboarding override in `src/app/_layout.tsx` that must be removed
before any commit.

**v1 scope: a Japanese course taught in Bangla** (target `ja`, mother tongue `bn`). Every design
decision below must also hold for other pairs, but content, transliteration tables and on-device
testing in v1 cover only ja ← bn. (If "Bangla" was meant as a second target language too, it is
Phase I below.)

---

## 1. What we are building

Lamplight today is a **reader for people who can already read**. A complete beginner who picks
Japanese with Bangla as mother tongue is dropped into raw Meiji prose with no readings, no
sentence audio and no idea how the language works.

The Learn Course is a **second space inside the app**, reached from a **Read ⇄ Learn switch in the
top-left corner**. It is a guided path from zero to the first real book, taught entirely in the
mother tongue:

```
Letters  →  Sounds & first words  →  Grammar units  →  Graded reading  →  Real books
(script)     (with audio)             (one pattern       (stories using      (unlocked by
                                       per lesson)        only taught words)  coverage)
```

Every step ends in practice: recognise, listen, build a sentence, translate from the mother
tongue, write. The learner can flip to **Read** at any moment and land exactly where they left
the book, then flip back to **Learn** and land exactly where they left the lesson.

### Is this the right way?

Yes, with three guardrails so Lamplight does not become a Duolingo clone:

1. **Reading is the destination.** Every unit ends in a short graded reading, and the course hands
   off to real books as soon as coverage allows.
2. **Patterns, not lectures.** Each grammar point is a 2–4 line explanation in the mother tongue
   plus many examples.
3. **Calm, not gamified.** No hearts, lives or streak shaming. A mistake costs nothing; the item
   simply comes back later.

---

## 2. The Read ⇄ Learn switch

### 2.1 What it is

A compact two-segment pill fixed in the **top-left corner** of every top-level screen in both
spaces:

```
┌──────────────────────────────────────┐
│ ┌──────────────────┐            (?)  │
│ │ 📖 Read │ ✦ Learn │                 │  ← same size, same spot, on every screen
│ └──────────────────┘                 │
│ Good evening                          │
│ …                                     │
```

- **Two segments**: `Read` (book icon) and `Learn` (sparkle icon). The active segment has an amber
  fill (`colors.flameAmber`, text `colors.primaryDark`). The inactive one is transparent with
  `colors.umber` text.
- **Sliding indicator**, animated with a Reanimated spring. Reuse the reader's existing slider
  values from `ReaderPageView.handleSwitchMode` (`damping 24, stiffness 260, mass 0.7`) so motion
  matches the rest of the app.
- **"Swappable":** tap either segment, **or swipe the pill left or right**. A horizontal pan with
  more than 24 px of travel commits the switch. Both fire `Haptics.selectionAsync()`.
- **Size:** height 36 pt, hit area 48 pt (`hitSlop`), width set by content. Labels use
  `typography.uiRowTitle` at 13 pt.
- **Accessibility:** `accessibilityRole="tablist"`; each segment is a `tab` with
  `accessibilityState={{ selected }}` and the label "Reading space" / "Learning space". Screen
  readers announce the switch.
- **RTL** (Arabic mother tongue): the pill mirrors to the **top-right**, matching the existing
  `headerRTL` handling in `homescreen.tsx`.
- **Reduced motion:** the indicator jumps without a spring and the space swap uses a plain
  cross-fade.

### 2.2 When it shows

| Condition | Switch |
|---|---|
| Target language has a course (v1: `ja`) **and** the mother tongue has course strings (v1: `bn`) **and** level is `zero` or `some` | Shown |
| Level `fluent` | Hidden by default; can be enabled with "Show Learn space" in Settings |
| No course for the pair (e.g. target `en`, or `ja` with mother tongue `ar` in v1) | Hidden; the header looks exactly as it does today |

One helper owns this rule: `isLearnSpaceAvailable(targetLang, motherTongue, level)` in
`src/features/learn/availability.ts`. **No screen re-implements the condition.**

### 2.3 Where it shows

- **Read space:** the header of Home, Library, Vocabulary and Settings.
- **Learn space:** the header of Path, Grammar and Practice.
- **Reader** (`reader/[bookId]`): **not** on the page, which keeps the reading surface clean. The
  reader's chrome menu gets one extra row, "Practice grammar", which opens the Learn space. The
  switch inside Learn then returns to the same page of the book.
- **Never** inside a lesson (the exercise runner is full-screen, with ✕ to exit), and never in
  onboarding.

The pill is the **first child of each header row**. It must not move between screens: same
offset (`layout.screenMargin` horizontally, `insets.top + 16` vertically) everywhere. That spatial
consistency is what makes the switch feel like one control, not seven copies of one.

### 2.4 How the swap works (navigation)

```
Root Stack
├── (tabs)                ← Read space (Home, Library, Vocabulary, Settings) — always the base
├── (learn)               ← Learn space (Path, Grammar, Practice) — pushed ON TOP of (tabs)
│   ├── path
│   ├── grammar
│   └── practice
├── learn/lesson/[lessonId]   ← full-screen runner, pushed above (learn)
└── reader/[bookId], book/[id], …
```

- **Read → Learn:** `router.push('/(learn)/path')`. Read stays mounted underneath, so every scroll
  position, open tab and the open book are preserved.
- **Learn → Read:** `router.back()` when the screen below is a Read screen. Otherwise (cold start
  directly into Learn, or a deep link) use `router.replace('/(tabs)/homescreen')`. A single helper
  makes this choice: `switchToRead()` in `src/features/learn/appMode.ts`. **Screens never call the
  router for the swap directly.**
- **Transition:** the `(learn)` Stack screen uses `animation: 'fade'` with
  `contentStyle: { backgroundColor: colors.libraryBackground }`. Both spaces share that
  background, so the swap shows no colour flash. This follows the comment pattern already in the
  root `_layout.tsx`.
- **Android hardware back** in Learn behaves exactly like tapping `Read`: it is the same stack pop.
- **Learn state across swaps:** Learn unmounts when popped. That is intentional: the lesson resume
  point lives in SQLite (`course_progress.exercise_index`), so returning to Learn always opens the
  exact exercise.
- **Remembered mode:** `app_mode` (`'read' | 'learn'`) is saved in `app_settings`. On cold start,
  after Home mounts, if the saved mode is `learn` and the space is available, Learn is pushed once.
  A `zero` learner finishing onboarding lands in Learn.

### 2.5 Learn space layout

Its own bottom tab bar, visually identical to the Read tab bar. Reuse `ThemeAwareTabBarBackground`
and the `screenOptions` from `src/app/(tabs)/_layout.tsx` by exporting them, not copying them.

| Tab | Content |
|---|---|
| **Path** | Units and lessons map, one "Continue" CTA, due-review count |
| **Grammar** | Every grammar point learned so far, as a reference list (open → note + examples + audio) |
| **Practice** | Mixed review of due items, letter chart, and (later) free writing |

```
┌──────────────────────────────┐
│ ┌──────────────┐             │
│ │ Read │✦Learn │  日本語        │
│ └──────────────┘             │
│ ████████░░░░░  Unit 3 of 12  │
│  ✓ Letters · Hiragana        │
│  ✓ Letters · Katakana        │
│  ● Unit 3 · "এটা হলো …" (AはBです)│ ← current, amber
│     ┌──────────────────────┐ │
│     │  Continue · lesson 2/5 │ │
│     └──────────────────────┘ │
│  ○ Unit 4 · প্রশ্ন (か)          │
│  ○ Reading · 「ねこ」            │
│ Review · 14 due          →   │
├──────────────────────────────┤
│   Path    Grammar   Practice │
└──────────────────────────────┘
```

---

## 3. UX principles

| # | Principle | Concretely |
|---|---|---|
| 1 | **One decision per screen** | One question, one answer area, one button. |
| 2 | **One obvious next step** | Path opens on the Continue CTA; Home (Read) shows a small "Continue lesson" card. |
| 3 | **Mother tongue everywhere** | Instructions, hints, grammar notes, transliteration and feedback are all in Bangla in v1. |
| 4 | **Hear everything** | Every Japanese item auto-plays once, with ▶ to replay and 🐢 for slow. |
| 5 | **No typing until ready** | Taps only (choices, tiles) until unit 6. Typing always has a tile fallback. |
| 6 | **Short sessions** | 8–12 exercises, about 3–5 minutes. ✕ at any time; resumes on the same exercise. |
| 7 | **Instant, kind feedback** | Right: haptic, amber ✓, audio, auto-continue. Wrong: correct answer plus a one-line Bangla reason; the item comes back later in the lesson. |
| 8 | **Progress without pressure** | Path map, no timers, optional daily goal. |
| 9 | **Suggest, never block** | Opening a hard book shows a one-time sheet: "Continue lesson / Read anyway". |
| 10 | **Accessible** | Hit targets of 48 pt or more, labelled tiles, Dynamic Type safe, reduced motion respected, Day/Lamp via `useTheme()`, no hard-coded colours. |

### Exercise wireframes

Build the sentence (prompt in Bangla, answer in Japanese tiles):
```
┌──────────────────────────────┐
│ ✕   ▓▓▓▓▓▓░░░░░░             │
│ এই বাক্যটি জাপানিতে লিখুন:      │
│ "এটি একটি বিড়াল।"             │
│ ┌──────────────────────────┐ │
│ │ これ  は  ねこ  です        │ │  ← answer line (tap a tile to remove it)
│ └──────────────────────────┘ │
│  [です] [ねこ] [は] [これ] [が] │  ← each tile: kana + Bangla transliteration under it
│ ┌──────────────────────────┐ │
│ │          যাচাই করুন         │ │  ← Check
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Letter card:
```
│            か                │
│        কা  ·  ka             │  ← Bangla script first, Latin second
│           ▶  🐢              │
│  উদাহরণ: かさ  কাসা  (ছাতা)     │  ← word, transliteration, meaning
│        [ আমি জানি ]            │  ← "I know this"
```

Feedback:
```
│ ✓ ঠিক!  これはねこです           │
│ ✕ সঠিক উত্তর: これはねこです        │
│   "は" বাক্যের বিষয় চিহ্নিত করে      │
│        [ চালিয়ে যান ]            │  ← Continue
```

---

## 4. Course structure (Japanese, taught in Bangla)

```
Course → Unit (one theme or grammar point) → Lessons (8–12 exercises)
                                          → Unit review → Reading checkpoint
```

| # | Unit | Teaches |
|---|---|---|
| 1 | Hiragana | 46 letters, dakuten — letter data **built** (`src/features/learn/scripts.ts`) |
| 2 | Katakana | 46 letters, long vowels |
| 3 | AはBです | topic は, です, これ/それ/あれ |
| 4 | Questions | か, なん, だれ |
| 5 | の possession | わたしのほん |
| 6 | Verbs (ます) | たべます, のみます, を |
| 7 | Place & time | に, で, へ |
| 8 | Adjectives | い / な |
| 9 | Negative & past | ません, ました |
| 10 | あります / います | existence |
| 11 | Te-form | て, ください |
| 12 | First kanji | 人 日 本 山 川 … with furigana |

After unit 12 a learner knows roughly 400–600 words, and the reading checkpoints move to real
short Aozora children's stories with furigana as the bridge to the library.

---

## 5. Exercise types

| Type | Prompt | Answer | From |
|---|---|---|---|
| `letter_read` | Letter | Pick its sound (Bangla script) | U1 |
| `letter_listen` | Audio | Pick the letter | U1 |
| `match_pairs` | 4–5 pairs | Tap-match Japanese ↔ Bangla | U1 |
| `word_meaning` | Word + audio | Pick the Bangla meaning | U3 |
| `listen_pick` | Audio | Pick what was heard | U3 |
| `fill_blank` | Sentence with a gap | Pick the missing piece (e.g. a particle) | U3 |
| `build_sentence` | Bangla sentence | Arrange Japanese tiles | U3 |
| `translate_back` | Japanese sentence | Arrange Bangla tiles | U4 |
| `spot_word` | Short text | Tap every instance of a word or particle | U5 |
| `write_free` | Bangla prompt | Type Japanese, graded by AI (online only) | U6, optional |
| `read_check` | Graded story | 2–3 comprehension questions in Bangla | Checkpoints |

**Checking answers:**
- Tile answers compare token-id arrays against `sentence.tokens` and any `accepted` alternatives.
- `write_free` uses a new `literary-ai` action, `grade_sentence`, which returns
  `correct | close | wrong` plus a one-line Bangla reason. It is cached by (prompt, answer) and
  skipped when offline.

---

## 6. Bangla transliteration

- **Table-driven, not AI.** Japanese kana map to romaji syllables (already in `scripts.ts`), and a
  `romaji → Bangla` table maps those to Bangla script: `ka → কা`, `shi → শি`, `tsu → ৎসু`,
  `n → ন্`, and so on.
- **Module:** `src/features/learn/transliterate.ts`, exporting
  `transliterate(kana: string, motherTongue: 'bn' | 'en'): string`. It is a pure function with no
  React Native imports, so `tsx --test` can run it.
- **Coverage:** all 46 basic kana, dakuten and handakuten (が, ぱ …), small ゃゅょ combinations
  (きゃ → ক্যা), small っ (doubles the next consonant), long vowels (ー and おう / えい), and ん
  before b/m/p.
- **Approximations are honest.** Sounds Bangla lacks (つ, ふ, ざ) carry a note shown on the letter
  card: "আনুমানিক — শুনে মিলিয়ে নিন" ("approximate — match it by ear").
- **Course content stores kana readings for every kanji**, so the course never needs a tokenizer.

---

## 7. Content model

Bundled JSON assets, which ship over the air with no native change and no new dependency.

```
assets/courses/ja/
  course.json        # units, lessons, item and sentence ids per lesson, unlock rules
  items.json         # letters, words, grammar points
  sentences.json     # pre-tokenised sentences with readings
  i18n/bn.json       # Bangla meanings, prompts, grammar explanations, UI strings
```

```ts
type CourseItem =
  | { id: string; kind: 'letter'; char: string; roman: string; say: string }
  | { id: string; kind: 'word'; text: string; reading: string; roman: string; pos: string }
  | { id: string; kind: 'grammar'; pattern: string; exampleIds: string[] };

type CourseSentence = {
  id: string;
  unit: number;
  tokens: Array<{ text: string; reading?: string; itemId?: string }>;
  accepted?: string[][];
};

type CourseStrings = {
  meanings: Record<string, string>;
  explanations: Record<string, string>;
  ui: Record<string, string>;
};
```

**Exercise engine** (`src/features/learn/exerciseEngine.ts`, pure): takes the lesson's ids and
returns an exercise queue. Distractors come from the same unit and part of speech, and due items
from earlier units are mixed in. Authors write items and sentences once; the engine produces
every exercise type from them.

**Authoring** (`scripts/build-course.mjs`):
1. Write an outline by hand.
2. An LLM drafts sentences, readings and Bangla strings.
3. **A fluent Japanese + Bangla reviewer approves every file.**
4. The validator checks that every `itemId` exists, every item has Bangla strings, every sentence
   uses only items from its own or earlier units, and no kanji appears without a reading.

---

## 8. Storage

New migrations appended to `MIGRATIONS` in `src/db/schema.ts` (currently v24), always accessed
through `getDb()`:

```sql
-- v25
CREATE TABLE IF NOT EXISTS course_progress (
  lang TEXT NOT NULL, lesson_id TEXT NOT NULL,
  status TEXT NOT NULL,                        -- 'locked' | 'open' | 'done'
  exercise_index INTEGER NOT NULL DEFAULT 0,   -- resume point
  best_accuracy REAL, completed_at INTEGER, updated_at INTEGER NOT NULL,
  PRIMARY KEY (lang, lesson_id)
);
-- v26
CREATE TABLE IF NOT EXISTS course_items (
  lang TEXT NOT NULL, item_id TEXT NOT NULL,
  srs_stage INTEGER NOT NULL DEFAULT 0, srs_interval_days REAL NOT NULL DEFAULT 0,
  srs_ease_factor REAL NOT NULL DEFAULT 2.5, srs_due_date INTEGER NOT NULL DEFAULT 0,
  srs_reps INTEGER NOT NULL DEFAULT 0, srs_lapses INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (lang, item_id)
);
```

- **Not `saved_words`:** its remote `library_item_id NOT NULL` foreign key would break sync, and
  the 30-words-per-book cap would block lesson 1.
- **Settings keys** in `app_settings`: `app_mode`, `learner_level:<lang>` (exists),
  `learn_space_forced_on`.
- **Stage 1 data:** `script_learned:<lang>` is copied into `course_items` once, then deleted.
- **Sync:** local only in v1.

---

## 9. Screens and files

| Route / file | Purpose |
|---|---|
| `src/components/ModeSwitch.tsx` | The top-left pill (§2) |
| `src/features/learn/appMode.ts` | `useAppMode()`, `switchToLearn()`, `switchToRead()`, persisted `app_mode` |
| `src/features/learn/availability.ts` | `isLearnSpaceAvailable()` and the `useLearnSpaceAvailable()` hook |
| `src/app/(learn)/_layout.tsx` | Learn tab bar (shared styling with `(tabs)`) |
| `src/app/(learn)/path.tsx` | Path map + Continue |
| `src/app/(learn)/grammar.tsx` | Grammar reference list |
| `src/app/(learn)/practice.tsx` | Review queue, letter chart entry |
| `src/app/learn/lesson/[lessonId].tsx` | Exercise runner |
| `src/app/learn/grammar/[itemId].tsx` | Grammar note |
| `src/app/learn/reading/[storyId].tsx` | Graded reading + questions |
| `src/app/learn/[lang].tsx` (exists) | Becomes the letter chart, opened from Practice |
| `src/components/BeginnerPathCard.tsx` (exists) | Becomes the Read-space "Continue lesson" card |

Components under `src/features/learn/components/`: `ExerciseShell`, `ChoiceList`, `TileBank`,
`AnswerLine`, `MatchPairs`, `AudioButton`, `TransliterationLine`, `FeedbackSheet`, `PathMap`,
`LearnerSentence`.

Reused as they are: `useTheme()`, `pronunciationEngine`, `srsAlgorithm`, `expo-haptics`,
Reanimated, Gesture Handler. **No new dependencies.**

---

## 10. Build order

Each phase is a separate `feature/*` branch, shippable on its own, and tested on a device before
the next one starts.

| Phase | Scope | Depends on |
|---|---|---|
| **0. Housekeeping** | Remove the onboarding override; commit the current branch work (reader Phase 1, level step, letters) after on-device OK | — |
| **A. Foundations** | Migrations v25–v26, `courseRepo`, content loader + validator, `transliterate.ts` (ja → bn), engine skeleton, tests | 0 |
| **B. Switch + Learn space** | `availability.ts`, `appMode.ts`, `ModeSwitch`, `(learn)` group with three tabs (Path shows units from `course.json`), pill in all seven headers, reader menu row | A |
| **C. Exercise runner** | `ExerciseShell`, `ChoiceList`, `AudioButton`, `FeedbackSheet`, `letter_read`, `letter_listen`, `match_pairs`; the letters unit as lessons with resume | B |
| **D. Grammar units 3–6** | `TileBank`, `build_sentence`, `translate_back`, `fill_blank`, `word_meaning`, grammar note, reviewed content | C, reviewer |
| **E. Reading checkpoints** | `LearnerSentence`, graded story, `read_check`, 3 stories | D |
| **F. Practice + SRS** | Due queue, counts on Path and Home card | D |
| **G. Reader bridge** | "Continue lesson / Read anyway" sheet; coverage-based unlocks (reader plan Phase 3) | E |
| **H. Writing** | `write_free`, `grade_sentence` action | D, server approval |
| **I. Scale out** | Bangla as a target language, more mother tongues, units 7–12, pre-generated audio | all |

---

## 11. Agent execution guide

These instructions are for whichever agent implements a phase. Follow them literally. Together
with `AGENTS.md` they are the contract.

### 11.1 Before touching code

1. Read `AGENTS.md`, this file, and **only** the files listed in the task card below.
2. `git status` must be clean, or contain only this branch's known work. Create
   `feature/learn-<phase>` from the branch that holds the previous phase.
3. **Never** push, never touch `main`/`dev`, never change git identity.
4. If a card leaves a visual or interaction detail open, **stop and ask**. Never invent UI.

### 11.2 Global rules

- **DB:** only through `getDb()` (the serializing queue). Migrations are appended, additive, and
  idempotent.
- **Styling:** only `useTheme()` tokens. No hex colours except the brand constants already allowed
  in `AGENTS.md`. Test Day and Lamp.
- **Logic purity:** logic in `src/features/learn/*.ts` must not import React Native, so
  `tsx --test` can run it. UI goes in `components/` and `app/`.
- **Dependencies:** none new. No `app.json` / `ios/` / `android/` changes.
- **Editing on this machine:** files use **CRLF**. Edit with the Edit tool, or with a Node script
  that preserves CRLF. Python is not installed.
- **After every task:** run `npx tsc --noEmit` and `npm test`, both must be green, then do the
  on-device check in the card, then stop and report.

### 11.3 Task cards (Phase B: the switch)

**B1 — availability**
- Create `src/features/learn/availability.ts`:
  `isLearnSpaceAvailable(target, motherTongue, level, forcedOn)`.
- v1 truth: `target === 'ja' && motherTongue === 'bn' && (level !== 'fluent' || forcedOn)`.
- Also export `useLearnSpaceAvailable()`. It reads `useTargetReadingLanguage()`,
  `useMotherTongue()` and the level, and re-evaluates on focus.
- Test: `tests/learnAvailability.test.ts`, covering every branch of the table in §2.2.

**B2 — app mode**
- Create `src/features/learn/appMode.ts`, following the `useSyncExternalStore` pattern of
  `targetReadingLanguage.ts`.
- `switchToLearn()`: set mode, `router.push('/(learn)/path')`.
- `switchToRead()`: set mode; if `router.canGoBack()` and the previous route is outside `(learn)`,
  call `router.back()`; else `router.replace('/(tabs)/homescreen')`.
- Persist `app_mode` fire-and-forget.
- **Pitfall:** guard against a double push. If already in `(learn)`, `switchToLearn()` does nothing.

**B3 — `ModeSwitch` component**
- Spec as in §2.1. Props: `active: 'read' | 'learn'`.
- Tap or swipe calls the B2 helpers.
- Renders `null` when `useLearnSpaceAvailable()` is false.
- Indicator: `useSharedValue`, `withSpring({ damping: 24, stiffness: 260, mass: 0.7 })`; measure
  segment width with `onLayout`, as `ReaderPageView` does.
- Swipe: `Gesture.Pan().activeOffsetX([-12, 12])`; commit when `|translationX| > 24`.
- **Pitfall:** call JS from the gesture through `runOnJS`.

**B4 — Learn space routes**
- Create `src/app/(learn)/_layout.tsx` (Tabs: path, grammar, practice) and three screens. Each
  screen's header row starts with `<ModeSwitch active="learn" />`.
- Export `ThemeAwareTabBarBackground` and the shared `screenOptions` from
  `src/app/(tabs)/_layout.tsx`, then import them. Do not duplicate them.
- Register `(learn)` in the root Stack in `src/app/_layout.tsx` with `animation: 'fade'` and
  `contentStyle: { backgroundColor: colors.libraryBackground }`.
- Path shows units from `course.json` (Phase A). Grammar and Practice may show empty states with
  approved copy.

**B5 — pill in the Read headers**
- Add `<ModeSwitch active="read" />` as the first element of the header in `homescreen.tsx`,
  `library.tsx`, `vocabulary.tsx` and `settings.tsx`.
- Existing header content moves down one row only when the pill renders. When it renders `null`,
  the header must be pixel-identical to today. Verify with screenshots before and after.
- RTL: wrap in the same `headerRTL` row direction that Home uses.

**B6 — reader entry**
- Add one row, "Practice grammar", to the reader chrome menu in `src/app/reader/[bookId].tsx`, next
  to "Translate Page". Show it only when the space is available. It calls `switchToLearn()`.
- Confirm that `switchToRead()` from Learn returns to the same page of the book.

**B7 — onboarding landing**
- When a `zero` learner finishes onboarding and the space is available, call `switchToLearn()`
  right after Home mounts. Do not change the onboarding screens.

### 11.4 On-device acceptance checklist (Phase B)

Run on Android (Expo Go, SDK 57) in both Day and Lamp:

- [ ] Japanese target + Bangla mother tongue + "I'm brand new": the pill appears top-left on Home,
      Library, Vocabulary and Settings, in the same spot on each.
- [ ] Tapping Learn fades to Path with no colour flash. Tapping Read returns to the exact tab and
      scroll position.
- [ ] Swiping the pill left or right switches. A short or vertical drag does not.
- [ ] From the reader menu, "Practice grammar" opens Learn; Read returns to the same page.
- [ ] Hardware back in Learn returns to Read.
- [ ] Kill and relaunch while in Learn: the app reopens in Learn.
- [ ] Target English, or level "I read it comfortably": no pill, and the headers look unchanged.
- [ ] Arabic mother tongue (RTL): no pill in v1 (no `ar` strings); layout unaffected.
- [ ] TalkBack announces "Reading space, selected" / "Learning space".
- [ ] Largest system font: the pill does not clip or overlap the help button.

### 11.5 Common failure modes to check before reporting done

| Symptom | Usual cause | Fix |
|---|---|---|
| White flash on swap | `(learn)` Stack `contentStyle` missing or mismatched | Set it to `colors.libraryBackground` |
| Read loses scroll position | Used `replace` instead of `back` | Use `switchToRead()` only |
| Two Learn screens stacked | Double tap / swipe and tap together | No-op guard in `switchToLearn()` |
| Pill jumps between screens | Different header padding per screen | Use `layout.screenMargin` and `insets.top + 16` on every screen |
| Gesture crashes | JS called from a worklet | `runOnJS` |
| Tests import RN and fail | UI code in `features/learn/*.ts` | Keep logic pure; move UI out |
| Headers shift when the pill is hidden | Wrapper `View` always rendered | Render the wrapper only when available |

---

## 12. Audio

- **v1:** device TTS (`expo-speech`), already wired, with voice-install prompts and a slow rate.
- **Before public launch:** pre-generated audio per item and sentence, stored in Supabase
  Storage and cached per unit with `expo-file-system` (about 1–3 MB per unit).

## 13. Monetisation

The course never calls the translator, so it never consumes translation caps. The free/Premium
split is a product decision (§15).

## 14. Risks

| Risk | Mitigation |
|---|---|
| Content volume and quality | Generated exercises; LLM drafts; **mandatory fluent reviewer**; validator; "Report a problem" on every exercise (existing `feedback` table) |
| Missing Japanese TTS voice | Existing install prompt; pre-generated audio later |
| Approximate transliteration | Notes plus a Latin line plus audio as the source of truth |
| Two spaces feel like two apps | One switch in one fixed spot, shared tab-bar styling, fade transition, cross-links (Continue card, reader menu row) |
| Header regressions on screens without the pill | B5 rule: pixel-identical when hidden; before/after screenshots |
| Navigation edge cases (cold start, deep links) | One helper (`switchToRead`) with a `replace` fallback |
| OTA migration safety | Additive tables only, idempotent guards like those in `db/client.ts` |

## 15. Decisions needed

1. **Free vs Premium** split for the course.
2. **Reviewer** for ja ← bn content.
3. **Audio:** device TTS for beta, or pre-generated audio before launch?
4. **AI writing grading** (`grade_sentence` in `literary-ai`, a server change).
5. **Pill icons:** reuse `LibraryIcon` for Read and `SparkleIcon` for Learn from
   `src/components/icons.tsx`, or have new icons designed?
6. **Bangla as a target language:** v1, or Phase I?

## 16. Relation to the reader plan

- Reader Phase 1 (sticky page translation and sentence cache): **built**, on this branch.
- Reader Phase 2 (readings in real books): still needed for the library. The course does not need
  it.
- Reader Phase 3 (coverage): drives Phase G's book unlocks.
- Reader Phase 4 (beginner track): **replaced by this document**.
