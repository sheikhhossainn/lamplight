# Context Verses — architecture reference

Free-text "what are you feeling" → relevant verses per tradition (Quran, Bible OT, Bible NT),
no typing constraints, no mood buttons. Semantic search via embeddings, not keyword match, not
an LLM reasoning about the user's situation.

## Embeddings

- **Model**: `Supabase/gte-small`, 384-dim output. Two different runtimes, same model:
  - **Stored side** (`scripts/seed-scripture-verses.mjs`, Node): embeds offline via
    `@huggingface/transformers`, self-hosted, no OpenAI/external API. Every row in
    `scripture_verses.embedding` (pgvector) was embedded once this way (batched, not per-row).
  - **Query side** (Edge Function, Deno): embeds live via the Edge Runtime's own native
    `Supabase.ai.Session('gte-small')` — not transformers.js. Two attempts at running
    transformers.js itself inside the Edge Function (both `@huggingface/transformers` v3 and
    `@xenova/transformers` v2, via esm.sh) failed to bundle/execute under Deno — v3 registered no
    ONNX backend for that target, v2 statically pulled in a Node-only native dependency esm.sh
    can't serve. `Supabase.ai.Session` runs natively in the Edge Runtime container, no bundling,
    no CDN import at all — hence gte-small over the originally-planned all-MiniLM-L6-v2, which
    that built-in API doesn't offer.
- **Why it "understands" context**: cosine similarity between two 384-number vectors, not literal
  word overlap. Close meaning → close vectors → surfaces as a match. There is no LLM reading or
  reasoning about the text in between — it's nearest-neighbor math.
- **Hard rule**: stored and query embeddings must come from the exact same model. Mixing models
  makes cosine similarity meaningless.

## Supabase

- **`scripture_verses`** — verse text + tradition + `embedding vector(384)`, public read RLS.
- **`search_verses_by_tradition(p_embedding, p_tradition, p_limit)`** — SQL function, `stable
  security invoker`. Called **once per tradition**, never merged into one cross-tradition
  `ORDER BY` — a single ranked list biases toward whichever tradition's phrasing scores highest.
- **Edge Function `context-verses`** (`supabase/functions/context-verses/index.ts`, Deno) — the
  only place live embedding happens:
  1. Receives `{ text, perTradition }`.
  2. Embeds `text` with `Supabase.ai.Session('gte-small')` (created once at module scope, reused
     across warm invocations).
  3. Calls `search_verses_by_tradition` once per tradition (`quran`, `bible-ot`, `bible-nt`,
     `torah`, `vedas`) using the service-role key.
  4. Returns the combined rows as flat JSON.
  - Separate endpoint from the app's usual PostgREST REST API (`/rest/v1/...`) — Edge Functions
    live at `/functions/v1/<name>`. Deploy with `supabase functions deploy context-verses`;
    `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are auto-provided as secrets.

## App

- **`contextVersesApi.ts`** — plain `fetch` to `${SUPABASE_URL}/functions/v1/context-verses` (not
  `@supabase/supabase-js` — nothing in the app bundles that client library; same convention as
  `remoteCatalog.ts`).
- **`VerseDeckView`** — shared deck UI: blind verse text → tap reveals tradition + citation →
  like/dislike → card fades out → next verse → after the last one, a summary list of every verse
  with its reaction. Reactions logged via the existing `logEvent()` into `analytics_events`
  (`verse_deck_reaction`), fire-and-forget. Used by `/mood-verses/reflect`, entered via
  `FeelingPromptModal` — tapping "Feeling?" on the Library screen opens the modal, submitting
  pushes `/mood-verses/reflect?text=...`, which calls `fetchContextVerses(text)`.
- The old mood-tag path (`get_mood_verses`, `moodVersesApi.ts`) still exists and works, just has no
  screen wired to it anymore — superseded by the free-text flow above.

## Verse table deck (offline, blind, no citation ever)

- **`VerseTableDeck`** (`src/features/scripture-verses/VerseTableDeck.tsx`) — reachable at
  `/mood-verses/table`, but nothing currently navigates there since "Feeling?" was repointed back
  to the free-text `FeelingPromptModal` flow above. Kept in the tree intentionally (not deleted)
  in case it gets a new entry point later. Not network-backed and not personalized — no
  embeddings, no text input. A wooden-table backdrop
  shows one face-down card at a time, cycling a fixed order (Quran → Bible OT → Bible NT → Torah →
  Vedas). Tap flips the card (`react-native-reanimated` rotateY) to reveal verse text only; unlike
  `VerseDeckView`, the tradition/book/chapter is never shown on either face — the card auto-fades
  after `REVEAL_HOLD_MS` and the next tradition's card slides in.
- **`randomVerse.ts`** (`src/features/scripture-verses/`) — picks one random verse per tradition
  straight from the same local `assets/*/verses.json` bundles the readers use (`bibleData`,
  `bibleNtData`, `quranData`, `vedasData`); Torah reuses the Bible OT data filtered to
  `GEN`–`DEU`, mirroring the filter in `src/app/torah/index.tsx`. Unlike `context-verses` (a
  starter curated deck — see `scripts/seed-scripture-verses.mjs`'s `torah`/`CURATED_VEDAS`
  entries, only the moods with a genuinely strong verse, not all ten), this deck draws from the
  full local text, so it's never short on cards for either tradition.
