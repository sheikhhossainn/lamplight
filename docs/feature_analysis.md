# LampLight — Deep Feature Analysis & Real Improvements
> Grounded in direct code inspection. Every suggestion references an actual file and a specific behavior.

---

## 1. Word Translation Popup (`WordTranslationPopup.tsx`)

**What it does well:**
- Anchor-aware positioning with flip logic (below → above when near screen bottom) — this is correct and well-implemented
- Stale request cancellation via `cancelled` flag in the async effect — no race conditions
- Long-press on 🔊 = slow speech rate — a genuinely good UX detail
- In-session translation cache in `cloudTranslationProvider.ts` prevents re-fetching the same word

**Real issues found in code:**

**Issue A — Translation fires immediately on tap, before the user intends to save.** `[RESOLVED]`  
`speakWord` was moved inside the `status: 'ready'` success branch in `WordTranslationPopup.tsx`, so words are only spoken after a successful translation.

**Issue B — The Copy button on line 203 has no `onPress` handler.** `[RESOLVED]`  
Wired `Clipboard.setStringAsync(state.translation)` using `expo-clipboard`. Added flexible content width and canonical `ReloadIcon` for pronunciation replay.

**Issue C — `checkTranslationCap` does a DB read on every single word tap.** `[PENDING — Task 1-G]`  
Every tap → `getTodayUsageCount()` → SQLite read → async. For a fast reader tapping frequently this adds latency before the popup even starts translating. Fix: use `checkCachedTranslationCap()` as the fast-path guard. Only fall back to the real DB read when the cached value is near or at the cap.

---

## 2. Word Action Menu (`WordActionMenu.tsx`)

**What it does well:**
- Identical anchoring logic to `WordTranslationPopup` — consistent positioning across the two menus
- `saveLabel` prop makes it reusable for Quran's "Highlight verse" vs prose's "Save as quote"

**Real issues found in code:**

**Issue D — No audio on long-press, even though `speakWord` is already imported and working in `WordTranslationPopup`.**  
`WordActionMenu` is the first menu the user sees on long-press. It shows the word but doesn't speak it. The `pronunciationEngine.ts` is fully functional — `speakWord(word, sourceLang)` is a one-line call. Add it to the component mount effect so the word is spoken the moment the menu appears.

**Issue E — Two separate menus (tap = translate, hold = action menu) require two separate gestures for a common flow.**  
The most common user journey is: long-press → tap "Translate" → see translation → tap "Save". That's a long-press + tap + tap. `WordTranslationPopup` already supports both translation and save in one screen. Consider merging: long-press could open the translation popup directly (with translate auto-firing), eliminating `WordActionMenu` as a separate step. The "Save as quote" action is the only thing unique to `WordActionMenu` — it could be a secondary action in the popup.

---

## 3. Pronunciation Engine (`pronunciationEngine.ts`)

**What it does well:**
- Toggle pattern (`toggleSpeech`) so tapping the same 🔊 twice stops it — correct
- Listener/subscriber pattern for `useCurrentSpeechId` — clean reactive design
- `getSpeechLocale` correctly maps `bn` → `bn-BD`, not just repeating the code

**Real issues found in code:**

**Issue F — Uses `expo-speech` (device TTS), which sounds robotic.**  
This is the same complaint users have about Beelinguapp. For the hackathon demo this is fine. But the engine is called `pronunciationEngine` — the abstraction is already there. The fix is to swap `Speech.speak()` for a neural TTS API call (ElevenLabs, Google Cloud TTS) *behind the same function signature*, so no callers change. The architecture already supports this cleanly.

**Issue G — `getSpeechLocale` uses a `switch` with only 8 languages hardcoded.**  
The default fallback `${code}-${code.toUpperCase()}` (`vi` → `vi-VI`) is wrong for Vietnamese (`vi-VN`), Thai (`th-TH`), etc. The 38-language picker in `languagePair.ts` is not reflected here. Add the missing locales or replace the switch with a map keyed by the same codes used in `TARGET_LANGUAGES`.

---

## 4. Share Card Screen (`ShareCardScreen.tsx`)

