// Locked design tokens from the Figma Design System (v1) — update here only, never ad hoc.

export const LamplightColor = {
  // Brand core — fixed, never altered
  primaryDark: '#1C1B1E',
  flameAmber: '#F5A623',
  parchment: '#F5EDE1',

  // Derived neutrals — every neutral is warmed toward charcoal/parchment, never pure gray
  ink: '#2B2621', // primary text on parchment/day surfaces, ~13.6:1 on #F5EDE1
  umber: '#5C5346', // secondary body copy on light
  fawn: '#8A7F6E', // muted labels, timestamps, bylines, placeholder text
  straw: '#C6B896', // disclosure chevrons, decorative rules, inactive icon strokes on light
  hairline: '#E2D3B8', // borders, dividers, progress-bar track on day surfaces
  card: '#F8F1E6', // elevated surface one step lighter than page bg (day theme)
  ember: '#252228', // elevated dark surface — lamp icon, splash tile, popup fill (night theme)
  lampText: '#F0E6D6', // reading-body text on night theme, ~15:1 on #1C1B1E — dimmer than parchment on purpose

  // Highlight & semantic colors — sparing use only, inside the highlighter picker
  highlight: {
    amber: '#F5A623',
    sage: '#7FA37A',
    clay: '#C97E7E',
    dusk: '#8FA6C9',
  },

  // Language-pair pill (EN -> ES etc.)
  pairPillBackground: '#FBE6BB',
  pairPillText: '#8A5A16',

  // Exact literals from the shipped mobile-app mockup (Lamplight Mobile App.dc.html)
  // that don't map onto the tokens above — kept distinct rather than approximated.
  mutedOnDark: '#B7ADA0', // onboarding subtext, splash tagline, dimmed page-percent readout
  dotInactive: '#4A443C', // inactive onboarding pagination dots
  libraryBackground: '#EDE2D1', // Library/Vocabulary/Settings page bg — distinct from parchment
  segmentedTrack: '#E9DEC9', // segmented-control track (List/Flashcards, Day/Lamp, plans)
  textFaint: '#9C9186', // vocabulary context sentences, inactive tab-bar icons
  progressLabel: '#B4863A', // "34% · Chapter 3" style captions — amber-brown, not pairPillText
  quietOnLight: '#7A6F60', // Reader's "Chapter 1" chrome label — quieter than fawn
} as const;

// Dark ("Lamp") theme — the same token keys as the light theme with surface and
// text values flipped to charcoal/cream. Brand, accent, highlight, and pill
// colors are intentionally identical (amber stays amber). The always-dark
// tokens (primaryDark, ember, lampText) are unchanged so components already
// designed for a dark surface (popups, splash, paywall) keep working as-is.
export const LamplightColorDark = {
  ...LamplightColor,
  parchment: '#1C1B1E', // main page background -> charcoal
  libraryBackground: '#1B1A1D', // Library/Vocabulary/Settings page bg
  card: '#26232A', // elevated surface, one step lighter than the page
  ink: '#F0E6D6', // primary text -> cream
  umber: '#C7BDB0', // secondary body copy
  fawn: '#9C9186', // muted labels/timestamps
  straw: '#6B6255', // inactive icon strokes, tab-bar inactive tint
  hairline: '#332F2B', // borders, dividers, progress track
  segmentedTrack: '#2A2723', // segmented-control track
  quietOnLight: '#9C9186', // reader chrome label (day-mode chrome only)
  pairPillBackground: 'rgba(245, 166, 35, 0.16)',
  pairPillText: '#F5A623',
} as const;

// Widened color-token type so the same shape describes both light and dark
// palettes (their string literals differ, so the theme surface must accept any
// string for the flippable tokens while keeping the highlight sub-object typed).
export type LamplightColors = {
  [K in keyof typeof LamplightColor]: (typeof LamplightColor)[K] extends string
    ? string
    : (typeof LamplightColor)[K];
};

// ---------------------------------------------------------------------------
// Cultural Reading Theme Palettes
// ---------------------------------------------------------------------------

// Bengali — secular literary paper, river ink, and quiet editorial greens.
// Brand charcoal, amber, and parchment stay unchanged.
export const BengaliColor: LamplightColors = {
  ...LamplightColor,
  libraryBackground: '#E9E6DC',
  card: '#FAF7EF',
  ink: '#26333A',
  umber: '#4B5D60',
  fawn: '#778486',
  straw: '#B9BEB8',
  hairline: '#D5DDD8',
  segmentedTrack: '#E0E5E0',
  quietOnLight: '#667274',
};

export const BengaliColorDark: LamplightColors = {
  ...LamplightColorDark,
  libraryBackground: '#1A2225',
  card: '#253035',
  ink: '#EDF0EA',
  umber: '#B9C6C4',
  fawn: '#8D9B9C',
  straw: '#4E5C5E',
  hairline: '#303C3F',
  segmentedTrack: '#253135',
  quietOnLight: '#8D9B9C',
  pairPillBackground: 'rgba(126, 170, 162, 0.18)',
  pairPillText: '#8EBEB5',
};

