# Lamplight — Detailed Feature Specifications by Teammate

This document provides exhaustive technical specifications, user flows, database changes, and acceptance criteria for every feature assigned to each team member.

---

# SECTION 1: LEAD (YOU) — UI/UX ATMOSPHERE & SCRIPTURE COMPARATIVE Q&A

---

### Feature L-1: 1890s Visual Atmosphere & Micro-Interactions
- **Objective:** Give the app an authentic, serene 1890s candlelit aesthetic that acts as an emotional sanctuary for deep reading.
- **Files to Modify:**
  - `src/theme/tokens.ts`
  - `src/theme/typography.ts`
  - `src/components/FlameGlow.tsx`
  - `src/features/reader/components/ReaderPageView.tsx`
- **Detailed Specification:**
  1. **Color Tokens:** Strictly maintain locked constants: Primary Dark (`#1C1B1E`), Flame Amber (`#F5A623`), Parchment (`#F5EDE1`), Fawn (`#8C7A6B`), Straw (`#D4C3A3`).
  2. **Reading Typography Floor:** Ensure body reading text in Lora never drops below `17px`, and `lineHeight` never drops below `1.85`.
  3. **Candle Flame Micro-Motion:** Enhance `FlameGlow.tsx` with a subtle, non-distracting flicker animation (opacity fluctuating gently between `0.85` and `1.0` with soft transform scale `[0.98, 1.02]`).
  4. **Haptic Feedback:** Integrate `expo-haptics` on major ritual moments: turning a page, saving a word, graduating a flashcard, and opening the scripture Q&A drawer.
- **Acceptance Criteria:**
  - Zero hardcoded hex codes in screen components; all use `useTheme()`.
  - Body text conforms to Lora 17px/1.85 line-height floor across all screen sizes.
  - Haptics fire smoothly without blocking UI thread.

---

### Feature L-2: Scripture Cross-Tradition Q&A Interface
- **Objective:** Replace the legacy "Feeling?" prompt with a clean, dignified Scripture Q&A interface where users ask deep theological and existential questions.
- **Files to Modify / Create:**
  - `src/features/scripture-verses/ScriptureQueryModal.tsx` *(NEW)*
  - `src/features/scripture-verses/FeelingPromptModal.tsx` *(Deprecate / Redirect)*
  - `src/app/(tabs)/library.tsx` *(Update trigger button)*
- **User Flow:**
  1. In the Library screen header, replace the "Feeling?" button with a dignified lamp icon / "Inquire of Scripture".
  2. Tapping opens `ScriptureQueryModal.tsx` (bottom sheet with warm parchment backdrop).
  3. Provides:
     - Free-form question chatbox: *"What rights do women have?"*, *"How should one deal with grief?"*, *"What is taught about usury/interest?"*
     - Curated inquiry pills for instant exploration: *"Forgiveness"*, *"Justice & Poverty"*, *"War & Peace"*, *"Women in Society"*, *"Afterlife"*.
     - Multilingual voice input button using existing `voiceTranscriber.ts`.
  4. Submitting dispatches the query and navigates to the comparative results screen.
- **Acceptance Criteria:**
  - Smooth modal transition using Reanimated.
  - Curated pills populate the input box immediately on tap.
  - Native voice transcription preserves non-English scripts (Arabic, Bengali).

---

### Feature L-3: Comparative AI Synthesis (Cross-Tradition RAG)
- **Objective:** Retrieve top-matching verses across all 5 traditions and generate an objective comparative synthesis answering the user's question directly.
- **Files to Modify / Create:**
  - `supabase/functions/context-verses/index.ts`
  - `src/features/scripture-verses/contextVersesApi.ts`
  - `src/features/scripture-verses/ScriptureComparativeView.tsx` *(NEW)*
