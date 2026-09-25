import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { Atma_400Regular, Atma_500Medium, Atma_600SemiBold } from '@expo-google-fonts/atma';
import { Kalam_400Regular, Kalam_700Bold } from '@expo-google-fonts/kalam';
import {
  Lora_400Regular,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  Lora_600SemiBold_Italic,
} from '@expo-google-fonts/lora';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import {
  reconcileScheduledNotifications,
  setupNotificationResponseListener,
} from '@/features/notifications/notificationService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { triggerSync } from '@/features/sync/syncWorker';
import { flushAnalyticsQueue } from '@/features/analytics/analytics';
import { fetchRemoteAppConfig, hydrateAppConfig } from '@/features/config/appConfig';
import { getSession } from '@/lib/supabaseAuth';

import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { WhatsNewOverlay } from '@/components/WhatsNewOverlay';
import { hydrateWhatsNewStatus } from '@/features/app-update/whatsNew';
import { hydrateMotherTongue } from '@/features/settings/motherTongue';
import { seedJapaneseCatalog } from '@/features/content-ingestion/japaneseApi';
import { seedKoreanCatalog } from '@/features/content-ingestion/koreanApi';
import { hydrateTargetLanguage } from '@/features/settings/languagePair';
import { hydrateTargetReadingLanguage } from '@/features/settings/targetReadingLanguage';
import { hydrateLiteraryTheme } from '@/features/settings/literaryTheme';
import { hydrateOnboardingStatus } from '@/features/settings/onboardingStatus';
import { hydratePageStyle } from '@/features/settings/pageStylePrefs';
import { hydrateReadingTypography } from '@/features/settings/readingPrefs';
import { cleanupPartialDownloads } from '@/features/storage/storageManager';
import { reconcileDownloadStates } from '@/features/content-ingestion/bookDownloader';
import { hydrateEntitlements } from '@/features/subscription/entitlementService';
import { reconcilePendingMergeJournals } from '@/features/account/accountSessionCoordinator';
import { BillingProvider } from '@/features/billing/BillingProvider';
import { LamplightThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThemeTransitionOverlay } from '@/theme/ThemeTransitionOverlay';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

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
    Kalam_400Regular,
    Kalam_700Bold,
    Atma_400Regular,
    Atma_500Medium,
    Atma_600SemiBold,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const ready = (fontsLoaded || Boolean(fontError)) && onboardingChecked;

  // Load persisted settings (translation language pair, mother tongue, page style, app config) once on launch.
  useEffect(() => {
    void Promise.all([
      getSession().catch(() => {}),
      hydrateAppConfig().catch(() => {}),
      hydrateTargetLanguage(),
      hydrateTargetReadingLanguage(),
      hydrateMotherTongue(),
      hydratePageStyle(),
      hydrateReadingTypography(),
      hydrateLiteraryTheme(),
      hydrateEntitlements(),
      cleanupPartialDownloads().catch(() => {}),
      reconcileDownloadStates().catch(() => {}),
      seedJapaneseCatalog(),
      seedKoreanCatalog(),
      reconcilePendingMergeJournals().catch(() => {}),
    ]);
  }, []);

  // Resolve the has-onboarded flag before the Stack mounts, so the "/" splash
  // route can redirect straight past itself instead of flashing then bouncing.
  useEffect(() => {
    void Promise.all([hydrateOnboardingStatus(), hydrateWhatsNewStatus()]).then(() =>
      setOnboardingChecked(true),
    );
  }, []);

  // Trigger local-first sync, flush offline analytics, and refresh remote app config on launch and when returning to foreground
  useEffect(() => {
    void triggerSync();
    void flushAnalyticsQueue();
    void fetchRemoteAppConfig();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void triggerSync();
        void flushAnalyticsQueue();
        void fetchRemoteAppConfig();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const router = useRouter();

  // Reconcile notifications on launch and listen for notification taps (RET-01, RET-02)
  useEffect(() => {
    void reconcileScheduledNotifications().catch(() => {});
    const cleanup = setupNotificationResponseListener((url) => {
      router.push(url as any);
    });
    return () => {
      cleanup?.();
    };
  }, [router]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LamplightThemeProvider>
        <BillingProvider>
          <AppShell />
        </BillingProvider>
      </LamplightThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { colors } = useTheme();
  const pathname = usePathname();

  // Dark-surface routes that must never reveal a light native window or container gap during transitions
  const isDarkRoute =
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/onboarding' ||
    pathname === '/paywall' ||
    (typeof pathname === 'string' && pathname.startsWith('/quote-share'));

  const contentBackground = isDarkRoute ? colors.primaryDark : colors.libraryBackground;

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
            two screens never reveals a third, mismatched color. */}
        <Stack.Screen
          name="index"
          options={{
            contentStyle: { backgroundColor: colors.primaryDark },
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            contentStyle: { backgroundColor: colors.primaryDark },
            animation: 'fade',
          }}
        />
        <Stack.Screen name="paywall" options={{ contentStyle: { backgroundColor: colors.primaryDark } }} />
        <Stack.Screen
          name="quote-share/[highlightId]"
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        {/* The reader screen manages its own Day↔Lamp background via hardcoded
            colors and animated overlays (READING_BG_LIGHT + a dark gradient).
            Pinned to a fixed color so the native container doesn't flash when
            setReadingTheme fires after the reader's local 280ms transition. */}
        <Stack.Screen name="reader/[bookId]" options={{ contentStyle: { backgroundColor: '#F4EBD9' } }} />
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
        {/* Wood-table backdrop is fixed art, not a theme token — matches the
            gradient's darkest stop so the fade_from_bottom transition doesn't
            flash libraryBackground before the gradient paints. */}
        <Stack.Screen name="mood-verses/table" options={{ contentStyle: { backgroundColor: '#4A3620' } }} />
        <Stack.Screen name="mood-verses/ask" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="mood-verses/inquiry" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="mood-verses/reflect" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="signup" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="profile" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="terms" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
        <Stack.Screen name="privacy" options={{ contentStyle: { backgroundColor: colors.parchment } }} />
      </Stack>
      <ThemeTransitionOverlay />
      <AppUpdatePrompt />
      <WhatsNewOverlay />
    </View>
  );
}
