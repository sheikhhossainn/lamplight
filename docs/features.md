# LampLight — Feature Implementation Checklist
> Last audited: 2026-09-15 | Based on direct codebase inspection of `src/`

**Key:**  
✅ = Confirmed implemented (source file exists and logic is present)  
⚠️ = Partially implemented (schema/stub exists but UI or logic incomplete)  
❌ = Not yet built  

---

## 📖 Core Reader

| # | Feature | Status | Evidence |
|---|---|---|---|
| 1 | Paragraph-by-paragraph bilingual parallel view | ✅ | `ReaderPageView.tsx` (60 KB) |
| 2 | "Parallel Study" ↔ "Full Translation" toggle | ✅ | `ReaderMenuModal.tsx`, `PageStyleSelectorModal.tsx` |
| 3 | Tap word → instant translation popup | ✅ | `WordTranslationPopup.tsx`, `TappableWords.tsx` (Copy button wired via `expo-clipboard`, flexible dynamic width sizing, pronunciation replay via `ReloadIcon`) |
| 4 | Long-press word → save to vocabulary | ✅ | `WordActionMenu.tsx` |
| 5 | Select sentence → save as highlight/quote | ✅ | `highlights` table in schema, `ReaderPageView.tsx` |
| 6 | Reading position persistence (resume where you left off) | ✅ | `readingPosition.ts` repository |
| 7 | Page turn sound | ✅ | `usePageTurnSound.ts` |
| 8 | Reader guide / onboarding modal | ✅ | `ReaderGuideModal.tsx` |
| 9 | Page style selector (font, size, background) | ✅ | `PageStyleSelectorModal.tsx`, `pageStyles.ts` |
| 10 | Custom pagination engine (glyph-level layout) | ✅ | `engine/paginate.ts`, `engine/glyphWidths.ts` |
| 11 | "Continue reading" hide/remove from history | ✅ | schema v5: `continue_hidden` column |
| 12 | Word-level phonetic stored with save | ⚠️ | `phonetic TEXT` column exists in schema v13 — but `pronunciationEngine.ts` is only 3.7 KB; unclear if phonetic is consistently populated on save |
| 13 | Paragraph audio (🔊 per paragraph) | ⚠️ | `pronunciationEngine.ts` exists — needs verification that it's wired to the paragraph 🔊 button in `ReaderPageView.tsx` |
| 14 | Word-level audio on long press (tap 🔊 on a single word) | ⚠️ | `WordTranslationPopup.tsx` auto-speaks on success and supports tap (normal) / long-press (slow) replay via `ReloadIcon`; `WordActionMenu.tsx` mount-speak pending (1-I) |
| 15 | Offline reading (cached book content) | ❌ | Books fetched from `text_url` (schema v3) — no local cache layer found |
| 16 | Book import (EPUB / PDF / MOBI) | ❌ | No import feature found |
| 17 | Lemmatization (save root word, not inflected form) | ❌ | Saves raw `source_word` — no stemming/lemmatization logic found |

---

## 📚 Book Library

| # | Feature | Status | Evidence |
|---|---|---|---|
| 18 | English books (Project Gutenberg via Gutendex) | ✅ | `books.ts` repo, `gutenberg_id` column, `content-ingestion/` feature |
| 19 | Bangla books library | ✅ | `src/app/bangla/`, `bangla_chapters` table (schema v10) |
| 20 | Japanese books (Aozora Bunko) | ✅ | `src/app/japanese/`, `japanese_chapters` table (schema v11) |
| 21 | Korean books (Gongu Madang) | ✅ | `src/app/korean/`, `korean_chapters` table (schema v12) |
| 22 | User-created shelves / categories | ✅ | `shelves` + `shelf_items` tables (schema v4), `shelves.ts` repo |
| 23 | Saved books screen | ✅ | `src/app/saved-books.tsx` |
| 24 | Book category filter (Philosophy, Religion, etc.) | ✅ | `categories` column (schema v6), `content-ingestion/bookCategories.ts` |
| 25 | Vocabulary-based book recommendation for new users | ⚠️ | `calibration.ts` has bands (foundational→scholar) — unclear if recommendations are wired to book display |
| 26 | Book cover images | ✅ | `cover_url` column (schema v3) |

---

## 🔤 Vocabulary & Spaced Repetition

