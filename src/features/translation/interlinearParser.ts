import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import { callLiteraryAi } from './literaryAiClient';
import { translationProvider } from './index';

export type InterlinearWord = {
  text: string;
  cleanWord: string | null;
  gloss?: string;
  phonetic?: string;
};

export type InterlinearSentence = {
  id: string;
  sourceText: string;
  translatedText?: string;
  words: InterlinearWord[];
  isTranslating?: boolean;
};

import { splitSentences } from './sentenceSplitter';
export { splitSentences };

/**
 * Parses a paragraph into structured interlinear sentences ready for bilingual glossing.
 */
export function parseParagraphToInterlinear(paragraph: string, paragraphIndex: number): InterlinearSentence[] {
  const sentences = splitSentences(paragraph);

  return sentences.map((sent, sentIndex) => {
    const rawTokens = tokenizeParagraph(sent);
    const words: InterlinearWord[] = rawTokens.map((token) => ({
      text: token,
      cleanWord: /^\s+$/.test(token) ? null : cleanWordForLookup(token) || null,
    }));

    return {
      id: `p${paragraphIndex}_s${sentIndex}`,
      sourceText: sent,
      words,
    };
  });
}

/**
 * Translates a sentence and returns the translation result.
 */
export async function translateInterlinearSentence(
  sentence: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  const result = await translationProvider.translateSelection(sentence, fromLang, toLang);
  return result.translatedText;
}

/**
 * Translates an array of literary sentences with high context awareness.
 * Uses authenticated server-side literary-ai Edge Function (backed by Groq AI),
 * falling back gracefully to Google Translate if offline or rate limited.
 */
export async function batchTranslateSentences(
  sentences: string[],
  fromLang: string,
  toLang: string,
): Promise<string[]> {
  if (sentences.length === 0) return [];

  const results: string[] = new Array(sentences.length).fill('');
  const missIdx: number[] = [];

  // Sentence-level persistent cache: turning back to a page, or re-reading a
  // passage, must not re-bill the Edge Function. Cache trouble is never fatal.
  try {
    const { getCachedTranslation } = await import('@/db/repositories/translationCache');
    await Promise.all(
      sentences.map(async (s, i) => {
        const hit = await getCachedTranslation(s, fromLang as any, toLang as any).catch(() => null);
        if (hit?.translatedText) results[i] = hit.translatedText;
        else missIdx.push(i);
      }),
    );
  } catch {
    missIdx.length = 0;
    sentences.forEach((_, i) => missIdx.push(i));
  }
  if (missIdx.length === 0) return results;

  const fetched = await fetchBatchTranslations(
    missIdx.map((i) => sentences[i]),
    fromLang,
    toLang,
  );

  missIdx.forEach((origIdx, k) => {
    const text = fetched[k];
    results[origIdx] = text;
    if (text) {
      void import('@/db/repositories/translationCache')
        .then((m) => m.setCachedTranslation(sentences[origIdx], text, fromLang as any, toLang as any))
        .catch(() => {});
    }
  });
  return results;
}

async function fetchBatchTranslations(
  sentences: string[],
  fromLang: string,
  toLang: string,
): Promise<string[]> {
  const edgeRes = await callLiteraryAi<{ success?: boolean; translations?: string[] }>('batch_translate', {
    sentences,
    fromLang,
    toLang,
  });

  if (edgeRes?.success && Array.isArray(edgeRes.translations) && edgeRes.translations.length === sentences.length) {
    return edgeRes.translations.map((s) => String(s || '').trim());
  }

  // Fallback to Google Translate per sentence
  const results = await Promise.all(
    sentences.map((s) => translationProvider.translateSelection(s, fromLang, toLang)),
  );
  return results.map((r) => r.translatedText);
}
