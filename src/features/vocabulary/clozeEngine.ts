import type { ClozeQuestion, WordCluster } from '@/db/repositories/wordCache';
import { callLiteraryAi } from '@/features/translation/literaryAiClient';

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
