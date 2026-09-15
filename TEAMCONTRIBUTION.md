# Lamplight — Team Contribution & Engineering Guidelines

Welcome to Lamplight. We are building a universal language learning platform built around reading free books — any language, any direction — paired with the world's first cross-scripture AI comparison engine. Built for Shipathon 2026.

---

## Team

| Handle | Role | Primary Area |
|---|---|---|
| **sheikhhossainn** | Lead — Features | SRS / Vocabulary, Translation, Language Pairs, Bug Fixes |
| **mahihasan909-gif** | Features | Scripture Q&A, Reader Features, Social & Sharing |
| **mahim** | UI/UX | Visual polish, themes, cultural design system, share cards |

---

## 1. sheikhhossainn — Vocabulary, SRS & Translation

### 1-A. Fix: Copy Button in Word Translation Popup
**File:** `src/features/reader/components/WordTranslationPopup.tsx` line 203
The Copy button renders with no `onPress`. Wire `Clipboard.setString(state.translation)` from `expo-clipboard`.

### 1-B. Fix: Context Sentence Shown During SRS Review — Most impactful
**File:** `src/app/(tabs)/vocabulary.tsx`
`contextSentence` is already saved in every `saved_words` row and fetched by `listDueWords()` — it just isn't rendered. Show it on the review card as a blurred hint the user taps to reveal. No DB changes needed.

### 1-C. Fix: SRS Review Flood
**File:** `src/db/repositories/savedWords.ts` > `listDueWords()`
Add `LIMIT 20` to the due-words query. Add a "Session complete — X cards remaining" screen after the 20-card batch.

### 1-D. Fix: New Words Flooding Today's Review Queue
**File:** `src/features/vocabulary/srsAlgorithm.ts` > `initialSrsState()`
Change `dueDate: Date.now()` to `dueDate: startOfNextDayMs()`. Words saved now should appear in tomorrow's session, not immediately.

### 1-E. Fix: getSpeechLocale Missing Languages
**File:** `src/features/audio/pronunciationEngine.ts`
The switch covers only 8 languages. The app supports 38 targets (see `languagePair.ts`). Replace the switch with a map that covers all 38, with correct region codes (vi -> vi-VN, th -> th-TH, etc.).

### 1-F. Fix: Source Language Hardcoded to English
**Files:** `src/features/settings/languagePair.ts`, `src/features/reader/components/WordTranslationPopup.tsx`
`sourceLang` is always `'en'`. For non-English source books (Bangla, Japanese, Korean), `sourceLang` must come from `book.source_language` (already in the DB schema). Wire it through to the translation call.

### 1-G. Fix: Cap Check DB Read on Every Word Tap
**File:** `src/features/reader/components/WordTranslationPopup.tsx`
Replace `checkTranslationCap()` (full DB read) with `checkCachedTranslationCap()` as the fast-path guard. Only fall back to the real read when cached value is near the cap.

### 1-H. Build: Vocabulary Growth Graph
**File:** New component in `src/app/(tabs)/vocabulary.tsx` or a sub-screen
Query `saved_words` grouped by `DATE(created_at / 1000, 'unixepoch')`. Plot a simple line graph of words saved per day. No new dependencies — use `react-native-svg` (already installed) for the chart.

### 1-I. Build: Word-Level Audio on Long Press
**File:** `src/features/reader/components/WordActionMenu.tsx`
`pronunciationEngine.ts` is fully functional. Call `speakWord(word, sourceLang)` in a `useEffect` on mount so the word is spoken the moment the action menu appears.

---

## 2. mahihasan909-gif — Scripture Q&A, Reader Features & Sharing

### 2-A. Build: In-Reader Scripture Cross-Reference Button
**Files:** Scripture reader components (quran, bible, torah, vedas routes)
Add a contextual "Ask across scriptures" button on each verse. It should open `ScriptureInquiryModal` with the question pre-filled based on the verse's theme. The modal and AI engine already exist in `src/features/scripture-qa/`.

### 2-B. Fix: Word Spoken Even on Translation Error
**File:** `src/features/reader/components/WordTranslationPopup.tsx` line 113
`speakWord` is called at the start of translation (even on error). Move it inside the `status: 'ready'` branch so the word is spoken only after translation succeeds.

### 2-C. Build: Quote Card Shows Translation Below the Quote
**File:** `src/features/reader/components/ShareCardScreen.tsx`
The share card shows only the source quote. Add an optional `translation` prop. When provided, render it in a smaller font below the quote text — so a Bengali user sharing an English quote also shows the Bangla translation on the card.