export const CultureMaterial = {
  classic: {
    day: { rail: '#8A6D3B', highlight: '#C4A86C', joint: '#5C441E', accent: '#9C6208', wash: '#FAF0DE' },
    lamp: { rail: '#5A4420', highlight: '#8C6C38', joint: '#3A2A10', accent: '#F5A623', wash: '#2C2218' },
  },
  bengali: {
    day: { rail: '#AA925B', highlight: '#D7C58D', joint: '#715A32', accent: '#2F665E', wash: '#DFE8E1' },
    lamp: { rail: '#725F38', highlight: '#A9945C', joint: '#493A22', accent: '#7EAAA2', wash: '#243735' },
  },
  western: {
    day: { rail: '#7A593D', highlight: '#B58A62', joint: '#4D3626', accent: '#8A5A32', wash: '#EEE2D2' },
    lamp: { rail: '#4C3729', highlight: '#74533A', joint: '#2D211A', accent: '#C39467', wash: '#332820' },
  },
  korean: {
    day: { rail: '#A69E8D', highlight: '#D8D3C8', joint: '#676157', accent: '#42566A', wash: '#E5E8EA' },
    lamp: { rail: '#55534F', highlight: '#77746D', joint: '#353432', accent: '#91A6BA', wash: '#252A2F' },
  },
  japanese: {
    day: { rail: '#9A7655', highlight: '#C7A57F', joint: '#684B35', accent: '#C85A32', wash: '#EBE3D3' },
    lamp: { rail: '#5C4434', highlight: '#806048', joint: '#37291F', accent: '#E27D46', wash: '#221915' },
  },
  arabic: {
    day: { rail: '#A88436', highlight: '#D8BE73', joint: '#705718', accent: '#263E63', wash: '#E6E1D5' },
    lamp: { rail: '#765F2A', highlight: '#A98A44', joint: '#443714', accent: '#D7B96C', wash: '#172440' },
  },
} as const;

export function getCultureMaterial(theme: string, scheme: 'day' | 'lamp') {
  const key =
    theme === 'bengali' || theme === 'korean' || theme === 'japanese' || theme === 'arabic' || theme === 'western'
      ? theme
      : 'classic';
  return CultureMaterial[key][scheme];
}

// Korean — Clean minimal, Hanji paper, cool whites
export const KoreanColor: LamplightColors = {
  ...LamplightColor,
  parchment: '#F7F7F5', // Hanji paper
  libraryBackground: '#EFEFEA',
  card: '#FFFFFF', // cool white elevated surface
  ink: '#191A1C', // clean minimal sumi ink
  umber: '#484A50',
  fawn: '#787B82',
  straw: '#B8BAC0',
  hairline: '#E2E4E8',
  segmentedTrack: '#E8E9EC',
  quietOnLight: '#686B72',
};

export const KoreanColorDark: LamplightColors = {
  ...LamplightColorDark,
  parchment: '#141517', // cool obsidian
  libraryBackground: '#101113',
  card: '#1B1C1F',
  ink: '#ECEEF0', // cool white text
  umber: '#B0B4BC',
  fawn: '#787B82',
  straw: '#4C4F56',
  hairline: '#26282E',
  segmentedTrack: '#1F2024',
  pairPillBackground: 'rgba(145, 166, 186, 0.16)',
  pairPillText: '#AEC0D2',
};

// Arabic — Deep navy, warm gold, RTL-aware
export const ArabicColor: LamplightColors = {
  ...LamplightColor,
  parchment: '#F7F5ED', // warm desert parchment
  libraryBackground: '#ECE7DA',
  card: '#FFFFFF',
  ink: '#0D1B2A', // deep navy ink
  umber: '#2B3E52', // muted navy body
  fawn: '#64748B',
  straw: '#CBD5E1',
  hairline: '#E2DBCB',
  segmentedTrack: '#E7DFCF',
  flameAmber: '#D4AF37', // warm lustrous gold
  pairPillBackground: '#F6E6C2',
  pairPillText: '#8D6B18',
  progressLabel: '#B08823',
  quietOnLight: '#55657E',
};

export const ArabicColorDark: LamplightColors = {
  ...LamplightColorDark,
  parchment: '#0B132B', // signature deep night navy
  libraryBackground: '#080E21',
  card: '#14203D', // elevated rich navy card
  ink: '#F8FAFC', // luminous ivory text
  umber: '#CBD5E1', // warm silver-gold
  fawn: '#94A3B8',
  straw: '#475569',
  hairline: '#1E293B',
  segmentedTrack: '#162344',
  flameAmber: '#E5B869', // warm glowing Arabian gold
  lampText: '#F8FAFC',
  pairPillBackground: 'rgba(229, 184, 105, 0.20)',
  pairPillText: '#E5B869',
  progressLabel: '#E5B869',
};

