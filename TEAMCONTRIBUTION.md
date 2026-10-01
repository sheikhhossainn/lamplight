# Lamplight — Team Contribution & Engineering Guidelines

Welcome to Lamplight. We are building a universal language learning platform built around reading free books — any language, any direction — paired with the world's first cross-scripture AI comparison engine. Built for Shipathon 2026.

---

## Team

| Handle | Role | Primary Area |
|---|---|---|
| **sheikhhossainn** | Lead — Features | SRS / Vocabulary, Translation, Language Pairs, Bug Fixes |
| **mahihasan909-gif** | Features | Quote Sharing Cards, Reader Features & Social |
| **mahim** | UI/UX | Visual polish, themes, cultural design system, share cards |

---

## 1. sheikhhossainn — Vocabulary, SRS & Translation

### 1-A. Fix: Copy Button in Word Translation Popup — ✅ Completed
**File:** `src/features/reader/components/WordTranslationPopup.tsx`
The Copy button renders with `Clipboard.setStringAsync(state.translation)` from `expo-clipboard`, along with dynamic card width adaptation and pronunciation replay via `ReloadIcon`.

### 1-B. Fix: Context Sentence Shown During SRS Review — ✅ Completed
**File:** `src/app/(tabs)/vocabulary.tsx`
Rendered on the front of the SRS flashcard as a blurred hint with a "Context hint · Tap to reveal" badge and haptic feedback, and fully displayed in context on the back of the card.

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

## 2. mahihasan909-gif — Quote Sharing Cards, Reader Features & Social

### 2-A. Build: Quote Card Shows Translation Below the Quote
**Files:** `src/features/reader/components/ShareCardScreen.tsx`, `src/app/quote-share/[highlightId].tsx`
The share card shows only the source quote. Add an optional `translation` prop. When provided, render it in a smaller, elegant secondary font below the quote text — so a reader sharing a foreign-language quote also displays the translated meaning on the card. Wire it through from saved highlight translations.

### 2-B. Fix: lineHeight Clips Non-Latin Scripts in Share Cards
**File:** `src/features/reader/components/ShareCardScreen.tsx` > `quoteFontStyle()`
`lineHeight` is `fontSize * 1.45` for all languages. For non-Latin scripts with tall ascenders/descenders (`bn`, `ar`, `hi`, `ur`), scale line-height to `1.6x` to prevent diacritics and ligatures from clipping.

### 2-C. Build: Culturally-Matched & Premium Quote Card Variants
**File:** `src/features/reader/components/ShareCardScreen.tsx`
Expand card visual aesthetics beyond the default 3 styles to provide culturally-matched variants:
- `'parchment'` / `'bengali'`: warm parchment, literary serif, subtle corner fold
- `'korean'`: clean minimal ink-on-white, subtle geometric accent
- `'arabic'`: deep navy, warm gold accent, RTL-aware alignment
- `'japanese'`: washi texture aesthetic, ink motif
- `'gradient'`: dark flame amber glow
- `'foldSplit'`: modern diagonal split
Support smooth swipe pagination and indicator dots between styles.

### 2-D. Build: Share Card Customization & Attribution Branding
**File:** `src/features/reader/components/ShareCardScreen.tsx`
Enhance quote card attribution and brand identity:
- Clearly format book title and author with refined typographic hierarchy.
- Include the Lamplight flame mark and "Shared from Lamplight" credit tag at the foot of each card variant.
- Adapt quote sizing dynamically based on length so long quotes never bleed into the credit footer.

### 2-E. Fix: Share Card Image Capture & Export Reliability
**File:** `src/features/reader/components/ShareCardScreen.tsx`
Ensure `captureRef` from `react-native-view-shot` reliably produces pixel-crisp PNG outputs across both Android and iOS without rendering artifacts, clipped text, or missing font glyphs before invoking `expo-sharing`.

### 2-F. Fix: Word Spoken Even on Translation Error
**File:** `src/features/reader/components/WordTranslationPopup.tsx` line 113
`speakWord` is called at the start of translation (even on error). Move it inside the `status: 'ready'` branch so the word is spoken only after translation succeeds.

### 2-G. Fix: Translation Cache is Unbounded
**File:** `src/features/translation/cloudTranslationProvider.ts`
The in-session Map cache grows indefinitely. Cap it at 500 entries with a simple LRU eviction (drop the oldest entry when the map exceeds 500 keys).

---

## 3. mahim — UI/UX Polish & Cultural Design System

### 3-A. Culture-Matched Reading Themes — 🟢 Completed
**Files:** `src/features/settings/literaryTheme.ts`, `src/theme/tokens.ts`
Culture-based themes implemented with dedicated palette tokens (day & lamp) and suggested during onboarding based on native language:
- Bengali -> Parchment & Flame (canonical default)
- Korean -> Clean minimal, Hanji paper, cool whites
- Arabic -> Deep navy, warm gold, RTL-aware
- Japanese -> Washi paper, muted earth tones, generous line-height
- Western -> Editorial cream, Lora serif

Each theme = dedicated token set in `tokens.ts`, cascaded via `ThemeProvider.tsx`.

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

1. **Git identity** — dynamically inherit each active contributor's git identity (`git config user.name` and `git config user.email`). Never hardcode or override another teammate's identity or push credentials.
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
| `feature/quote-sharing` | mahihasan909-gif |
| `feature/ui-cultural-themes` | mahim |

### PR Definition of Done
- [ ] Design tokens used — no hardcoded colors or font sizes
- [ ] SQLite calls use the serialized client
- [ ] `npx tsc --noEmit` produces 0 errors
- [ ] Tested on Android / iOS Expo Go (SDK 57)
