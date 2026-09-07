import type { LanguageCode, TranslationProvider, TranslationResult } from './TranslationProvider';

// Thin wrapper around the unofficial (but widely used, key-free) Google Translate
// endpoint. Payloads here are always a single word or a short highlighted
// sentence, never full pages. Swappable for a paid/official API later without
// any caller changes — see TranslationProvider.ts.
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

// A word/pair translated once never needs re-fetching — Austen's vocabulary
// doesn't change mid-session.
const cache = new Map<string, TranslationResult>();

function cacheKey(text: string, from: LanguageCode, to: LanguageCode): string {
  return `${from}|${to}|${text.toLowerCase()}`;
}

async function fetchTranslation(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
): Promise<TranslationResult> {
  const key = cacheKey(text, from, to);
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `${ENDPOINT}?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  const translatedText = extractTranslatedText(data);
  const result: TranslationResult = { sourceText: text, translatedText };
  cache.set(key, result);
  return result;
}

function extractTranslatedText(data: unknown): string {
  // Response shape: [[["translated chunk","source chunk",...], ...], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected translation response shape');
  }
  const segments = data[0] as unknown[];
  // Google splits multi-sentence input into one segment per sentence/clause.
  // A single word/short selection was always exactly one segment, so joining
  // with '' was invisible — but a whole translated page is many segments,
  // and '' glues them into one unbroken run with no space between sentences,
  // which Text can't wrap (renders as one line spilling past the margins).
  // Join with a space and collapse any doubled-up whitespace that introduces.
  return segments
    .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const cloudTranslationProvider: TranslationProvider = {
  translateWord: (word, from, to) => fetchTranslation(word, from, to),
  translateSelection: (text, from, to) => fetchTranslation(text, from, to),
};
