// Fixed, tuned reading-body metrics — the design system's locked reading values
// (Lora, 18px, line-height 1.85). Font size / line spacing are intentionally
// NOT user-adjustable: the paginator measures each device's real page width and
// height (see paginateBook), so the layout stays robust across screen sizes
// without a per-user knob. Centralized here so the Reader is the single source
// of truth for what "reading body" means.

// 18px sits comfortably above the design system's 17px reading-body floor
// ("never shrink below 17px").
export const READING_FONT_SIZE_PX = 18;

// 1.85 is the design system's reading-body line-height — "the single most
// important number in the system." Never tighten below it. Kept as a resolved
// pixel value so the paginator's line math stays integer-stable.
export const READING_LINE_HEIGHT_PX = Math.round(READING_FONT_SIZE_PX * 1.85); // 33

// Bengali script features prominent top hanging lines (Matra), ascenders,
// descenders, and complex conjuncts (যুক্তাক্ষর). Matching the 18px body size with
// a balanced 35px line-height (1.95 ratio) ensures comfortable reading without feeling oversized.
export const BANGLA_READING_FONT_SIZE_PX = 18;
export const BANGLA_READING_LINE_HEIGHT_PX = Math.round(BANGLA_READING_FONT_SIZE_PX * 1.95); // 35

// Japanese (Kanji/Kana) and Korean (Hangul) square ideographic glyphs read best
// with a balanced 18px body and 34px line-height (1.88 ratio).
export const CJK_READING_FONT_SIZE_PX = 18;
export const CJK_READING_LINE_HEIGHT_PX = Math.round(CJK_READING_FONT_SIZE_PX * 1.88); // 34

export function getReadingFontSize(language?: string): number {
  if (language === 'bn') return BANGLA_READING_FONT_SIZE_PX;
  if (language === 'ja' || language === 'ko') return CJK_READING_FONT_SIZE_PX;
  return READING_FONT_SIZE_PX;
}

export function getReadingLineHeight(language?: string): number {
  if (language === 'bn') return BANGLA_READING_LINE_HEIGHT_PX;
  if (language === 'ja' || language === 'ko') return CJK_READING_LINE_HEIGHT_PX;
  return READING_LINE_HEIGHT_PX;
}
