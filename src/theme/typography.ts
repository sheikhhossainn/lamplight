import type { TextStyle } from 'react-native';

// Font family names as registered by useFonts() in app/_layout.tsx.
// Lora is reserved for anything that IS the book (reading text, titles, quotes) plus
// literary-voice headlines. Manrope is reserved for app chrome. Never mix the two roles.
export const FontFamily = {
  loraRegular: 'Lora_400Regular',
  loraItalicMedium: 'Lora_500Medium_Italic',
  loraSemiBold: 'Lora_600SemiBold',
  loraSemiBoldItalic: 'Lora_600SemiBold_Italic',
  manropeRegular: 'Manrope_400Regular',
  manropeSemiBold: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
  amiriRegular: 'Amiri_400Regular',
  amiriBold: 'Amiri_700Bold',
} as const;

// Named styles — screens must consume these, never inline TextStyle with raw fontFamily.
// Reading body's 1.85 line-height is the single most important number in the system —
// it's what makes pages feel like a book, not a UI list. Never shrink it.
export const LamplightTypography = {
  wordmark: {
    fontFamily: FontFamily.loraItalicMedium,
    fontSize: 34,
    lineHeight: 46, // generous clearance — italic descenders (the "g" in Lamplight) clip at a tight line-height
    letterSpacing: 0.3,
  },
  onboardingHeadline: {
    fontFamily: FontFamily.loraItalicMedium,
    fontSize: 27,
    lineHeight: 36,
    letterSpacing: 0,
  },
  screenTitle: {
    fontFamily: FontFamily.loraItalicMedium,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: 0,
  },
  bookCoverTitle: {
    fontFamily: FontFamily.loraSemiBoldItalic,
    fontSize: 20,
    lineHeight: 23,
    letterSpacing: 0,
  },
  bookSpineTitle: {
    fontFamily: FontFamily.loraSemiBoldItalic,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0,
  },
  readingBody: {
    fontFamily: FontFamily.loraRegular,
    fontSize: 17,
    lineHeight: 31, // 17 * 1.85 — never go below 17px or shrink this ratio
    letterSpacing: 0,
  },
  quoteShareCard: {
    fontFamily: FontFamily.loraItalicMedium,
    fontSize: 22,
    lineHeight: 34,
    letterSpacing: 0,
  },
  translatedWordPopup: {
    fontFamily: FontFamily.loraSemiBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
    // always set in Amber (colors.flameAmber), always paired with the Manrope-set original word above it
  },
  translatedWordInline: {
    fontFamily: FontFamily.loraSemiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0,
  },
  titleUiContext: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  uiRowTitle: {
    fontFamily: FontFamily.manropeSemiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  buttonLabel: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 15,
    lineHeight: 20, // must exceed fontSize — a line-height equal to it clips glyph descenders on Android
    letterSpacing: 0,
  },
  metadataCaption: {
    fontFamily: FontFamily.manropeRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  poeticTagline: {
    fontFamily: FontFamily.loraItalicMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  eyebrowLabel: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  arabicVerse: {
    fontFamily: FontFamily.amiriRegular,
    fontSize: 24,
    lineHeight: 46, // generous clearance for stacked diacritics (tashkeel)
    letterSpacing: 0,
    writingDirection: 'rtl',
  },
} as const satisfies Record<string, TextStyle>;

export type LamplightTypographyKey = keyof typeof LamplightTypography;
