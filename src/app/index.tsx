import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { AuthCard } from '@/components/AuthCard';
import { FlameGlow } from '@/components/FlameGlow';
import { hasCompletedOnboarding } from '@/features/settings/onboardingStatus';
import { isAuthenticatedAccount } from '@/lib/supabaseAuth';
import { LamplightColor } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function SplashScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [alreadyAuth, setAlreadyAuth] = useState(false);

  useEffect(() => {
    let active = true;
    void isAuthenticatedAccount().then((authed) => {
      if (active) {
        setAlreadyAuth(authed);
        setCheckingAuth(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Root layout already resolved the has-onboarded flag before this route
  // could mount. If onboarded or already authenticated, jump to homescreen.
  if (hasCompletedOnboarding() || (!checkingAuth && alreadyAuth)) {
    return <Redirect href={'/homescreen' as any} />;
  }

  const handleSkipToGuest = () => {
    router.replace('/onboarding');
  };

  const handleAuthSuccess = () => {
    if (hasCompletedOnboarding()) {
      router.replace('/homescreen' as any);
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark }]}>
      {/* Dark radial vignette + large ambient amber glow */}
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#2A2620" />
            <Stop offset="60%" stopColor="#1C1B1E" />
            <Stop offset="100%" stopColor="#17161A" />
          </RadialGradient>
          <RadialGradient id="ambientGlow" cx="50%" cy="25%" r="45%">
            <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={0.24} />
            <Stop offset="70%" stopColor={colors.flameAmber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#vignette)" />
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#ambientGlow)" />
      </Svg>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 30,
            paddingHorizontal: spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeIn.duration(280).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
          style={styles.brandHeader}
        >
          <FlameGlow size={56} variant="flicker" showTile={false} />
          <Text
            style={[
              typography.wordmark,
              { color: LamplightColor.parchment, fontSize: 32, letterSpacing: 0.8, marginTop: 8 },
            ]}
          >
            Lamplight
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              {
                color: colors.mutedOnDark,
                marginTop: 4,
                textAlign: 'center',
                maxWidth: 290,
                lineHeight: 18,
                fontSize: 12,
              },
            ]}
          >
            Read foreign literature in its original language with companion translations.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(80).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
          style={styles.cardContainer}
        >
          <AuthCard
            initialMode="signin"
            onSuccess={handleAuthSuccess}
            onSkip={handleSkipToGuest}
            showSkipButton={true}
            skipButtonLabel="Continue as Guest"
            title="Enter Lamplight"
            subtitle="Sign in or register to sync your library, vocabulary & streaks."
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
