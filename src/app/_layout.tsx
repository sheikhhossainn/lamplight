import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  Lora_400Regular,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  Lora_600SemiBold_Italic,
} from '@expo-google-fonts/lora';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { hydrateTargetLanguage } from '@/features/settings/languagePair';
import { hydrateOnboardingStatus } from '@/features/settings/onboardingStatus';
import { LamplightThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThemeTransitionOverlay } from '@/theme/ThemeTransitionOverlay';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
    Lora_600SemiBold_Italic,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const ready = (fontsLoaded || Boolean(fontError)) && onboardingChecked;

  // Load persisted settings (translation language pair) once on launch.
  useEffect(() => {
    void hydrateTargetLanguage();
  }, []);

  // Resolve the has-onboarded flag before the Stack mounts, so the "/" splash
  // route can redirect straight past itself instead of flashing then bouncing.
  useEffect(() => {
    void hydrateOnboardingStatus().then(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <LamplightThemeProvider>
      <AppShell />
    </LamplightThemeProvider>
  );
}

function AppShell() {
  const { colors } = useTheme();
  // Fallback for any route not listed below — matches the shared default so
  // an unmatched screen still blends rather than flashing an unrelated tone.
  const contentBackground = colors.libraryBackground;

  // app.json pins the native Android root window background to charcoal
  // (baked in at build time, for the dark Splash/Onboarding hand-off) — that
  // native window is what's briefly visible during a Fragment transition,
  // *underneath* any RN-level contentStyle, so in Day theme every navigation
  // still flashed charcoal for a frame no matter what contentStyle said. This
  // overrides that native background at runtime to track the current theme,
  // which contentStyle can't reach.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(contentBackground);
  }, [contentBackground]);

  return (
    <View style={{ flex: 1, backgroundColor: contentBackground }}>
      <Stack
        screenOptions={{
          headerShown: false,
          // fade_from_bottom over plain 'fade' — Android's native-stack 'fade'
          // preset is nearly instant, reading as a flicker rather than motion.
          // The added slight vertical drift makes the crossfade legible as an
          // actual transition without becoming a directional slide.
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: contentBackground },
        }}
      >
        {/* Each screen's own root View sets one of colors.primaryDark /
            colors.parchment / colors.libraryBackground — contentStyle here is
            pinned to match exactly, per route, so the animated gap between
            two screens never reveals a third, mismatched color (that
            mismatch was the flash on back-navigation: contentStyle defaulted
            to libraryBackground everywhere, so parchment reader screens
            popping back to a libraryBackground list screen flashed the
            correct color momentarily against the reader's own still-visible
            parchment). */}
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: colors.primaryDark } }} />
        <Stack.Screen name="onboarding" options={{ contentStyle: { backgroundColor: colors.primaryDark } }} />
        <Stack.Screen name="paywall" options={{ contentStyle: { backgroundColor: colors.primaryDark } }} />
        <Stack.Screen
          name="quote-share/[highlightId]"
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        <Stack.Screen name="reader/[bookId]" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="book/[id]" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="saved-books" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="bible/[bookId]" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="bible-nt/[bookId]" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="quran/[surahNumber]" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen
          name="bible/index"
          options={{ contentStyle: { backgroundColor: colors.libraryBackground } }}
        />
        <Stack.Screen
          name="bible-nt/index"
          options={{ contentStyle: { backgroundColor: colors.libraryBackground } }}
        />
        <Stack.Screen name="quran/index" options={{ contentStyle: { backgroundColor: colors.libraryBackground } }} />
      </Stack>
      <ThemeTransitionOverlay />
      <AppUpdatePrompt />
    </View>
  );
}
