import type { ClozeQuestion, WordCluster, WordRelated } from '@/db/repositories/wordCache';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'openai/gpt-oss-120b',
];

function getKey(): string | null {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY ?? null;
}

async function callGroq(system: string, user: string, maxTokens = 400): Promise<string | null> {
  const key = getKey();
  if (!key) return null;

  for (const model of GROQ_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      // try next model in cascade
    }
  }
  return null;
}

/**
 * Generates a fill-in-the-blank cloze question from a word + its context sentence.
 * Returns null if Groq is unavailable or fails.
 */
export async function generateClozeQuestion(
  word: string,
  contextSentence: string,
): Promise<ClozeQuestion | null> {
  const system =
    'You are a vocabulary quiz generator. Given a word and a sentence, return ONLY a JSON object with keys: "sentence" (the sentence with the word replaced by ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.';

  const user = `Word: "${word}"\nSentence: "${contextSentence}"`;

  const raw = await callGroq(system, user, 350);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { sentence?: string; answer?: string; distractors?: unknown };
    let sentence = typeof parsed.sentence === 'string' ? parsed.sentence : '';
    const answer = typeof parsed.answer === 'string' ? parsed.answer : word;

    // Ensure sentence has ___
    if (!sentence.includes('___')) {
      const re = new RegExp(`\\b${word}\\b`, 'i');
      if (re.test(contextSentence)) {
        sentence = contextSentence.replace(re, '___');
      } else {
        sentence = `The meaning of ___ was clearly understood in context.`;
      }
    }

    let distractors: string[] = [];
    if (Array.isArray(parsed.distractors)) {
      distractors = parsed.distractors.map(String).filter((d) => d.toLowerCase() !== answer.toLowerCase());
    }

    // Pad distractors if fewer than 3
    const fallbackDistractors = ['apparent', 'obscure', 'profound', 'subtle', 'vivid', 'fleeting'];
    for (const fb of fallbackDistractors) {
      if (distractors.length >= 3) break;
      if (fb.toLowerCase() !== answer.toLowerCase() && !distractors.includes(fb)) {
        distractors.push(fb);
      }
    }

    return {
      sentence,
      answer,
      distractors: distractors.slice(0, 3),
    };
  } catch {
    // malformed JSON — ignore
  }
  return null;
}

const TONGUE_NAMES: Record<string, string> = {
  bn: 'Bengali (বাংলা)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  en: 'English',
};

/**
 * Normalizes an array of synonyms or antonyms from various model response shapes:
 * - ["happy", "cheerful"]
 * - [{ "word": "happy", "meaning": "খুশি" }]
 * - [{ "synonym": "happy", "meaning": "খুশি" }]
 */
function normalizeRelated(raw: unknown): WordRelated[] {
  if (!Array.isArray(raw)) return [];
  const results: WordRelated[] = [];

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

/**
 * Single Groq call that returns the full word cluster:
 * - usageNote (1 sentence, in mother tongue)
 * - synonyms (up to 3, each with mother-tongue meaning)
 * - antonyms (up to 3, each with mother-tongue meaning)
 */
export async function generateWordCluster(
  word: string,
  translation: string,
  motherTongue: string,
): Promise<WordCluster | null> {
  const tongueName = TONGUE_NAMES[motherTongue] ?? 'English';
  const inTongue = motherTongue === 'en' ? 'English' : tongueName;

  const system =
    `You are an expert vocabulary tutor. Return ONLY a valid JSON object with these exact keys:\n` +
    `- "usageNote": 1 concise sentence in ${inTongue} explaining when/why this word is used.\n` +
    `- "synonyms": array of up to 3 objects { "word": string, "meaning": string in ${inTongue} }.\n` +
    `- "antonyms": array of up to 3 objects { "word": string, "meaning": string in ${inTongue} }.\n` +
    `Meanings must be in ${inTongue}.`;

  const user = `English word: "${word}"\nTranslation: "${translation}"`;

  const raw = await callGroq(system, user, 450);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const usageNote = String(parsed.usageNote ?? parsed.usage_note ?? parsed.note ?? '').trim();
    const synonyms = normalizeRelated(parsed.synonyms);
    const antonyms = normalizeRelated(parsed.antonyms);

    if (usageNote || synonyms.length > 0 || antonyms.length > 0) {
      return {
        usageNote,
        synonyms,
        antonyms,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Generates an alternative/fresh fill-in-the-blank question using a brand new sentence.
 * Used when the user retakes the quiz with the same words.
 */
export async function generateFreshClozeQuestion(
  word: string,
  contextSentence: string,
): Promise<ClozeQuestion | null> {
  const system =
    'You are a vocabulary quiz generator. Given a word and its original sentence, compose a NEW, DIFFERENT creative sentence that uses the word naturally, replacing that word with ___. Return ONLY a JSON object with keys: "sentence" (the new sentence with ___), "answer" (the original word, exact casing), "distractors" (array of exactly 3 plausible but wrong words of similar length/type). No extra keys.';

  const user = `Word: "${word}"\nPrevious sentence context: "${contextSentence}"`;

  const raw = await callGroq(system, user, 350);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { sentence?: string; answer?: string; distractors?: unknown };
    let sentence = typeof parsed.sentence === 'string' ? parsed.sentence : '';
    const answer = typeof parsed.answer === 'string' ? parsed.answer : word;

    if (!sentence.includes('___')) {
      sentence = `In this modern age, ___ remains an essential virtue.`;
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

    return {
      sentence,
      answer,
      distractors: distractors.slice(0, 3),
    };
  } catch {
    // ignore
  }
  return null;
}
