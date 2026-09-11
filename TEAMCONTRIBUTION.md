# Lamplight — Team Contribution & Engineering Guidelines

Welcome to Lamplight. We are building a second-language-acquisition (SLA) reading sanctuary. The app tells readers exactly which book they can understand right now based on Hu & Nation’s empirical 98% lexical coverage threshold, wrapped in a tranquil 1890s candlelit atmosphere.

---

## 1. Team Ownership & Workstreams

### 👑 Lead (You): UI/UX Atmosphere & Scripture Cross-Tradition Q&A
**Primary Objective:** Deliver an immersive 1890s candlelit experience and transform the Feeling mechanism into an objective, cross-scriptural theological synthesis engine.

- **UI/UX & Atmosphere Polish:**
  - Maintain and enforce the design system (`src/theme/tokens.ts`, `typography.ts`, `ThemeProvider.tsx`).
  - Perfect micro-interactions: candle flicker glow (`FlameGlow.tsx`), paper-turn haptics, and reading progress indicators.
  - Integrate new UI components built by teammates into the Library (`library.tsx`), Book Details (`book/[id].tsx`), and Reader (`reader/[bookId].tsx`).
- **Scripture Cross-Tradition Q&A Engine:**
  - Deprecate/replace `FeelingPromptModal.tsx` with `ScriptureQueryModal.tsx`.
  - Wire free-form theological queries (e.g., *"What rights do women have?"*, *"What is taught about usury/interest?"*) to the Supabase Edge Function (`supabase/functions/context-verses`).
  - Upgrade Edge Function to execute cross-tradition RAG: vector retrieval across Quran, Bible (OT/NT), Torah, and Vedas, synthesized into a comparative summary citing exact verses.
  - Connect citation tap handlers to auto-scroll into scripture readers with golden amber highlight illumination (`ScriptureTableDeck.tsx`).

---

### 🛠️ Teammate 1: Word-State Tracking, Spaced Repetition (SRS) & Retention Engine
**Primary Objective:** Build the pedagogical retention loop so words looked up in books stick permanently through spaced retrieval, advancing through `unknown → learning → known`.

- **Database Migration (SQLite v13):**
  - Update `src/db/schema.ts` and `src/db/repositories/savedWords.ts`:
    - Add `status TEXT NOT NULL DEFAULT 'learning'` (`'learning'` | `'known'`).
    - Add `review_count INTEGER NOT NULL DEFAULT 0`.
    - Add `last_reviewed_at INTEGER NOT NULL DEFAULT 0`.
    - Add `next_review_at INTEGER NOT NULL DEFAULT 0`.
    - Add `interval_days INTEGER NOT NULL DEFAULT 1`.
- **Spaced Repetition Algorithm:**
  - Implement Leitner/SM-2 interval logic:
    - Initial save: `interval = 1 day`, `status = 'learning'`.
    - "Need Practice" tap: Reset interval to 1 day.
    - "Remembered" tap: Spaced multiplier (1d → 3d → 7d → 16d → Graduated).
    - Upon 4 consecutive successful reviews: Set `status = 'known'`.
