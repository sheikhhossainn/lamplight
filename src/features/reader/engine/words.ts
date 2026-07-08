// Splits on whitespace while keeping the whitespace tokens themselves, so the
// renderer can reproduce exact spacing while only making word tokens tappable.
export function tokenizeParagraph(paragraph: string): string[] {
  return paragraph.split(/(\s+)/).filter((token) => token.length > 0);
}

export function cleanWordForLookup(token: string): string {
  return token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
}
