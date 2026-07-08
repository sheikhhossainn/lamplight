import { StyleSheet } from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';

import { LamplightColor } from '@/theme/tokens';

type LampGlowOverlayProps = {
  width: number;
  height: number;
  warmth: number; // 0..1
};

// The full Lamp-mode background: a dark radial base plus a warm amber glow
// layered on top, centered slightly above middle. Opacity of the glow tracks
// the warmth control rather than being a fixed decorative wash.
export function LampGlowOverlay({ width, height, warmth }: LampGlowOverlayProps) {
  const glowOpacity = 0.06 + warmth * 0.08;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="lampBase" cx="50%" cy="50%" r="75%">
          <Stop offset="0%" stopColor="#232025" />
          <Stop offset="55%" stopColor={LamplightColor.primaryDark} />
          <Stop offset="100%" stopColor="#141316" />
        </RadialGradient>
        <RadialGradient id="lampGlow" cx="50%" cy="40%" r="55%">
          <Stop offset="0%" stopColor={LamplightColor.flameAmber} stopOpacity={glowOpacity} />
          <Stop offset="60%" stopColor={LamplightColor.flameAmber} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#lampBase)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#lampGlow)" />
    </Svg>
  );
}