**What it does well:**
- Three card variants with swipe gesture to cycle them — polished interaction
- `captureRef` → `Sharing.shareAsync` pipeline is correct and complete
- `adjustsFontSizeToFit` + character-length-based font size: adaptive text sizing prevents overflow
- Functional `PanResponder` using functional state update (no stale closure) — this is the correct pattern

**Real issues found in code:**

**Issue H — The card is completely generic — same parchment/gradient/foldSplit for every user and every language.**  
The `ShareCard` receives only `text` and `attribution`. It has no knowledge of the user's language or culture. This is the exact gap identified in the competitive analysis. The variant system (`type Variant`) is already the right abstraction — adding culture-aware variants means adding new `Variant` values and corresponding `if (variant === 'korean')` branches. The swipe-to-cycle UX already supports more variants.

**Issue I — Translation of the quote is not shown on the card.**  
The card shows `text` (the quote) and `attribution` (book + author). But a Bangla user who saved a sentence from an English book gets a card that only shows the English sentence. Their followers on Facebook see English with no Bangla. The `SavedWord` type has both `sourceWord` and `translation` — the quote highlight has `quoteText` but no stored translation. To fix: when navigating to the share screen from a highlight, also pass the translated version of the quote and show it in a smaller font below.

**Issue J — `lineHeight` in `quoteFontStyle` is hardcoded as `fontSize * 1.45`.**  
For Bangla and Arabic text, descenders and ascenders are taller than Latin script. 1.45× lineHeight clips characters. Use 1.6× for `bn`, `ar`, `hi`, `ur` target languages.

---

## 5. Spaced Repetition System (SRS)

**What it does well:**
- Full SM-2 algorithm correctly implemented in `srsAlgorithm.ts`
- `getSrsMetrics()` in `savedWords.ts` is a single efficient aggregate query
- `listDueWords()` query is correct — orders by `srs_due_date ASC` so most overdue comes first
- `phonetic` column exists in schema v13 — phonetic can be stored with each word

**Real issues found in code:**

**Issue K — `contextSentence` is fetched from DB in `listDueWords()` but never displayed in `vocabulary.tsx`.** `[RESOLVED]`  
Implemented on the front of the SRS flashcard as an interactive blurred tap-to-reveal hint box with haptic feedback, and fully displayed in context on the back of the card.

**Issue L — `listDueWords()` returns ALL due words in one query, no limit.**  
```sql
SELECT * FROM saved_words WHERE srs_due_date <= ? OR srs_due_date = 0
```
A user who hasn't reviewed for a week could have 200 due words returned at once. This is called a "review flood." Linga's users export to Anki because this is Anki's known problem too. Fix: add `LIMIT 20` and a "session complete" screen after 20 cards that shows how many remain. This turns an overwhelming wall into satisfying daily sessions.

**Issue M — SRS `initialSrsState()` sets `dueDate: Date.now()`.**  
A word saved at 3pm is immediately due for review. The user saves a word, closes the app, reopens it — the word is already in their review queue from 2 minutes ago. Set the initial `dueDate` to the start of the *next* day, so newly saved words appear in tomorrow's review session, not tonight's.

---

## 6. Translation Provider (`cloudTranslationProvider.ts`)

**What it does well:**
- In-session `Map` cache — correct, prevents duplicate network calls
- Handles multi-segment Google response by joining with spaces — the comment explains exactly why

**Real issues found in code:**

**Issue N — Uses the unofficial `gtx` Google Translate endpoint.**  
Line 7: `https://translate.googleapis.com/translate_a/single?client=gtx`. This endpoint is undocumented, key-free, and Google can break it without notice. It's fine for a hackathon but needs to be flagged as a risk. The `TranslationProvider` interface is already the right abstraction for swapping to the official API later.

**Issue O — The in-session cache is a plain `Map` that grows unboundedly.**  
A user who reads for hours and taps hundreds of words will accumulate them all in memory. For a reading app where the same words appear repeatedly across chapters, an LRU cache capped at 500 entries would be more appropriate and trivially implementable.

---

## 7. Scripture Q&A Engine

**What it does well:**
- `controversialQuestions.ts` at 123 KB is a substantial curated dataset — not a thin ChatGPT wrapper
- Rate limiting (`inquiryRateLimit.ts`) and caching (`inquiryCache.ts`) are both present — production-aware
- `citationResolver.ts` (20 KB) suggests sourced answers, not hallucinated ones

