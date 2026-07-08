import { router } from 'expo-router';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FlameGlow } from '@/components/FlameGlow';
import { ChevronRightIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const EXIT_MS = 380;

export default function SplashScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  // Only the exit fade is a manually-driven shared value — the entrance uses
  // Reanimated's mount-triggered `entering` animations instead of a useEffect
  // assigning shared values, which is more robust across Fast Refresh (each
  // real mount re-runs the entering animation fresh, rather than depending on
  // an effect's assignment staying in sync with previously-compiled worklets).
  const screenOpacity = useSharedValue(1);

  const handleBegin = () => {
    screenOpacity.value = withTiming(
      0,
      { duration: EXIT_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(router.replace)('/onboarding');
      },
    );
  };

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.primaryDark }, screenStyle]}>
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
    </Animated.View>
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
