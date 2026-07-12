import { Redirect, router } from 'expo-router';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FlameGlow } from '@/components/FlameGlow';
import { ChevronRightIcon } from '@/components/icons';
import { hasCompletedOnboarding } from '@/features/settings/onboardingStatus';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SplashScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  // Root layout already resolved the has-onboarded flag before this route
  // could mount, so this is synchronous — no flash of the splash screen.
  if (hasCompletedOnboarding()) {
    return <Redirect href="/library" />;
  }

  // The exit is handled by the navigator's fade animation (see root layout) —
  // no manual screen fade here, which used to fade the dark splash to
  // transparent and briefly reveal the gap behind it as a flash.
  const handleBegin = () => {
    router.replace('/onboarding');
  };

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

      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(620).easing(Easing.out(Easing.cubic))}>
          <FlameGlow size={84} variant="flicker" />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(320).duration(480).easing(Easing.out(Easing.cubic))}
          style={[typography.wordmark, { color: colors.lampText, marginTop: spacing.lg }]}
        >
          Lamplight
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(560).duration(420).easing(Easing.out(Easing.cubic))}
          style={[
            typography.poeticTagline,
            { color: colors.fawn, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          The night is a page, and the lamp its only light
        </Animated.Text>
      </View>

      <Animated.View
        entering={FadeInUp.delay(820).duration(420).easing(Easing.out(Easing.cubic))}
        style={[styles.footer, { bottom: insets.bottom + 32 }]}
      >
        <Pressable
          onPress={handleBegin}
          style={[styles.beginButton, { backgroundColor: colors.flameAmber }]}
        >
          <Text
            style={[
              typography.buttonLabel,
              { color: colors.primaryDark, includeFontPadding: false, textAlignVertical: 'center' },
            ]}
          >
            Begin
          </Text>
          <View style={{ marginLeft: 6 }}>
            <ChevronRightIcon color={colors.primaryDark} size={18} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 100,
  },
});
