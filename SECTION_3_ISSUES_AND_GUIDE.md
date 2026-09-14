# Lamplight — Section 3 Feature Audit, Issues & Implementation Guide

**Author / Assignee:** Mahi Hasan (`mahihasan909-gif`)  
**Branch:** `feature/section-3-coverage-decipher`  
**Reference Document:** `TASK_SPECIFICATIONS.md` (Section 3: Features T2-1 through T2-6)  
**Date:** September 2026

---

## Executive Summary & Status Overview

First, commendation where due: **the mathematical foundation and architecture implemented here are solid.**
- The token-weighted Hu & Nation coverage engine (`src/features/vocabulary/coverageMath.ts` and `coverageEngine.ts`) is cleanly designed and well-tested with 21 automated assertions (`scripts/test-section3-features.ts`).
- SQLite storage and repository (`src/db/repositories/bookLexicons.ts`) handle caching, migration v14, and async sequential seeding without lock contention.
- The 4-layer Illuminated Decryption Sheet (`src/features/reader/components/DecipherPageSheet.tsx`) and `WordChip.tsx` look visually stunning and adhere to 1890s typography and tokens.
- Type checking passes with 0 errors (`npx tsc --noEmit`).

However, the branch cannot be merged into `dev` yet because of **one major feature regression**, **two specification deviations**, and **one data pipeline issue**.

### Task Completion Matrix

| Task ID | Task Description | Status | Core Issue |
|---|---|---|---|
| **T2-1** | Book Lexicon Precomputation Script | ⚠️ Incomplete Data | English books use a 93-word fallback sample instead of full Gutenberg texts. |
| **T2-2** | SQLite `book_lexicons` Storage & Repo | ✅ Complete | Migration v14 & repository match specification. |
| **T2-3** | Real-Time Hu & Nation Coverage Engine | ✅ Complete | Formula, tiers, hooks, and automated tests match specification. |
| **T2-4** | Library Readability Sorting & Badges | ❌ **Regressed / Incomplete** | Filter segment and BookSpine coverage badges were **reverted in commit `a7372b8`**. |
| **T2-5** | Book Detail Comprehension Forecast | ✅ Complete | Meter, subtitle, and top 5 target word chips work as specified. |
| **T2-6** | Illuminated Decryption Sheet | ⚠️ Partial Deviation | Daily limit changed from **3 to 20**; tracked in `app_settings` instead of `translation_usage`. |
| *Extra* | Multi-color Highlighter & Quote Actions | ℹ️ Out of Scope | Added in commit `2db12ba`; needs team coordination. |

---

## Detailed Issues & Step-by-Step Remediation Guide

---

### Issue #1: Feature T2-4 Regressed — Missing Library Readability Filter & BookSpine Badges

#### Why this task is not completed:
In commit `a7cb7ec`, you correctly implemented the Library Readability Filter Segment (`[ All | Ready to Read (98%) | Challenging (95%) | Mastered ]`) and small coverage badges on `BookSpine.tsx`. However, in commit `a7372b8` (*"refactor(library): remove coverage badges from shelf spines and keep comprehension meter on book details"*), you **completely deleted the filter segment and the spine badges**.

Only sorting (`shelfBooks` sorted closest to 98%) remains. The core objective of Feature T2-4 is to give readers instant visual guidance on the shelves so they immediately know which books are within their vocabulary comprehension.

#### What `TASK_SPECIFICATIONS.md` requires:
1. **Library Filter Segment** in `src/app/(tabs)/library.tsx`:
   - Segments: `[ All | Ready to Read (98%) | Challenging (95%) | Mastered ]`
   - Filters books shown on the main shelf by their Hu & Nation coverage tier:
     - `ready`: $\ge 98\%$
     - `challenging`: $95\% - 97.9\%$
     - `mastered`: $\ge 99\%$ or completed
2. **Spine Badges** in `src/components/BookSpine.tsx`:
   - A discreet pill badge on the spine:
     - **`98% Ready`** in Flame Amber badge (`#F5A623`) with dark text (`#1C1B1E`).
     - **`95% Mod`** in Muted Fawn badge (`#8C7A6B`) with light text (`#F5EDE1`).
     - **`<95% Adv`** in subtle outline badge with light text.

