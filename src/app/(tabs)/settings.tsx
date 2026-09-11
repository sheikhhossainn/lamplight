import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
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
import { MotherTonguePicker } from '@/components/MotherTonguePicker';
import {
  getMotherTongueOption,
  setMotherTongue,
  useMotherTongue,
} from '@/features/settings/motherTongue';
import { useTheme } from '@/theme/ThemeProvider';
import { LamplightColor, Layout, Spacing } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAY_COLORS = {
  parchment: '#F5EDE1',
  card: '#F8F1E6',
  hairline: '#E2D3B8',
  ink: '#2B2621',
  fawn: '#8A7F6E',
  straw: '#C6B896',
  segmentedTrack: '#E9DEC9',
  accountBg: '#1C1B1E',
  accountBorder: '#1C1B1E',
  accountSubtext: '#B7ADA0',
} as const;

const LAMP_COLORS = {
  parchment: '#1C1B1E',
  card: '#26232A',
  hairline: '#332F2B',
  ink: '#F0E6D6',
  fawn: '#9C9186',
  straw: '#6B6255',
  segmentedTrack: '#2A2723',
  accountBg: '#26232A',
  accountBorder: '#332F2B',
  accountSubtext: '#9C9186',
} as const;

// Calm, slow, butter-smooth glide for theme switching
const GLIDE_DURATION = 420;
const GLIDE_EASING = Easing.bezier(0.25, 1, 0.5, 1);

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

function ThemeSegmentedSwitch({
  theme,
  themeAnim,
  onThemeChange,
}: {
  theme: 'day' | 'lamp';
  themeAnim: SharedValue<number>;
  onThemeChange: (next: 'day' | 'lamp') => void;
}) {
  const { colors, radius, typography } = useTheme();

  // Progress: 0 = day, 1 = lamp
  const progress = useSharedValue(theme === 'lamp' ? 1 : 0);
  const segWidth = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if external theme changes
  useEffect(() => {
    const target = theme === 'lamp' ? 1 : 0;
    if (Math.round(progress.value) !== target) {
      progress.value = withTiming(target, {
        duration: GLIDE_DURATION,
        easing: GLIDE_EASING,
      });
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

    // 1. Slow, butter-smooth glide for the sliding pill across left and right
    progress.value = withTiming(targetVal, {
      duration: GLIDE_DURATION,
      easing: GLIDE_EASING,
    });

    // 2. Coordinated smooth bezier transition across the whole Settings screen
    themeAnim.value = withTiming(targetVal, {
      duration: GLIDE_DURATION,
      easing: GLIDE_EASING,
    });

    // 3. Commit theme store change once the slow glide completes
    timeoutRef.current = setTimeout(() => {
      onThemeChange(target);
    }, GLIDE_DURATION);
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const w = segWidth.value;
    return {
      width: w > 0 ? w : '50%',
      transform: [{ translateX: progress.value * w }],
    };
  });

  const sunAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const rotate = interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const lampAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const rotate = interpolate(p, [0, 1], [-15, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const sunActiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));
  const sunInactiveStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const lampActiveStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const lampInactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const dayContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.55], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
  }));

  const lampContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.segmentedTrack, LAMP_COLORS.segmentedTrack],
    ),
  }));

  return (
    <Animated.View
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        if (width > 0) {
          segWidth.value = (width - 6) / 2;
        }
      }}
      style={[styles.segmented, animatedTrackStyle, { borderRadius: radius.pill }]}
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
            <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, sunActiveStyle]}>
                <SunIcon color={LamplightColor.flameAmber} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, sunInactiveStyle]}>
                <SunIcon color={DAY_COLORS.fawn} />
              </Animated.View>
            </View>
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
            <View style={{ width: 12, height: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, lampActiveStyle]}>
                <LampDropIcon color={LamplightColor.flameAmber} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, lampInactiveStyle]}>
                <LampDropIcon color={DAY_COLORS.fawn} />
              </Animated.View>
            </View>
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
    </Animated.View>
  );
}

