import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
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
 * Uses Groq AI if available for authentic literary translation,
 * falling back gracefully to Google Translate.
 */
export async function batchTranslateSentences(
  sentences: string[],
  fromLang: string,
  toLang: string,
): Promise<string[]> {
  if (sentences.length === 0) return [];

  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (groqKey) {
    const candidateModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    for (const model of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an elite literary translator for a language learning reading app.
Translate the provided array of sentences from ${fromLang} to ${toLang}.
Provide a faithful, elegant literary translation that sounds natural and captures archaic idioms accurately.
Return a JSON object with key "translations" containing an array of translated strings with the exact same count and sequence as the input sentences:
{"translations": ["...", "..."]}`,
              },
              {
                role: 'user',
                content: JSON.stringify(sentences),
              },
            ],
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.translations) && parsed.translations.length === sentences.length) {
              return parsed.translations.map((s: any) => String(s || '').trim());
            }
          }
        }
      } catch (e) {
        console.warn(`[interlinearParser] Groq ${model} failed, checking next model:`, e);
      }
    }
  }

  // Fallback to Google Translate per sentence
  const results = await Promise.all(
    sentences.map((s) => translationProvider.translateSelection(s, fromLang, toLang)),
  );
  return results.map((r) => r.translatedText);
}
