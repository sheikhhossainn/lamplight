import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

type ParticleConfig = {
  id: number;
  startXPercent: number; // 0..100
  startYPercent: number; // 0..100
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  baseOpacity: number;
};

const PARTICLES: ParticleConfig[] = [
  { id: 1, startXPercent: 18, startYPercent: 65, size: 4, duration: 4200, delay: 0, driftX: 16, driftY: -110, baseOpacity: 0.38 },
  { id: 2, startXPercent: 78, startYPercent: 72, size: 5, duration: 5100, delay: 600, driftX: -20, driftY: -140, baseOpacity: 0.32 },
  { id: 3, startXPercent: 32, startYPercent: 45, size: 3, duration: 3800, delay: 1200, driftX: 12, driftY: -90, baseOpacity: 0.28 },
  { id: 4, startXPercent: 84, startYPercent: 38, size: 3.5, duration: 4600, delay: 1800, driftX: -14, driftY: -100, baseOpacity: 0.3 },
  { id: 5, startXPercent: 50, startYPercent: 78, size: 4.5, duration: 5400, delay: 400, driftX: 18, driftY: -150, baseOpacity: 0.35 },
  { id: 6, startXPercent: 62, startYPercent: 52, size: 3, duration: 4100, delay: 2200, driftX: -16, driftY: -95, baseOpacity: 0.25 },
  { id: 7, startXPercent: 25, startYPercent: 80, size: 4, duration: 4800, delay: 1500, driftX: 14, driftY: -125, baseOpacity: 0.34 },
];

function FloatingEmber({
  particle,
  color,
  screenWidth,
  screenHeight,
}: {
  particle: ParticleConfig;
  color: string;
  screenWidth: number;
  screenHeight: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, {
          duration: particle.duration,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
      ),
    );
  }, [particle, progress]);

  const style = useAnimatedStyle(() => {
    const currentProg = progress.value;
    const translateX = currentProg * particle.driftX;
    const translateY = currentProg * particle.driftY;
    const opacity = particle.baseOpacity * (0.5 + 0.5 * Math.sin(currentProg * Math.PI));

    return {
      transform: [{ translateX }, { translateY }],
      opacity,
    };
  });

  const startLeft = (particle.startXPercent / 100) * screenWidth;
  const startTop = (particle.startYPercent / 100) * screenHeight;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startLeft,
          top: startTop,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function AuthBackgroundAnimation() {
  const { colors, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const glowPulse = useSharedValue(0.85);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [glowPulse]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isLamp ? glowPulse.value : 0.4,
  }));

  const particleColor = isLamp ? colors.flameAmber : colors.fawn;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Warm ambient aura for dark mode */}
      <Animated.View style={[StyleSheet.absoluteFill, glowAnimatedStyle]}>
        <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="authAmbientGlow" cx="50%" cy="30%" rx="65%" ry="45%">
              <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={isLamp ? 0.16 : 0.05} />
              <Stop offset="55%" stopColor={colors.flameAmber} stopOpacity={isLamp ? 0.05 : 0.01} />
              <Stop offset="100%" stopColor={colors.flameAmber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#authAmbientGlow)" />
        </Svg>
      </Animated.View>

      {/* Floating ember particles */}
      {PARTICLES.map((particle) => (
        <FloatingEmber
          key={particle.id}
          particle={particle}
          color={particleColor}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});