function ToggleSwitch({
  value,
  onChange,
  themeAnim,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  themeAnim?: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const translateX = useSharedValue(value ? 16 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 16 : 0, {
      duration: 200,
      dampingRatio: 0.85,
      reduceMotion: ReduceMotion.System,
    });
  }, [value, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackAnimatedStyle = useAnimatedStyle(() => {
    if (value) {
      return { backgroundColor: LamplightColor.flameAmber };
    }
    const hairline = themeAnim
      ? interpolateColor(themeAnim.value, [0, 1], [DAY_COLORS.hairline, LAMP_COLORS.hairline])
      : colors.hairline;
    return { backgroundColor: hairline };
  });

  const handlePress = () => {
    const next = !value;
    translateX.value = withSpring(next ? 16 : 0, {
      duration: 200,
      dampingRatio: 0.85,
      reduceMotion: ReduceMotion.System,
    });
    onChange(next);
  };

  return (
    <Pressable hitSlop={8} onPress={handlePress}>
      <Animated.View style={[styles.toggleTrack, trackAnimatedStyle]}>
        <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      </Animated.View>
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
  const motherTongue = useMotherTongue();
  const motherTongueOption = getMotherTongueOption(motherTongue);
  const pageTurnSound = usePageTurnSoundEnabled();
  // undefined = not known yet, null = unlimited (premium). Collapsing those two
  // into null made the row flash "Unlimited translations" on every focus while
  // the server round-trip was still in flight.
  const [translationsLeft, setTranslationsLeft] = useState<number | null | undefined>(undefined);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [motherTonguePickerVisible, setMotherTonguePickerVisible] = useState(false);

  const isLamp = theme === 'lamp';
  const themeAnim = useSharedValue(isLamp ? 1 : 0);

  useEffect(() => {
    themeAnim.value = withTiming(isLamp ? 1 : 0, {
      duration: GLIDE_DURATION,
      easing: GLIDE_EASING,
    });
  }, [isLamp, themeAnim]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.parchment, LAMP_COLORS.parchment],
    ),
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.card, LAMP_COLORS.card],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.hairline, LAMP_COLORS.hairline],
    ),
  }));

  const animatedAccountCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.accountBg, LAMP_COLORS.accountBg],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.accountBorder, LAMP_COLORS.accountBorder],
    ),
  }));

  const animatedInkTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.ink, LAMP_COLORS.ink],
    ),
  }));

  const animatedFawnTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.fawn, LAMP_COLORS.fawn],
    ),
  }));

  const animatedAccountSubtextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [DAY_COLORS.accountSubtext, LAMP_COLORS.accountSubtext],
    ),
  }));

  const dayChevronStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.value,
  }));
  const nightChevronStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.value,
  }));

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
    <Animated.ScrollView
      style={[styles.container, animatedContainerStyle]}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: insets.top + 16,
        paddingBottom: TAB_BAR_CLEARANCE,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Text style={[typography.screenTitle, animatedInkTextStyle, { marginBottom: spacing.lg }]}>
        Settings
      </Animated.Text>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Appearance
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13, marginBottom: 10 }]}>
          Reading theme
        </Animated.Text>
        <ThemeSegmentedSwitch theme={theme} themeAnim={themeAnim} onThemeChange={setReadingTheme} />
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Reading
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { borderRadius: radius.card, marginBottom: spacing.xl, paddingVertical: 4 },
        ]}
      >
        <View style={styles.settingsRow}>
          <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>Page-turn sound</Animated.Text>
          <ToggleSwitch value={pageTurnSound} onChange={setPageTurnSoundEnabled} themeAnim={themeAnim} />
        </View>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Language
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            borderRadius: radius.card,
            marginBottom: spacing.xl,
            paddingVertical: 4,
          },
        ]}
      >
        <View style={styles.settingsRow}>
          <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
            Mother tongue
          </Animated.Text>
          <Pressable
            onPress={() => setMotherTonguePickerVisible(true)}
            style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
              {motherTongueOption.flag} {motherTongueOption.nativeName}
            </Text>
          </Pressable>
        </View>
        <View style={styles.settingsRow}>
          <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
            Default translation pair
          </Animated.Text>
          <Pressable
            onPress={() => setLanguagePickerVisible(true)}
            style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
              EN → {targetLanguageLabel(targetLanguage)}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Storage
      </Animated.Text>
      <AnimatedPressable
        onPress={() => router.push('/saved-books')}
        style={[
          styles.card,
          styles.settingsRow,
          animatedCardStyle,
          { borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>Saved books</Animated.Text>
        <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.centered, dayChevronStyle]}>
            <ChevronRightIcon color={DAY_COLORS.straw} size={15} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.centered, nightChevronStyle]}>
            <ChevronRightIcon color={LAMP_COLORS.straw} size={15} />
          </Animated.View>
        </View>
      </AnimatedPressable>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Account
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          styles.settingsRow,
          animatedAccountCardStyle,
          { borderRadius: radius.card },
        ]}
      >
        <View>
          <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13 }]}>
            Free plan
          </Text>
          <Animated.Text
            style={[
              typography.metadataCaption,
              animatedAccountSubtextStyle,
              { fontSize: 11, marginTop: 2 },
            ]}
          >
            {translationsLeft === undefined
              ? 'Checking translations left…'
              : translationsLeft === null
                ? 'Unlimited translations'
                : `${translationsLeft} translations left today`}
          </Animated.Text>
        </View>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Upgrade</Text>
        </Pressable>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        About
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          styles.settingsRow,
          animatedCardStyle,
          { borderRadius: radius.card },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
            Lamplight {Constants.expoConfig?.version ?? ''}
          </Animated.Text>
          <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
            {updateStatusLabel(updateStatus, downloadProgress)}
          </Animated.Text>
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
      </Animated.View>

      <MotherTonguePicker
        visible={motherTonguePickerVisible}
        selected={motherTongue}
        onSelect={(code) => {
          setMotherTongue(code);
          setMotherTonguePickerVisible(false);
        }}
        onClose={() => setMotherTonguePickerVisible(false)}
      />

      <LanguagePicker
        visible={languagePickerVisible}
        selected={targetLanguage}
        onSelect={(code) => {
          setTargetLanguage(code);
          setLanguagePickerVisible(false);
        }}
        onClose={() => setLanguagePickerVisible(false)}
      />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
