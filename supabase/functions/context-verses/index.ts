// Embeds a user's free-text "what are you feeling" description with
// Supabase's built-in gte-small model and calls public.search_verses_by_tradition
// once per tradition. Mirrors that function's own non-negotiable rule: never
// merge into one cross-tradition ORDER BY, or results bias toward whichever
// tradition's phrasing scores highest.
//
// Model: gte-small (384-dim), via the Edge Runtime's native `Supabase.ai.Session`
// — not transformers.js. Two straight attempts at running transformers.js
// (both @huggingface/transformers v3 and @xenova/transformers v2) failed to
// bundle/run under Deno via esm.sh (v3: no ONNX backend registered for Deno;
// v2: esm.sh can't serve its Node-only onnxruntime-node dependency for a
// non-Node target). Supabase.ai.Session runs natively inside the Edge Runtime
// container, no bundling at all. Cost: gte-small, not all-MiniLM-L6-v2 — the
// seed script (scripts/seed-scripture-verses.mjs) embeds with the same
// gte-small model so stored and query embeddings stay consistent.
//
// Deploy: `supabase functions deploy context-verses` (requires the Supabase
// CLI, linked to this project). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// auto-provided as secrets to every Edge Function — nothing to configure.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Supabase: {
  ai: { Session: new (model: string) => { run(text: string, opts: { mean_pool: boolean; normalize: boolean }): Promise<number[]> } };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TRADITIONS = ['quran', 'bible-ot', 'bible-nt', 'torah', 'vedas'] as const;
const MAX_TEXT_LENGTH = 500;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

// Created once at module scope, reused across warm invocations on the same
// Edge Function instance — same reasoning as caching a pipeline() would have
// been, just with the runtime's own model session instead.
const embeddingModel = new Supabase.ai.Session('gte-small');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; perTradition?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const text = body.text?.trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) {
    return new Response(JSON.stringify({ error: '"text" is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const perTradition = body.perTradition ?? 2;

  const embedding = await embeddingModel.run(text, { mean_pool: true, normalize: true });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // One call per tradition, never a merged query — see header note.
  const results = await Promise.all(
    TRADITIONS.map((tradition) =>
      supabase.rpc('search_verses_by_tradition', {
        p_embedding: embedding,
        p_tradition: tradition,
        p_limit: perTradition,
      }),
    ),
  );

  for (const { error } of results) {
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const rows = results.flatMap((r) => r.data ?? []);

  return new Response(JSON.stringify(rows), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
