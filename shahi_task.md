# sheikhhossainn — Shipathon 2026 Delivery Record

This is the current implementation record for the work assigned through `TEAMCONTRIBUTION.md`. It replaces the earlier planning document. Statuses reflect implemented work in the working tree; a feature is only fully accepted after device testing.

## Product direction

Lamplight is a calm reading companion: users read books and scriptures, translate and save words, build a sustainable vocabulary habit, and return to their reading position without friction. The experience should stay reliable offline where possible, preserve the reader as the primary surface, and use audio only where it has clear value.

## Completed implementation work

### Vocabulary, translation, and review

- Copy from the translation popup works without requiring a user to translate first.
- Long-pressing a word presents **Translate**, **Save as quote**, and **Copy**.
- The word action menu supports source-language-aware pronunciation and a repeat action, so pronunciation is available without forcing users through translation.
- Source language is propagated from the active book instead of assuming English; native-language books and Quran Arabic/English lines retain their correct language context.
- Speech locale coverage and fallbacks were extended for supported target languages.
- Newly saved vocabulary is scheduled for the next local day rather than immediately flooding the current review session.
- Flashcard review is limited to a manageable batch instead of asking the user to study every saved word at once.
- Again, Hard, Good, and Easy retain distinct spaced-repetition behavior. Their UI was revised so the next interval is clear and the transition feels responsive.
- Context hints, hard-word review, completion states, and a fill-in-the-blank quiz flow were added around review sessions.
- A completed review session keeps its completion state when the user changes tabs. It does not restart the same review automatically.
- A returning user can take another quiz using close related words and antonyms rather than a mechanically identical set.
- The Words view includes an animated vocabulary-growth graph; its tab transition and chart motion were tuned to avoid the prior lag/stutter.

### Reader interaction and native-language support

- Long-press word selection was strengthened for Bengali and other scripts, with improved hit-testing and selection/highlight behavior.
- Book loading screens use the book cover dynamically for both source-language and target-language books; presentation was adjusted to preserve cover clarity.
- Reader typography/theme changes no longer alter scripture typography. Scriptures retain their intended classic-print style.

### Scripture reading and navigation

- Quran, Bible, and Vedas no longer use generic word-pronunciation behavior inside scripture text.
- Scripture reading position restoration was improved so reopening returns to the saved verse rather than an approximate earlier verse.
- Large verse restoration was optimized to land directly at the saved verse rather than visibly scrolling down through the chapter.
- Quran now distinguishes three concepts:
  - **Saved reading position:** silently restores the reader where the user left off.
  - **Explicit destination:** briefly highlights a verse opened from a saved word, search result, or similar link.
  - **Active recitation:** uses the strong amber state and follows the verse currently being played.
- This separation prevents a saved first verse from looking as if Quran recitation has started.

### Ask Scriptures and Supabase

- The Ask Scriptures flow was reviewed and its identified implementation issues were fixed.
- Supabase configuration/migration work was completed and the related function was deployed after the required secret was added.

### Onboarding and app entry

- Splash and onboarding screens were revised to explain the product more clearly at first launch: read, understand, save meaningful words, and return consistently.
- The design remains aligned with Lamplight’s existing theme and does not introduce a separate visual system.

### Quran recitation

- Quran has source recitation by Mishary Rashid Alafasy instead of text-to-speech.
- Users are offered a clear choice to download a surah for offline listening or stream it for the current session.
- The download sheet shows the reciter credit and download progress.
- Recitation progresses ayah by ayah, highlights the active verse, and smoothly follows it in the reading view.
- Auto-follow aims to keep the full active verse card visibly inside the reading area rather than hidden at the screen edge.
- Playback controls now follow a clear state model:
  - Before listening: **Listen**.
  - While playing: **Pause** and **Restart**.
  - While paused: **Continue** and **Restart**.
  - After completion: one **Restart** button only.
- Bible narration controls were removed. Bible is already supplied in English, and Quran is the scripture currently using source recitation.

## Current verification checklist

The codebase has passed `npx tsc --noEmit` after the recent changes. The following needs device acceptance before calling the work finished.

### Quran reader and recitation

- Open a Quran surah with a previously saved position. It should scroll to that verse without amber highlighting it.
- Open an explicit Quran verse from a saved word or Ask Scriptures. It should briefly highlight the destination verse.
- Start Quran recitation. Verse 1 should become highlighted only after audio begins.
- Let a surah play through several ayahs. The highlighted card should remain fully visible, not under the bottom edge.
- Manually scroll while it plays. Confirm auto-follow pauses while the user is dragging and resumes cleanly afterward.
- Pause, continue, restart, and let playback finish. Confirm the final state contains one Restart button only.
- Download a small surah, disable network, and verify its recitation starts offline.

### Vocabulary and SRS

- Save a new word and confirm it is due tomorrow, not in today’s ordinary review batch.
- Test Again, Hard, Good, and Easy; verify the displayed interval matches the next review behavior.
- Review a batch to completion, leave the Vocabulary tab, and return. The completion screen should remain until the user chooses a next action.
- Use **Review hard words again** and make sure it does not turn into an unlimited session.
- Take the fill-in-the-blank quiz, then request another quiz. Confirm it uses a meaningful variation rather than repeating every exact prompt.
- Confirm Copy works directly from the word menu and from the translation popup.
- Test long-press selection on English, Bengali, and another non-Latin script. The selected word should match the finger target and the menu should appear without visible delay.

### Reader and scripture visuals

- Load English and native-language books. Confirm the full title and sharp cover-based loading screen appear correctly.
- Change the app font/theme, then open Quran, Bible, and Vedas. Scripture text must retain its classic-print styling.
- Open Bible Old Testament and New Testament chapters. Confirm there is no audio/narration button.

## Guardrails for remaining changes

- Keep Quran source recitation separate from ordinary word pronunciation.
- Do not add a dependency or native configuration without explicit approval.
- Use `src/theme/tokens.ts`, `src/theme/typography.ts`, and `useTheme()` for visual values.
- All SQLite access must use the queued client in `src/db/client.ts`.
- Preserve the reader’s body-text floor: Lora at least 17px with at least 1.85 line height.
- Run `npx tsc --noEmit` after each code change and test interactions on Expo Go SDK 57 before marking work accepted.

## Next product-quality focus

1. Complete the on-device verification above, especially Quran resume versus active recitation and native-script selection.
2. Fix only failures found during that pass; avoid expanding scope while stabilizing Shipathon delivery.
3. After acceptance, review only real usage feedback to decide whether Bible or Vedas need vetted source recitation in a later release.
