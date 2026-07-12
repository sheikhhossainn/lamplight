# Scriptures — architecture reference

Verse-level religious texts (Quran, Bible/Old Testament, more to come). Deliberately **not**
routed through the prose-book pipeline (`content-ingestion/`, `books` table, `ReaderScreen`) —
that pipeline is chapter/page/paragraph-oriented with font-metric-relative addressing, unsuited
to a stable, citable verse key. Each scripture is its own parallel vertical: bundled static
asset + own DB tables + own repository + own routes. Shared machinery lives in
`src/features/reader/components/` (see "Shared UI" below).

## Running a fetch script — no port involved, don't kill the wrong process

`fetch-quran.mjs`, `fetch-bible-ot.mjs`, `fetch-bible-nt.mjs` are one-off outbound HTTP clients
(they call out to alquran.cloud / bible-api.com / bible.helloao.org) — **not servers**, so there
is no port listening and nothing to find in a port scan. They run as a plain `node scripts/fetch-*.mjs`
process, typically for several minutes (bible-api.com's 15 req/30s rate limit dominates), or
started via `npm run fetch:*` (spawns an extra `cmd.exe`/npm wrapper process as the parent).

If you need to confirm one is still running or avoid killing it while cleaning up other Node
processes (e.g. a stray `expo start` left over from route-typegen), match on command line, not
just process name — everything here is `node.exe`:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'fetch-bible|fetch-quran' } |
  Select-Object ProcessId, CommandLine
