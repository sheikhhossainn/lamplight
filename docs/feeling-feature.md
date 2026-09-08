# FEELING Sanctuary — Architecture, Workflow & Extension Guide

> **Location**: `docs/feeling-feature.md`  
> **Entry point**: "Feeling?" icon button in Library header (`src/app/(tabs)/library.tsx`)  
> **Target route**: `/mood-verses/reflect`

---

## 1. Vision & Core Philosophy

The **Feeling** feature is an empathetic, sacred scripture sanctuary designed for moments when a user is carrying emotional weight: loneliness, numbness, burnout, grief, anxiety, heartbreak, guilt, or quiet gratitude.

### Key Principles
1. **Empathy, Not Commands**: Users never type rigid commands ("show me verse for sadness") or select robotic filters. They can write naturally, select emotional presets, or speak in their native tongue.
2. **"Wild Card" Unpredictable Deck**: Verses are not delivered in a predictable, repetitive sequence (e.g. Card 1 = Quran, Card 2 = Bible, Card 3 = Vedas). Instead, comfort cards are drawn like an organic **Wild Card deck** with Fisher-Yates shuffling, ensuring diverse traditions are interleaved unpredictably while maintaining spiritual resonance.
3. **Native Script Integrity**: If a user speaks or writes in Bengali (`বাংলা`), Urdu (`اردو`), Arabic (`العربية`), Spanish (`Español`), etc., their native script is **strictly preserved** in the chatbox for them to see and edit. Translation to English happens silently in the background solely to power semantic emotion matching.
4. **Resilient Offline Fallback**: If network or Supabase vector search is unavailable, an offline curated comfort corpus (`curatedComfortVerses.ts`) immediately delivers deep comfort verses with zero errors or delay.

---

## 2. File Map & Responsibilities

