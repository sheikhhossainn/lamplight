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

import { LamplightThemeProvider } from '@/theme/ThemeProvider';

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
      <Stack screenOptions={{ headerShown: false }} />
    </LamplightThemeProvider>
  );
}
