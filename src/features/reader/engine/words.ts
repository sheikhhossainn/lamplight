// Splits on whitespace while keeping the whitespace tokens themselves, so the
// renderer can reproduce exact spacing while only making word tokens tappable.
export function tokenizeParagraph(paragraph: string): string[] {
  return paragraph.split(/(\s+)/).filter((token) => token.length > 0);
}

export function cleanWordForLookup(token: string): string {
  // Supports Latin, Bengali, Japanese (Kana & Kanji), and Korean Hangul
  return token.replace(
    /^[^A-Za-z\u0980-\u09FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF\u1100-\u11FF']+|[^A-Za-z\u0980-\u09FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF\u1100-\u11FF']+$/g,
    '',
  );
}

// Splits a paragraph into sentence chunks (each keeping its trailing
// punctuation and space), so quote selection can operate at sentence
// granularity instead of grabbing a whole paragraph. Recognizes Latin (.!?),
// Bengali Dari (। \u0964, ॥ \u0965), and CJK full stops (。 \u3002, ！？ \uFF01\uFF1F).
// Falls back to the whole paragraph as one chunk when there's no sentence-ending punctuation.
export function splitIntoSentences(paragraph: string): string[] {
  const matches = paragraph.match(
    /[^.!?\u0964\u0965\u3002\uFF01\uFF1F]+[.!?\u0964\u0965\u3002\uFF01\uFF1F]+["'’”)\]]*\s*|[^.!?\u0964\u0965\u3002\uFF01\uFF1F]+$/g,
  );
  return matches && matches.length > 0 ? matches : [paragraph];
}

// The sentence containing a character offset in the paragraph. Used when saving
// a word so its stored context is the sentence the word is actually in — a
// whole paragraph gets clamped to a few lines on the card, which usually cuts
// off before the word itself and reads identical for two words from the same
// paragraph.
export function sentenceAtOffset(paragraph: string, offset: number): string {
  let cursor = 0;
  for (const sentence of splitIntoSentences(paragraph)) {
    cursor += sentence.length;
    if (offset < cursor) return sentence.trim();
  }
  return paragraph.trim();
}

// Display-side counterpart, for context saved before sentenceAtOffset existed
// (those rows hold the whole paragraph). Returns the first sentence containing
// the word; falls back to the text as stored when the word isn't found.
export function sentenceContaining(text: string, word: string): string {
  const needle = word.toLowerCase();
  const match = splitIntoSentences(text).find((sentence) =>
    sentence.toLowerCase().includes(needle),
  );
  return (match ?? text).trim();
}
