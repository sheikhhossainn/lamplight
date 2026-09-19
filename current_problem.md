# LampLight: Current Issues, Architecture Analysis & Implementation Plan

**Document Path:** `current_problem.md`  
**Date:** September 19, 2026  
**Context:** Onboarding Search Bugs & Tri-State Language/Theme Modularization

---

## 1. Summary of Issues & User Requirements

### Issue 1: Mother Tongue Search Input Snaps/Erases Automatically
* **User Report:** On the onboarding screen, the Mother Tongue selector search is not working. Typing anything erases it automatically after a single keystroke/character.
* **Impact:** Users cannot search through the available mother tongues (e.g. searching "Bangla", "Bengali", or "বাংলা").

### Issue 2: Target Reading Language Needs a Search Option
* **User Report:** The "Which language to learn / read" slide currently does not have a search option.
* **Requirement:** Add a clean, responsive search bar to filter target reading languages with synonymous search support (matching English, native script, and country names), matching the design of the mother tongue search.

### Issue 3: Architectural Conflict Between Mother Tongue, Target Language, and Theme
* **User Report:**
  > *"If I select my mother tongue to bangla, select want to learn to english and select the theme to korean, then the app gets confused, it doesn't show english books, so how the theme should be modular is, the style of korean theme will remain intact but the texts inside it will change to bangla and it won't have korean written on it, and the design of the theme will look like bangla but the color will remain the korean styles. Do you understand what I am trying to gain? do not code just discuss with me, is this even a good idea?"*
* **Core Problem:** The app currently tangles three orthogonal concerns:
  1. **Interface & Assistance Language (`motherTongue`):** The reader's native language for definitions, dictionaries, UI, and grammar notes.
  2. **Content & Reading Goal (`targetReadingLanguage`):** The language the user came to read/learn (English Classics). This **must strictly dictate** the book catalog, bookshelf, starter book recommendation, and calibration quiz.
  3. **Atmosphere & Visual Palette (`literaryTheme`):** The aesthetic styling, color palette (e.g. Hanji cool whites, river ink, parchment), typography rhythm, and shelf materials (ash, bamboo, walnut).

---

## 2. Technical Root Cause Analysis

### 2.1 Why the Mother Tongue Search Erases After One Character
* **File:** `src/app/onboarding.tsx`
* **Root Cause:**
  1. The `renderSlide` callback is wrapped in `useCallback` (lines 546–1504), but `motherTongueSearchQuery` is **missing from its dependency array**.
  2. The parent horizontal `FlatList` has `extraData={`${selectedTheme}_${themeSearchQuery}`}` (line 1522), omitting `motherTongueSearchQuery`.
  3. When a user types a character, `setMotherTongueSearchQuery` updates state and re-renders `OnboardingScreen`. However, because dependencies did not change, `renderSlide` retains its initial stale closure where `motherTongueSearchQuery === ''`.
  4. The controlled `<TextInput value={motherTongueSearchQuery} />` receives `value=""` from the stale closure, immediately resetting and wiping the input after the first keypress.

### 2.2 Why the App Confuses Book Catalogs When Choosing Bangla + English + Korean
* **Files:** `src/app/(tabs)/homescreen.tsx`, `src/app/(tabs)/library.tsx`, `src/features/settings/literaryTheme.ts`
* **Root Causes:**
  1. **Homescreen Spotlight (`homescreen.tsx:232-297`):**
     `loadSpotlight` checks `if (motherTongue === 'bn')` and loads Bengali books from `fetchBanglaBooks`. It ignores `targetReadingLanguage` entirely. A user wanting to read English gets a Bengali spotlight book simply because their native tongue is Bengali.
  2. **Library Primary Shelves (`library.tsx:720-838`):**
     The screen renders a dedicated shelf based on `motherTongue !== 'en'` (displaying `বাংলা সাহিত্য`), rather than prioritizing the reader's chosen `targetReadingLanguage` (English Classics).
  3. **Cultural Theme Coupling (`literaryTheme.ts` & `CultureEditionBanner.tsx`):**
     When `korean` theme is selected, the banner loads `korean_bn` with Korean authors (*Yi Sang, Kim Sowol*), Korean edition badges, and Korean monograms. The user wants the **Korean visual aesthetic** (Hanji paper, cool minimalist whites, ash wood), but adapted into their **Bangla reading sanctuary** without forcing Korean cultural text or Korean books onto an English learner.

---

## 3. Design & Architecture Evaluation: "Is This a Good Idea?"

### Verdict: **Yes, it is a necessary evolution of the product architecture.**

Decoupling **Visual Atmosphere** from **Language of Content** and **Language of Support** solves the identity crisis in the app:

| Domain | Role | Governed By | Example (User's Setup) |
|---|---|---|---|
| **Book Catalog & Reading Shelf** | What books you read | `targetReadingLanguage` | **English Classics** (Jane Austen, Dickens, Shelley) |
| **Dictionary, Explanations & UI** | How words are translated | `motherTongue` | **Bangla** (শব্দার্থ, সহায়িকা, পাঠাগার বিবরণ) |
| **Visual Palette & Materials** | Colors, paper tone, wood rail | `literaryTheme` | **Korean Aesthetic** (Cool Hanji white `#F7F6F2`, Ash wood, minimal airiness) |

### How Modular Theme Presentation Should Work
1. **Palette & Contrast:** The palette stays 100% faithful to the chosen theme token (e.g. `korean` provides the serene Hanji cool-white background, ash wood plank, and subtle borders).
2. **Edition & Sanctuary Framing:** Rather than pretending the user is reading Korean literature with Korean authors, the banner and shelf presentation adapt to the user's reading journey in their native tongue:
   * **Title / Native Title:** "বাংলা পাঠাগার" (Bangla Sanctuary) or "শান্ত পাঠাগার" (Serene Sanctuary).
   * **Subtitle:** "হাঁজি কাগজ ও কালির স্নিগ্ধতায় ইংরেজি ধ্রুপদী সাহিত্য" (*English classic literature in the tranquility of Hanji paper & ink*).
   * **Monogram:** Native Bengali typography token (e.g., "অ" or clean editorial monogram) styled in the Korean ash/cool-contrast theme colors.
   * **Authors displayed in sparks/banners:** Matches the **target reading language** (English classics: Austen, Shelley, Tolstoy) or universal literary sparks, translated/explained in Bangla.

---

## 4. Implementation Plan (Using Specific Skills)

### Skill 1: `react-native-best-practices`
* **Action:** Fix controlled `TextInput` stale closure in `onboarding.tsx`.
* **Details:**
  - Add `motherTongueSearchQuery` and `targetLanguageSearchQuery` to `renderSlide` dependencies and `extraData`.
  - Alternatively and preferably: isolate the search bar and options into dedicated subcomponents (`MotherTongueSlide`, `TargetLanguageSlide`, `ThemeSlide`) so typing never forces full slide re-renders of the horizontal paging list.

### Skill 2: `expo-design-system`
* **Action:** Modularize theme presentation tokens in `src/features/settings/literaryTheme.ts`.
* **Details:**
  - Separate `palette` (colors, paper wash, shelf material) from `culturalMetadata` (authors, titles, monograms).
  - Update `getModularThemePresentation(themeCode, motherTongue, targetReadingLanguage)`:
    - If `motherTongue === 'bn'` and `themeCode === 'korean'`, preserve the Hanji cool palette and ash material, but render title/monogram/edition in Bengali typography without foreign Korean text.
    - Reference English classic authors when target language is English.

### Skill 3: `expo-native-ui` & `expo-router`
* **Action:** Align Homescreen and Library shelf hierarchy to Target Reading Language.
* **Details:**
  - `src/app/(tabs)/homescreen.tsx`:
    - Fix `loadSpotlight` to use `targetReadingLanguage`. If target is `en`, load English classics spotlight (e.g. Austen, Shelley, Dickens).
    - Ensure `calibratedBook` accurately reflects the target language with the user's aesthetic theme.
  - `src/app/(tabs)/library.tsx`:
    - Ensure the primary curated shelf displays the `targetReadingLanguage` books.
    - If `motherTongue !== targetReadingLanguage`, present a dedicated secondary shelf: *"From your mother tongue"* (বাংলা সাহিত্য) as an optional cultural companion, rather than replacing the target shelf.
  - `src/app/onboarding.tsx`:
    - Add search input to Slide 5 (`target_language`) with clear button and real-time synonym filtering.

---

## 5. Verification Plan

1. **Type Safety & Build:**
   * Run `npx tsc --noEmit` to verify clean TypeScript compilation with zero errors.
2. **Onboarding Search Test:**
   * Test typing multi-character searches in Mother Tongue search bar (e.g. "ban", "বাংলা") — verify text does NOT erase.
   * Test typing in the new Target Reading Language search bar.
3. **Tri-State Matrix Test (`bn` + `en` + `korean`):**
   * Select Mother Tongue: **Bangla** (`bn`).
   * Select Target Language: **English** (`en`).
   * Select Theme: **Korean** (`korean`).
   * Complete onboarding and verify:
     - Onboarding calibration recommends an **English** book (e.g. *Pride and Prejudice* or *Frankenstein*).
     - Homescreen spotlight shows an **English** classic.
     - Banner uses the **Korean** palette (cool Hanji whites / ash wood), but text is rendered in **Bangla** with no Korean characters.
     - Library primary shelf displays English books, with an optional mother tongue shelf below.