#### Step-by-Step Fix:
1. **In `src/components/BookSpine.tsx`**:
   - Re-introduce the optional `coverage` prop:
     ```typescript
     type BookSpineProps = {
       // ... existing props
       coverage?: {
         coveragePercent: number;
         tier: 'ready' | 'challenging' | 'not_yet';
       } | null;
     };
     ```
   - Render the badge in the top-right corner of the spine:
     ```tsx
     {coverage && (
       <View
         style={[
           styles.badgeContainer,
           coverage.tier === 'ready'
             ? { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber }
             : coverage.tier === 'challenging'
             ? { backgroundColor: colors.fawn, borderColor: colors.fawn }
             : { backgroundColor: colors.card, borderColor: colors.hairline },
         ]}
       >
         <Text
           numberOfLines={1}
           style={[
             styles.badgeText,
             { color: coverage.tier === 'ready' ? colors.primaryDark : colors.ink },
           ]}
         >
           {coverage.tier === 'ready'
             ? `${Math.round(coverage.coveragePercent)}% Ready`
             : coverage.tier === 'challenging'
             ? `${Math.round(coverage.coveragePercent)}% Mod`
             : `${Math.round(coverage.coveragePercent)}% Adv`}
         </Text>
       </View>
     )}
     ```
2. **In `src/app/(tabs)/library.tsx`**:
   - Re-add `readabilityFilter` state:
     ```typescript
     type ReadabilityFilter = 'all' | 'ready' | 'challenging' | 'mastered';
     const [readabilityFilter, setReadabilityFilter] = useState<ReadabilityFilter>('all');
     ```
   - Filter `shelfBooks` by `readabilityFilter` when active:
     ```typescript
     if (readabilityFilter === 'ready') {
       list = list.filter((b) => (coverageMap.get(b.id)?.coveragePercent ?? 0) >= 98);
     } else if (readabilityFilter === 'challenging') {
       list = list.filter((b) => {
         const p = coverageMap.get(b.id)?.coveragePercent ?? 0;
         return p >= 95 && p < 98;
       });
     } else if (readabilityFilter === 'mastered') {
       list = list.filter((b) => {
         const pos = positions.find((p) => p.bookId === b.id);
         const p = coverageMap.get(b.id)?.coveragePercent ?? 0;
         return (pos && pos.percentComplete >= 0.95) || p >= 99;
       });
     }
     ```
   - Render the horizontal chip segment row directly beneath the header or category toggle.
   - Pass `coverage={coverageMap.get(book.id)}` into `BookSpine`.

---

### Issue #2: Feature T2-6 Spec Mismatch — Daily Free Quota & Storage Mechanism

#### Why this task is not completed:
In commit `02b8245` (*"feat(decipher): bump free daily decipher limit to 20 pages"*), you increased `FREE_DAILY_DECIPHER_LIMIT` from `3` to `20`. Furthermore:
1. `TASK_SPECIFICATIONS.md` (line 344) and `ROADMAP.md` strictly stipulate:
   > *"Enforce daily limit: Free tier allowed **3 page decryptions per day** (tracked via `translation_usage`). Premium tier has unlimited access."*
2. Usage is currently tracked in `app_settings` via `decipher_usage_YYYY-MM-DD` rather than the `translation_usage` table.

#### Why the limit was 3 pages:
The business model and free-tier cost constraints allow 3 illuminated interlinear breakdowns per day. A 20-page cap permits 20 full-page LLM translations per user per day, which drastically exceeds free-tier API quotas.

#### Step-by-Step Fix:
1. **In `src/features/reader/components/DecipherPageSheet.tsx`**:
   - Change the daily limit constant back to `3`:
     ```typescript
     const FREE_DAILY_DECIPHER_LIMIT = 3;
     ```
   - Update the paywall explanation text:
     ```typescript
     Free tier provides 3 Illuminated Page Decryptions per day. Upgrade to Lamplight
     Fellowship for unlimited sentence-by-sentence phonetic breakdowns.
     ```
