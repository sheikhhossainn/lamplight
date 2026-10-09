import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

/** Scenes are drawn on a 360×84 canvas; the landmark sits right of centre, the left is open ground. */
export const SCENE_VIEWBOX = '0 0 360 84';
export const SCENE_HEIGHT = 84;

/** A rippling horizontal line across the canvas at height y. */
const wave = (y: number, amp: number) =>
  `M0 ${y} Q15 ${y - amp} 30 ${y}` + Array.from({ length: 11 }, (_, i) => ` T${60 + i * 30} ${y}`).join('');

/**
 * Inner SVG markup for a culture's landmark vignette, drawn in a single colour at varying opacity.
 * Returns null for the classic theme, which has no culture of its own.
 */
export function getCultureSceneMarkup(theme: LiteraryThemeCode, c: string): string | null {
  const fill = (o: number) => `fill="${c}" fill-opacity="${o}"`;
  const line = (o: number, w = 1.4) =>
    `fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  switch (theme) {
    case 'japanese':
      // Torii gate before Mount Fuji and the rising sun.
      return `
        <circle cx="300" cy="30" r="15" ${fill(0.16)} />
        <path d="M10 84 L100 42 Q118 32 136 42 L226 84 Z" ${fill(0.09)} />
        <path d="M101 42 L110 49 L118 43 L127 50 L135 42" ${line(0.35, 1.1)} />
        <path d="M0 78 H180" ${line(0.2, 1)} />
        <path d="M24 70 H96 M40 64 H88" ${line(0.14, 1)} />
        <rect x="262" y="38" width="6" height="46" ${fill(0.6)} />
        <rect x="312" y="38" width="6" height="46" ${fill(0.6)} />
        <rect x="257" y="44" width="66" height="5" ${fill(0.5)} />
        <rect x="287" y="35" width="6" height="9" ${fill(0.45)} />
        <path d="M244 24 Q290 36 336 24 L331 34 Q290 42 249 34 Z" ${fill(0.7)} />
        <path d="M248 80 H332" ${line(0.3, 1)} />
      `;
    case 'korean':
      // Hanok pavilion with upturned eaves, a moon and soft hills.
      return `
        <circle cx="64" cy="26" r="13" ${fill(0.15)} />
        <path d="M0 84 L48 56 L92 72 L142 48 L196 84 Z" ${fill(0.08)} />
        <path d="M205 42 C226 44 240 38 250 22 L290 22 C300 38 314 44 335 42 C328 54 306 54 290 51 L250 51 C234 54 212 54 205 42 Z" ${fill(0.62)} />
        <path d="M236 18 H304" ${line(0.4, 1.2)} />
        <rect x="252" y="51" width="5" height="27" ${fill(0.55)} />
        <rect x="270" y="51" width="5" height="27" ${fill(0.55)} />
        <rect x="288" y="51" width="5" height="27" ${fill(0.55)} />
        <path d="M257 60 H270 M275 60 H288 M257 69 H270 M275 69 H288" ${line(0.3, 1)} />
        <rect x="238" y="77" width="66" height="7" ${fill(0.4)} />
        <path d="M20 78 H160" ${line(0.18, 1)} />
      `;
    case 'arabic':
      // Mosque dome, minarets, crescent moon and stars.
      return `
        <path d="M60 12 A12 12 0 1 0 72 29 A9.5 9.5 0 1 1 60 12 Z" ${fill(0.3)} />
        <circle cx="110" cy="20" r="1.6" ${fill(0.5)} />
        <circle cx="140" cy="34" r="1.2" ${fill(0.4)} />
        <circle cx="30" cy="46" r="1.2" ${fill(0.4)} />
        <path d="M241 62 C241 42 255 32 270 32 C285 32 299 42 299 62 Z" ${fill(0.6)} />
        <path d="M270 32 V20" ${line(0.6, 1.3)} />
        <circle cx="270" cy="17" r="2.6" ${fill(0.6)} />
        <rect x="241" y="62" width="58" height="22" ${fill(0.42)} />
        <path d="M262 84 V74 A8 8 0 0 1 278 74 V84" ${line(0.75, 1.3)} />
        <rect x="316" y="38" width="8" height="46" ${fill(0.52)} />
        <rect x="312" y="48" width="16" height="3" ${fill(0.6)} />
        <path d="M314 38 H326 L320 24 Z" ${fill(0.65)} />
        <rect x="216" y="50" width="7" height="34" ${fill(0.4)} />
        <path d="M214 50 H225 L219.5 38 Z" ${fill(0.5)} />
        <path d="M150 84 V70 C150 60 172 60 172 70 V84 Z" ${fill(0.2)} />
        <path d="M0 80 H190" ${line(0.18, 1)} />
      `;
    case 'bengali':
      // River at dusk: nouka boat, palm trees, low sun and ripples.
      return `
        <circle cx="96" cy="40" r="16" ${fill(0.17)} />
        <path d="M0 52 Q60 44 130 52" ${line(0.14, 1)} />
        <path d="M205 67 Q216 77 242 77 L282 77 Q306 77 316 62 Q296 69 262 69 Q226 69 205 67 Z" ${fill(0.62)} />
        <path d="M236 67 C236 52 276 52 276 67 Z" ${fill(0.4)} />
        <path d="M292 66 V38" ${line(0.6, 1.4)} />
        <path d="M292 40 Q313 49 319 66 L292 66 Z" ${fill(0.3)} />
        <path d="M339 76 Q336 52 343 32" ${line(0.6, 2.2)} />
        <path d="M343 32 Q331 26 321 33 M343 32 Q337 21 326 20 M343 32 Q352 24 360 27 M343 32 Q353 33 360 42" ${line(0.6, 1.6)} />
        <path d="M24 78 Q22 62 27 48" ${line(0.45, 1.8)} />
        <path d="M27 48 Q19 44 12 49 M27 48 Q24 40 16 39 M27 48 Q34 42 41 44 M27 48 Q35 49 40 56" ${line(0.45, 1.4)} />
        <path d="${wave(74, 5)}" ${line(0.4, 1.1)} />
        <path d="${wave(80, 4)}" ${line(0.26, 1)} />
      `;
    case 'western': {
      // Library: arched Gothic windows, a row of books and a crescent moon.
      const arch = (x: number) =>
        `<path d="M${x - 10} 84 V48 A10 10 0 0 1 ${x + 10} 48 V84 Z" ${fill(0.14)} />` +
        `<path d="M${x - 10} 84 V48 A10 10 0 0 1 ${x + 10} 48 V84 M${x} 38 V84 M${x - 10} 62 H${x + 10}" ${line(0.55, 1.2)} />`;
      const books = [14, 22, 17, 26, 19, 24, 15, 21, 27, 18, 23, 16, 25, 20]
        .map((h, i) => `<rect x="${8 + i * 9}" y="${84 - h}" width="7" height="${h}" ${fill(i % 3 === 0 ? 0.34 : 0.22)} />`)
        .join('');
      return `
        <path d="M300 6 A11 11 0 1 0 308 24 A8.5 8.5 0 1 1 300 6 Z" ${fill(0.28)} />
        ${books}
        ${arch(228)}${arch(268)}${arch(308)}
        <path d="M0 83 H360" ${line(0.3, 1)} />
      `;
    }
    default:
      return null;
  }
}
