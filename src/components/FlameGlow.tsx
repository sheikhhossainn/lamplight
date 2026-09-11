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
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LamplightColor } from '@/theme/tokens';

type FlameGlowProps = {
  size?: number;
  // 'flicker' = realistic multi-layer organic candle fire with out-of-phase core & mantle
  // 'glowPulse' = reader's floating lamp: static flame, breathing ambient glow
  // 'static' = unmoving logo
  variant?: 'flicker' | 'glowPulse' | 'static';
  showTile?: boolean;
  lit?: boolean;
};

// Coordinate system: 0-96 standard icon box
const FLAME_BBOX = { x: 33.6, y: 22.08, width: 28.8, height: 36.48 };

// Outer mantle flame path (the iconic Lamplight silhouette)
const MANTLE_PATH_D =
  'M48 22.08C37.44 37.44 33.6 48 40.32 58.56C40.32 51.84 44.16 47.04 48 44.16C51.84 47.04 55.68 51.84 55.68 58.56C62.4 48 58.56 37.44 48 22.08Z';

// Inner luminous core (white-hot heart of the flame)
const CORE_PATH_D =
  'M48 29.5C42.2 38.5 40.2 44.8 43.5 52.8C43.8 49.2 45.8 46.2 48 46.2C50.2 46.2 52.2 49.2 52.5 52.8C55.8 44.8 53.8 38.5 48 29.5Z';

// Base combustion oxygen root (subtle blue hue at the wick)
const BASE_ROOT_D =
  'M48 44.16C45.2 46.5 42.5 50.8 42.5 55.8C44.4 54 46.2 52.6 48 52.6C49.8 52.6 51.6 54 53.5 55.8C53.5 50.8 50.8 46.5 48 44.16Z';

// Organic, meditative turbulence for outer mantle (calm, draft-free room)
const MANTLE_PHASES = [0, 0.2, 0.42, 0.64, 0.82, 1];
const MANTLE_SCALE_X = [1, 0.985, 1.018, 0.99, 1.015, 1];
const MANTLE_SCALE_Y = [1, 1.022, 0.98, 1.018, 0.99, 1];
const MANTLE_SKEW_DEG = [0, -0.65, 0.5, -0.35, 0.45, 0];
const MANTLE_TRANSLATE_X = [0, -0.3, 0.4, -0.2, 0.3, 0];

// Dynamic keyframes for inner luminous core (gentle, rhythmic breathing)
const CORE_PHASES = [0, 0.22, 0.45, 0.68, 0.85, 1];
const CORE_SCALE_X = [1, 1.025, 0.975, 1.02, 0.985, 1];
const CORE_SCALE_Y = [1, 0.98, 1.035, 0.975, 1.025, 1];
const CORE_TRANSLATE_Y = [0, -0.6, 0.4, -0.7, 0.3, 0];
const CORE_OPACITY = [0.92, 0.98, 0.88, 0.97, 0.92, 0.92];

// Ambient glow breath (slow, rhythmic respiration)
const GLOW_INTENSITY = [0.55, 0.72, 0.85, 0.68, 0.78, 0.55];

