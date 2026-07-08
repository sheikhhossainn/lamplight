import { createContext, use, type PropsWithChildren } from 'react';

import { LamplightColor, Layout, Radius, Spacing } from './tokens';
import { LamplightTypography } from './typography';

const themeValue = {
  colors: LamplightColor,
  typography: LamplightTypography,
  spacing: Spacing,
  radius: Radius,
  layout: Layout,
} as const;

type LamplightTheme = typeof themeValue;

const ThemeContext = createContext<LamplightTheme | null>(null);

export function LamplightThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext value={themeValue}>{children}</ThemeContext>;
}

export function useTheme(): LamplightTheme {
  const theme = use(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called within a LamplightThemeProvider');
  }
  return theme;
}
