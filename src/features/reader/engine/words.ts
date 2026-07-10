// Splits on whitespace while keeping the whitespace tokens themselves, so the
// renderer can reproduce exact spacing while only making word tokens tappable.
export function tokenizeParagraph(paragraph: string): string[] {
  return paragraph.split(/(\s+)/).filter((token) => token.length > 0);
}

export function cleanWordForLookup(token: string): string {
  return token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
}

// Splits a paragraph into sentence chunks (each keeping its trailing
// punctuation and space), so quote selection can operate at sentence
// granularity instead of grabbing a whole paragraph. Falls back to the whole
// paragraph as one chunk when there's no sentence-ending punctuation.
export function splitIntoSentences(paragraph: string): string[] {
  const matches = paragraph.match(/[^.!?]+[.!?]+["'’”)\]]*\s*|[^.!?]+$/g);
  return matches && matches.length > 0 ? matches : [paragraph];
}
