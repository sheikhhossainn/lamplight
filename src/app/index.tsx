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
    return <Redirect href={'/homescreen' as any} />;
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
        <Animated.View entering={FadeIn.duration(600).easing(Easing.out(Easing.cubic))}>
          <FlameGlow size={92} variant="flicker" showTile={false} />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(180).duration(500).easing(Easing.out(Easing.cubic))}
          style={{ alignItems: 'center' }}
        >
          <Text
            style={[
              typography.wordmark,
              { color: colors.parchment, fontSize: 36, letterSpacing: 0.8, marginTop: spacing.xl },
            ]}
          >
            Lamplight
          </Text>

          <Text
            style={[
              typography.metadataCaption,
              {
                color: colors.mutedOnDark,
                marginTop: spacing.md,
                textAlign: 'center',
                maxWidth: 270,
                lineHeight: 22,
                letterSpacing: 0.2,
              },
            ]}
          >
            A quiet sanctuary to read in original script and learn as you turn each page.
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeIn.delay(350).duration(450).easing(Easing.out(Easing.cubic))}
        style={[styles.footer, { bottom: Math.max(insets.bottom + 28, 40) }]}
      >
        <Pressable
          onPress={handleBegin}
          hitSlop={12}
          style={({ pressed }) => [
            styles.beginButton,
            {
              backgroundColor: colors.flameAmber,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              typography.buttonLabel,
              {
                color: colors.primaryDark,
                includeFontPadding: false,
                textAlignVertical: 'center',
                letterSpacing: 0.6,
                fontSize: 15,
              },
            ]}
          >
            Begin
          </Text>
          <View style={styles.iconCircle}>
            <ChevronRightIcon color={colors.primaryDark} size={13} />
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
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: 26,
    borderRadius: 23,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(28, 27, 30, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
