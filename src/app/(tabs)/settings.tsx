import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ChevronRightIcon } from '@/components/icons';
import {
  useAppUpdateBanner,
  type AppUpdateStatus,
} from '@/features/app-update/useAppUpdateBanner';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { setReadingTheme, useReadingTheme } from '@/features/settings/readingTheme';
import { setPageTurnSoundEnabled, usePageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { checkCachedTranslationCap, checkTranslationCap } from '@/features/translation';
import type { CapCheck } from '@/features/translation/capPolicy';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { Layout, Spacing } from '@/theme/tokens';

// Clear the tab bar so the last row isn't half-hidden behind it.
const TAB_BAR_CLEARANCE = Layout.tabBarHeight + Spacing.xl;

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="2.5" x2="12" y2="5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="21.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="2.5" y1="12" x2="5" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="19" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5.3" y1="5.3" x2="7.1" y2="7.1" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16.9" y1="16.9" x2="18.7" y2="18.7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5.3" y1="18.7" x2="7.1" y2="16.9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16.9" y1="7.1" x2="18.7" y2="5.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function LampDropIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={14} viewBox="0 0 20 20">
      <Path
        d="M10 3c-3 3.5-4.5 6-3 8.5 1-1 2-1.8 3-2.2 1 0.4 2 1.2 3 2.2 1.5-2.5 0-5-3-8.5z"
        fill={color}
      />
    </Svg>
  );
}