| # | Feature | Status | Evidence |
|---|---|---|---|
| 27 | Save words with context sentence | ✅ | `context_sentence TEXT NOT NULL` in schema v1 |
| 28 | Save words with book + chapter + page + paragraph | ✅ | All four columns present in schema v1 + v2 |
| 29 | SM-2 spaced repetition algorithm | ✅ | `srsAlgorithm.ts` — full SM-2 with Again/Hard/Good/Easy ratings |
| 30 | SRS stage tracking (New → Learning → Reviewing → Mastered) | ✅ | `srs_stage` column (schema v13), `getStageLabel()` |
| 31 | SRS review screen (vocabulary tab) | ✅ | `src/app/(tabs)/vocabulary.tsx` (43 KB) |
| 32 | **Context sentence shown during SRS review** | ✅ | Implemented in `FlashcardDeck` (`vocabulary.tsx`) as an interactive blurred tap-to-reveal hint on front of card, and displayed in full context on back |
| 33 | Vocabulary growth visualization (graph/chart) | ❌ | Not found anywhere |
| 34 | CEFR level estimation from saved words | ❌ | Not found |
| 35 | Vocabulary mini-games | ❌ | Not found |
| 36 | Vocabulary placement test (onboarding calibration words) | ✅ | `calibration.ts` — 4 bands per language, multi-language |

---

## 📜 Scripture

| # | Feature | Status | Evidence |
|---|---|---|---|
| 37 | Quran reader | ✅ | `src/app/quran/`, `quran-content/` feature, `quran_*` tables |
| 38 | Bible Old Testament reader | ✅ | `src/app/bible/`, `bible-content/` feature, `bible_*` tables |
| 39 | Bible New Testament reader | ✅ | `src/app/bible-nt/` |
| 40 | Torah reader | ✅ | `src/app/torah/` |
| 41 | Vedas reader | ✅ | `src/app/vedas/`, `vedas-content/` feature |
| 42 | Cross-scripture AI Q&A engine | ✅ | `aiScriptureEngine.ts` (26 KB), `scriptureInquiryApi.ts` |
| 43 | Citation resolver (sourced answers) | ✅ | `citationResolver.ts` (20 KB) |
| 44 | Controversial questions dataset | ✅ | `controversialQuestions.ts` (123 KB!), `criticalControversies.ts` (61 KB) |
| 45 | Scripture Q&A rate limiting | ✅ | `inquiryRateLimit.ts` |
| 46 | Scripture Q&A caching | ✅ | `inquiryCache.ts` |
| 47 | Scripture Q&A UI (deck + modal + spinner) | ✅ | `ScriptureInquiryDeck.tsx`, `ScriptureInquiryModal.tsx`, `ScriptureInquirySpinner.tsx` |
| 48 | One-tap "Compare across all scriptures" from verse | ❌ | Not found — Q&A is a separate UI, not wired to in-reader verse tap |
| 49 | Quran word saving | ✅ | `quran_saved_words` table |
| 50 | Bible word/verse highlighting | ✅ | `bible_highlights` table |
| 51 | Mood → verse semantic search | ⚠️ | `src/app/mood-verses/` route exists — verify implementation depth |

---

## 🌐 Language & Translation

| # | Feature | Status | Evidence |
|---|---|---|---|
| 52 | Target language picker (38 languages) | ✅ | `languagePair.ts` — 38 languages including Bengali, Korean, Arabic, Japanese, etc. |
| 53 | Translation usage cap / free tier policy | ✅ | `capPolicy.ts`, `translationUsageApi.ts`, `translation_usage` table |
| 54 | Cloud translation provider | ✅ | `cloudTranslationProvider.ts` |
| 55 | Native language (mother tongue) setting | ⚠️ | `motherTongue.ts` in settings — exists but unclear how deeply used in UI |
| 56 | Native-script phonetics for target words | ❌ | Not found |
| 57 | Grammar explanation in native language (AI tutor) | ❌ | Not found |
| 58 | RTL layout support for Arabic/Hebrew/Urdu readers | ❌ | Not found |

---

## 🎨 Themes & Personalisation

