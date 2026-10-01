/**
 * Literary Sentence Splitter
 *
 * Splits paragraphs into literary sentences, handling English punctuation,
 * Bengali dari ('।'), closing quotes, brackets, and abbreviations without
 * importing any native React Native dependencies.
 */

const ABBREVIATIONS = /^(Mr|Mrs|Ms|Dr|Prof|Capt|Col|Gen|Lt|Rev|St|Sr|Jr|vs|etc|e\.g|i\.e)\.$/i;

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
