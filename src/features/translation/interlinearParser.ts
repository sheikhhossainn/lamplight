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
