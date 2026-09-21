import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

async function callGroq(
  system: string,
  user: string,
  maxTokens = 450,
  temperature = 0.2,
): Promise<string | null> {
  if (!GROQ_API_KEY) {
    console.error('[literary-ai] GROQ_API_KEY is not configured on server.');
    return null;
  }

  for (const model of GROQ_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature,
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[literary-ai] Model ${model} returned status ${res.status}`);
        continue;
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.warn(`[literary-ai] Model ${model} error:`, err);
    }
  }
  return null;
}

const TONGUE_NAMES: Record<string, string> = {
  bn: 'Bengali (বাংলা)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  ar: 'Arabic (العربية)',
  en: 'English',
};

function normalizeRelated(raw: unknown): Array<{ word: string; meaning: string }> {
  if (!Array.isArray(raw)) return [];
  const results: Array<{ word: string; meaning: string }> = [];

  for (const item of raw) {
    if (typeof item === 'string' && item.trim().length > 0) {
      results.push({ word: item.trim(), meaning: '' });
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const w = obj.word ?? obj.synonym ?? obj.antonym ?? obj.name;
      const m = obj.meaning ?? obj.translation ?? obj.definition ?? '';
      if (typeof w === 'string' && w.trim().length > 0) {
        results.push({
          word: w.trim(),
          meaning: typeof m === 'string' ? m.trim() : '',
        });
      }
    }
  }

  return results.slice(0, 3);
}

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

  // 1. Authenticate user via JWT
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired authentication token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Determine user tier (Free vs Premium)
  const [profileRes, grantsRes] = await Promise.all([
    supabase.from('profiles').select('plan_key').eq('id', user.id).single(),
    supabase
      .from('entitlement_grants')
      .select('id, feature_bundle, ends_at')
      .eq('owner_id', user.id)
      .is('revoked_at', null)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .limit(1),
  ]);

  const isProfilePremium = profileRes.data?.plan_key === 'premium';
  const hasActiveGrant = Boolean(grantsRes.data && grantsRes.data.length > 0);
  const isPremium = isProfilePremium || hasActiveGrant;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;

  // 3. Handle Actions
  if (action === 'batch_translate') {
    const sentences = Array.isArray(body.sentences) ? body.sentences : [];
    const fromLang = String(body.fromLang || 'en');
    const toLang = String(body.toLang || 'bn');

    if (sentences.length === 0) {
      return new Response(JSON.stringify({ success: true, translations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Free tier: enforce daily translation rate limit
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const { data: usageRow } = await supabase
        .from('translation_usage')
        .select('count_used')
        .eq('owner_id', user.id)
        .eq('usage_date', today)
        .single();

      const currentCount = usageRow?.count_used ?? 0;
      const FREE_DAILY_LIMIT = 300;

      if (currentCount + sentences.length > FREE_DAILY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: 'Free daily translation limit reached. Upgrade to Premium for unlimited literary translations.',
            limit: FREE_DAILY_LIMIT,
            current: currentCount,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Record / increment usage
      await supabase.rpc('increment_translation_usage', {
        p_owner_id: user.id,
        p_date: today,
      });
    }

    const system = `You are an elite literary translator for a language learning reading app.
Translate the provided array of sentences from ${fromLang} to ${toLang}.
Provide a faithful, elegant literary translation that sounds natural and captures archaic idioms accurately.
Return a JSON object with key "translations" containing an array of translated strings with the exact same count and sequence as the input sentences:
{"translations": ["...", "..."]}`;

    const raw = await callGroq(system, JSON.stringify(sentences), 1500, 0.2);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.translations) && parsed.translations.length === sentences.length) {
          return new Response(
            JSON.stringify({
              success: true,
              translations: parsed.translations.map((s: any) => String(s || '').trim()),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch (err) {
        console.warn('[literary-ai] Failed to parse translations JSON:', err);
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Translation engine unavailable or returned invalid structure',
        success: false,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  if (action === 'cloze_question') {
    const word = String(body.word || '').trim();
    const contextSentence = String(body.contextSentence || '').trim();

    if (!word || !contextSentence) {
      return new Response(JSON.stringify({ error: 'word and contextSentence are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system =
      'You are a vocabulary quiz generator. Given a word and a sentence, return ONLY a JSON object with keys: "sentence" (the sentence with the word replaced by ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.';
    const userPrompt = `Word: "${word}"\nSentence: "${contextSentence}"`;

    const raw = await callGroq(system, userPrompt, 350, 0.3);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { sentence?: string; answer?: string; distractors?: unknown };
        let sentence = typeof parsed.sentence === 'string' ? parsed.sentence : '';
        const answer = typeof parsed.answer === 'string' ? parsed.answer : word;

        if (!sentence.includes('___')) {
          const re = new RegExp(`\\b${word}\\b`, 'i');
          if (re.test(contextSentence)) {
            sentence = contextSentence.replace(re, '___');
          } else {
            sentence = 'The meaning of ___ was clearly understood in context.';
          }
        }

        let distractors: string[] = [];
        if (Array.isArray(parsed.distractors)) {
          distractors = parsed.distractors.map(String).filter((d) => d.toLowerCase() !== answer.toLowerCase());
        }

        const fallbackDistractors = ['apparent', 'obscure', 'profound', 'subtle', 'vivid', 'fleeting'];
        for (const fb of fallbackDistractors) {
          if (distractors.length >= 3) break;
          if (fb.toLowerCase() !== answer.toLowerCase() && !distractors.includes(fb)) {
            distractors.push(fb);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            question: {
              sentence,
              answer,
              distractors: distractors.slice(0, 3),
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch {
        // malformed JSON
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to generate cloze question', success: false }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (action === 'fresh_cloze_question') {
    const word = String(body.word || '').trim();
    const contextSentence = String(body.contextSentence || '').trim();

    if (!word || !contextSentence) {
      return new Response(JSON.stringify({ error: 'word and contextSentence are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system =
      'You are a vocabulary quiz generator. Given a word and its original sentence, compose a NEW, DIFFERENT creative sentence that uses the word naturally, replacing that word with ___. Return ONLY a JSON object with keys: "sentence" (the new sentence with ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.';
    const userPrompt = `Word: "${word}"\nPrevious sentence context: "${contextSentence}"`;

    const raw = await callGroq(system, userPrompt, 350, 0.3);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { sentence?: string; answer?: string; distractors?: unknown };
        let sentence = typeof parsed.sentence === 'string' ? parsed.sentence : '';
        const answer = typeof parsed.answer === 'string' ? parsed.answer : word;

        if (!sentence.includes('___')) {
          sentence = 'In this modern age, ___ remains an essential virtue.';
        }

        let distractors: string[] = [];
        if (Array.isArray(parsed.distractors)) {
          distractors = parsed.distractors.map(String).filter((d) => d.toLowerCase() !== answer.toLowerCase());
        }

        const fallbackDistractors = ['lucid', 'ephemeral', 'rigorous', 'candid', 'subtle'];
        for (const fb of fallbackDistractors) {
          if (distractors.length >= 3) break;
          if (fb.toLowerCase() !== answer.toLowerCase() && !distractors.includes(fb)) {
            distractors.push(fb);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            question: {
              sentence,
              answer,
              distractors: distractors.slice(0, 3),
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch {
        // malformed JSON
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to generate fresh cloze question', success: false }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (action === 'word_cluster') {
    // Word clusters require Premium tier
    if (!isPremium) {
      return new Response(
        JSON.stringify({
          error: 'Word clusters and advanced vocabulary analysis require Lamplight Premium.',
          requiresPremium: true,
          success: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const word = String(body.word || '').trim();
    const translation = String(body.translation || '').trim();
    const motherTongue = String(body.motherTongue || 'bn').trim();

    const tongueName = TONGUE_NAMES[motherTongue] ?? 'English';
    const inTongue = motherTongue === 'en' ? 'English' : tongueName;

    const system =
      `You are an expert vocabulary tutor. Return ONLY a valid JSON object with these exact keys:\n` +
      `- "usageNote": 1 concise sentence in ${inTongue} explaining when/why this word is used.\n` +
      `- "synonyms": array of up to 3 objects { "word": string, "meaning": string in ${inTongue} }.\n` +
      `- "antonyms": array of up to 3 objects { "word": string, "meaning": string in ${inTongue} }.\n` +
      `Meanings must be in ${inTongue}.`;

    const userPrompt = `English word: "${word}"\nTranslation: "${translation}"`;

    const raw = await callGroq(system, userPrompt, 450, 0.3);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const usageNote = String(parsed.usageNote ?? parsed.usage_note ?? parsed.note ?? '').trim();
        const synonyms = normalizeRelated(parsed.synonyms);
        const antonyms = normalizeRelated(parsed.antonyms);

        if (usageNote || synonyms.length > 0 || antonyms.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              cluster: {
                usageNote,
                synonyms,
                antonyms,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch {
        // ignore
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to generate word cluster', success: false }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
