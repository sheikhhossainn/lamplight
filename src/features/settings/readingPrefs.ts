import { useSyncExternalStore } from 'react';

// Fixed, tuned reading-body metrics — the design system's locked reading values
// (Lora, never below 17px, line-height never below 1.85).
// Centralized here so the Reader is the single source of truth for what "reading body" means.

export const MIN_READING_FONT_SIZE_PX = 17;
export const MAX_READING_FONT_SIZE_PX = 24;
export const DEFAULT_READING_FONT_SIZE_PX = 18;

export const MIN_READING_LINE_HEIGHT_RATIO = 1.85;
export const MAX_READING_LINE_HEIGHT_RATIO = 2.15;
export const DEFAULT_READING_LINE_HEIGHT_RATIO = 1.88;

export type ReadingTypographyPrefs = {
  fontSize: number;
  lineHeightRatio: number;
};

const TYPOGRAPHY_PREFS_KEY = 'reader_typography_prefs';

let currentTypographyPrefs: ReadingTypographyPrefs = {
  fontSize: DEFAULT_READING_FONT_SIZE_PX,
  lineHeightRatio: DEFAULT_READING_LINE_HEIGHT_RATIO,
};

const listeners = new Set<() => void>();

function clampFontSize(size: number): number {
  return Math.max(MIN_READING_FONT_SIZE_PX, Math.min(MAX_READING_FONT_SIZE_PX, Math.round(size * 2) / 2));
}

function clampLineHeightRatio(ratio: number): number {
  return Math.max(MIN_READING_LINE_HEIGHT_RATIO, Math.min(MAX_READING_LINE_HEIGHT_RATIO, Math.round(ratio * 100) / 100));
}

export function getReadingTypographyPrefs(): ReadingTypographyPrefs {
  return currentTypographyPrefs;
}

export function setReadingTypographyPrefs(prefs: Partial<ReadingTypographyPrefs>): void {
  const next: ReadingTypographyPrefs = {
    fontSize: prefs.fontSize !== undefined ? clampFontSize(prefs.fontSize) : currentTypographyPrefs.fontSize,
    lineHeightRatio: prefs.lineHeightRatio !== undefined ? clampLineHeightRatio(prefs.lineHeightRatio) : currentTypographyPrefs.lineHeightRatio,
  };
  if (next.fontSize === currentTypographyPrefs.fontSize && next.lineHeightRatio === currentTypographyPrefs.lineHeightRatio) {
    return;
  }
  currentTypographyPrefs = next;
  listeners.forEach((listener) => listener());
  void (async () => {
    try {
      const { setSetting } = await import('@/db/repositories/appSettings');
      await setSetting(TYPOGRAPHY_PREFS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal if setting storage fails
    }
  })();
}

export function resetReadingTypographyPrefs(): void {
  setReadingTypographyPrefs({
    fontSize: DEFAULT_READING_FONT_SIZE_PX,
    lineHeightRatio: DEFAULT_READING_LINE_HEIGHT_RATIO,
  });
}

export async function hydrateReadingTypography(): Promise<void> {
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    const raw = await getSetting(TYPOGRAPHY_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReadingTypographyPrefs>;
      currentTypographyPrefs = {
        fontSize: parsed.fontSize !== undefined ? clampFontSize(parsed.fontSize) : DEFAULT_READING_FONT_SIZE_PX,
        lineHeightRatio: parsed.lineHeightRatio !== undefined ? clampLineHeightRatio(parsed.lineHeightRatio) : DEFAULT_READING_LINE_HEIGHT_RATIO,
      };
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Ignore parse error, use defaults
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReadingTypography(): ReadingTypographyPrefs {
  return useSyncExternalStore(subscribe, getReadingTypographyPrefs);
}

// 18px sits comfortably above the design system's 17px reading-body floor
// ("never shrink below 17px").
export const READING_FONT_SIZE_PX = 18;

// 1.88 is the design system's reading-body line-height for handwritten script.
// Kept as a resolved pixel value so the paginator's line math stays integer-stable.
export const READING_LINE_HEIGHT_PX = 34;

// Bengali script features prominent top hanging lines (Matra), ascenders,
// descenders, and complex conjuncts (যুক্তাক্ষর). Matching the 18px body size with
// a balanced 35px line-height (1.95 ratio) ensures comfortable reading without feeling oversized.
export const BANGLA_READING_FONT_SIZE_PX = 18;
export const BANGLA_READING_LINE_HEIGHT_PX = Math.round(BANGLA_READING_FONT_SIZE_PX * 1.95); // 35

// Japanese (Kanji/Kana) and Korean (Hangul) square ideographic glyphs read best
// with a balanced 18px body and 34px line-height (1.88 ratio).
export const CJK_READING_FONT_SIZE_PX = 18;
export const CJK_READING_LINE_HEIGHT_PX = Math.round(CJK_READING_FONT_SIZE_PX * 1.88); // 34

export function getReadingFontSize(language?: string, userFontSize?: number): number {
  const base = userFontSize !== undefined ? clampFontSize(userFontSize) : currentTypographyPrefs.fontSize;
  return clampFontSize(base);
}

export function getReadingLineHeight(language?: string, userFontSize?: number, userRatio?: number): number {
  const fontSize = getReadingFontSize(language, userFontSize);
  const ratio = userRatio !== undefined ? clampLineHeightRatio(userRatio) : currentTypographyPrefs.lineHeightRatio;
  const effectiveRatio = language === 'bn' ? Math.max(1.95, ratio) : ratio;
  return Math.round(fontSize * effectiveRatio);
}

