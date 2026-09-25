import type { BookRow } from '@/db/repositories/books';

export type EditionInfo = {
  edition: string;
  provenance: string;
  formatLabel: string;
};

export type ReadingTimeEstimate = {
  totalMinutes: number;
  totalLabel: string;
  remainingMinutes: number;
  remainingLabel: string;
};

export type ReadingPaceContext = {
  daysToComplete: number;
  paceSummary: string;
};

const AVERAGE_MINUTES_PER_CHAPTER = 14;

/**
 * Returns rich edition provenance and format metadata for a book (FULLAPP §4.2).
 */
export function getEditionInfo(book: BookRow): EditionInfo {
  if (book.gutenbergId) {
    return {
      edition: 'Project Gutenberg Edition',
      provenance: `EBook #${book.gutenbergId}`,
      formatLabel: 'Unabridged Public Domain',
    };
  }

  if (book.source === 'bangla_api' || book.sourceLanguage === 'bn' || book.id.startsWith('bn-')) {
    return {
      edition: 'Bangla Sahitya Collection',
      provenance: 'Classical Bengal Literary Archive',
      formatLabel: 'Original Bengali Script',
    };
  }

  if (book.source === 'aozora_bunko' || book.sourceLanguage === 'ja' || book.id.startsWith('ja-') || book.id.startsWith('aozora-')) {
    return {
      edition: 'Aozora Bunko Literary Edition',
      provenance: 'Japanese Digital Library Archive',
      formatLabel: 'Original Japanese Text',
    };
  }

  if (book.source === 'gongu_korea' || book.sourceLanguage === 'ko' || book.id.startsWith('ko-') || book.id.startsWith('gongu-')) {
    return {
      edition: 'Gongu Korean Heritage Edition',
      provenance: 'Korea Copyright Commission Open Collection',
      formatLabel: 'Korean Literary Archive',
    };
  }

  if (book.id.startsWith('imported-')) {
    return {
      edition: 'Personal Library Import',
      provenance: 'Device Local Storage',
      formatLabel: 'Imported EPUB Document',
    };
  }

  return {
    edition: 'Lamplight Literary Edition',
    provenance: 'Curated Classics Collection',
    formatLabel: 'Standard Prose Edition',
  };
}

/**
 * Computes estimated reading time based on chapters and progress (FULLAPP §4.2).
 * Uses a comfortable literary baseline of ~14 minutes per chapter (~3,000 words at 215 wpm).
 */
export function estimateReadingTime(
  totalChapters: number,
  percentComplete: number = 0,
): ReadingTimeEstimate {
  const chapters = Math.max(1, totalChapters || 1);
  const totalMinutes = chapters * AVERAGE_MINUTES_PER_CHAPTER;
  const clampedPercent = Math.max(0, Math.min(1, percentComplete));

  const remainingMinutes = Math.max(0, Math.round(totalMinutes * (1 - clampedPercent)));

  const formatDuration = (mins: number): string => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const totalLabel = `~${formatDuration(totalMinutes)}`;
  const remainingLabel =
    clampedPercent >= 1
      ? 'Completed'
      : remainingMinutes === totalMinutes
        ? `${totalLabel} total`
        : `~${formatDuration(remainingMinutes)} remaining`;

  return {
    totalMinutes,
    totalLabel,
    remainingMinutes,
    remainingLabel,
  };
}

/**
 * Calculates adaptive completion forecast based on reader's daily target minutes (FULLAPP §4.2).
 */
export function getReadingPaceContext(
  dailyMinutes: number,
  totalMinutes: number,
  percentComplete: number = 0,
): ReadingPaceContext {
  const safeDaily = Math.max(5, dailyMinutes || 15);
  const remainingMinutes = Math.max(0, Math.round(totalMinutes * (1 - Math.min(1, percentComplete))));
  const daysToComplete = Math.max(1, Math.ceil(remainingMinutes / safeDaily));

  const paceSummary =
    percentComplete >= 1
      ? 'You have completed this title!'
      : `At ${safeDaily}m/day, you will finish in ~${daysToComplete} day${daysToComplete === 1 ? '' : 's'}.`;

  return {
    daysToComplete,
    paceSummary,
  };
}