function ThemeSegmentedSwitch({ theme }: { theme: 'day' | 'lamp' }) {
  const { colors, radius, typography } = useTheme();

  // Progress: 0 = day, 1 = lamp
  const progress = useSharedValue(theme === 'lamp' ? 1 : 0);
  const segWidth = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if external theme changes
  useEffect(() => {
    const target = theme === 'lamp' ? 1 : 0;
    if (Math.round(progress.get()) !== target) {
      progress.set(
        withSpring(target, {
          duration: 200,
          dampingRatio: 0.88,
          reduceMotion: ReduceMotion.System,
        })
      );
    }
  }, [theme, progress]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSelect = (target: 'day' | 'lamp') => {
    if (theme === target) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const targetVal = target === 'lamp' ? 1 : 0;

    // 1. Immediately launch physical spring on the UI thread (0ms latency)
    progress.set(
      withSpring(targetVal, {
        duration: 220,
        dampingRatio: 0.88,
        reduceMotion: ReduceMotion.System,
      })
    );

    // 2. Commit theme store change once the pill has full momentum
    timeoutRef.current = setTimeout(() => {
      setReadingTheme(target);
    }, 100);
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const w = segWidth.get();
    return {
      width: w > 0 ? w : '50%',
      transform: [{ translateX: progress.get() * w }],
    };
  });

  const sunAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const rotate = interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const lampAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const rotate = interpolate(p, [0, 1], [-15, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const dayContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [1, 0.55], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
  }));

  const lampContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.55, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        if (width > 0) {
          segWidth.set((width - 6) / 2);
        }
      }}
      style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slidingPill,
          { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
          pillAnimatedStyle,
        ]}
      />
      <Pressable
        hitSlop={6}
        onPress={() => handleSelect('day')}
        style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
      >
        <Animated.View style={[styles.segmentInner, dayContentStyle]}>
          <Animated.View style={[styles.segmentIcon, sunAnimatedStyle]}>
            <SunIcon color={theme === 'day' ? colors.flameAmber : colors.fawn} />
          </Animated.View>
          <Text
            style={[
              typography.uiRowTitle,
              { fontSize: 12, marginLeft: 6, color: colors.lampText },
            ]}
          >
            Day
          </Text>
        </Animated.View>
      </Pressable>
      <Pressable
        hitSlop={6}
        onPress={() => handleSelect('lamp')}
        style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
      >
        <Animated.View style={[styles.segmentInner, lampContentStyle]}>
          <Animated.View style={[styles.segmentIcon, lampAnimatedStyle]}>
            <LampDropIcon color={theme === 'lamp' ? colors.flameAmber : colors.fawn} />
          </Animated.View>
          <Text
            style={[
              typography.uiRowTitle,
              { fontSize: 12, marginLeft: 6, color: colors.lampText },
            ]}
          >
            Lamp
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const translateX = useSharedValue(value ? 16 : 0);

  useEffect(() => {
    translateX.set(
      withSpring(value ? 16 : 0, {
        duration: 200,
        dampingRatio: 0.85,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [value, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const handlePress = () => {
    const next = !value;
    translateX.set(
      withSpring(next ? 16 : 0, {
        duration: 200,
        dampingRatio: 0.85,
        reduceMotion: ReduceMotion.System,
      })
    );
    onChange(next);
  };

  return (
    <Pressable
      hitSlop={8}
      onPress={handlePress}
      style={[styles.toggleTrack, { backgroundColor: value ? colors.flameAmber : colors.hairline }]}
    >
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
    </Pressable>
  );
}

// The passive half of the update lifecycle. It used to be a top banner on every
// screen; nobody needs to watch a background download, but someone who wonders
// "am I on the latest build?" comes here to ask.
function updateStatusLabel(status: AppUpdateStatus, progress: number | undefined): string {
  switch (status) {
    case 'checking':
      return 'Checking for updates…';
    case 'downloading':
      return `Downloading update… ${Math.round((progress ?? 0) * 100)}%`;
    case 'ready':
      return 'Update ready — restart to install';
    case 'error':
      return 'Update check failed — will retry next launch';
    default:
      return 'Up to date';
  }
}

export default function SettingsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { status: updateStatus, downloadProgress, applyUpdate } = useAppUpdateBanner();

  const theme = useReadingTheme();
  const targetLanguage = useTargetLanguage();
  const pageTurnSound = usePageTurnSoundEnabled();
  // undefined = not known yet, null = unlimited (premium). Collapsing those two
  // into null made the row flash "Unlimited translations" on every focus while
  // the server round-trip was still in flight.
  const [translationsLeft, setTranslationsLeft] = useState<number | null | undefined>(undefined);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const isPremium = isPremiumUser();
      const apply = (cap: CapCheck) => {
        if (!cancelled) setTranslationsLeft(cap.remaining === Infinity ? null : cap.remaining);
      };

      // Local cache first (no network) so the real count paints immediately;
      // the server read below overwrites it once it lands. Only fills a still-
      // unknown value, so a slow cache read can't clobber a fresher server one.
      checkCachedTranslationCap(isPremium).then((cap) => {
        if (!cap || cancelled) return;
        setTranslationsLeft((prev) =>
          prev === undefined ? (cap.remaining === Infinity ? null : cap.remaining) : prev,
        );
      });
      checkTranslationCap(isPremium).then(apply);

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    // Scrolls now that About sits below the plan card — on a short phone the
    // last section would otherwise fall off the bottom with no way to reach it.
    <ScrollView
      style={[styles.container, { backgroundColor: colors.parchment }]}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: insets.top + 16,
        paddingBottom: TAB_BAR_CLEARANCE,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.screenTitle, { color: colors.ink, marginBottom: spacing.lg }]}>
        Settings
      </Text>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Appearance
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginBottom: 10 }]}>
          Reading theme
        </Text>
        <ThemeSegmentedSwitch theme={theme} />
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Reading
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl, paddingVertical: 4 },
        ]}
      >
        <View style={styles.settingsRow}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Page-turn sound</Text>
          <ToggleSwitch value={pageTurnSound} onChange={setPageTurnSoundEnabled} />
        </View>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Language
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
          Default language pair
        </Text>
        <Pressable
          onPress={() => setLanguagePickerVisible(true)}
          style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
            EN → {targetLanguageLabel(targetLanguage)}
          </Text>
        </Pressable>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Storage
      </Text>
      <Pressable
        onPress={() => router.push('/saved-books')}
        style={[
          styles.card,
          styles.settingsRow,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Saved books</Text>
        <ChevronRightIcon color={colors.straw} size={15} />
      </Pressable>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Account
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          {
            // Day: deliberate inverted dark card on parchment. Lamp: primaryDark
            // == page bg, so an inverted card disappears — use the elevated
            // surface + hairline border to lift it off the background instead.
            backgroundColor: theme === 'day' ? colors.primaryDark : colors.card,
            borderColor: theme === 'day' ? colors.primaryDark : colors.hairline,
            borderRadius: radius.card,
          },
        ]}
      >
        <View>
          <Text style={[typography.uiRowTitle, { color: theme === 'day' ? colors.lampText : colors.ink, fontSize: 13 }]}>
            Free plan
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              { color: theme === 'day' ? colors.mutedOnDark : colors.fawn, fontSize: 11, marginTop: 2 },
            ]}
          >
            {translationsLeft === undefined
              ? 'Checking translations left…'
              : translationsLeft === null
                ? 'Unlimited translations'
                : `${translationsLeft} translations left today`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Upgrade</Text>
        </Pressable>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        About
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Lamplight {Constants.expoConfig?.version ?? ''}
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
            {updateStatusLabel(updateStatus, downloadProgress)}
          </Text>
        </View>
        {updateStatus === 'checking' || updateStatus === 'downloading' ? (
          <ActivityIndicator size="small" color={colors.flameAmber} />
        ) : updateStatus === 'ready' ? (
          <Pressable
            onPress={applyUpdate}
            style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Restart</Text>
          </Pressable>
        ) : null}
      </View>

      <LanguagePicker
        visible={languagePickerVisible}
        selected={targetLanguage}
        onSelect={(code) => {
          setTargetLanguage(code);
          setLanguagePickerVisible(false);
        }}
        onClose={() => setLanguagePickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    position: 'relative',
    height: 40,
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 100,
    justifyContent: 'center',
  },
  toggleThumb: {
    position: 'absolute',
    left: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5EDE1',
  },
  pairPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  upgradeButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
});