- **Detailed Specification:**
  1. **Vector Retrieval:** The Edge Function receives `{ text: question, perTradition: 2 }`.
  2. Embeds the question using native `Supabase.ai.Session('gte-small')` (384-dim vector).
  3. Calls `search_verses_by_tradition` across:
     - The Holy Quran
     - Old Testament (Hebrew Scriptures)
     - New Testament (Gospels & Epistles)
     - Torah (Pentateuch)
     - Rigveda (Vedas)
  4. **LLM Synthesis:** Sends the retrieved verses and query to an LLM endpoint (Groq / Gemini / Claude) with a strict prompt:
     - *"You are an objective religious comparative scholar. Answer the user's question directly using only the provided verses. Compare and contrast how the traditions address the topic. Citing book, chapter, and verse accurately."*
  5. Edge Function returns:
     ```json
     {
       "synthesis": "Markdown comparative analysis...",
       "verses": [
         { "tradition": "quran", "book": "An-Nisa", "chapter": 4, "verseNumber": 32, "snippet": "..." },
         { "tradition": "bible-ot", "book": "Proverbs", "chapter": 31, "verseNumber": 10, "snippet": "..." }
       ]
     }
     ```
- **Acceptance Criteria:**
  - Synthesis answers the question with scholarly neutrality without editorializing.
  - Every claim links directly to at least one cited verse from the returned payload.

---

### Feature L-4: Reader Auto-Scroll & Golden Glow Deep-Linking
- **Objective:** Tapping any cited scripture verse in the Q&A view smoothly opens the scripture reader, auto-scrolls to the verse, and illuminates it with a warm golden highlight.
- **Files to Modify:**
  - `src/features/scripture-verses/ScriptureComparativeView.tsx`
  - `src/app/quran/[surahNumber].tsx`
  - `src/app/bible/[bookId].tsx`
  - `src/app/torah/index.tsx`
  - `src/app/vedas/[bookId].tsx`
- **Detailed Specification:**
  1. Each cited verse card in the Q&A results features a **"Read in Context ➔"** button.
  2. Tapping routes to the appropriate scripture path with query parameters (e.g. `/quran/4?jumpVerse=32`).
  3. Target reader screen executes chapter-scoped lazy loading, computes layout height, scrolls to `viewPosition: 0.2`, and triggers `goldenGlow` highlight animation.
- **Acceptance Criteria:**
  - Smooth animation without layout jank or white flashes.
  - Golden amber highlight fades in upon landing and stays for 3 seconds before softening.

---

# SECTION 2: TEAMMATE 1 — WORD-STATE, SRS & RETENTION ENGINE

---

### Feature T1-1: SQLite Migration v13 (Word-State Tracking)
- **Objective:** Evolve `saved_words` from a static record into an active Spaced Repetition state machine.
- **Files to Modify:**
  - `src/db/schema.ts`
  - `src/db/repositories/savedWords.ts`
- **Detailed Specification:**
  1. Add Migration `v13` in `src/db/schema.ts`:
     ```sql
     ALTER TABLE saved_words ADD COLUMN status TEXT NOT NULL DEFAULT 'learning';
     ALTER TABLE saved_words ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
     ALTER TABLE saved_words ADD COLUMN last_reviewed_at INTEGER NOT NULL DEFAULT 0;
     ALTER TABLE saved_words ADD COLUMN next_review_at INTEGER NOT NULL DEFAULT 0;
     ALTER TABLE saved_words ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE saved_words ADD COLUMN frequency_rank INTEGER NOT NULL DEFAULT 99999;
     ```
  2. Update `SavedWord` type and `fromSqlRow` mapper in `src/db/repositories/savedWords.ts`.
  3. Add repository functions:
     - `listWordsDueForReview(limit?: number): Promise<SavedWord[]>`
     - `updateWordSrsState(id: string, isCorrect: boolean): Promise<void>`
     - `getKnownWordsCount(): Promise<number>`
     - `listAllKnownWords(): Promise<Set<string>>`
- **Acceptance Criteria:**
  - Existing saved words gracefully default to `status = 'learning'`.
  - All DB operations route strictly through serialized `getDb()` from `src/db/client.ts`.

---

### Feature T1-2: Spaced Repetition (SRS) Engine
- **Objective:** Calculate scientific review intervals so words move from short-term memory to permanent recognition.
- **Files to Create:**
  - `src/features/vocabulary/srsAlgorithm.ts` *(NEW)*
