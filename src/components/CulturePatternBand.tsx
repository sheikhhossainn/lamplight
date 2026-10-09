import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

const BAND_HEIGHT = 10;

type Tile = { width: number; shapes: ReactNode };

function getTile(theme: LiteraryThemeCode, color: string): Tile | null {
  const line = { stroke: color, strokeWidth: 0.9, strokeLinecap: 'round', fill: 'none' } as const;
  switch (theme) {
    case 'bengali':
      // Kantha running stitch + alpona diamond.
      return {
        width: 24,
        shapes: (
          <>
            <Path d="M0 5 H3.5 M20.5 5 H24" {...line} />
            <Path d="M12 1.5 L17.5 5 L12 8.5 L6.5 5 Z" {...line} />
            <Path d="M12 3.8 L14 5 L12 6.2 L10 5 Z" fill={color} />
          </>
        ),
      };
    case 'japanese':
      // Seigaiha: layered wave scales.
      return {
        width: 20,
        shapes: (
          <>
            {[9, 6, 3].map((r) => (
              <Path key={r} d={`M${10 - r} 10 A${r} ${r} 0 0 1 ${10 + r} 10`} {...line} />
            ))}
          </>
        ),
      };
    case 'korean':
      // Hanji window lattice.
      return {
        width: 20,
        shapes: (
          <>
            <Path d="M0 5 H20 M10 0 V10" {...line} />
            <Rect x="7" y="2" width="6" height="6" {...line} />
          </>
        ),
      };
    case 'arabic':
      // Eight-pointed star of a mashrabiya screen.
      return {
        width: 16,
        shapes: (
          <>
            <Path d="M0 5 H3.2 M12.8 5 H16" {...line} />
            <Rect x="4.6" y="1.6" width="6.8" height="6.8" {...line} />
            <Path d="M8 0.2 L12.8 5 L8 9.8 L3.2 5 Z" {...line} />
          </>
        ),
      };
    case 'western':
      // Ornamental rule with a lozenge.
      return {
        width: 24,
        shapes: (
          <>
            <Path d="M0 5 H8.5 M15.5 5 H24" {...line} />
            <Path d="M12 2 L15 5 L12 8 L9 5 Z" {...line} />
          </>
        ),
      };
    default:
      return null;
  }
}

/** Decorative edge band: a repeating pattern drawn from the culture's own craft. Renders nothing for classic. */
export function CulturePatternBand({
  theme,
  color,
  opacity = 0.5,
  style,
}: {
  theme: LiteraryThemeCode;
  color: string;
  opacity?: number;
  style?: ViewStyle;
}) {
  const id = `band${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const tile = getTile(theme, color);
  if (!tile) return null;

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={[styles.band, { opacity }, style]}
    >
      <Svg width="100%" height={BAND_HEIGHT}>
        <Defs>
          <Pattern id={id} x="0" y="0" width={tile.width} height={BAND_HEIGHT} patternUnits="userSpaceOnUse">
            {tile.shapes}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height={BAND_HEIGHT} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAND_HEIGHT,
  },
});
