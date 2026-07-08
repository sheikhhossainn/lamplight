import { router } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FlameGlow } from '@/components/FlameGlow';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SplashScreen() {
  const { colors, typography, spacing } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark }]}>
      {/* Dark radial vignette + large ambient amber glow behind the mark —
          not a flat background. Matches the Figma splash export exactly. */}
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="42%" r="65%">
            <Stop offset="0%" stopColor="#2A2620" />
            <Stop offset="60%" stopColor="#1C1B1E" />
            <Stop offset="100%" stopColor="#17161A" />
          </RadialGradient>
          <RadialGradient id="ambientGlow" cx="50%" cy="35%" r="42%">
            <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={0.28} />
            <Stop offset="70%" stopColor={colors.flameAmber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#vignette)" />
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#ambientGlow)" />
      </Svg>

      <View style={{ flex: 0.8 }} />
      <View style={styles.content}>
        <FlameGlow size={84} variant="flicker" />
        <Text style={[typography.wordmark, { color: colors.lampText, marginTop: spacing.lg }]}>
          Lamplight
        </Text>
        <Text
          style={[
            typography.eyebrowLabel,
            { color: colors.fawn, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          A reading lamp for language learners
        </Text>
      </View>
      <View style={{ flex: 1.2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
  },
});