- **Detailed Specification:**
  1. **States:** `'learning'` vs. `'known'`.
  2. **Graduation Rule:** A word graduates to `'known'` after **4 consecutive successful reviews**.
  3. **Interval Progression Schedule:**
     - Level 0 (Just saved): `interval = 1 day`
     - Level 1 (1st correct): `interval = 3 days`
     - Level 2 (2nd correct): `interval = 7 days`
     - Level 3 (3rd correct): `interval = 16 days`
     - Level 4 (4th correct): `interval = 35 days` $\rightarrow$ **Graduated to `known`**.
  4. **Failure Penalty ("Need Practice"):**
     - Reset `interval = 1 day`.
     - Decrement `review_count` to `max(0, review_count - 1)` (do not reset completely to 0 to avoid punishing long streaks too harshly).
     - Keep `status = 'learning'`.
- **Acceptance Criteria:**
  - Unit tests covering: 4 consecutive passes = graduation; failure at Level 3 drops interval back to 1 day; graduation updates `status` to `'known'`.

---

### Feature T1-3: Active Retrieval Flashcard Deck Overhaul
- **Objective:** Turn the passive flashcard tab in Notebook into an active, friction-free daily review tool.
- **Files to Modify:**
  - `src/app/(tabs)/vocabulary.tsx`
- **Detailed Specification:**
  1. Change `FlashcardDeck` component:
     - Front of card: Target word + sentence context with word blanked out or highlighted.
     - Tap card $\rightarrow$ Flips to reveal translation, grammatical gloss, and full sentence.
     - Below card: Two clear action buttons:
       - **"Need Practice"** (Left button, muted parchment border, resets interval).
       - **"Remembered"** (Right button, solid Flame Amber, advances interval).
  2. **Daily Review Cap:** Free users can review up to **20 cards per day**. Show celebratory completion card when done: *"Daily review complete! 20 words strengthened."* Premium users have unlimited reviews.
- **Acceptance Criteria:**
  - Smooth 3D flip animation using Reanimated or layout transitions.
  - Tapping an action button advances to the next card immediately and saves new interval to SQLite asynchronously.

---

### Feature T1-4: Frequency-Ranked Queue Sorting (Zipf's Law)
- **Objective:** Prioritize high-frequency words in the review queue so users unlock books exponentially faster.
- **Files to Create / Modify:**
  - `src/features/vocabulary/frequencyRank.ts` *(NEW)*
  - `src/app/(tabs)/vocabulary.tsx`
- **Detailed Specification:**
  1. Bundle a lightweight frequency lookup table for top 5,000 common English/target words (`assets/data/frequency_5k.json`).
  2. When words are saved or fetched for review:
     - Attach `frequency_rank` from the table (e.g., *"water"* = 120, *"labyrinth"* = 4,200).
  3. Sort the daily review queue by:
     `ORDER BY status ASC, frequency_rank ASC, next_review_at ASC`
- **Acceptance Criteria:**
  - Top-1000 common words always appear before obscure Victorian words in daily flashcards.

---

### Feature T1-5: In-Reader Retention Subtlety
- **Objective:** Subtle reinforcement: visually cue the reader when a word they are currently learning appears in text.
- **Files to Modify:**
  - `src/features/reader/components/TappableWords.tsx`
  - `src/features/reader/components/ReaderPageView.tsx`
- **Detailed Specification:**
  1. On chapter load, query `SELECT source_word FROM saved_words WHERE status = 'learning'`.
  2. Store words in a fast in-memory `Set<string>`.
  3. When rendering tokens in `TappableWords.tsx`, if `learningWordsSet.has(cleanWord)`:
     - Render a subtle amber dot (`•`) or soft amber underline beneath the word.
- **Acceptance Criteria:**
  - Zero frame drop during pagination or scrolling.
  - Visual cue is discreet and does not distract from reading immersion.

---

### Feature T1-6: 60-Second Onboarding Vocabulary Calibration
- **Objective:** Solve the cold-start problem so new users immediately see realistic coverage scores (e.g., 85%–96%) instead of 0%.
- **Files to Create / Modify:**
  - `src/features/onboarding/VocabularyPlacementModal.tsx` *(NEW)*
  - `src/app/onboarding.tsx`
