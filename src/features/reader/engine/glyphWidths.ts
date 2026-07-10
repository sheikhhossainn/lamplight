// Real per-character advance widths for the reading font, MEASURED on device.
//
// RN's text layout API exposes only per-line geometry from onTextLayout — never
// per-glyph positions — so precise touch->character hit-testing has to model
// character widths itself. A guessed table is crude for a proportional serif
// (Lora); instead the reader renders a one-time hidden pass (each character on
// its own line, whose reported line width IS that character's advance) and feeds
// the results here. Only RATIOS matter: the hit-test normalizes to each line's
// real measured width, so absolute units/scale are irrelevant, and the residual
// error is just kerning (sub-character).

// Em-relative fallback used before measurement completes (and for any character
// the measured set didn't cover). Ratios, not pixels — see charAdvance.
const FALLBACK: Record<string, number> = {
  ' ': 0.35,
  i: 0.3,
  j: 0.3,
  l: 0.3,
  I: 0.35,
  t: 0.4,
  f: 0.4,
  r: 0.45,
  '.': 0.3,
  ',': 0.3,
  ';': 0.3,
  ':': 0.3,
  '!': 0.3,
  "'": 0.25,
  '"': 0.4,
  '|': 0.25,
  '(': 0.4,
  ')': 0.4,
  '-': 0.45,
  m: 0.95,
  w: 0.9,
  M: 1.0,
  W: 1.05,
};
function fallbackAdvance(ch: string): number {
  const w = FALLBACK[ch];
  if (w !== undefined) return w;
  if (ch >= 'A' && ch <= 'Z') return 0.72;
  return 0.55;
}

let measured: Record<string, number> | null = null;

export function setMeasuredGlyphWidths(widths: Record<string, number>): void {
  measured = widths;
}

export function glyphWidthsReady(): boolean {
  return measured !== null;
}

// Advance width of a single character. Measured (px) once available, else the
// em-relative fallback. Mixing is safe within a call because a given line is
// resolved entirely from one source until measurement lands (after which every
// visible character is covered, with `n`'s width as the catch-all).
export function charAdvance(ch: string): number {
  if (measured) {
    const w = measured[ch];
    if (w !== undefined) return w;
    return measured.__typical ?? measured.n ?? 1;
  }
  return fallbackAdvance(ch);
}

// Characters to measure — each rendered on its own line so onTextLayout reports
// its advance as that line's width. Space is derived separately (it trims to
// zero on its own line), from the A/B lines appended below.
const MEASURE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?'\"()[]{}<>-–—…“”‘’&%$/@*_+=";
const SPACE_WITH = 'a a a a a a a a a a'; // 10 a's, 9 interior spaces
const SPACE_WITHOUT = 'aaaaaaaaaa'; // 10 a's

// The exact text the reader renders (hidden) to measure the font. Its
// onTextLayout line widths map back to characters via buildGlyphWidths, in order.
export const GLYPH_MEASURE_TEXT = [...MEASURE_CHARS, SPACE_WITH, SPACE_WITHOUT].join('\n');

// Turn the measured per-line widths (same order as GLYPH_MEASURE_TEXT) into a
// char->advance map, deriving the space advance from the A/B difference.
export function buildGlyphWidths(lineWidths: number[]): Record<string, number> | null {
  const chars = [...MEASURE_CHARS];
  if (lineWidths.length < chars.length + 2) return null;
  const map: Record<string, number> = {};
  for (let i = 0; i < chars.length; i += 1) map[chars[i]] = lineWidths[i] || 0.5;
  const withSpaces = lineWidths[chars.length];
  const withoutSpaces = lineWidths[chars.length + 1];
  map[' '] = Math.max(0.1, (withSpaces - withoutSpaces) / 9);
  map.__typical = map.n ?? map[' '];
  return map;
}
