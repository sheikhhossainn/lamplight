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
  kalamRegular: 'Kalam_400Regular',
  kalamBold: 'Kalam_700Bold',
  atmaRegular: 'Atma_400Regular',
  atmaMedium: 'Atma_500Medium',
  atmaSemiBold: 'Atma_600SemiBold',
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
    fontFamily: FontFamily.kalamRegular,
    fontSize: 18,
    lineHeight: 34, // 18 * 1.88 — spacious manuscript line-height for clean legibility
    letterSpacing: 0.2,
  },
  // Scripture readers intentionally do not inherit prose-reader font or page
  // style preferences. These preserve their established verse treatment even
  // when the book reader evolves.
  scriptureVerse: {
    fontFamily: FontFamily.loraRegular,
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 0,
  },
  banglaReadingBody: {
    fontFamily: FontFamily.atmaMedium,
    fontSize: 18.5,
    lineHeight: 35,
    letterSpacing: 0.2,
  },
  banglaScreenTitle: {
    fontFamily: FontFamily.atmaSemiBold,
    fontSize: 27,
    lineHeight: 38,
    letterSpacing: 0,
  },
  banglaBookCoverTitle: {
    fontFamily: FontFamily.atmaSemiBold,
    fontSize: 22,
    lineHeight: 31,
    letterSpacing: 0,
  },
  banglaBookSpineTitle: {
    fontFamily: FontFamily.atmaSemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  banglaUiRowTitle: {
    fontFamily: FontFamily.atmaMedium,
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0,
    includeFontPadding: false,
  },
  banglaButtonLabel: {
    fontFamily: FontFamily.atmaSemiBold,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0,
    includeFontPadding: false,
  },
  banglaMetadataCaption: {
    fontFamily: FontFamily.atmaRegular,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0,
    includeFontPadding: false,
  },
  banglaEyebrowLabel: {
    fontFamily: FontFamily.atmaSemiBold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    includeFontPadding: false,
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
    lineHeight: 14,
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
  scriptureArabicVerse: {
    fontFamily: FontFamily.amiriRegular,
    fontSize: 24,
    lineHeight: 46,
    letterSpacing: 0,
    writingDirection: 'rtl',
  },
  cjkReadingBody: {
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 0,
  },
  cjkBookCoverTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  cjkBookSpineTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
} as const satisfies Record<string, TextStyle>;

export type LamplightTypographyKey = keyof typeof LamplightTypography;

export type NativeUiRole = 'display' | 'row' | 'metadata' | 'eyebrow';

export function getNativeUiTextStyle(language: string, role: NativeUiRole = 'row'): TextStyle {
  if (language === 'bn') {
    if (role === 'display') return LamplightTypography.banglaScreenTitle;
    if (role === 'metadata') return LamplightTypography.banglaMetadataCaption;
    if (role === 'eyebrow') return LamplightTypography.banglaEyebrowLabel;
    return LamplightTypography.banglaUiRowTitle;
  }

  if (language === 'ar') {
    return {
      fontFamily: role === 'display' || role === 'eyebrow' ? FontFamily.amiriBold : FontFamily.amiriRegular,
      fontSize: role === 'display' ? 27 : role === 'metadata' ? 16 : role === 'eyebrow' ? 14 : 19,
      lineHeight: role === 'display' ? 42 : role === 'metadata' ? 27 : role === 'eyebrow' ? 22 : 31,
      letterSpacing: 0,
      writingDirection: 'rtl',
    };
  }

  if (language === 'ja' || language === 'ko') {
    return {
      fontSize: role === 'display' ? 23 : role === 'metadata' ? 14 : role === 'eyebrow' ? 12 : 17,
      lineHeight: role === 'display' ? 34 : role === 'metadata' ? 23 : role === 'eyebrow' ? 16 : 27,
      fontWeight: role === 'display' || role === 'eyebrow' ? '700' : role === 'row' ? '600' : '400',
      letterSpacing: role === 'eyebrow' ? 0.5 : 0,
    };
  }

  if (role === 'display') return LamplightTypography.screenTitle;
  if (role === 'metadata') return LamplightTypography.metadataCaption;
  if (role === 'eyebrow') return LamplightTypography.eyebrowLabel;
  return LamplightTypography.uiRowTitle;
}

export type ReadingPageStyle =
  | 'classic'
  | 'modern'
  | 'manuscript'
  | 'editorial'
  | 'oxford'
  | 'vellum'
  | 'nocturne'
  | 'zen';

export function getReadingTextStyle(language?: string, pageStyle?: ReadingPageStyle | string): TextStyle {
  const style = pageStyle ?? 'manuscript';
  if (language === 'bn') {
    if (style === 'classic') {
      return {
        fontFamily: FontFamily.loraRegular,
        fontSize: 18,
        lineHeight: 34,
        letterSpacing: 0,
      };
    }
    if (style === 'modern' || style === 'nocturne') {
      return {
        fontFamily: FontFamily.manropeRegular,
        fontSize: 17.5,
        lineHeight: 33,
        letterSpacing: 0.1,
      };
    }
    if (style === 'editorial') {
      return {
        fontFamily: FontFamily.atmaRegular,
        fontSize: 18,
        lineHeight: 35,
        letterSpacing: 0.25,
      };
    }
    if (style === 'oxford') {
      return {
        fontFamily: FontFamily.loraSemiBold,
        fontSize: 18.5,
        lineHeight: 36,
        letterSpacing: 0.15,
      };
    }
    if (style === 'vellum') {
      return {
        fontFamily: FontFamily.atmaMedium,
        fontSize: 19,
        lineHeight: 37,
        letterSpacing: 0.3,
      };
    }
    if (style === 'zen') {
      return {
        fontFamily: FontFamily.atmaRegular,
        fontSize: 19.5,
        lineHeight: 39,
        letterSpacing: 0.45,
      };
    }
    return LamplightTypography.banglaReadingBody;
  }
  if (language === 'ja' || language === 'ko') {
    return LamplightTypography.cjkReadingBody;
  }
  if (style === 'classic') {
    return {
      fontFamily: FontFamily.loraRegular,
      fontSize: 17.5,
      lineHeight: 33,
      letterSpacing: 0,
    };
  }
  if (style === 'modern') {
    return {
      fontFamily: FontFamily.manropeRegular,
      fontSize: 17,
      lineHeight: 32,
      letterSpacing: 0.15,
    };
  }
  if (style === 'editorial') {
    return {
      fontFamily: FontFamily.loraRegular,
      fontSize: 17.5,
      lineHeight: 35,
      letterSpacing: 0.3,
    };
  }
  if (style === 'oxford') {
    return {
      fontFamily: FontFamily.loraSemiBold,
      fontSize: 18,
      lineHeight: 36,
      letterSpacing: 0.2,
    };
  }
  if (style === 'vellum') {
    return {
      fontFamily: FontFamily.loraItalicMedium,
      fontSize: 18.5,
      lineHeight: 36,
      letterSpacing: 0.35,
    };
  }
  if (style === 'nocturne') {
    return {
      fontFamily: FontFamily.manropeRegular,
      fontSize: 17.5,
      lineHeight: 34,
      letterSpacing: 0.4,
    };
  }
  if (style === 'zen') {
    return {
      fontFamily: FontFamily.loraRegular,
      fontSize: 19,
      lineHeight: 38,
      letterSpacing: 0.5,
    };
  }
  return LamplightTypography.readingBody;
}

// Bengali script detection (\u0980-\u09FF)
export function isBengaliText(str?: string | null): boolean {
  if (!str) return false;
  return /[\u0980-\u09FF]/.test(str);
}

// Japanese script detection (Kana & Kanji)
export function isJapaneseText(str?: string | null): boolean {
  if (!str) return false;
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
}

// Korean Hangul script detection
export function isKoreanText(str?: string | null): boolean {
  if (!str) return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(str);
}

// Converts Latin numbers (0-9) to Bengali digits (০-৯)
export function toBengaliNumerals(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)] ?? digit);
}
