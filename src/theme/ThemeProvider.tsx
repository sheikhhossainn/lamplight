import { createContext, use, useMemo, type PropsWithChildren } from 'react';

import { useReadingTheme } from '@/features/settings/readingTheme';
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
  typography: typeof LamplightTypography;
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

  const value = useMemo<LamplightTheme>(
    () => ({
      colors: scheme === 'lamp' ? LamplightColorDark : LamplightColor,
      typography: LamplightTypography,
      spacing: Spacing,
      radius: Radius,
      layout: Layout,
      scheme,
    }),
    [scheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): LamplightTheme {
  const theme = use(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called within a LamplightThemeProvider');
  }
  return theme;
}
