/**
 * Context-Aware Literary Translation Engine (LEARN-04 / FULLAPP.md §10.4)
 *
 * Provides deep sentence-level literary contextual translation, part-of-speech analysis,
 * and nuance explanations for words encountered in prose reading.
 *
 * Rules:
 * - Free translation retains the existing literal word-by-word provider.
 * - Contextual enrichment is gated on canUse('context_translation').
 * - Cached locally in SQLite persistent_translation_cache for instant offline review.
 * - Pure extraction functions decoupled from React Native / SQLite for test runner compatibility.
 */

import { splitSentences } from './sentenceSplitter';

export type ContextEnrichment = {
  contextualTranslation: string;
  definition: string;
  partOfSpeech: string;
  contextFit: string;
  synonyms: Array<{ word: string; meaning: string }>;
  antonyms: Array<{ word: string; meaning: string }>;
  grammarNote: string | null;
  version: string;
};

export type ContextTranslationResponse = {
  enrichment?: ContextEnrichment;
  requiresPremium?: boolean;
  error?: string;
};

/**
 * Extracts the specific sentence enclosing a target word from a paragraph of prose.
 * If charOffset is provided, finds the sentence covering that offset.
 * Otherwise, finds the first sentence containing the word.
 */
export function extractContextSentence(
  paragraph: string,
  word: string,
  charOffset?: number,
): string {
  if (!paragraph || !paragraph.trim()) return '';
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return paragraph.trim();

  const sentences = splitSentences(paragraph);
  if (sentences.length <= 1) return paragraph.trim();

  // If charOffset is given, compute character ranges for each sentence
  if (typeof charOffset === 'number' && charOffset >= 0) {
    let currentIdx = 0;
    for (const s of sentences) {
      const foundIdx = paragraph.indexOf(s, currentIdx);
      if (foundIdx !== -1) {
        const start = foundIdx;
        const end = foundIdx + s.length;
        if (charOffset >= start && charOffset <= end) {
          return s;
        }
        currentIdx = end;
      }
    }
  }

  // Fallback: match first sentence containing the word on word boundaries
  const wordRegex = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'i');
  for (const s of sentences) {
    if (wordRegex.test(s)) {
      return s;
    }
  }

  // Substring fallback
  for (const s of sentences) {
    if (s.toLowerCase().includes(cleanWord)) {
      return s;
    }
  }

  return sentences[0] || paragraph.trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fetches context-aware literary translation for a word in its literary sentence.
 * Bounded by canUse('context_translation') entitlement.
 * Results are cached persistently in SQLite for offline access.
 */
export async function fetchContextTranslation(params: {
  word: string;
  contextSentence: string;
  fromLang?: string;
  toLang?: string;
  bookTitle?: string;
  bookAuthor?: string;
}): Promise<ContextTranslationResponse> {
  const { word, contextSentence, fromLang = 'en', toLang = 'bn', bookTitle, bookAuthor } = params;
  const trimmedWord = word.trim();
  const trimmedSentence = contextSentence.trim();

  if (!trimmedWord || !trimmedSentence) {
    return { error: 'Word and context sentence required' };
  }

  // Dynamic import for headless test runner isolation
  const { canUse } = await import('@/features/subscription/subscriptionState');
  if (!canUse('context_translation')) {
    return { requiresPremium: true };
  }

  const { getAppFlag } = await import('@/features/config/appConfig');
  if (!getAppFlag('literary_ai_translation_enabled')) {
    return { error: 'Literary AI translation is temporarily undergoing maintenance.' };
  }

  // Check persistent SQLite cache first
  try {
    const { getCachedTranslation, setCachedTranslation } = await import('@/db/repositories/translationCache');
    const cached = await getCachedTranslation(
      trimmedWord,
      fromLang as any,
      toLang as any,
      trimmedSentence,
    );

    if (cached && cached.translatedText.startsWith('{')) {
      try {
        const parsed = JSON.parse(cached.translatedText) as ContextEnrichment;
        if (parsed.contextualTranslation && parsed.definition) {
          return { enrichment: parsed };
        }
      } catch {
        // malformed JSON, proceed to fetch
      }
    }
  } catch (err) {
    // Non-blocking cache lookup failure
  }

  // Call Supabase literary-ai Edge Function
  try {
    const { callLiteraryAi } = await import('./literaryAiClient');
    const res = await callLiteraryAi<{
      success: boolean;
      enrichment?: ContextEnrichment;
      error?: string;
      requiresPremium?: boolean;
    }>('context_translate', {
      word: trimmedWord,
      contextSentence: trimmedSentence,
      fromLang,
      toLang,
      bookTitle,
      bookAuthor,
    });

    if (res?.requiresPremium) {
      return { requiresPremium: true };
    }

    if (res?.success && res.enrichment) {
      // Cache asynchronously in SQLite
      try {
        const { setCachedTranslation } = await import('@/db/repositories/translationCache');
        void setCachedTranslation(
          trimmedWord,
          JSON.stringify(res.enrichment),
          fromLang as any,
          toLang as any,
          trimmedSentence,
          'literary-ai',
        ).catch(() => {});
      } catch {
        // non-blocking cache write
      }

      return { enrichment: res.enrichment };
    }

    return { error: res?.error || 'Translation enrichment unavailable' };
  } catch (err) {
    return { error: 'Network failure during context translation' };
  }
}