| File | Role |
|---|---|
| [`src/features/scripture-verses/FeelingPromptModal.tsx`](file:///d:/Coding/LampLight/src/features/scripture-verses/FeelingPromptModal.tsx) | Full-screen sanctuary modal: presets chips, multiline chatbox, voice recording controls, full-screen language search picker, and rotating calming submission overlay. |
| [`src/features/scripture-verses/voiceTranscriber.ts`](file:///d:/Coding/LampLight/src/features/scripture-verses/voiceTranscriber.ts) | Audio transcription pipeline: Groq Whisper (`whisper-large-v3`) with fallback to OpenAI Whisper (`whisper-1`). Background translation helper `translateToEnglishIfNeeded()`. |
| [`src/features/scripture-verses/empatheticMatcher.ts`](file:///d:/Coding/LampLight/src/features/scripture-verses/empatheticMatcher.ts) | Emotion classifier & wild card deck drawer. Analyzes feeling text, extracts emotional themes, queries vector/curated databases, and applies Fisher-Yates organic interleaving. |
| [`src/features/scripture-verses/curatedComfortVerses.ts`](file:///d:/Coding/LampLight/src/features/scripture-verses/curatedComfortVerses.ts) | Hand-curated offline corpus of uplifting, comforting verses across Quran, Bible (OT/NT), and Vedas for 10 core emotional states. |
| [`src/app/mood-verses/reflect.tsx`](file:///d:/Coding/LampLight/src/app/mood-verses/reflect.tsx) | Page route receiving `?text=...`, invoking `drawEmpatheticDeck()`, and rendering `VerseDeckView`. |
| [`src/features/scripture-verses/VerseDeckView.tsx`](file:///d:/Coding/LampLight/src/features/scripture-verses/VerseDeckView.tsx) | Deck presentation: illuminated parchment card styling, tradition badges, like/comfort reactions, live bookmarking to SQLite, and deep links to reader chapters. |
| [`src/components/icons.tsx`](file:///d:/Coding/LampLight/src/components/icons.tsx) | Custom SVG icons: `MicrophoneIcon`, `StopIcon`, `ChevronDownIcon`, `TranslateIcon`, `SearchIcon`, `CheckIcon`, `BookmarkIcon`. |

---

## 3. End-to-End User Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Library as Library Screen
    participant Modal as FeelingPromptModal
    participant Transcriber as voiceTranscriber
    participant Groq as Groq Whisper Cloud
    participant Matcher as empatheticMatcher
    participant DeckView as VerseDeckView

    User->>Library: Taps "Feeling?" icon in header
    Library->>Modal: Opens full-screen sanctuary modal
    alt Option A: User chooses preset
        User->>Modal: Taps preset chip (e.g., "Lonely", "Numb", "Heartbroken")
        Modal->>Modal: Populates chatbox with empathetic reflection
    else Option B: User speaks into mic
        User->>Modal: Picks voice language (or Auto Detect)
        User->>Modal: Taps Microphone icon
        Modal->>Modal: Records audio via expo-audio
        User->>Modal: Taps Stop icon
        Modal->>Transcriber: transcribeAudioUri(uri, languageCode)
        Transcriber->>Groq: Multipart upload via FileSystem.uploadAsync
        Groq-->>Transcriber: Returns native script text (e.g. বাংলা)
        Transcriber-->>Modal: Inserts transcribed text into chatbox
    else Option C: User writes freely
        User->>Modal: Types freely in chatbox in any language
    end
    User->>Modal: Taps "Draw comforting verses ➔"
    Modal->>Modal: Shows calming reflection spinner ("Listening to what you're carrying...")
    Modal->>Transcriber: translateToEnglishIfNeeded(text) [Background]
    Transcriber-->>Modal: Returns English semantic meaning
    Modal->>Matcher: drawEmpatheticDeck(englishText)
    Matcher->>Matcher: Classifies emotion + Fisher-Yates wild card shuffle
    Matcher-->>DeckView: Navigates to /mood-verses/reflect with curated deck
    DeckView-->>User: Displays illuminated sacred cards (with Save bookmark & Chapter links)
```

---

## 4. Voice Transcription & Speech-to-Text Pipeline

### Audio Recording
- Handled via `expo-audio` with preset `RecordingPresets.HIGH_QUALITY`.
- Mic permission requested dynamically via `requestRecordingPermissionsAsync()`.
- Toggle button switches dynamically between `<MicrophoneIcon />` and `<StopIcon />`.

### Multipart Upload Workaround for Android
> [!IMPORTANT]
> **Known Android Bug Avoided**: React Native's native Android `fetch()` crashes with `Unsupported FormDataPart implementation` when sending file blobs.
> **Fix**: We use `uploadAsync` from `expo-file-system/legacy`:
> ```ts
> await uploadAsync(endpoint, audioUri, {
>   fieldName: 'file',
>   httpMethod: 'POST',
>   uploadType: FileSystemUploadType.MULTIPART,
>   mimeType: 'audio/m4a',
>   parameters: {
>     model: 'whisper-large-v3',
>     temperature: '0',
>     ...(languageCode && languageCode !== 'auto' ? { language: languageCode } : {}),
>   },
>   headers: { Authorization: `Bearer ${apiKey}` },
> });
> ```

### Whisper Determinism (`temperature: '0'`)
To prevent Whisper from drifting into hallucinated phrases or misdetecting short utterances in background noise, `temperature: '0'` is enforced.

### Voice Language Picker (Keyboard-Safe Architecture)
- If the language picker were an inline dropdown beneath the tall chatbox, the on-screen keyboard would cover the results list.
- **Solution**: Tapping the language trigger opens a **top-pinned full-screen picker overlay** (`StyleSheet.absoluteFill` inside the modal).
  - Search input is pinned at the **very top** with `autoFocus`.
  - The results list flexes between the search bar and the keyboard.
  - Searches across 40+ languages by English name, native script, or ISO code (e.g., typing `"beng"`, `"বাংলা"`, `"urdu"`, `"اردو"`, or `"es"` matches instantly).
  - Android hardware back button closes the picker without dismissing the whole modal.

---

## 5. Emotion Classification & Wild Card Deck Matching

### Supported Emotional Themes
`src/features/scripture-verses/empatheticMatcher.ts` classifies input text across 10 distinct emotional archetypes:

1. `grief`: Death, loss, tears, mourning, missing someone.
2. `loneliness`: Isolation, disconnected, abandoned, nobody to talk to.
3. `numbness`: Feeling empty, hollow, apathy, unfeeling.
4. `burnout`: Exhaustion, weary, overwhelmed, cannot go on.
5. `heartbreak`: Betrayal, breakup, shattered heart, disappointment.
6. `anxiety`: Racing thoughts, panic, worry, dread, overthinking.
7. `meaninglessness`: Why bother, lost direction, purpose, heavy silence.
8. `guilt`: Remorse, regret, feeling unforgivable, ashamed.
9. `fear`: Physical danger, sickness, enemies, unknown future.
10. `gratitude`: Peaceful, blessed, quiet relief, thankful.

### Organic "Wild Card" Shuffle
Instead of fixed rounds (e.g., Tradition A $\rightarrow$ Tradition B $\rightarrow$ Tradition C), the engine applies an **organic Fisher-Yates shuffle with tradition balance**:
- Picks high-resonance verses for the matched emotion from Quran, Bible OT, Bible NT, Torah, and Vedas.
- Ensures no two consecutive cards share the exact same tradition.
- Returns a 5–7 card deck of sacred words.

---

## 6. Verse Deck UI & Interactions

1. **Card Presentation**:
   - Styled with Lamplight's illuminated parchment aesthetic (`colors.card`, `colors.flameAmber`, `colors.hairline`).
   - Distinct badges for traditions (`QURAN`, `BIBLE`, `VEDAS`, `TORAH`).
   - Amber quote glyphs and generous typography (`Lora`, line height $\ge 1.85$).
2. **Bookmark Persistence**:
   - Tapping the Bookmark icon directly updates SQLite highlights tables (`quran_highlights`, `bible_highlights`) via Lamplight's serializing DB queue (`src/db/client.ts`).
   - Provides haptic feedback and a visual saved indicator.
3. **Deep-Linking to Reader**:
   - Each card provides a `"Read chapter ➔"` button that routes directly to the reader (e.g., `/quran/surah-2`, `/bible/psalms-23`), enabling continuous reading in context.
4. **Summary Card**:
   - After swiping or advancing through the deck, a summary review screen recaps all drawn verses and lets the user revisit saved verses.

---

## 7. Environment Variables

Add the following to your root `.env` file:

```env
# Primary Speech-to-Text Engine (Groq is extremely fast & free at groq.com)
EXPO_PUBLIC_GROQ_API_KEY=gsk_...

# Secondary STT Fallback (Optional)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# Remote Vector Embeddings (Optional, fallback works 100% offline)
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 8. How to Extend & Improve This Feature

### Adding a New Tradition or Sacred Text (e.g., Bhagavad Gita, Tao Te Ching)
1. Add verses with emotional tag metadata to [`src/features/scripture-verses/curatedComfortVerses.ts`](file:///d:/Coding/LampLight/src/features/scripture-verses/curatedComfortVerses.ts).
2. Add tradition badge style in [`src/features/scripture-verses/VerseDeckView.tsx`](file:///d:/Coding/LampLight/src/features/scripture-verses/VerseDeckView.tsx).
3. If reading chapters exist in the reader, map deep link routing in `handleReadChapter()`.

### Adding Audio Recitation to Cards
To allow users to listen to a soothing voice reciting the displayed verse:
1. Use `expo-audio` in `VerseDeckView.tsx` with a play/pause audio wave button (`SoundWaveIcon`).
2. Stream Quran audio from established CDN endpoints (e.g., EveryAyah) and Bible public domain audio.

### Tuning Whisper Prompting for Dialects
In [`src/features/scripture-verses/voiceTranscriber.ts`](file:///d:/Coding/LampLight/src/features/scripture-verses/voiceTranscriber.ts), you can pass a `prompt` parameter to Whisper:
```ts
parameters.prompt = "Spiritual reflection, emotional vulnerability, prayer, comfort.";
```
This primes Whisper's acoustic decoder toward quiet, whispered, or heartfelt cadence.
