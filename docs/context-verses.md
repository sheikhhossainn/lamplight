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
  3. Calls `search_verses_by_tradition` once per tradition (`quran`, `bible-ot`, `bible-nt`) using
     the service-role key.
  4. Returns the combined rows as flat JSON.
  - Separate endpoint from the app's usual PostgREST REST API (`/rest/v1/...`) — Edge Functions
    live at `/functions/v1/<name>`. Deploy with `supabase functions deploy context-verses`;
    `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are auto-provided as secrets.

## App

- **`FeelingPromptModal`** — free-text sheet, opened from the speech-bubble icon at the right edge
  of the Library screen's Scriptures shelf header. On submit, navigates to
  `/mood-verses/reflect?text=...`.
- **`contextVersesApi.ts`** — plain `fetch` to `${SUPABASE_URL}/functions/v1/context-verses` (not
  `@supabase/supabase-js` — nothing in the app bundles that client library; same convention as
  `remoteCatalog.ts`).
- **`VerseDeckView`** — shared deck UI: blind verse text → tap reveals tradition + citation →
  like/dislike → card fades out → next verse → after the last one, a summary list of every verse
  with its reaction. Reactions logged via the existing `logEvent()` into `analytics_events`
  (`verse_deck_reaction`), fire-and-forget.
- The old mood-tag path (`get_mood_verses`, `moodVersesApi.ts`) still exists and works, just has no
  screen wired to it anymore — superseded by this free-text flow.
