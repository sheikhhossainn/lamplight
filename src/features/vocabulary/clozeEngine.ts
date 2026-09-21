import type { ClozeQuestion, WordCluster } from '@/db/repositories/wordCache';
import { getSession } from '@/lib/supabaseAuth';

async function callLiteraryAi<T>(action: string, payload: Record<string, unknown>): Promise<T | null> {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const session = await getSession();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/literary-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Generates a fill-in-the-blank cloze question from a word + its context sentence
 * via authenticated server-side literary-ai Edge Function.
 * Returns null if the service is unavailable or fails.
 */
export async function generateClozeQuestion(
  word: string,
  contextSentence: string,
): Promise<ClozeQuestion | null> {
  const res = await callLiteraryAi<{ success?: boolean; question?: ClozeQuestion }>('cloze_question', {
    word,
    contextSentence,
  });
  return res?.success && res.question ? res.question : null;
}

/**
 * Calls server-side literary-ai Edge Function to generate the full word cluster:
 * - usageNote (1 sentence, in mother tongue)
 * - synonyms (up to 3, each with mother-tongue meaning)
 * - antonyms (up to 3, each with mother-tongue meaning)
 * Requires Premium tier on the server.
 */
export async function generateWordCluster(
  word: string,
  translation: string,
  motherTongue: string,
): Promise<WordCluster | null> {
  const res = await callLiteraryAi<{ success?: boolean; cluster?: WordCluster }>('word_cluster', {
    word,
    translation,
    motherTongue,
  });
  return res?.success && res.cluster ? res.cluster : null;
}

/**
 * Generates an alternative/fresh fill-in-the-blank question using a brand new sentence
 * via authenticated server-side literary-ai Edge Function.
 * Used when the user retakes the quiz with the same words.
 */
export async function generateFreshClozeQuestion(
  word: string,
  contextSentence: string,
): Promise<ClozeQuestion | null> {
  const res = await callLiteraryAi<{ success?: boolean; question?: ClozeQuestion }>('fresh_cloze_question', {
    word,
    contextSentence,
  });
  return res?.success && res.question ? res.question : null;
}
