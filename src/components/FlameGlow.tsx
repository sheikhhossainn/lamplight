import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LamplightColor, Motion } from '@/theme/tokens';

type FlameGlowProps = {
  size?: number;
  // 'flicker' = splash/attract-loop. 'glowPulse' = the Reader's floating lamp
  // icon. 'static' = no animation. Only the glow layer's opacity ever animates
  // — the flame mark itself is rendered once, fully opaque, and never moves,
  // scales, or fades, so the brand mark always stays crisp.
  variant?: 'flicker' | 'glowPulse' | 'static';
  // The mark's own rounded-square tile background — on by default to match the
  // brand lockup, turned off when nesting inside a button that already has one.
  showTile?: boolean;
};

export function FlameGlow({ size = 96, variant = 'flicker', showTile = true }: FlameGlowProps) {
  const glow = useSharedValue(0.5);

  useEffect(() => {
    if (variant === 'static') {
      glow.value = 0.5;
      return;
    }
    if (variant === 'flicker') {
      // Gentle, uneven glow-intensity wander behind the mark — never near 0,
      // so nothing ever appears to vanish. This is the whole "flicker."
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.55, { duration: 850, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      glow.value = withRepeat(
        withTiming(1, { duration: Motion.lampGlowPulseMs, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [variant, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={{ width: size, height: size }}>
      {/* Static mark: tile + flame + fold bars — fully opaque, never animated */}
      <Svg width={size} height={size} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
        {showTile ? (
          <Path
            d="M74.88 0H21.12C9.45575 0 0 9.45575 0 21.12V74.88C0 86.5443 9.45575 96 21.12 96H74.88C86.5443 96 96 86.5443 96 74.88V21.12C96 9.45575 86.5443 0 74.88 0Z"
            fill={LamplightColor.primaryDark}
          />
        ) : null}
        <Path
          d="M48 22.08C37.44 37.44 33.6 48 40.32 58.56C40.32 51.84 44.16 47.04 48 44.16C51.84 47.04 55.68 51.84 55.68 58.56C62.4 48 58.56 37.44 48 22.08Z"
          fill={LamplightColor.flameAmber}
        />
        <Path
          d="M60 67.2H36C35.2047 67.2 34.56 67.8447 34.56 68.64C34.56 69.4352 35.2047 70.08 36 70.08H60C60.7953 70.08 61.44 69.4352 61.44 68.64C61.44 67.8447 60.7953 67.2 60 67.2Z"
          fill={LamplightColor.parchment}
        />
        <Path
          d="M55.2 73.92H40.8C40.0047 73.92 39.36 74.5648 39.36 75.36C39.36 76.1553 40.0047 76.8 40.8 76.8H55.2C55.9953 76.8 56.64 76.1553 56.64 75.36C56.64 74.5648 55.9953 73.92 55.2 73.92Z"
          fill={LamplightColor.parchment}
          opacity={0.5}
        />
      </Svg>

      {/* Animated glow: a soft amber halo behind the flame, opacity-only */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Defs>
            <RadialGradient id="flameGlow" cx="48" cy="46" r="28" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={LamplightColor.flameAmber} stopOpacity={0.45} />
              <Stop offset="100%" stopColor={LamplightColor.flameAmber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={96} height={96} fill="url(#flameGlow)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
