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