// Japanese — Washi paper, muted earth tones, generous line-height
export const JapaneseColor: LamplightColors = {
  ...LamplightColor,
  parchment: '#F4EFE6', // fibrous unbleached washi paper
  libraryBackground: '#EBE3D3', // tatami & earthen wall wash
  card: '#FAF5EC', // elevated warm washi surface
  ink: '#24211D', // sumi soot ink
  umber: '#544D42', // cedar / roasted tea umber
  fawn: '#85796A', // weathered bamboo
  straw: '#BFAFA0',
  hairline: '#DDD1BC',
  segmentedTrack: '#E2D7C3',
  flameAmber: '#C85A32', // traditional Japanese persimmon / vermilion lacquer (shuiro)
  pairPillBackground: 'rgba(200, 90, 50, 0.14)',
  pairPillText: '#C85A32',
  progressLabel: '#C85A32',
  quietOnLight: '#73685C',
};

export const JapaneseColorDark: LamplightColors = {
  ...LamplightColorDark,
  parchment: '#181715', // charred cedar sumi
  libraryBackground: '#131210',
  card: '#22201D',
  ink: '#EDE5D6', // washi cream text
  umber: '#BEB4A3',
  fawn: '#8C8375',
  straw: '#585147',
  hairline: '#2E2B26',
  segmentedTrack: '#262420',
  flameAmber: '#E27D46', // warm glowing persimmon ember
  pairPillBackground: 'rgba(226, 125, 70, 0.18)',
  pairPillText: '#E27D46',
  progressLabel: '#E27D46',
};

// Western — Editorial cream, Lora serif
export const WesternColor: LamplightColors = {
  ...LamplightColor,
  parchment: '#FBF8F1', // smooth editorial book cream
  libraryBackground: '#F0ECE2',
  card: '#FFFFFF',
  ink: '#1F1E1B', // sharp bookpress black
  umber: '#4E4942',
  fawn: '#7C756B',
  straw: '#BEB5A7',
  hairline: '#E4DDD2',
  segmentedTrack: '#ECE5DA',
  flameAmber: '#C67D15', // vintage amber / book leather
  quietOnLight: '#6E665C',
};

export const WesternColorDark: LamplightColors = {
  ...LamplightColorDark,
  parchment: '#181716', // antique leatherbound dark
  libraryBackground: '#151413',
  card: '#22201E',
  ink: '#EFECE6', // soft ivory
  umber: '#BFB8AD',
  fawn: '#8E867B',
  straw: '#544E47',
  hairline: '#2F2C29',
  segmentedTrack: '#272422',
  flameAmber: '#D98F28',
  pairPillBackground: 'rgba(217, 143, 40, 0.16)',
  pairPillText: '#D98F28',
};

export function getCultureThemeColors(
  theme: string,
  scheme: 'day' | 'lamp',
): LamplightColors {
  switch (theme) {
    case 'korean':
      return scheme === 'lamp' ? KoreanColorDark : KoreanColor;
    case 'arabic':
      return scheme === 'lamp' ? ArabicColorDark : ArabicColor;
    case 'japanese':
      return scheme === 'lamp' ? JapaneseColorDark : JapaneseColor;
    case 'western':
      return scheme === 'lamp' ? WesternColorDark : WesternColor;
    case 'bengali':
      return scheme === 'lamp' ? BengaliColorDark : BengaliColor;
    case 'classic':
    default:
      return scheme === 'lamp' ? LamplightColorDark : LamplightColor;
  }
}

export type HighlightColorKey = keyof typeof LamplightColor.highlight;

// Spacing scale (px) — base unit 4px
export const Spacing = {
  xs: 4,
  sm: 8,
  xsm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

// Screen/card layout constants
export const Layout = {
  screenMargin: 24, // 22-28px range
  cardPadding: 16, // 14-18px range
  sectionGap: 22, // 20-26px range
  tabBarHeight: 66,
  buttonHeight: 52,
} as const;

// Corner radius & the fold motif
export const Radius = {
  pill: 100, // buttons, tags, tab pills
  card: 12, // panels, popups, sheets
  bookCoverSpine: 2, // flat spine edge
  bookCoverOuter: 8, // book cover outer corners (non-curl corners)
  circle: '50%', // swatches, avatars, lamp icon
} as const;

// Motion timing (ms) / easing notes — see components/motion for implementations
export const Motion = {
  flameFlickerMs: [2600, 3200] as const, // ease-in-out loop, multi-keyframe scale+skew+glow, never plain opacity
  lampGlowPulseMs: 4000, // ease-in-out, opacity 0.7 -> 1
  pageTurnMs: [350, 450] as const, // page-curl transition
  chromeFadeMs: [200, 250] as const, // reader top bar fade in/out
  chromeAutoHideMs: 2000, // auto-hide after last tap
  // No bounce/overshoot easing anywhere — calm, not playful.
} as const;

// Icon stroke spec
export const IconStroke = {
  widthPx: [1.6, 1.8] as const,
  colorOnLight: '#2B2621',
  colorOnDark: '#F0E6D6',
} as const;
