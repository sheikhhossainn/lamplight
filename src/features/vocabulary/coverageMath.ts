export type CoverageTier = 'ready' | 'challenging' | 'not_yet';

export type BookCoverageResult = {
  bookId: string;
  coveragePercent: number; // e.g. 98.2
  tier: CoverageTier; // >=98%, 95-97.9%, <95%
  unknownTokenCount: number;
  highLeverageTargetWords: string[]; // Top 5 high-leverage words to learn to reach 98%
};

export type BookLexiconProfileInput = {
  bookId: string;
  totalRunningTokens: number;
  uniqueWordCount: number;
  tokenFrequencies: Record<string, number>;
};

// Baseline universal vocabulary (common English/target core words) seeded so new users
// don't start at an artificial 0% before calibration or first words saved.
export const BASELINE_CORE_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
  'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
  'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
  'these', 'give', 'day', 'most', 'us',
  // Common CJK / Bangla high-frequency particles & pronouns
  'わたし', 'ぼく', 'あなた', 'これ', 'それ', 'あれ', 'の', 'に', 'は', 'を', 'が', 'です', 'ます',
  '나', '너', '우리', '이것', '그것', '저것', '하다', '있다', '없다',
  'আমি', 'তুমি', 'সে', 'এই', 'সেই', 'একটি', 'এবং', 'ও', 'কিন্তু', 'বা',
]);

/**
 * Calculates token-weighted Hu & Nation lexical coverage:
 * Coverage % = (Sum_{w in Known} count(w in book)) / (total running words in book) * 100%
 */
export function calculateBookCoverage(
  profile: BookLexiconProfileInput,
  knownWords: Set<string>,
): BookCoverageResult {
  const { bookId, totalRunningTokens, tokenFrequencies } = profile;

  if (!totalRunningTokens || totalRunningTokens === 0) {
    return {
      bookId,
      coveragePercent: 100,
      tier: 'ready',
      unknownTokenCount: 0,
      highLeverageTargetWords: [],
    };
  }

  let knownTokenCount = 0;
  const unknownList: Array<{ word: string; count: number }> = [];

  for (const [word, count] of Object.entries(tokenFrequencies)) {
    const cleanWord = word.toLowerCase().trim();
    if (knownWords.has(cleanWord) || BASELINE_CORE_WORDS.has(cleanWord)) {
      knownTokenCount += count;
    } else {
      unknownList.push({ word, count });
    }
  }

  const rawPercent = (knownTokenCount / totalRunningTokens) * 100;
  const coveragePercent = Math.min(100, Math.max(0, Math.round(rawPercent * 10) / 10));

  let tier: CoverageTier = 'not_yet';
  if (coveragePercent >= 98.0) {
    tier = 'ready';
  } else if (coveragePercent >= 95.0) {
    tier = 'challenging';
  }

  // Sort unknown words by occurrence frequency descending
  unknownList.sort((a, b) => b.count - a.count);
  const highLeverageTargetWords = unknownList.slice(0, 5).map((u) => u.word);

  return {
    bookId,
    coveragePercent,
    tier,
    unknownTokenCount: Math.max(0, totalRunningTokens - knownTokenCount),
    highLeverageTargetWords,
  };
}