### 2-D. Build: Mood -> Verse Feature Audit & Completion
**File:** `src/app/mood-verses/`
Audit and verify the full implementation of the mood-to-verse semantic search. Confirm the Supabase edge function is connected, results are rendering correctly, and the UI matches the design system.

### 2-E. Fix: lineHeight Clips Non-Latin Scripts in Share Cards
**File:** `src/features/reader/components/ShareCardScreen.tsx` > `quoteFontStyle()`
`lineHeight` is `fontSize * 1.45` for all languages. For bn, ar, hi, ur, ascenders/descenders are taller — use 1.6x to prevent clipping.

### 2-F. Build: "Compare Across Scriptures" from Prose Book Reader
**Files:** `src/features/reader/components/ReaderPageView.tsx`, `src/features/scripture-qa/ScriptureInquiryModal.tsx`
If a passage references a theme (justice, forgiveness, etc.), offer an inline shortcut to compare that theme across all five scriptures via the existing inquiry modal.

### 2-G. Fix: Translation Cache is Unbounded
**File:** `src/features/translation/cloudTranslationProvider.ts`
The in-session Map cache grows indefinitely. Cap it at 500 entries with a simple LRU eviction (drop the oldest entry when the map exceeds 500 keys).

---

## 3. mahim — UI/UX Polish & Cultural Design System

### 3-A. Culture-Matched Reading Themes
**Files:** `src/features/settings/literaryTheme.ts`, `src/theme/tokens.ts`
Current themes are genre-based (Gothic, Romance, etc.). Add culture-based themes suggested during onboarding based on the user's native language:
- Bengali -> Parchment & Flame (already the default)
- Korean -> Clean minimal, Hanji paper, cool whites
- Arabic -> Deep navy, warm gold, RTL-aware
- Japanese -> Washi paper, muted earth tones, generous line-height
- Western -> Editorial cream, Lora serif

Each theme = a new token set. No new components needed.

### 3-B. Culturally-Matched Share Card Variants
**File:** `src/features/reader/components/ShareCardScreen.tsx`
The Variant type already exists. Add culture-named variants alongside the current three:
- 'korean' — clean ink-on-white, geometric accent
- 'arabic' — RTL text flow, ornamental border, gold on navy
- 'japanese' — washi texture, ink motif
- 'bengali' — warm parchment (existing 'parchment' variant, aliased)

Default variant is suggested based on motherTongue setting. User can still swipe to any style.

### 3-C. Reader UI Polish Pass
**Files:** `src/features/reader/components/ReaderPageView.tsx`, `ReaderMenuModal.tsx`
Review the reading experience against the Linga benchmark for "fluff-free" feel. Focus on: transition timing, menu animation, paragraph spacing, and the Parallel Study toggle interaction.

### 3-D. Vocabulary Tab Visual Upgrade
**File:** `src/app/(tabs)/vocabulary.tsx`
Once sheikhhossainn lands the context sentence (1-B) and growth graph (1-H), integrate them visually. Design the card layout so the context sentence reveal feels intentional.

---

## 4. Non-Negotiable Engineering Rules

1. **Git identity** — every commit must use:
   `
   git config user.name "sheikhhossainn"
   git config user.email "skhossain799@gmail.com"
   `
2. **SQLite queue** — all DB calls go through `getDb()` in `src/db/client.ts`. Never bypass it.
3. **Design tokens** — never hardcode hex values that exist in `src/theme/tokens.ts`. Locked constants: `#1C1B1E`, `#F5A623`, `#F5EDE1`. Reading body: Lora, >=17px, line-height >=1.85.
4. **No new dependencies** without lead sign-off.
5. **Type check before PR**: `npx tsc --noEmit` must pass with 0 errors.

---

## 5. Branching Strategy

| Branch | Owner |
|---|---|
| `main` | Protected — PRs only |
| `feature/srs-vocabulary` | sheikhhossainn |
| `feature/scripture-sharing` | mahihasan909-gif |
| `feature/ui-cultural-themes` | mahim |

### PR Definition of Done
- [ ] Design tokens used — no hardcoded colors or font sizes
- [ ] SQLite calls use the serialized client
- [ ] `npx tsc --noEmit` produces 0 errors
- [ ] Tested on Android / iOS Expo Go (SDK 57)