- **Flashcard Deck Overhaul (`src/app/(tabs)/vocabulary.tsx`):**
  - Replace passive flip switcher with active retrieval buttons: **"Need Practice"** (amber outline) and **"Remembered"** (amber solid).
  - Sort the active review queue by **general word frequency rank** (Zipf's Law) so top-1000 common words are reviewed before rare Victorian adjectives.
  - Implement daily review session cap (20 reviews/day for Free users, uncapped for Premium).
- **In-Reader Retention Subtlety:**
  - Hook into `src/features/reader/engine/words.ts` and `TappableWords.tsx` to render a subtle amber dot beneath words currently in the user's `learning` queue when they reappear in subsequent chapters.
- **60-Second Onboarding Calibration:**
  - Build a rapid frequency-band checklist (1k, 2k, 3k, 5k words) in the onboarding flow to seed the user's baseline known word set so new users don't start at 0% coverage.

---

### 🔬 Teammate 2: Book Lexicons, 98% Coverage Engine & "Decipher" Interlinear Translation
**Primary Objective:** Implement the Hu & Nation 98% lexical coverage scoring across all catalog books, and create the "Decipher" sentence-by-sentence breakdown sheet for difficult passages.

- **Lexicon Precomputation Pipeline:**
  - Write an offline Node/TS script (`scripts/extract-book-lexicons.ts`) that ingests Gutenberg/catalog books, tokenizes text, removes punctuation, normalizes lemmas, and counts running occurrences.
  - Output structured token-frequency profiles (stored in SQLite table `book_lexicons`).
- **Real-Time Coverage Engine:**
  - In `src/features/vocabulary/coverageEngine.ts`, implement the token-weighted coverage formula:
    $$\text{Coverage } \% = \frac{\sum_{w \in \text{Known}} \text{count}(w \text{ in book})}{\text{Total running words in book}} \times 100\%$$
  - Expose a hook `useBookCoverage(bookId)` that recalculates or reads cached scores, invalidating whenever a word graduates to `known`.
- **Library Sorting & Coverage UI:**
  - Add coverage badges to book spines and cards:
    - **$\ge 98\%$:** *"Ready to Read"* (Golden flame badge)
    - **$95\% - 97\%$:** *"Challenging"* (Muted fawn badge)
    - **$< 95\%$:** *"Not Yet"* (Subtle faint badge)
  - Add filter tabs in `src/app/(tabs)/library.tsx` to sort by Comprehension Ease.
  - Display estimated % understood on `src/app/book/[id].tsx` before download.
- **"Illuminated Decryption Sheet" (Interlinear Translation):**
  - Build `src/features/reader/components/DecipherPageSheet.tsx` (slides up on demand):
    - Parses the current page into sentences.
    - Displays:
      1. Original target sentence (Japanese/Korean/Arabic/English).
      2. Phonetic guide (Furigana/Romaji/Transliteration).
      3. Horizontal word chips with individual definitions and a `[+]` button to save straight to Teammate 1's `learning` queue.
      4. Polished natural sentence translation in user's mother tongue.
  - Enforce free-tier limit: 3 page decryptions per day via `translation_usage`.

---

## 2. Shared Architecture & Contract Interfaces

To ensure zero merge conflicts and seamless integration, teammates must conform to these shared TypeScript interfaces:

```typescript
// --- CONTRACT 1: Word State (Teammate 1 owns, Teammate 2 reads) ---
export type WordStatus = 'unknown' | 'learning' | 'known';

export type WordStateRecord = {
  sourceWord: string;
  status: WordStatus;
  reviewCount: number;
  intervalDays: number;
  nextReviewAt: number;
};

// --- CONTRACT 2: Book Lexicon Profile (Teammate 2 owns, Library reads) ---
export type BookLexiconProfile = {
  bookId: string;
  totalRunningTokens: number;
  uniqueWordCount: number;
  // Word -> occurrence count in this book
  tokenFrequencies: Record<string, number>;
};

// --- CONTRACT 3: Coverage Result (Teammate 2 outputs, UI consumes) ---
export type BookCoverageResult = {
  bookId: string;
  coveragePercent: number; // e.g., 98.4
  tier: 'ready' | 'challenging' | 'not_yet'; // >=98%, 95-97%, <95%
  unknownTokenCount: number;
  highLeverageTargetWords: string[]; // Top words to learn to unlock 98%
};
```

---

## 3. Non-Negotiable Engineering Rules

1. **Git Author & Push Identity (CRITICAL):**
   - Every commit and push **must** be authored under the authorized repo identity:
     - Name: `sheikhhossainn`
     - Email: `skhossain799@gmail.com`
   - Set locally before writing code:
     ```bash
     git config user.name "sheikhhossainn"
     git config user.email "skhossain799@gmail.com"
     ```
   - Commits authored under any other GitHub user will be rejected.

2. **SQLite Serializing Queue (Android Stability):**
   - **Never** call the raw SQLite database handle directly.
   - All DB queries must be routed through `getDb()` and the serializing queue in `src/db/client.ts`.

3. **Design System & Typography Floor:**
   - Source of truth: `src/theme/tokens.ts`, `typography.ts`, `ThemeProvider.tsx`.
   - Never hardcode arbitrary hex colors. Use theme tokens (`colors.primaryDark`, `colors.flameAmber`, `colors.parchment`).
   - Locked reading typography floor: Font is **Lora**, font size **never below 17px**, line height **never below 1.85**.

4. **Zero Unapproved Dependencies:**
   - Do not install new npm packages or modify native configs (`app.json`, `ios/`, `android/`) without lead sign-off.

5. **Type Safety & Build Verification:**
   - Before opening a PR or merging into `main`, run:
     ```bash
     npx tsc --noEmit
     ```
   - Must pass with 0 errors.

---

## 4. Git Branching Strategy

- `main`: Protected production branch.
- `feature/scripture-qa-ui`: Lead
- `feature/srs-word-state`: Teammate 1
- `feature/coverage-decipher-sheet`: Teammate 2

### Definition of Done for PRs:
- [ ] Code strictly follows design tokens and typography rules.
- [ ] SQLite calls use the serialized client.
- [ ] `npx tsc --noEmit` produces zero compiler errors.
- [ ] Tested on Android / iOS Expo Go (SDK 57).
