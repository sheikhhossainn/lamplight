import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import { getSession } from '@/lib/supabaseAuth';
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

/**
 * Splits text into literary sentences, handling English punctuation, Bengali dari ('।'),
 * closing quotes ('"', ''', '”', '’'), brackets, and common honorific abbreviations.
 */
export function splitSentences(paragraph: string): string[] {
  if (!paragraph || !paragraph.trim()) return [];

  // Match sentences ending in ., !, ?, or । followed by optional closing quotes/brackets and whitespace/end-of-string
  const regex = /([^.!?।\n]+[.!?।]+['"”’\)\]]*(?:\s+|$)|[^.!?।\n]+$)/g;
  const matches = paragraph.match(regex);
  if (!matches) return [paragraph.trim()];

  const cleaned = matches
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));

  if (cleaned.length === 0) return [paragraph.trim()];

  // Re-join sentences that were mistakenly split on common titles/abbreviations (e.g. Mr., Mrs., Dr.)
  const ABBREVIATIONS = /^(Mr|Mrs|Ms|Dr|Prof|Capt|Col|Gen|Lt|Rev|St|Sr|Jr|vs|etc|e\.g|i\.e)\.$/i;
  const merged: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i];
    if (merged.length > 0) {
      const prev = merged[merged.length - 1];
      const lastWord = prev.split(/\s+/).pop() || '';
      if (ABBREVIATIONS.test(lastWord)) {
        merged[merged.length - 1] = prev + ' ' + s;
        continue;
      }
    }
    merged.push(s);
  }

  return merged;
}

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

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const session = await getSession();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/literary-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          action: 'batch_translate',
          sentences,
          fromLang,
          toLang,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) as { success?: boolean; translations?: string[] };
        if (data.success && Array.isArray(data.translations) && data.translations.length === sentences.length) {
          return data.translations.map((s) => String(s || '').trim());
        }
      }
    } catch (e) {
      console.warn('[interlinearParser] Server literary-ai translation failed, falling back to local provider:', e);
    }
  }

  // Fallback to Google Translate per sentence
  const results = await Promise.all(
    sentences.map((s) => translationProvider.translateSelection(s, fromLang, toLang)),
  );
  return results.map((r) => r.translatedText);
}
