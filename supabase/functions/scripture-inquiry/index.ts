import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const MAX_QUESTION_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 12_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a neutral comparative religious studies scholar.
Return only valid JSON with topicBackground and traditions. Each tradition has tradition, traditionName, subtitle, and citations.
For citations use only these fields: surahNumber/verseNumber for Quran; bookId/chapter/verseNumber for Torah, Old Testament, New Testament, and Rigveda.
Do not provide historical claims, commentary, theological verdicts, rulings, or recommendations. Cite relevant primary passages across Quran, Torah & Old Testament, New Testament, and Rigveda when supported by the question. Do not invent citations.`;

type InquiryRequest = { question?: unknown };
type SlotResult = { allowed: boolean; retry_after_seconds: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'Authentication is required' }, 401);
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return json({ error: 'Authentication is required' }, 401);

  let body: InquiryRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION_LENGTH) : '';
  if (!question) return json({ error: 'A question is required' }, 400);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return json({ error: 'Authentication is required' }, 401);

  const { data: slots, error: slotError } = await userClient.rpc('claim_scripture_inquiry_slot');
  const slot = Array.isArray(slots) ? (slots[0] as SlotResult | undefined) : undefined;
  if (slotError || !slot) return json({ error: 'Unable to check inquiry limit' }, 503);
  if (!slot.allowed) return json({ error: 'Try again shortly', retryAfterSeconds: slot.retry_after_seconds }, 429);
  if (!GROQ_API_KEY) return json({ error: 'AI is not configured' }, 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: `User inquiry: ${question}` }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: 'AI request failed' }, 502);
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return json({ error: 'AI returned no response' }, 502);
    try {
      return json(JSON.parse(content));
    } catch {
      return json({ error: 'AI returned invalid data' }, 502);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'AI request timed out' }, 504);
    return json({ error: 'AI request failed' }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
