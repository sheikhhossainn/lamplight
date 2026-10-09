import Svg, { Path, Rect } from 'react-native-svg';

import { LamplightClassicThemeIcon } from '@/components/icons';
import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

type CultureLampIconProps = {
  theme: LiteraryThemeCode;
  color: string;
  flameColor?: string;
  size?: number;
};

/**
 * The lamp is Lamplight's mark; each culture has its own: diya (Bengali), andon (Japanese),
 * cheongsachorong (Korean), fanous (Arabic), candlestick (Western).
 */
export function CultureLampIcon({ theme, color, flameColor, size = 24 }: CultureLampIconProps) {
  const flame = flameColor ?? color;
  const stroke = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

  if (theme === 'bengali') {
    // Diya: clay bowl with a pinched spout, wick flame above.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 13.5 C3 18 7 20 12 20 C17 20 21 18 21 13.5 Z" {...stroke} />
        <Path d="M21 13.5 C22.4 13.2 23 12.2 23 11.2" {...stroke} />
        <Path d="M9 22.5 H15" {...stroke} />
        <Path d="M12 12.5 C9.6 10.2 10 7 12 3 C14 7 14.4 10.2 12 12.5 Z" fill={flame} />
      </Svg>
    );
  }
  if (theme === 'japanese') {
    // Andon: paper lantern in a wooden frame.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 3.5 H19 M5 20.5 H19" {...stroke} />
        <Rect x="6.5" y="3.5" width="11" height="17" {...stroke} />
        <Path d="M6.5 9 H17.5 M6.5 15 H17.5" {...stroke} strokeWidth={1} />
        <Path d="M12 17.8 C10.2 16.2 10.4 14 12 11.2 C13.6 14 13.8 16.2 12 17.8 Z" fill={flame} />
      </Svg>
    );
  }
  if (theme === 'korean') {
    // Cheongsachorong: hanging hexagonal silk lantern with tassel.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 1 V3.5" {...stroke} />
        <Path d="M8.5 3.5 H15.5 L19 9.5 V14 L15.5 19 H8.5 L5 14 V9.5 Z" {...stroke} />
        <Path d="M12 19 V23 M10.2 23 H13.8" {...stroke} />
        <Path d="M12 15.6 C10.2 14 10.4 12 12 9 C13.6 12 13.8 14 12 15.6 Z" fill={flame} />
      </Svg>
    );
  }
  if (theme === 'arabic') {
    // Fanous: domed lantern with a ring and a flared base.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M10 1.8 H14 M12 1.8 V4" {...stroke} />
        <Path d="M7 9 C7 6 9.2 4 12 4 C14.8 4 17 6 17 9" {...stroke} />
        <Path d="M7 9 H17 L16 18 H8 Z" {...stroke} />
        <Path d="M8.6 18 L9.6 21.5 H14.4 L15.4 18" {...stroke} />
        <Path d="M12 16 C10.2 14.4 10.4 12.2 12 9.8 C13.6 12.2 13.8 14.4 12 16 Z" fill={flame} />
      </Svg>
    );
  }
  if (theme === 'western') {
    // Candle in a holder.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M9.5 9.5 H14.5 V18 H9.5 Z" {...stroke} />
        <Path d="M6 21 H18 M7 18 H17 L16 21 H8 Z" {...stroke} />
        <Path d="M12 8 C10.2 6.4 10.4 4.2 12 1.8 C13.6 4.2 13.8 6.4 12 8 Z" fill={flame} />
      </Svg>
    );
  }
  return <LamplightClassicThemeIcon color={color} flameColor={flame} size={size} />;
}
