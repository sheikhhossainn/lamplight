# Design System

Lamplight is styled as an **1890s candlelit literary sanctuary**. It favors warm parchment, natural paper textures, muted ink, and glowing amber lantern accents over cold digital minimalism.

---

## 1. Source of Truth (in order)

1. `src/theme/tokens.ts` — Semantic color palettes, spacing scales, border radii, and motion bezier curves.
2. `src/theme/typography.ts` — Multilingual font families, optical sizes, reading body floors, and typography styles.
3. `src/theme/ThemeProvider.tsx` — `useTheme()`, providing reactive access to `colors`, `typography`, `cultureTheme`, and `scheme` (`day` / `lamp`).
4. `AGENTS.md` — Behavioral and engineering constraints.

> [!IMPORTANT]
> **Token Discipline**: Never hardcode hex values, pixel sizes, or fonts that already exist in the token files. Always access theme properties through `const { colors, typography, spacing, radius } = useTheme();`.

---

## 2. Locked Constants (Never Alter)

These core brand constants must remain unchanged across the entire app:

| Constant | Value | Description |
|---|---|---|
| **Primary Dark** | `#1C1B1E` | Obsidian lamp black. Used for Lamp backgrounds, dark cards, and deep accents. Never use pure `#000000`. |
| **Flame Amber** | `#F5A623` | Warm radiant lantern amber. The primary active indicator, highlight accent, and spark. |
| **Parchment** | `#F5EDE1` | Natural tactile paper base for Day mode, cards, and light surfaces. |
| **Reading Floor** | `Lora, >= 17px, line-height >= 1.85` | Reading body minimum floor. **Never shrink this ratio**. |

---

## 3. Cultural Literary Themes (`getCultureThemeColors`)

Lamplight decouples visual aesthetic atmosphere (`cultureTheme`) from language. The palette transforms dynamically across five literary cultures:

| Literary Theme | Atmosphere & Textures | Day Paper Base | Lamp Atmosphere | Accents & Shelves |
|---|---|---|---|---|
| **`korean`** | **Hanji Paper**: Clean minimal, cool whites, serene ink | `#F7F3EC` | `#17181C` | Ash wood, subtle celadon, ash borders |
| **`japanese`** | **Washi Paper**: Earth tones, muted sumi ink, generous margins | `#F5EFE6` | `#1A1918` | Hinoki cedar, soft matcha, bamboo slate |
| **`bengali`** | **Bengal Ink & River**: Secular literary paper, monsoon river ink | `#F4EFE6` | `#1C1B1E` | Bamboo, earthy clay, river teal |
| **`arabic`** | **Navy & Gold**: Deep night sky, illuminated manuscript gold, RTL | `#F0ECE1` | `#131826` | Warm brass, lapis navy, gilded amber |
| **`western`** | **Editorial Cream**: 19th-century letterpress, Lora serif, quiet margins | `#F6EFE3` | `#1C1B1E` | Polished walnut, deep umber, fawn |

---

## 4. Reading Modes (Day & Lamp)

Every cultural theme supports two coordinated lighting states via `ThemeSegmentedSwitch`:

- **Day Mode (`scheme: 'day'`)**:
  - Warm parchment surfaces (`colors.parchment`, `colors.card`).
  - Dark ink typography (`colors.ink`).
  - Subtle hairlines (`rgba(0,0,0,0.06)`).
- **Lamp Mode (`scheme: 'lamp'`)**:
  - Candlelit night library (`colors.parchment` maps to deep charcoal/obsidian).
  - Soft glowing text (`colors.lampText`, `colors.fawn`).
  - Radiant amber accents (`colors.flameAmber`).
- **Transition Mechanics**:
  - Settings and surfaces use coordinated bezier transitions (`withTiming(target, { duration: 200, easing: Easing.bezier(0.25, 1, 0.5, 1) })`).
  - Avoid jarring pops: shared values interpolate color and rotation across Day/Lamp icons in unison.

---

## 5. Multilingual Typography

Font pairings are tuned to maintain visual weight across distinct writing systems:

| Language / Script | Primary Fonts | Key Rules |
|---|---|---|
| **English / Latin** | `Lora-Regular`, `Lora-Bold`, `Lora-Italic` (reading); System/Inter (UI) | Never drop below 17px or 1.85 line-height for body prose. |
| **Bengali** | `Galada`, `AnekBangla`, `HindSiliguri` | Optical sizing: Bengali glyphs render slightly larger to balance visual weight with Latin text. |
| **Japanese** | `NotoSerifJP`, Hiragino Mincho | Requires an extra `+2.5px` line-height buffer for legible kanji/furigana layout. |
| **Korean** | `NotoSerifKR`, Nanum Myeongjo | High legibility hangul glyphs with clean, spacious margins. |
| **Arabic** | `Amiri-Regular`, `Amiri-Bold` | Strict RTL awareness, generous vertical line spacing for tashkeel diacritics. |

---

## 6. Component Design Patterns

### Tactile Cloth Book Spines
For books without historical photo covers, the app renders a physical cloth-bound spine with an authentic book-curl shadow and gilded title typography using deterministic spine colors:
- **Charcoal**: `#1C1B1E`
- **Deep Olive**: `#5C5346`
- **Warm Clay**: `#8A7F6E`
- **Sand Cloth**: `#C6B896`
- **Night Plum**: `#252228`
- **Terracotta**: `#C05C1F`

### Culture Edition Banners & Monograms
The banner at the top of the homescreen and library showcases the cultural motif and monogram:
- Dynamically decouples visual palette from language via `getModularThemePresentation(theme, motherTongue, targetReadingLanguage)`.
- Monograms adapt to the user's native script (`'অ'` for Bengali, `'Aa'` for English, `'책'` for Korean, `'本'` for Japanese, `'ض'` for Arabic).

### Layout Clearance
- Bottom Tab Bar Clearance: Always add `Layout.tabBarHeight + Spacing.xl` to the bottom padding of scroll views so bottom rows are never obscured.
- Touch Targets: Interactive pills and icons must always provide `hitSlop={8}` or `hitSlop={12}` for effortless one-handed thumb interaction.
