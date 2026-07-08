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