| # | Feature | Status | Evidence |
|---|---|---|---|
| 59 | Reading theme system (Day / Lamp) | ✅ | `readingTheme.ts`, `ThemeProvider.tsx`, `theme/tokens.ts` |
| 60 | Page style preferences (font, size, line height) | ✅ | `pageStylePrefs.ts`, `readingPrefs.ts` |
| 61 | Literary theme preference (Gothic / Romance / Philosophy / Adventure) | ✅ | `literaryTheme.ts` — 4 themes, persisted |
| 62 | Sound preferences (ambience, page turn) | ✅ | `soundPrefs.ts`, `ambience/` feature |
| 63 | Theme transition animations | ✅ | `themeTransition.ts` |
| 64 | **Culture-matched reading themes** (Bengali parchment, Korean minimal, Arabic RTL, Japanese washi) | ❌ | Literary themes exist but are genre-based, not culture-based |
| 65 | **Culturally-matched quote card styles** | ❌ | `ShareCardScreen.tsx` exists but is a single generic style |

---

## 📤 Social & Sharing

| # | Feature | Status | Evidence |
|---|---|---|---|
| 66 | Quote/highlight saving from book | ✅ | `highlights` table, `ReaderPageView.tsx` |
| 67 | Quote share card screen | ✅ | `ShareCardScreen.tsx` (12 KB), `/quote-share/[highlightId]` route |
| 68 | Verse share card screen | ✅ | `verse-share.tsx` → `ShareCardScreen` |
| 69 | Social share (OS share sheet) | ⚠️ | `ShareCardScreen.tsx` exists — verify the share button actually triggers `expo-sharing` or `Share.share()` |
| 70 | **Culturally-styled share cards** (per native language) | ❌ | Single generic card style only |
| 71 | Book Club / social reading with friends | ❌ | Not found |

---

## 🧭 Onboarding & Settings

| # | Feature | Status | Evidence |
|---|---|---|---|
| 72 | Onboarding flow | ✅ | `onboarding.tsx` (45 KB — large, feature-rich) |
| 73 | Vocabulary calibration / placement test in onboarding | ✅ | `calibration.ts` exists with 4-band word lists per language |
| 74 | Target reading language setting | ✅ | `targetReadingLanguage.ts` |
| 75 | Language pair setting | ✅ | `languagePair.ts` |
| 76 | Paywall / subscription screen | ✅ | `paywall.tsx`, `subscription/` feature |
| 77 | App update prompt | ✅ | `app-update/` feature |
| 78 | Analytics | ✅ | `analytics/` feature |
| 79 | Settings tab | ✅ | `src/app/(tabs)/settings.tsx` (25 KB) |
| 80 | **Reading DNA onboarding** (placement test → level → book recommendation) | ⚠️ | Calibration words exist per language but the full flow (test → level display → recommended books) needs verification |

---

## 🚀 Not Started — Hackathon Priorities

| # | Feature | Priority | Notes |
|---|---|---|---|
| A | **Context sentence shown during SRS review** | ✅ Done | Rendered as tap-to-reveal blurred hint on review card in `vocabulary.tsx` |
| B | **Word-level audio on long press** | 🔴 Critical | `pronunciationEngine.ts` exists — wire to `WordActionMenu.tsx` |
| C | **Vocabulary growth graph** | 🔴 Critical | Pure frontend — count saved words by date from existing DB |
| D | **Culture-matched reading themes** | 🟡 Strong differentiator | Token sets — low effort, high demo impact |
| E | **Culturally-styled quote cards** | 🟡 Strong differentiator | Extend `ShareCardScreen.tsx` with theme variants |
| F | **One-tap scripture cross-reference from verse** | 🟡 Strong differentiator | Wire existing `ScriptureInquiryModal` to an in-reader button |
| G | **RTL layout for Arabic/Hebrew/Urdu** | 🟡 Important | Needed for those language pairs to feel native |
| H | Grammar explanation in native language (AI) | 🟢 Post-hackathon | New AI call + UI |
| I | Book Club / social reading | 🟢 Post-hackathon | Requires backend/realtime infra |
| J | Offline reading cache | 🟢 Post-hackathon | Significant infra work |
| K | Book import (EPUB/PDF) | 🟢 Post-hackathon | Significant parsing work |
| L | Lemmatization on word save | 🟢 Post-hackathon | Library integration |
| M | CEFR level estimation | 🟢 Post-hackathon | Frequency list mapping |
| N | Vocabulary mini-games | 🟢 Post-hackathon | New feature area |
