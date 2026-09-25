import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

async function callGemini(
  system: string,
  user: string,
  maxTokens = 450,
  temperature = 0.2,
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: user }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[literary-ai] Gemini ${model} returned status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return content;
    } catch (err) {
      console.warn(`[literary-ai] Gemini ${model} error:`, err);
    }
  }
  return null;
}

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

type AiCallResult = {
  content: string | null;
  provider: 'gemini' | 'groq' | null;
  model: string | null;
};

async function callAi(
  system: string,
  user: string,
  maxTokens = 450,
  temperature = 0.2,
): Promise<AiCallResult> {
  // 1. Try Gemini first if available (fast, structured JSON, high quality literary reasoning)
  if (GEMINI_API_KEY) {
    const geminiText = await callGemini(system, user, maxTokens, temperature);
    if (geminiText) {
      return { content: geminiText, provider: 'gemini', model: 'gemini-flash' };
    }
  }

  // 2. Fall back to Groq
  if (GROQ_API_KEY) {
    const groqText = await callGroq(system, user, maxTokens, temperature);
    if (groqText) {
      return { content: groqText, provider: 'groq', model: 'groq-llama' };
    }
  }

  return { content: null, provider: null, model: null };
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

async function sha256Hex(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
      const FREE_DAILY_LIMIT = 50;
      const countToAdd = sentences.length;

      if (currentCount + countToAdd > FREE_DAILY_LIMIT) {
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

      // Record / increment usage with exact batch sentence count
      await supabase.rpc('increment_translation_usage', {
        p_owner_id: user.id,
        p_date: today,
        p_count: countToAdd,
      });
    }

    const system = `You are an elite literary translator for a language learning reading app.
Translate the provided array of sentences from ${fromLang} to ${toLang}.
Provide a faithful, elegant literary translation that sounds natural and captures archaic idioms accurately.
Return a JSON object with key "translations" containing an array of translated strings with the exact same count and sequence as the input sentences:
{"translations": ["...", "..."]}`;

    const { content: raw } = await callAi(system, JSON.stringify(sentences), 1500, 0.2);
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

  if (action === 'cloze_question' || action === 'fresh_cloze_question') {
    const isFresh = action === 'fresh_cloze_question';
    const word = String(body.word || '').trim();
    const contextSentence = String(body.contextSentence || '').trim();

    if (!word || !contextSentence) {
      return new Response(JSON.stringify({ error: 'word and contextSentence are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = isFresh
      ? 'You are a vocabulary quiz generator. Given a word and its original sentence, compose a NEW, DIFFERENT creative sentence that uses the word naturally, replacing that word with ___. Return ONLY a JSON object with keys: "sentence" (the new sentence with ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.'
      : 'You are a vocabulary quiz generator. Given a word and a sentence, return ONLY a JSON object with keys: "sentence" (the sentence with the word replaced by ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.';
    const userPrompt = isFresh
      ? `Word: "${word}"\nPrevious sentence context: "${contextSentence}"`
      : `Word: "${word}"\nSentence: "${contextSentence}"`;

    const { content: raw } = await callAi(system, userPrompt, 350, 0.3);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { sentence?: string; answer?: string; distractors?: unknown };
        let sentence = typeof parsed.sentence === 'string' ? parsed.sentence : '';
        const answer = typeof parsed.answer === 'string' ? parsed.answer : word;

        if (!sentence.includes('___')) {
          if (!isFresh) {
            const re = new RegExp(`\\b${word}\\b`, 'i');
            sentence = re.test(contextSentence) ? contextSentence.replace(re, '___') : 'The meaning of ___ was clearly understood in context.';
          } else {
            sentence = 'In this modern age, ___ remains an essential virtue.';
          }
        }

        let distractors: string[] = [];
        if (Array.isArray(parsed.distractors)) {
          distractors = parsed.distractors.map(String).filter((d) => d.toLowerCase() !== answer.toLowerCase());
        }

        const fallbackDistractors = isFresh
          ? ['lucid', 'ephemeral', 'rigorous', 'candid', 'subtle']
          : ['apparent', 'obscure', 'profound', 'subtle', 'vivid', 'fleeting'];
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

    return new Response(JSON.stringify({ error: `Failed to generate ${isFresh ? 'fresh ' : ''}cloze question`, success: false }), {
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

    const { content: raw } = await callAi(system, userPrompt, 450, 0.3);
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

  if (action === 'context_translate') {
    // Context-aware translation requires Premium tier (FULLAPP.md §10.4)
    if (!isPremium) {
      return new Response(
        JSON.stringify({
          error: 'Context-aware translation requires Lamplight Premium.',
          requiresPremium: true,
          success: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const word = String(body.word || '').trim().slice(0, 100);
    const contextSentence = String(body.contextSentence || '').trim().slice(0, 500);
    const fromLang = String(body.fromLang || 'en').trim();
    const toLang = String(body.toLang || 'bn').trim();
    const bookTitle = body.bookTitle ? String(body.bookTitle).trim().slice(0, 100) : undefined;
    const bookAuthor = body.bookAuthor ? String(body.bookAuthor).trim().slice(0, 100) : undefined;

    if (!word || !contextSentence) {
      return new Response(JSON.stringify({ error: 'word and contextSentence are required', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tongueName = TONGUE_NAMES[toLang] ?? toLang;

    const system =
      `You are an elite literary linguist and translator for Lamplight reading app.\n` +
      `Given a word or phrase and its exact sentence in a book, analyze its contextual meaning.\n` +
      `Translate and explain it in ${tongueName}.\n` +
      `Return ONLY a valid JSON object with these exact keys:\n` +
      `- "contextualTranslation": string (exact translation of this word AS USED in this sentence in ${tongueName})\n` +
      `- "definition": string (1 concise definition of this specific contextual sense in ${tongueName})\n` +
      `- "partOfSpeech": string ("noun" | "verb" | "adjective" | "adverb" | "idiom" | "phrase" | "other")\n` +
      `- "contextFit": string (1 concise sentence explaining why this meaning fits the literary context)\n` +
      `- "synonyms": array of up to 3 objects { "word": string, "meaning": string in ${tongueName} }\n` +
      `- "antonyms": array of up to 3 objects { "word": string, "meaning": string in ${tongueName} }\n` +
      `- "grammarNote": string or null (brief grammatical nuance, archaic usage, or idiom note)\n` +
      `- "version": "v1-groq-literary"`;

    const userPrompt =
      `Word/Phrase: "${word}"\n` +
      `Context Sentence: "${contextSentence}"\n` +
      (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
      `Source Language: ${fromLang}\nTarget Language: ${toLang}`;

    const { content: raw } = await callAi(system, userPrompt, 500, 0.2);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const contextualTranslation = String(
          parsed.contextualTranslation ?? parsed.contextual_translation ?? parsed.translation ?? '',
        ).trim();
        const definition = String(parsed.definition ?? '').trim();
        const partOfSpeech = String(parsed.partOfSpeech ?? parsed.part_of_speech ?? 'other').trim();
        const contextFit = String(parsed.contextFit ?? parsed.context_fit ?? '').trim();
        const synonyms = normalizeRelated(parsed.synonyms);
        const antonyms = normalizeRelated(parsed.antonyms);
        const grammarNote = parsed.grammarNote ? String(parsed.grammarNote).trim() : null;

        if (contextualTranslation || definition) {
          return new Response(
            JSON.stringify({
              success: true,
              enrichment: {
                contextualTranslation: contextualTranslation || word,
                definition,
                partOfSpeech,
                contextFit,
                synonyms,
                antonyms,
                grammarNote,
                version: 'v1-groq-literary',
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch (err) {
        console.warn('[literary-ai] Failed to parse context_translate JSON:', err);
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to generate context translation', success: false }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // -------------------------------------------------------------
  // AI Reading Companion Actions (FULLAPP.md §16)
  // -------------------------------------------------------------
  if (action === 'companion_report_feedback') {
    const { reason, notes, bookId, chapterIndex, targetAction, excerptHash } = body;
    if (!reason) {
      return new Response(JSON.stringify({ error: 'Feedback reason is required', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      await supabase.from('companion_feedback').insert({
        owner_id: user.id,
        action: String(targetAction || 'general'),
        book_id: bookId ? String(bookId) : null,
        chapter_index: typeof chapterIndex === 'number' ? chapterIndex : null,
        reason: String(reason),
        notes: notes ? String(notes).slice(0, 1000) : null,
        excerpt_hash: excerptHash ? String(excerptHash) : null,
      });
    } catch (err) {
      console.warn('[literary-ai] Failed to record companion feedback:', err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for your report. Our editorial team reviews all reports to keep Lamplight accurate and spoiler-free.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const COMPANION_ACTIONS = [
    'companion_explain',
    'companion_simplify',
    'companion_summary',
    'companion_recap_characters',
    'companion_reflective_questions',
  ];

  if (COMPANION_ACTIONS.includes(action)) {
    // 1. Entitlement check (FULLAPP.md §16.2.2 & §16.4)
    if (!isPremium) {
      return new Response(
        JSON.stringify({
          error: 'The AI Reading Companion requires Lamplight Premium.',
          requiresPremium: true,
          success: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Daily usage rate limit accounting (FULLAPP.md §16.2.4)
    const PREMIUM_DAILY_COMPANION_LIMIT = 60;
    const today = new Date().toISOString().split('T')[0];
    let currentUsage = 0;
    try {
      const { data: usageRow } = await supabase
        .from('companion_usage')
        .select('count_used')
        .eq('owner_id', user.id)
        .eq('usage_date', today)
        .single();
      currentUsage = usageRow?.count_used ?? 0;
    } catch {
      // non-blocking
    }

    if (currentUsage >= PREMIUM_DAILY_COMPANION_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Daily companion limit of ${PREMIUM_DAILY_COMPANION_LIMIT} requests reached. Quota refreshes tomorrow.`,
          limit: PREMIUM_DAILY_COMPANION_LIMIT,
          current: currentUsage,
          success: false,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const bookTitle = body.bookTitle ? String(body.bookTitle).trim().slice(0, 100) : '';
    const bookAuthor = body.bookAuthor ? String(body.bookAuthor).trim().slice(0, 100) : '';
    const chapterIndex = typeof body.chapterIndex === 'number' ? body.chapterIndex : 0;
    const chapterTitle = body.chapterTitle ? String(body.chapterTitle).trim().slice(0, 100) : `Chapter ${chapterIndex + 1}`;

    // 3. Cache lookup (FULLAPP.md §16.2.8)
    const excerptHashInput = String(body.excerpt || body.sentence || body.chapterExcerpt || body.textUpToNow || '').slice(0, 500);
    const cacheKey = await sha256Hex(`companion:${action}:${bookTitle}:${chapterIndex}:${excerptHashInput}:v1`);

    try {
      const { data: cached } = await supabase
        .from('companion_cache')
        .select('response')
        .eq('cache_key', cacheKey)
        .single();

      if (cached?.response) {
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            data: cached.response,
            version: 'v1-groq-companion',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } catch {
      // non-blocking cache lookup
    }

    // 4. Action-specific prompts and Groq invocation
    let systemPrompt = '';
    let userPrompt = '';
    let maxTokens = 500;

    if (action === 'companion_explain') {
      const passage = String(body.excerpt || '').trim().slice(0, 1500);
      const isReference = Boolean(body.isReference);

      if (!passage) {
        return new Response(JSON.stringify({ error: 'Excerpt is required', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt =
        `You are Lamplight's AI Reading Companion, an erudite literary guide.\n` +
        (isReference
          ? `Explain any literary, classical, mythological, philosophical, or historical references in this excerpt.\n`
          : `Explain the difficult meaning, subtle nuances, subtext, and prose craft in this excerpt.\n`) +
        `STRICT SPOILER RULE: Explain ONLY the provided excerpt in the context of ${chapterTitle}. NEVER reveal, hint at, or foreshadow future plot twists, character deaths, or events from future chapters.\n` +
        `Return ONLY a valid JSON object with these exact keys:\n` +
        `- "explanation": string (2-3 concise, elegant paragraphs explaining the passage)\n` +
        `- "keyThemes": array of 1-3 concise strings highlighting themes or motifs\n` +
        `- "referenceNote": string or null (if any classical/historical allusion is present, explain it briefly; otherwise null)\n` +
        `- "version": "v1-groq-companion"`;

      userPrompt =
        (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
        `Location: ${chapterTitle}\n` +
        `Excerpt:\n"${passage}"`;
      maxTokens = 550;
    } else if (action === 'companion_simplify') {
      const sentence = String(body.sentence || '').trim().slice(0, 600);

      if (!sentence) {
        return new Response(JSON.stringify({ error: 'Sentence is required', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt =
        `You are Lamplight's AI Reading Companion.\n` +
        `Simplify the provided complex, archaic, or dense literary sentence into clear, modern English while preserving 100% of its original meaning, nuance, and emotional tone.\n` +
        `Return ONLY a valid JSON object with these exact keys:\n` +
        `- "simplified": string (the crystal-clear modern paraphrase)\n` +
        `- "originalMeaning": string (1 concise sentence explaining what was originally conveyed)\n` +
        `- "vocabularyBreakdown": array of up to 3 objects { "archaicWord": string, "modernMeaning": string }\n` +
        `- "version": "v1-groq-companion"`;

      userPrompt =
        (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
        `Sentence:\n"${sentence}"`;
      maxTokens = 400;
    } else if (action === 'companion_summary') {
      const chapterExcerpt = String(body.chapterExcerpt || '').trim().slice(0, 4000);

      if (!chapterExcerpt) {
        return new Response(JSON.stringify({ error: 'Chapter excerpt is required', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt =
        `You are Lamplight's AI Reading Companion.\n` +
        `Summarize Chapter ${chapterIndex + 1} (${chapterTitle}) for a reader.\n` +
        `CRITICAL SPOILER SAFETY: You MUST ONLY summarize what takes place in this specific chapter text. Do NOT reveal, foreshadow, or hint at any deaths, betrayals, twists, or outcomes in subsequent chapters.\n` +
        `Return ONLY a valid JSON object with these exact keys:\n` +
        `- "summary": string (2-3 concise, well-crafted paragraphs summarizing key narrative events)\n` +
        `- "keyDevelopments": array of 3-4 bullet points noting pivotal moments in this chapter\n` +
        `- "thematicFocus": string (1 sentence summarizing the chapter's central theme or emotional tone)\n` +
        `- "spoilerFreeGuarantee": true\n` +
        `- "version": "v1-groq-companion"`;

      userPrompt =
        (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
        `Chapter: ${chapterTitle} (Chapter ${chapterIndex + 1})\n` +
        `Chapter Text:\n${chapterExcerpt}`;
      maxTokens = 650;
    } else if (action === 'companion_recap_characters') {
      const textUpToNow = String(body.textUpToNow || '').trim().slice(0, 4000);

      if (!textUpToNow) {
        return new Response(JSON.stringify({ error: 'Reading text is required', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt =
        `You are Lamplight's AI Reading Companion.\n` +
        `Recap the characters encountered in the reader's journey up to Chapter ${chapterIndex + 1} (${chapterTitle}).\n` +
        `CRITICAL SPOILER SAFETY: Describe characters' status, intentions, and roles ONLY as known up to this point in the book. NEVER reveal future secrets, identities, betrayals, or fates from later chapters.\n` +
        `Return ONLY a valid JSON object with these exact keys:\n` +
        `- "characters": array of objects { "name": string, "role": string, "statusUpToNow": string, "keyRelationships": string }\n` +
        `- "version": "v1-groq-companion"`;

      userPrompt =
        (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
        `Current Position: Chapter ${chapterIndex + 1} (${chapterTitle})\n` +
        `Text Excerpt Up To Current Position:\n${textUpToNow}`;
      maxTokens = 700;
    } else if (action === 'companion_reflective_questions') {
      const chapterExcerpt = String(body.chapterExcerpt || '').trim().slice(0, 4000);

      if (!chapterExcerpt) {
        return new Response(JSON.stringify({ error: 'Chapter excerpt is required', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt =
        `You are Lamplight's AI Reading Companion.\n` +
        `Generate 3 thoughtful, reflective discussion questions about Chapter ${chapterIndex + 1} (${chapterTitle}).\n` +
        `Questions should invite the reader to ponder moral choices, character motivations, and universal literary themes. Do NOT ask about future events.\n` +
        `Return ONLY a valid JSON object with these exact keys:\n` +
        `- "questions": array of 3 objects { "question": string, "theme": string, "contextNote": string }\n` +
        `- "version": "v1-groq-companion"`;

      userPrompt =
        (bookTitle ? `Book: "${bookTitle}" by ${bookAuthor || 'Classic Author'}\n` : '') +
        `Chapter: ${chapterTitle} (Chapter ${chapterIndex + 1})\n` +
        `Chapter Text:\n${chapterExcerpt}`;
      maxTokens = 550;
    }

    // 5. Call AI (Gemini or Groq)
    const { content: raw, provider } = await callAi(systemPrompt, userPrompt, maxTokens, 0.25);
    const companionVersion = `v1-${provider || 'ai'}-companion`;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);

        // Store in companion_cache (non-blocking)
        try {
          await supabase.from('companion_cache').upsert({
            cache_key: cacheKey,
            action,
            model_version: companionVersion,
            response: parsed,
          });
        } catch {
          // ignore cache write error
        }

        // Increment usage accounting (non-blocking)
        try {
          await supabase.rpc('increment_companion_usage', {
            p_owner_id: user.id,
            p_date: today,
            p_count: 1,
          });
        } catch {
          // ignore usage write error
        }

        // Record request telemetry (non-blocking, no copyrighted text logged)
        try {
          await supabase.from('companion_request_logs').insert({
            owner_id: user.id,
            action,
            book_id: body.bookId ? String(body.bookId) : null,
            chapter_index: chapterIndex,
            token_estimate: maxTokens,
            cost_estimate_cents: provider === 'gemini' ? 0.0004 : 0.0006,
            success: true,
          });
        } catch {
          // ignore telemetry write error
        }

        return new Response(
          JSON.stringify({
            success: true,
            cached: false,
            data: parsed,
            version: companionVersion,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (err) {
        console.warn(`[literary-ai] Failed to parse ${action} JSON:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        error: 'AI Reading Companion engine was temporarily unable to fulfill this request. Please try again.',
        success: false,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
