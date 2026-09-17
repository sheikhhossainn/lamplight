# Feature validation checklist

All assigned features 1-A through 1-I are implemented. Complete these on-device checks in Expo Go SDK 57 before marking the work accepted.

## Reader actions

- Long-press a word. The menu must open silently and offer **Translate**, **Copy**, and **Save as quote** (or **Highlight verse** for scripture).
- Tap **Copy**, paste into another app, and confirm the selected source word is copied exactly.
- Tap **Translate** and confirm the translation appears and pronunciation happens once, without duplicate speech.
- Save/highlight a word or verse and confirm its existing action still works.

## 1-A — Copy translated text

- Translate a word, tap the popup's Copy action, and paste into another app.
- Confirm the copied text is the translation, while the long-press menu's Copy action copies the original selected word.

## 1-B — SRS context and hints

- In Vocabulary review, tap **Show context**, then **More clues**, then reveal the answer.
- Confirm context and clues help without giving away the answer, reset for the next card, and retain all four ratings: Again, Hard, Good, and Easy.

## 1-C — SRS review batches

- With more than 20 overdue words, start review.
- Confirm a session contains at most 20 cards, shows the total due count, and **Continue review** loads the next batch after completion.

## 1-D — New-word scheduling

- Save a new word today, then open SRS review.
- Confirm it is not due today and becomes due at the next local midnight.

## 1-E — Speech-language coverage

- Select and translate words for Bangla, Arabic, Japanese, Korean, Hindi, Simplified Chinese, and Traditional Chinese.
- Confirm speech uses the appropriate voice or, when unavailable, provides the system voice-download guidance without crashing.

## 1-F — Book source language

- In English, Bangla, Japanese, and Korean books, translate and save a word.
- Confirm the popup and saved-word audio use the book's source language; Quran Arabic and English lines must use their respective language.

## 1-G — Translation-cap responsiveness

- Translate several words in one session.
- Confirm the popup remains responsive. Near the free limit, confirm uncached translations are blocked correctly while reading, saving, and audio remain available.

## 1-H — Vocabulary growth chart

- Open Vocabulary and confirm the 30-day chart appears above the word list.
- Check empty history, sparse history, narrow screens, Day theme, and Lamp theme. Adding or deleting a word should refresh the chart.

## 1-I — Long-press interaction

- Verify long-press itself does not speak.
- Verify the menu actions remain anchored correctly and no action produces overlapping or repeated audio.

## Engineering verification

- `npx tsc --noEmit` passes.
- Check at least one small Android device and one normal iOS device, including Day and Lamp themes.