2. **Storage integration**:
   - If using `translation_usage` table from `src/db/schema.ts` (line 48):
     ```sql
     CREATE TABLE IF NOT EXISTS translation_usage (
       date TEXT PRIMARY KEY,
       count INTEGER NOT NULL DEFAULT 0
     );
     ```
   - Or, if keeping `decipher_usage_YYYY-MM-DD` in `app_settings` for local tracking, ensure it counts up to 3 for non-premium users, while keeping the `__DEV__` bypass convenient during development.

---

### Issue #3: Feature T2-1 Data Integrity — Gutenberg Books Use Fallback Mockup String

#### Why this task is not completed:
In `scripts/extract-book-lexicons.ts` (lines 200–214), `fetchGutenbergText(gutenbergId)` tries to fetch texts from `gutenberg.org`. In offline/sandboxed environments or under rate limits, this fetch fails, triggering lines 231–235:
```typescript
if (!text) {
  console.log(`[Offline Fallback] Generating baseline sample lexicon for ${book.title}`);
  text = `In the beginning of the story ${book.title}, a solemn gentleman walked through the carriage road towards the vicar and the hearth...`;
}
```
As a result, in `assets/data/book_lexicons.json`:
- All 10 English Gutenberg classics have identical `totalRunningTokens: 92–94` and `uniqueWordCount: ~61`.
- A real book like *Pride and Prejudice* has over 120,000 words. Running coverage calculations against 93 words means learning just 2 words jumps the user's coverage score by several percentage points artificially.
- For Bangla books, only title and synopsis (20–27 tokens) were profiled.

#### Step-by-Step Fix:
1. Allow `extract-book-lexicons.ts` to read local cached raw texts from `assets/books/` if present before attempting network fetch.
2. In `scripts/extract-book-lexicons.ts`, add fallback logic that checks if the chapter text is already downloaded locally in the DB or SQLite cache.
3. Once run with full text, re-generate `assets/data/book_lexicons.json`.

---

### Issue #4: Out-of-Scope Code Coordination (Highlighter & Quotes)

#### What was done:
In commit `2db12ba` (*"feat(reader,quotes): add multi-color highlighter and quote jump/copy actions"*):
- You added 4-color highlighter dots (`amber`, `sage`, `clay`, `dusk`) in `src/app/reader/[bookId].tsx`.
- You added an extensive Quote Action modal in `src/app/(tabs)/vocabulary.tsx`.

#### Why this needs coordination:
While high quality, neither of these features were part of Section 3 in `TASK_SPECIFICATIONS.md`. Modifying `reader/[bookId].tsx` and `vocabulary.tsx` creates merge risks with Lead (Atmosphere & Reader) and Teammate 1 (SRS & Vocabulary Deck).
- **Recommendation:** Keep your changes self-contained and ensure you rebase smoothly against `dev`.

---

## Verification Checklist for Mahi

Before requesting re-review or submitting a PR to `dev`, verify each of the following:

- [ ] **1. Re-add Filter Segment:** `[ All | Ready to Read (98%) | Challenging (95%) | Mastered ]` is visible in `src/app/(tabs)/library.tsx` and filters books smoothly.
- [ ] **2. Re-add Spine Badges:** Books on shelves in `library.tsx` display the small coverage badge (`98% Ready`, `95% Mod`, `Adv`).
- [ ] **3. Free Decipher Quota:** `FREE_DAILY_DECIPHER_LIMIT` is set to `3` in `DecipherPageSheet.tsx`.
- [ ] **4. Test Suite Passes:** Running `npx tsx scripts/test-section3-features.ts` outputs `21 / 21 TESTS PASSED`.
- [ ] **5. TypeScript Passes:** Running `npx tsc --noEmit` returns zero errors.
- [ ] **6. Git Identity:** All commits and pushes are authored with `sheikhhossainn` (`skhossain799@gmail.com`).
