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
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppUpdateBanner } from '@/components/AppUpdateBanner';
import { hydrateTargetLanguage } from '@/features/settings/languagePair';
import { LamplightThemeProvider } from '@/theme/ThemeProvider';
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
  });

  const ready = fontsLoaded || Boolean(fontError);

  // Load persisted settings (translation language pair) once on launch.
  useEffect(() => {
    void hydrateTargetLanguage();
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
      {/* Charcoal root so no transition ever reveals the native white window
          behind the screens. The first-run flow (Splash -> Onboarding -> ...)
          is all dark, so this makes those hand-offs seamless. */}
      <View style={{ flex: 1, backgroundColor: '#1C1B1E' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Crossfade every screen transition (smooth, no directional slide)
            // and paint the transition gap charcoal instead of the default
            // white — the Splash and Onboarding are both dark, so a white gap
            // used to flash between them.
            animation: 'fade',
            contentStyle: { backgroundColor: '#1C1B1E' },
          }}
        />
        <ThemeTransitionOverlay />
        <AppUpdateBanner />
      </View>
    </LamplightThemeProvider>
  );
}