export function FlameGlow({ size = 96, variant = 'flicker', showTile = true, lit = true }: FlameGlowProps) {
  // Two independent harmonic oscillators for genuine out-of-phase organic fluid motion
  const mantlePhase = useSharedValue(0);
  const corePhase = useSharedValue(0);
  const breathe = useSharedValue(0.5);

  useEffect(() => {
    if (!lit) return;
    if (variant === 'flicker') {
      // Outer mantle sways on a calm 3600ms cycle
      mantlePhase.value = withRepeat(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
      // Inner core breathes on a 2200ms harmonic cycle
      corePhase.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        -1,
        false,
      );
    } else if (variant === 'glowPulse') {
      breathe.value = withRepeat(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [variant, lit, mantlePhase, corePhase, breathe]);

  // Outer flame mantle style
  const mantleStyle = useAnimatedStyle(() => {
    if (!lit || variant !== 'flicker') {
      return { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }, { skewX: '0deg' }, { translateX: 0 }] };
    }
    return {
      transform: [
        { scaleX: interpolate(mantlePhase.value, MANTLE_PHASES, MANTLE_SCALE_X) },
        { scaleY: interpolate(mantlePhase.value, MANTLE_PHASES, MANTLE_SCALE_Y) },
        { skewX: `${interpolate(mantlePhase.value, MANTLE_PHASES, MANTLE_SKEW_DEG)}deg` },
        { translateX: interpolate(mantlePhase.value, MANTLE_PHASES, MANTLE_TRANSLATE_X) },
      ],
    };
  });

  // Inner white-hot core style
  const coreStyle = useAnimatedStyle(() => {
    if (!lit || variant !== 'flicker') {
      return { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }, { translateY: 0 }] };
    }
    return {
      opacity: interpolate(corePhase.value, CORE_PHASES, CORE_OPACITY),
      transform: [
        { scaleX: interpolate(corePhase.value, CORE_PHASES, CORE_SCALE_X) },
        { scaleY: interpolate(corePhase.value, CORE_PHASES, CORE_SCALE_Y) },
        { translateY: interpolate(corePhase.value, CORE_PHASES, CORE_TRANSLATE_Y) },
      ],
    };
  });

  // Ambient aura glow
  const glowStyle = useAnimatedStyle(() => {
    if (!lit) return { opacity: 0 };
    if (variant === 'flicker') {
      return { opacity: interpolate(corePhase.value, CORE_PHASES, GLOW_INTENSITY) };
    }
    if (variant === 'glowPulse') {
      return { opacity: 0.5 + breathe.value * 0.5 };
    }
    return { opacity: 0.7 };
  });

  const flameLeft = (FLAME_BBOX.x / 96) * size;
  const flameTop = (FLAME_BBOX.y / 96) * size;
  const flameWidth = (FLAME_BBOX.width / 96) * size;
  const flameHeight = (FLAME_BBOX.height / 96) * size;

  return (
    <View style={{ width: size, height: size }}>
      {/* Dynamic Multi-Stage Ambient Glow Bloom */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 96 96">
          <Defs>
            {/* Wide soft atmospheric aura */}
            <RadialGradient id="outerAura" cx="48" cy="44" r="38" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={LamplightColor.flameAmber} stopOpacity={0.45} />
              <Stop offset="55%" stopColor={LamplightColor.flameAmber} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={LamplightColor.flameAmber} stopOpacity={0} />
            </RadialGradient>
            {/* Intense golden core bloom */}
            <RadialGradient id="innerBloom" cx="48" cy="44" r="18" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFF4D0" stopOpacity={0.75} />
              <Stop offset="60%" stopColor={LamplightColor.flameAmber} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={LamplightColor.flameAmber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={96} height={96} fill="url(#outerAura)" />
          <Rect x={0} y={0} width={96} height={96} fill="url(#innerBloom)" />
        </Svg>
      </Animated.View>

      {/* Static Tile & Parchment Paper Bars */}
      {showTile ? (
        <Svg width={size} height={size} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
          <Path
            d="M74.88 0H21.12C9.45575 0 0 9.45575 0 21.12V74.88C0 86.5443 9.45575 96 21.12 96H74.88C86.5443 96 96 86.5443 96 74.88V21.12C96 9.45575 86.5443 0 74.88 0Z"
            fill={LamplightColor.primaryDark}
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
      ) : null}

      {/* Animated Multi-Layer Organic Flame Container */}
      <View
        style={{
          position: 'absolute',
          left: flameLeft,
          top: flameTop,
          width: flameWidth,
          height: flameHeight,
        }}
      >
        {/* Layer 1: Fluid Aerodynamic Outer Mantle */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transformOrigin: '50% 70%' },
            mantleStyle,
          ]}
        >
          <Svg
            width={flameWidth}
            height={flameHeight}
            viewBox={`${FLAME_BBOX.x} ${FLAME_BBOX.y} ${FLAME_BBOX.width} ${FLAME_BBOX.height}`}
          >
            <Defs>
              <LinearGradient id="mantleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFAE29" />
                <Stop offset="45%" stopColor={LamplightColor.flameAmber} />
                <Stop offset="100%" stopColor="#D95C0E" />
              </LinearGradient>
            </Defs>
            <Path
              d={MANTLE_PATH_D}
              fill={lit ? 'url(#mantleGrad)' : LamplightColor.straw}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: Subtle Blue Oxygen Wick Root (Only when lit) */}
        {lit ? (
          <Svg
            width={flameWidth}
            height={flameHeight}
            viewBox={`${FLAME_BBOX.x} ${FLAME_BBOX.y} ${FLAME_BBOX.width} ${FLAME_BBOX.height}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="blueBaseGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#3C8EB8" stopOpacity={0.65} />
                <Stop offset="60%" stopColor="#4A7596" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#4A7596" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={BASE_ROOT_D} fill="url(#blueBaseGrad)" />
          </Svg>
        ) : null}

        {/* Layer 3: Inner Luminous White-Gold Core (Shivering and Dancing) */}
        {lit ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transformOrigin: '50% 68%' },
              coreStyle,
            ]}
          >
            <Svg
              width={flameWidth}
              height={flameHeight}
              viewBox={`${FLAME_BBOX.x} ${FLAME_BBOX.y} ${FLAME_BBOX.width} ${FLAME_BBOX.height}`}
            >
              <Defs>
                <LinearGradient id="coreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="40%" stopColor="#FFF8E0" />
                  <Stop offset="75%" stopColor="#FFE175" />
                  <Stop offset="100%" stopColor="#FFC233" />
                </LinearGradient>
              </Defs>
              <Path d={CORE_PATH_D} fill="url(#coreGrad)" />
            </Svg>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
