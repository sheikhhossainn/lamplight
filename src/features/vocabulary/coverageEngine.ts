import { useCallback, useEffect, useState } from 'react';

import { getBookLexicon, getAllBookLexicons, type BookLexiconProfile } from '@/db/repositories/bookLexicons';
import { listAllKnownWords } from '@/db/repositories/savedWords';
import {
  type CoverageTier,
  type BookCoverageResult,
  BASELINE_CORE_WORDS,
  calculateBookCoverage,
} from './coverageMath';

export type { CoverageTier, BookCoverageResult };
export { BASELINE_CORE_WORDS, calculateBookCoverage };

// In-memory coverage cache
const coverageCache = new Map<string, BookCoverageResult>();
type CoverageListener = () => void;
const listeners = new Set<CoverageListener>();

export function subscribeToCoverageUpdates(listener: CoverageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Invalidates coverage cache across the app (called when a word graduates to 'known'
 * or onboarding calibration finishes).
 */
export function invalidateCoverageCache(): void {
  coverageCache.clear();
  listeners.forEach((l) => l());
}

/**
 * React hook to retrieve real-time coverage for a single book.
 */
export function useBookCoverage(bookId: string) {
  const [coverage, setCoverage] = useState<BookCoverageResult | null>(() => coverageCache.get(bookId) || null);
  const [loading, setLoading] = useState(!coverageCache.has(bookId));

  const refresh = useCallback(async () => {
    try {
      const [profile, knownWords] = await Promise.all([
        getBookLexicon(bookId),
        listAllKnownWords(),
      ]);

      if (!profile) {
        setCoverage(null);
        setLoading(false);
        return;
      }

      const res = calculateBookCoverage(profile, knownWords);
      coverageCache.set(bookId, res);
      setCoverage(res);
    } catch {
      // Keep existing coverage on error
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    let mounted = true;
    const update = () => {
      if (mounted) refresh();
    };

    refresh();
    const unsubscribe = subscribeToCoverageUpdates(update);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refresh]);

  return { coverage, loading, recalculate: refresh };
}

/**
 * React hook to calculate coverage across multiple catalog books simultaneously in <150ms.
 */
export function useCatalogCoverage(bookIds?: string[]) {
  const [coverageMap, setCoverageMap] = useState<Map<string, BookCoverageResult>>(
    () => new Map(coverageCache),
  );
  const [loading, setLoading] = useState(coverageCache.size === 0);

  const refresh = useCallback(async () => {
    try {
      const [allProfiles, knownWords] = await Promise.all([
        getAllBookLexicons(),
        listAllKnownWords(),
      ]);

      const map = new Map<string, BookCoverageResult>();
      for (const [id, profile] of allProfiles.entries()) {
        if (!bookIds || bookIds.includes(id)) {
          const res = calculateBookCoverage(profile, knownWords);
          map.set(id, res);
          coverageCache.set(id, res);
        }
      }
      setCoverageMap(map);
    } catch {
      // Keep cached
    } finally {
      setLoading(false);
    }
  }, [bookIds]);

  useEffect(() => {
    let mounted = true;
    const update = () => {
      if (mounted) refresh();
    };

    refresh();
    const unsubscribe = subscribeToCoverageUpdates(update);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refresh]);

  return { coverageMap, loading, recalculate: refresh };
}