**Real issue found in code:**

**Issue P — The scripture Q&A is a standalone UI (`ScriptureInquiryDeck.tsx`), not wired to the in-reader experience.**  
A user reading a Quran verse about forgiveness cannot tap the verse and ask "what do the other scriptures say about this?" — they have to exit the Quran reader, navigate to the Q&A section, and manually type the question. This is the biggest UX gap in the scripture section. The fix is a contextual "Ask across scriptures" button on each verse that pre-fills the question with the verse's theme.

---

## 8. Language Settings (`languagePair.ts`)

**What it does well:**
- 38 languages — genuinely broad, including Bengali, Korean, Arabic, Thai, Swahili
- Persisted via `app_settings` table — survives app restarts
- `useSyncExternalStore` pattern — correct reactive design, no prop-drilling

**Real issue found in code:**

**Issue Q — Source language is hardcoded as English.**  
Line 7 comment: *"The bundled/source books are English, so the source side of the pair is fixed."*  
This directly contradicts the product vision of "any language, any direction." The `languagePair.ts` file is named as if it handles pairs but only handles the target. The `motherTongue.ts` file exists in settings but isn't connected to the translation call — `WordTranslationPopup` always passes `sourceLang = 'en'` as the default. For Bangla→Korean or Japanese→Bangla to work, `sourceLang` needs to come from the book's `source_language` DB column, which already exists in the schema.

---

## 9. Cap Policy (`capPolicy.ts`)

**What it does well:**
- 300 free translations/day is a well-reasoned limit (comment explains the math)
- Server-side enforcement with local cache as fallback — correct anti-abuse design
- Premium users bypass entirely — clean separation

**Real issue found in code:**

**Issue R — The cap is per-day but resets at an ambiguous time.**  
`getTodayUsageCount()` presumably uses a date string key. If it resets at midnight UTC, a user in Bangladesh (UTC+6) hits their reset at 6am — their "day" starts in the early morning, which is fine. But a user in Los Angeles (UTC-7) hits it at 5pm the previous day. The reset time should be local midnight, not UTC midnight. This is worth verifying in `translationUsageApi.ts`.

---

## Summary Table

| # | File | Issue | Severity |
|---|---|---|---|
| A | `WordTranslationPopup.tsx` | Word spoken on error, not just success | ✅ Resolved |
| B | `WordTranslationPopup.tsx` | Copy button has no `onPress` — completely broken | ✅ Resolved |
| C | `WordTranslationPopup.tsx` | DB read on every tap for cap check | Medium |
| D | `WordActionMenu.tsx` | No audio on long-press despite engine being ready | Medium |
| E | `WordActionMenu.tsx` | Two-menu flow adds unnecessary steps to common path | Low |
| F | `pronunciationEngine.ts` | Device TTS (robotic) — engine is ready for neural TTS swap | Medium |
| G | `pronunciationEngine.ts` | `getSpeechLocale` missing most of the 38 supported languages | **High** |
| H | `ShareCardScreen.tsx` | No culture-aware card variants | Medium |
| I | `ShareCardScreen.tsx` | Card doesn't show translated text below the quote | Medium |
| J | `ShareCardScreen.tsx` | `lineHeight * 1.45` clips Bangla/Arabic/Hindi scripts | Medium |
| K | `vocabulary.tsx` | `contextSentence` saved but never shown during SRS review | ✅ Resolved |
| L | `savedWords.ts` | `listDueWords()` has no LIMIT — review floods on neglected decks | **High** |
| M | `srsAlgorithm.ts` | `initialSrsState` sets dueDate to now — new words flood today's review | Medium |
| N | `cloudTranslationProvider.ts` | Unofficial Google endpoint — fragile | Low |
| O | `cloudTranslationProvider.ts` | Unbounded in-memory translation cache | Low |
| P | `scripture-qa/` | Q&A not wired to in-reader verse context | **High** |
| Q | `languagePair.ts` | Source language hardcoded to English — blocks multi-language pairs | **Critical** |
| R | `capPolicy.ts` | Daily cap resets at UTC midnight, not user's local midnight | Low |
