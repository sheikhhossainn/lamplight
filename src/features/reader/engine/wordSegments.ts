export type WordSegment = {
  text: string;
  start: number;
  end: number;
  isWordLike: boolean;
};

const segmenterCache = new Map<string, Intl.Segmenter>();

function getSegmenter(locale?: string): Intl.Segmenter | null {
  if (typeof Intl.Segmenter !== 'function') return null;
  const cacheKey = locale || 'default';
  const cached = segmenterCache.get(cacheKey);
  if (cached) return cached;
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    segmenterCache.set(cacheKey, segmenter);
    return segmenter;
  } catch {
    return null;
  }
}

// Keeps original string ranges intact while delegating script-aware word
// boundaries to the platform ICU implementation. The fallback still handles
// space-delimited and Unicode-letter scripts when Segmenter is unavailable.
export function segmentWords(text: string, locale?: string): WordSegment[] {
  const segmenter = getSegmenter(locale);
  if (segmenter) {
    return Array.from(segmenter.segment(text), ({ segment, index, isWordLike }) => ({
      text: segment,
      start: index,
      end: index + segment.length,
      isWordLike: Boolean(isWordLike),
    }));
  }

  const segments: WordSegment[] = [];
  const pattern = /[\p{L}\p{M}\p{N}\p{Pc}\u200C\u200D]+|[^\p{L}\p{M}\p{N}\p{Pc}\u200C\u200D]+/gu;
  for (const match of text.matchAll(pattern)) {
    const segment = match[0];
    const start = match.index ?? 0;
    segments.push({
      text: segment,
      start,
      end: start + segment.length,
      isWordLike: /^[\p{L}\p{M}\p{N}\p{Pc}\u200C\u200D]+$/u.test(segment),
    });
  }
  return segments;
}
