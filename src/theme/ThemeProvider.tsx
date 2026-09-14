import { createContext, use, useMemo, type PropsWithChildren } from 'react';

import { useReadingTheme } from '@/features/settings/readingTheme';
import { usePageStyle } from '@/features/settings/pageStylePrefs';
import { getPageStyleConfig } from '@/features/reader/pageStyles';
import {
  LamplightColor,
  LamplightColorDark,
  Layout,
  Radius,
  Spacing,
  type LamplightColors,
} from './tokens';
import { LamplightTypography } from './typography';

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
};

const ThemeContext = createContext<LamplightTheme | null>(null);

export function LamplightThemeProvider({ children }: PropsWithChildren) {
  // The reading-theme store is the single source of truth for light vs. dark.
  // Swapping the color tokens here cascades to every screen automatically,
  // since they all read colors through useTheme() rather than importing tokens.
  const scheme = useReadingTheme();
  const pageStyleId = usePageStyle();

  const value = useMemo<LamplightTheme>(() => {
    const styleConfig = getPageStyleConfig(pageStyleId);
    return {
      colors: scheme === 'lamp' ? LamplightColorDark : LamplightColor,
      typography: {
        ...LamplightTypography,
        readingBody: {
          ...LamplightTypography.readingBody,
          fontFamily: styleConfig.englishFont,
          fontSize: styleConfig.fontSize,
          lineHeight: styleConfig.lineHeight,
          letterSpacing: styleConfig.letterSpacing,
        },
        banglaReadingBody: {
          ...LamplightTypography.banglaReadingBody,
          fontFamily: styleConfig.banglaFont,
          fontSize: styleConfig.banglaFontSize,
          lineHeight: styleConfig.banglaLineHeight,
          letterSpacing: styleConfig.banglaLetterSpacing,
        },
      },
      spacing: Spacing,
      radius: Radius,
      layout: Layout,
      scheme,
    };
  }, [scheme, pageStyleId]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): LamplightTheme {
  const theme = use(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called within a LamplightThemeProvider');
  }
  return theme;
}
