// Word-tap lookup cleanup for Arabic verse text. cleanWordForLookup in the
// prose reader is English-only (strips non-[A-Za-z'] chars), so Arabic needs
// its own cleaner rather than reusing it — re-exported here so callers get
// both cleaners from one import.
export { cleanWordForLookup } from '@/features/reader/engine/words';

// Strips tashkeel (diacritics), punctuation, and any non-Arabic-letter chars
// from a token's edges, keeping the Arabic base letters for translation
// lookup — same role as cleanWordForLookup but for Arabic script.
export function cleanArabicWordForLookup(token: string): string {
  return token.replace(/^[^؀-ۿ]+|[^؀-ۿ]+$/g, '');
}