```

These scripts are resumable (checkpoint to disk after every book — see the Old Testament section
below), so killing one mid-run isn't destructive, just wasteful — it re-fetches from scratch or
resumes depending on what's already flushed to `assets/`. Prefer letting it finish or reading its
output file over killing it speculatively.

## Quran

- **Source**: alquran.cloud (Islamic Network), free, no API key. Confirmed live-working; the
  _official_ quran.com/Quran Foundation API now requires OAuth2 client-credential registration
  and was rejected for that reason.
- **Editions fetched**: `quran-uthmani` (Arabic), `en.sahih` (Sahih International English
  translation), `en.transliteration` (English transliteration/pronunciation guide) — all three
  from alquran.cloud. Tafsir (commentary) is a separate source: **Al-Jalalayn**, English, from
  `spa5k/tafsir_api` (free, no-key, static JSON on the jsdelivr CDN, one bulk file per surah —
  chosen over Ibn Kathir for being concise enough to read inline; Ibn Kathir runs to
  multi-paragraph entries per verse and was rejected as too long for in-app display).
- **Fetch script**: `scripts/fetch-quran.mjs` — one-off, run via `npm run fetch:quran`. Loops
  all 114 surahs, writes `assets/quran/surahs.json` (114-entry metadata list: number, Arabic
  name, English name/translation, revelation type, verse count) and `assets/quran/verses.json`
  (single object keyed by surah number → verse array, each verse has Arabic/English/
  transliteration/tafsir text). One combined verses file, not 114 per-surah files, because Metro
  can't `require()` a dynamic path.
- **Runtime loader**: `src/features/quran-content/quranData.ts` — `listSurahs()`,
  `getSurahMeta(number)`, `getSurahVerses(number)`. Reads the bundled JSON directly, no network.
- **DB**: schema migration v8 in `src/db/schema.ts` — tables `quran_reading_position` (PK
  surah_number), `quran_highlights`, `quran_saved_words`, all keyed by
  `(surah_number, verse_number)`.
- **Repository**: `src/db/repositories/quran.ts`.
- **Screens**: `src/app/quran/index.tsx` (114-surah list, continue-reading card) and
  `src/app/quran/[surahNumber].tsx` (verse-by-verse reader: Arabic line, transliteration line,
  English line, then a collapsed-by-default "Tafsir/Interpretation" disclosure row per verse
  (rendered uppercase via typography.eyebrowLabel; expanded text ends with an
  "— Tafsir al-Jalalayn" attribution line) — expand state is local component state, not
  persisted).
- **Arabic font**: `@expo-google-fonts/amiri`, registered in `src/app/_layout.tsx`, exposed as
  `arabicVerse` in `src/theme/typography.ts`.
- **Word lookup cleaners**: `src/features/quran-content/verseWords.ts` —
  `cleanArabicWordForLookup` (Arabic-script-aware) plus a re-export of the prose reader's
  English `cleanWordForLookup`.

## Bible — Old Testament

- **Source**: bible-api.com, free, no API key. Public-domain **World English Bible (WEB)**
  translation. Rate-limited to 15 requests/30s — the fetch script paces itself accordingly and
  takes roughly half an hour for the full Old Testament.
- **Canon**: Protestant Old Testament, 39 books, Genesis–Malachi — hardcoded as an explicit ID
  list in the fetch script (not sliced from the API's full 66-book response) so an API change
  can't silently pull in New Testament books.
- **Commentary**: **Jamieson-Fausset-Brown (JFB)**, public domain, from the HelloAO Bible API
  (`bible.helloao.org`, free, no key, no rate limit). Chosen over that API's `matthew-henry`
  commentary — despite the name, that dataset is the _full_ unabridged Matthew Henry text
  (entries run to ~10k characters), same conciseness problem Ibn Kathir had for the Quran side.
  JFB groups commentary by verse range (an entry numbered 3 covers verses 3-5 until the next
  entry); every verse in a range gets that range's shared text. Fetched inline in the same fetch
  script, merged onto each verse as an optional `commentary` field.
- **Fetch script**: `scripts/fetch-bible-ot.mjs`, run via `npm run fetch:bible-ot`. Writes
  `assets/bible/books.json` (39-entry metadata list: id, name, chapter count) and
  `assets/bible/verses.json` (nested object: book ID → chapter number → verse array of
  `{number, text, commentary?}`).
- **Runtime loader**: `src/features/bible-content/bibleData.ts` — `listBooks()`,
  `getBookMeta(bookId)`, `getBookVerses(bookId)` (flattens all chapters of a book into one
  ordered `{chapter, verse}[]` for continuous-scroll rendering). Also hand-curates a
  `BOOK_MEANINGS` map — a one-line synopsis per book, not sourced from any commentary (those run
  to full paragraphs), shown as list-row context the same way the Quran surah list shows
  `nameTranslation`.
- **DB**: schema migration v9 in `src/db/schema.ts` — tables `bible_reading_position` (PK
  book_id), `bible_highlights`, `bible_saved_words`, all keyed by `(book_id, chapter, verse)`.
  Shared with the New Testament below (see note there) since both are keyed by `book_id` and the
  two testaments' book IDs never collide.
- **Repository**: `src/db/repositories/bible.ts`.
- **Screens**: `src/app/bible/index.tsx` (39-book list, continue-reading card, each row showing
  chapter count and the book's one-line meaning) and `src/app/bible/[bookId].tsx` (continuous
  verse scroll across all of a book's chapters, with a chapter-number header wherever the chapter
  changes, and a collapsed-by-default "Interpretation" disclosure row per verse that has JFB
  commentary — same UI pattern as the Quran tafsir disclosure, attributed "— Jamieson-Fausset-
  Brown").
- English-only text — no transliteration/dual-script concerns, reuses the prose reader's
  `cleanWordForLookup` directly from `src/features/reader/engine/words.ts`.

## Bible — New Testament

Sibling of the Old Testament above, not a merge into it — a separate library spine/route since
the OT screens/list were already shipped as "Bible · Old Testament." Same source (bible-api.com
WEB translation), same JFB commentary source, same fetch-script shape, same UI patterns —
duplicated rather than parameterized, following this doc's own "Adding another scripture" recipe.

- **Canon**: 27 books, Matthew–Revelation, hardcoded ID list in the fetch script (mirrors the OT
  script's rationale — an API change can't silently pull in Old Testament books).
- **Fetch script**: `scripts/fetch-bible-nt.mjs`, run via `npm run fetch:bible-nt`. Writes
  `assets/bible-nt/books.json` and `assets/bible-nt/verses.json`, same shapes as the OT script.
  ~260 chapters, roughly 10 minutes at bible-api.com's rate limit.
- **Runtime loader**: `src/features/bible-content/bibleNtData.ts` — same shape as `bibleData.ts`,
  including its own hand-curated `BOOK_MEANINGS` map for the 27 NT books.
- **DB**: no new tables — reuses `bible_reading_position`, `bible_highlights`,
  `bible_saved_words` from the Old Testament section above. Safe because those tables are keyed
  by `book_id` alone and OT ids (`GEN`, `EXO`, …) never collide with NT ids (`MAT`, `MRK`, …).
  One consequence: each testament's "continue reading" card only surfaces a position from its
  own testament — `getLatestBibleReadingPosition()` queries the whole shared table, but the
  screen discards the result if the returned `bookId` isn't in its own book list, rather than
  showing the other testament's progress.
- **Repository**: `src/db/repositories/bible.ts` (same file, unchanged — already generic over
  `bookId`).
- **Screens**: `src/app/bible-nt/index.tsx` and `src/app/bible-nt/[bookId].tsx`, structurally
  identical to the OT screens.

## Shared UI

- **`src/features/reader/components/TappableWords.tsx`** — renders a string as nested tappable
  `<Text>` word-spans (long-press → callback with word + tap coordinates). Deliberately _not_
  the prose reader's pixel-precise `ReaderPageView` hit-testing engine (font-metric model tuned
  for Lora/English prose, wrong tool for short verse strings in any script). Takes a
  `cleanWord` function as a prop so it stays script-agnostic; both Quran and Bible screens
  supply their own cleaner.
- **`WordActionMenu`** (`src/features/reader/components/WordActionMenu.tsx`) — extended with an
  optional `saveLabel` prop (default `"Save as quote"` for the prose reader). Scripture screens
  pass `"Highlight verse"` / `"Remove highlight"` since their save action highlights the whole
  verse, not a prose quote selection.
- **`WordTranslationPopup`** (`src/features/reader/components/WordTranslationPopup.tsx`) —
  extended with optional `sourceLang`/`sourceLangLabel` props (default `'en'`/`"EN"`). The
  Quran reader passes `'ar'`/`"AR"` when the tapped word came from the Arabic line. Both props
  default to the original prose-reader behavior, so no existing caller changed.
- Translation itself goes through the existing generic provider
  (`src/features/translation/`) unchanged — `sourceLang` was already a free-form string there,
  only the popup component had `'en'` hardcoded.

## Library entry point

- `src/app/(tabs)/library.tsx` — a fixed "Scriptures" shelf (visually identical to the "Browse"
  book-spine shelf, `BookSpine` component reused) sits right after the main book shelf and
  before user-created shelves, so it stays anchored near the top regardless of how many shelves
  a user adds. Currently three hardcoded entries (Quran, Bible OT, Bible NT); each new scripture
  gets its own spine added here by hand — not data-driven, since scriptures aren't part of the
  synced book catalog.
- Cover art: no real photo asset exists for any scripture. All three fall back to `BookSpine`'s
  existing painted-spine-plus-title treatment (same fallback every catalog book without a cover
  photo gets) — `SPINE_COLOR_BY_BOOK` in `src/components/BookSpine.tsx` pins `quran`, `bible-ot`,
  and `bible-nt` to specific brand-token colors rather than the default fallback-tone cycle.
