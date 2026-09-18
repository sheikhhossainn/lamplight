import { createContext, use, useMemo, type PropsWithChildren } from 'react';

import { useReadingTheme } from '@/features/settings/readingTheme';
import { usePageStyle } from '@/features/settings/pageStylePrefs';
import {
  isRtlLiteraryTheme,
  useLiteraryTheme,
  type LiteraryThemeCode,
} from '@/features/settings/literaryTheme';
import { getPageStyleConfig } from '@/features/reader/pageStyles';
import {
  getCultureThemeColors,
  Layout,
  Radius,
  Spacing,
  type LamplightColors,
} from './tokens';
import { FontFamily, LamplightTypography } from './typography';

type LamplightTheme = {
  colors: LamplightColors;
  typography: {
    [K in keyof typeof LamplightTypography]: K extends 'readingBody' | 'banglaReadingBody'
      ? {
          fontFamily: string;
          fontSize: number;
          lineHeight: number;
          letterSpacing: number;
        }
      : (typeof LamplightTypography)[K];
  };
  spacing: typeof Spacing;
  radius: typeof Radius;
  layout: typeof Layout;
  scheme: 'day' | 'lamp';
  cultureTheme: LiteraryThemeCode;
  isRTL: boolean;
};

const ThemeContext = createContext<LamplightTheme | null>(null);

export function LamplightThemeProvider({ children }: PropsWithChildren) {
  // The reading-theme store is the single source of truth for light vs. dark.
  // Swapping the color tokens here cascades to every screen automatically,
  // since they all read colors through useTheme() rather than importing tokens.
  const scheme = useReadingTheme();
  const pageStyleId = usePageStyle();
  const cultureTheme = useLiteraryTheme();

  const value = useMemo<LamplightTheme>(() => {
    const styleConfig = getPageStyleConfig(pageStyleId);
    const colors = getCultureThemeColors(cultureTheme, scheme);
    const isRTL = isRtlLiteraryTheme(cultureTheme);

    // Japanese culture theme provides generous line-height (+2.5px);
    // Western culture theme prioritizes editorial Lora serif.
    const isJapaneseTheme = cultureTheme === 'japanese';
    const isWesternTheme = cultureTheme === 'western';

    const readingFont = isWesternTheme
      ? (styleConfig.id === 'modern' ? styleConfig.englishFont : FontFamily.loraRegular)
      : styleConfig.englishFont;

    const readingLineHeight = isJapaneseTheme
      ? styleConfig.lineHeight + 2.5
      : styleConfig.lineHeight;

    return {
      colors,
      typography: {
        ...LamplightTypography,
        readingBody: {
          ...LamplightTypography.readingBody,
          fontFamily: readingFont,
          fontSize: styleConfig.fontSize,
          lineHeight: readingLineHeight,
          letterSpacing: styleConfig.letterSpacing,
        },
        banglaReadingBody: {
          ...LamplightTypography.banglaReadingBody,
          fontFamily: styleConfig.banglaFont,
          fontSize: styleConfig.banglaFontSize,
          lineHeight: isJapaneseTheme ? styleConfig.banglaLineHeight + 2.5 : styleConfig.banglaLineHeight,
          letterSpacing: styleConfig.banglaLetterSpacing,
        },
      },
      spacing: Spacing,
      radius: Radius,
      layout: Layout,
      scheme,
      cultureTheme,
      isRTL,
    };
  }, [scheme, pageStyleId, cultureTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): LamplightTheme {
  const theme = use(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called within a LamplightThemeProvider');
  }
  return theme;
}
