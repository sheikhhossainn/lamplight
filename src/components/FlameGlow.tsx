import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LamplightColor } from '@/theme/tokens';

type FlameGlowProps = {
  size?: number;
  // 'flicker' = splash/attract-loop: the flame itself subtly squashes/stretches
  // and skews, pivoted near its own base, like a real flame — never a plain
  // opacity pulse. 'glowPulse' = the Reader's floating lamp icon: flame stays
  // still, only the glow behind it breathes. 'static' = no animation.
  variant?: 'flicker' | 'glowPulse' | 'static';
  // The mark's own rounded-square tile background — on by default to match the
  // brand lockup, turned off when nesting inside a button that already has one.
  showTile?: boolean;
};

// Flame path's own bounding box within the 0-96 icon coordinate space —
// used both to crop the isolated animated layer and as the pivot reference
// for transformOrigin, so the flicker rotates/scales around the flame's own
// base rather than the icon's center (which would look like the whole mark
// wobbling instead of a flame flickering).
const FLAME_BBOX = { x: 33.6, y: 22.08, width: 28.8, height: 36.48 };
const FLAME_PATH_D =
  'M48 22.08C37.44 37.44 33.6 48 40.32 58.56C40.32 51.84 44.16 47.04 48 44.16C51.84 47.04 55.68 51.84 55.68 58.56C62.4 48 58.56 37.44 48 22.08Z';

// Multi-keyframe flicker, matching the shipped brand animation: non-uniform
// x/y scale (squash+stretch) plus a slight skew, phased so no two properties
// peak at the same instant — this is what reads as "flicker" rather than a
// mechanical pulse.
const PHASES = [0, 0.22, 0.45, 0.68, 0.85, 1];
const SCALE_X = [1, 0.97, 1.05, 0.98, 1.03, 1];
const SCALE_Y = [1, 1.05, 0.96, 1.03, 0.98, 1];
const SKEW_DEG = [0, -1.5, 1, -0.5, 0.8, 0];
const FLAME_OPACITY = [1, 0.96, 1, 0.9, 1, 1];
const GLOW_INTENSITY = [0.55, 0.7, 0.8, 0.6, 0.72, 0.55];

export function FlameGlow({ size = 96, variant = 'flicker', showTile = true }: FlameGlowProps) {
  const phase = useSharedValue(0);
  const breathe = useSharedValue(0.5);

  useEffect(() => {
    if (variant === 'flicker') {
      phase.value = withRepeat(withTiming(1, { duration: 2900, easing: Easing.linear }), -1, false);
    } else if (variant === 'glowPulse') {
      breathe.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
  }, [variant, phase, breathe]);

  const flameStyle = useAnimatedStyle(() => {
    if (variant !== 'flicker') return { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }, { skewX: '0deg' }] };
    return {
      opacity: interpolate(phase.value, PHASES, FLAME_OPACITY),
      transform: [
        { scaleX: interpolate(phase.value, PHASES, SCALE_X) },
        { scaleY: interpolate(phase.value, PHASES, SCALE_Y) },
        { skewX: `${interpolate(phase.value, PHASES, SKEW_DEG)}deg` },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (variant === 'flicker') {
      return { opacity: interpolate(phase.value, PHASES, GLOW_INTENSITY) };
    }
    if (variant === 'glowPulse') {
      return { opacity: 0.5 + breathe.value * 0.5 };
    }
    return { opacity: 0.6 };
  });

  const flameLeft = (FLAME_BBOX.x / 96) * size;
  const flameTop = (FLAME_BBOX.y / 96) * size;
  const flameWidth = (FLAME_BBOX.width / 96) * size;
  const flameHeight = (FLAME_BBOX.height / 96) * size;

  return (
    <View style={{ width: size, height: size }}>
      {/* Glow: a soft amber halo behind the flame, breathing independently */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Defs>
            <RadialGradient id="flameGlow" cx="48" cy="46" r="28" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={LamplightColor.flameAmber} stopOpacity={1} />
              <Stop offset="70%" stopColor={LamplightColor.flameAmber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={96} height={96} fill="url(#flameGlow)" />
        </Svg>
      </Animated.View>

      {/* Static mark: tile + fold bars — never animated */}
      <Svg width={size} height={size} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
        {showTile ? (
          <Path
            d="M74.88 0H21.12C9.45575 0 0 9.45575 0 21.12V74.88C0 86.5443 9.45575 96 21.12 96H74.88C86.5443 96 96 86.5443 96 74.88V21.12C96 9.45575 86.5443 0 74.88 0Z"
            fill={LamplightColor.primaryDark}
          />
        ) : null}
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

      {/* Animated flame — isolated to its own bounding box so scale/skew
          pivots around the flame's own base (transformOrigin), not the
          whole icon's center. */}
      <Animated.View
        style={[
          { position: 'absolute', left: flameLeft, top: flameTop, width: flameWidth, height: flameHeight },
          { transformOrigin: '50% 65%' },
          flameStyle,
        ]}
      >
        <Svg
          width={flameWidth}
          height={flameHeight}
          viewBox={`${FLAME_BBOX.x} ${FLAME_BBOX.y} ${FLAME_BBOX.width} ${FLAME_BBOX.height}`}
        >
          <Path d={FLAME_PATH_D} fill={LamplightColor.flameAmber} />
        </Svg>
      </Animated.View>
    </View>
  );
}