- **Detailed Specification:**
  1. After selecting source/target languages, present a 60-second calibration card:
     - Display 20 representative words sampled across 4 frequency bands:
       - Band 1 (Top 1,000 common words): 5 words
       - Band 2 (1,000 – 3,000 common words): 5 words
       - Band 3 (3,000 – 5,000 common words): 5 words
       - Band 4 (5,000+ literary words): 5 words
  2. User taps words they confidently recognize.
  3. Based on results, seed the user's baseline known count (e.g. selecting all in Band 1 & 2 marks the top 3,000 standard words as `known` in their baseline profile).
- **Acceptance Criteria:**
  - Takes under 60 seconds to complete.
  - Immediately calculates initial coverage percentages across all catalog books upon reaching Library.

---

# SECTION 3: TEAMMATE 2 — BOOK LEXICONS, 98% COVERAGE & DECIPHER SHEET

---

### Feature T2-1: Book Lexicon Precomputation Script
- **Objective:** Precompute word frequency distributions for all catalog books so coverage calculations can run in milliseconds on-device.
- **Files to Create:**
  - `scripts/extract-book-lexicons.ts` *(NEW)*
  - `assets/data/book_lexicons.json` *(NEW)*
- **Detailed Specification:**
  1. Write a Node/TS script to iterate through all books in Gutenberg catalog, Bangla, Japanese, and Korean.
  2. For each book:
     - Strip markup, tokenize running text into words.
     - Normalize: lowercase, remove surrounding punctuation, apply basic lemmatization for English.
     - Calculate:
       - `totalRunningTokens`: Total word count (e.g., 85,000 words).
       - `uniqueWordCount`: Unique vocabulary count (e.g., 6,200 words).
       - `frequencies`: Map of `{ [word: string]: occurrence_count }`.
  3. Export compressed JSON artifact bundled or stored in Supabase Storage.
- **Acceptance Criteria:**
  - Script successfully profiles all catalog books without memory leaks.

---

### Feature T2-2: SQLite `book_lexicons` Storage & Repository
- **Objective:** Store book vocabulary frequency profiles locally for instant offline coverage queries.
- **Files to Modify / Create:**
  - `src/db/schema.ts` (Migration v14)
  - `src/db/repositories/bookLexicons.ts` *(NEW)*
- **Detailed Specification:**
  1. Create SQLite table:
     ```sql
     CREATE TABLE IF NOT EXISTS book_lexicons (
       book_id TEXT PRIMARY KEY REFERENCES books(id),
       total_tokens INTEGER NOT NULL,
       unique_words INTEGER NOT NULL,
       lexicon_json TEXT NOT NULL
     );
     ```
  2. Repository functions:
     - `upsertBookLexicon(bookId: string, totalTokens: number, uniqueWords: number, frequencies: Record<string, number>): Promise<void>`
     - `getBookLexicon(bookId: string): Promise<BookLexiconProfile | null>`
- **Acceptance Criteria:**
  - Fast query execution (<10ms per book profile retrieval).

---

### Feature T2-3: Real-Time Token-Weighted Coverage Engine
- **Objective:** Implement the Hu & Nation 98% lexical coverage formula.
- **Files to Create:**
  - `src/features/vocabulary/coverageEngine.ts` *(NEW)*
- **Detailed Specification:**
  1. **The Hu & Nation Mathematical Formula:**
     $$\text{Coverage } \% = \frac{\sum_{w \in \text{Known Words}} \text{occurrences}(w \text{ in book})}{\text{total running tokens in book}} \times 100$$
  2. Invalidate cache whenever:
     - A new word graduates to `known` in Teammate 1's SRS engine.
     - Onboarding calibration completes.
  3. Expose React hook `useBookCoverage(bookId: string)`:
     - Returns `{ coveragePercent, tier, unknownCount, highLeverageWords }`.
     - Tiers:
       - `ready`: $\ge 98\%$
       - `challenging`: $95\% - 97.9\%$
       - `not_yet`: $< 95\%$
- **Acceptance Criteria:**
  - Coverage percentage is strictly token-weighted, not unique-word weighted.
  - Recalculation across 50 catalog books runs in under 150ms on mobile hardware.

---

### Feature T2-4: Library Readability Sorting & Badges
- **Objective:** Surface books readers can understand right now directly in the Library UI.
- **Files to Modify:**
  - `src/app/(tabs)/library.tsx`
  - `src/components/BookSpine.tsx`
- **Detailed Specification:**
  1. Add Library Filter Segment:
     - `[ All | Ready to Read (98%) | Challenging (95%) | Mastered ]`
  2. On each book spine and card:
     - Render a small coverage pill badge:
       - **`98% Comprehension`** in Flame Amber badge (`#F5A623`).
       - **`95% Moderate`** in Muted Fawn badge.
       - **`89% Advanced`** in subtle outline.
  3. Default sort order: Books closest to 98% appear first.
- **Acceptance Criteria:**
  - Instant filtering with zero stutter.
  - Badges match the 1890s design system tokens.

---

### Feature T2-5: Book Detail Comprehension Forecast
- **Objective:** Give readers full visibility into a book's difficulty before they download or open it.
- **Files to Modify:**
  - `src/app/book/[id].tsx`
- **Detailed Specification:**
  1. Above the "Start Reading" button, display the **Comprehension Meter**:
     - Large percentage display: e.g., `97.2% Comprehensible`.
     - Subtitle: *"Approx. 5 unknown words per page — perfect for instructional reading."*
  2. **Target Words Preview:**
     - Display a preview list of the top 5 high-leverage words in this book that the reader does not know yet:
       e.g., *"Learn these 5 words to reach 98%: [hearth, carriage, solemn, vicar, obliged]"*.
- **Acceptance Criteria:**
  - Meter updates in real time if any target word is saved or graduated.

---

### Feature T2-6: "Illuminated Decryption Sheet" (Interlinear Page Breakdown)
- **Objective:** Provide a sentence-by-sentence interlinear breakdown for challenging foreign texts (Japanese, Korean, Arabic, Bengali, Victorian English) without ruining page typography.
- **Files to Create:**
  - `src/features/reader/components/DecipherPageSheet.tsx` *(NEW)*
  - `src/features/reader/components/WordChip.tsx` *(NEW)*
- **User Flow & UX:**
  1. Reader taps **"Decipher Page"** button in reader bottom bar.
  2. Parchment bottom sheet slides up displaying the current page split into sentences.
  3. For each sentence:
     - **Layer 1:** Original text in large, clear serif font.
     - **Layer 2:** Phonetic pronunciation (Furigana/Romaji for Japanese, Romanization for Korean, Transliteration for Arabic/Bengali).
     - **Layer 3:** Word Chips: Horizontal row of pills showing root word + English definition + small **`[+]`** button.
     - **Layer 4:** Natural full sentence translation in user's mother tongue.
  4. Tapping **`[+]`** on any word chip calls Teammate 1's `saveWord()` repository to insert it directly into the `learning` SRS queue.
  5. Enforce daily limit: Free tier allowed **3 page decryptions per day** (tracked via `translation_usage`). Premium tier has unlimited access.
- **Acceptance Criteria:**
  - Sheet slides up smoothly over the reader screen without resetting reader position.
  - Tapping `[+]` updates chip UI to a checked state and saves to SQLite immediately.
  - Free-tier cap displays a clean paywall prompt when limit is reached.

---

## 4. Cross-Teammate Integration Checklist

```
[Teammate 1: SRS]                       [Teammate 2: Coverage Engine]
  │                                       │
  ├── 1. Saves word as 'learning'         │
  ├── 2. Reviews in Flashcards            │
  └── 3. Graduates word to 'known' ─────► ├── 4. Invalidates coverage cache
                                          ├── 5. Recalculates book %
                                          └── 6. Library updates "Ready to Read" badges
```

- [ ] Teammate 1 exports `listAllKnownWords(): Promise<Set<string>>`.
- [ ] Teammate 2 imports `listAllKnownWords` inside `coverageEngine.ts`.
- [ ] Teammate 2's `DecipherPageSheet` calls Teammate 1's `saveWord()` on `[+]` tap.
- [ ] Lead consumes Teammate 2's `useBookCoverage()` in `BookSpine.tsx` and `book/[id].tsx`.
