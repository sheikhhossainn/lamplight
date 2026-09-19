import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { ChevronRightIcon, MoonIcon as ThemeMoonIcon, SunIcon as ThemeSunIcon } from '@/components/icons';
import { CultureEditionBanner } from '@/components/CultureEditionBanner';
import {
  useAppUpdateBanner,
  type AppUpdateStatus,
} from '@/features/app-update/useAppUpdateBanner';
import { refreshSyncStatus, triggerSync, useSyncStatus, type SyncStatus } from '@/features/sync/syncWorker';
import { getStorageUsage, clearTemporaryCache, getUnsyncedSafetyStatus, type StorageUsage } from '@/features/storage/storageManager';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RedeemPromoModal } from '@/components/RedeemPromoModal';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useReadingTheme } from '@/features/settings/readingTheme';
import { requestThemeChange } from '@/features/settings/themeTransition';
import { setPageTurnSoundEnabled, usePageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import {
  isPremiumUser,
  getEntitlementSnapshot,
  subscribeToEntitlements,
  type EntitlementSnapshot,
} from '@/features/subscription/subscriptionState';
import {
  checkCachedTranslationCap,
  checkTranslationCap,
  FREE_DAILY_TRANSLATION_LIMIT,
} from '@/features/translation';
import type { CapCheck } from '@/features/translation/capPolicy';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MotherTonguePicker } from '@/components/MotherTonguePicker';
import { LiteraryThemePicker } from '@/components/LiteraryThemePicker';
import { LanguageBadge } from '@/components/LanguageBadge';
import {
  getMotherTongueOption,
  setMotherTongue,
  useMotherTongue,
} from '@/features/settings/motherTongue';
import {
  getLiteraryThemeOption,
  setLiteraryTheme,
  useLiteraryTheme,
} from '@/features/settings/literaryTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureThemeColors, Layout, Spacing } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Theme is an occasional state change, not a cinematic transition. Keep every
// Settings surface on one short UI-thread clock so text never trails a card.
const GLIDE_DURATION = 200;
const GLIDE_EASING = Easing.bezier(0.25, 1, 0.5, 1);

// Clear the tab bar so the last row isn't half-hidden behind it.
const TAB_BAR_CLEARANCE = Layout.tabBarHeight + Spacing.xl;

function ThemeSegmentedSwitch({
  theme,
  themeAnim,
  onThemeChange,
}: {
  theme: 'day' | 'lamp';
  themeAnim: SharedValue<number>;
  onThemeChange: (next: 'day' | 'lamp') => void;
}) {
  const { colors, cultureTheme, radius, typography } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');

  // Progress: 0 = day, 1 = lamp
  const progress = useSharedValue(theme === 'lamp' ? 1 : 0);
  const segWidth = useSharedValue(0);

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

  const handleSelect = (target: 'day' | 'lamp') => {
    if (theme === target) return;

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

    // Commit globally now. The root overlay keeps the crossfade coherent while
    // the navigator receives its new tab-bar colours in the same transition.
    onThemeChange(target);
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
      [dayColors.segmentedTrack, lampColors.segmentedTrack],
    ),
  }));

  const animatedSegmentLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.lampText, lampColors.lampText],
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
                <ThemeSunIcon color={colors.flameAmber} size={14} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, sunInactiveStyle]}>
                <ThemeSunIcon color={dayColors.fawn} size={14} />
              </Animated.View>
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              typography.uiRowTitle,
              animatedSegmentLabelStyle,
              { fontSize: 12, marginLeft: 6 },
            ]}
          >
            Day
          </Animated.Text>
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
                <ThemeMoonIcon color={colors.flameAmber} size={14} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, lampInactiveStyle]}>
                <ThemeMoonIcon color={dayColors.fawn} size={14} />
              </Animated.View>
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              typography.uiRowTitle,
              animatedSegmentLabelStyle,
              { fontSize: 12, marginLeft: 6 },
            ]}
          >
            Night
          </Animated.Text>
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
  const { colors, cultureTheme } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
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
      return { backgroundColor: colors.flameAmber };
    }
    const hairline = themeAnim
      ? interpolateColor(themeAnim.value, [0, 1], [dayColors.hairline, lampColors.hairline])
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

function syncSubtitle(status: SyncStatus): string {
  switch (status) {
    case 'guest':
      return 'Log in to sync';
    case 'syncing':
      return 'Syncing reading progress…';
    case 'offline_saved':
      return 'Connection problem · Offline';
    case 'needs_attention':
      return 'Syncing problem · Tap to retry';
    case 'synced':
    default:
      return 'Up to date · Synced just now';
  }
}

export default function SettingsScreen() {
  const { colors, cultureTheme, typography, spacing, radius } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  const insets = useSafeAreaInsets();
  const { status: updateStatus, downloadProgress, applyUpdate } = useAppUpdateBanner();
  const syncStatus = useSyncStatus();

  const theme = useReadingTheme();
  const targetLanguage = useTargetLanguage();
  const motherTongue = useMotherTongue();
  const motherTongueOption = getMotherTongueOption(motherTongue);
  const pageTurnSound = usePageTurnSoundEnabled();
  // undefined = not known yet, null = unlimited (premium). We default to the
  // full daily limit so the screen paints immediately without an infinite
  // "Checking translations left…" hang, which cached/server reads then refine.
  const [translationsLeft, setTranslationsLeft] = useState<number | null | undefined>(
    isPremiumUser() ? null : FREE_DAILY_TRANSLATION_LIMIT,
  );
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [motherTonguePickerVisible, setMotherTonguePickerVisible] = useState(false);
  const literaryTheme = useLiteraryTheme();
  const literaryThemeOption = getLiteraryThemeOption(literaryTheme);
  const [literaryThemePickerVisible, setLiteraryThemePickerVisible] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [syncAndClearDialogVisible, setSyncAndClearDialogVisible] = useState(false);
  const [offlineBlockedDialogVisible, setOfflineBlockedDialogVisible] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [accountProtectionDialogVisible, setAccountProtectionDialogVisible] = useState(false);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>(getEntitlementSnapshot());

  useEffect(() => {
    return subscribeToEntitlements(setEntitlement);
  }, []);

  const isPremium = entitlement.status === 'premium' || entitlement.status === 'trial' || entitlement.status === 'grace';

  const loadStorage = useCallback(() => {
    getStorageUsage().then(setStorageUsage).catch(() => {});
  }, []);

  const handleClearCache = async () => {
    if (clearingCache) return;
    setClearingCache(true);
    try {
      const safety = await getUnsyncedSafetyStatus();
      if (!safety.canSafelyClear) {
        setUnsyncedCount(safety.pendingCount);
        if (safety.isOffline) {
          setOfflineBlockedDialogVisible(true);
        } else {
          setSyncAndClearDialogVisible(true);
        }
        return;
      }

      await clearTemporaryCache();
      loadStorage();
    } catch (err) {
      console.warn('[Settings] Error clearing cache:', err);
    } finally {
      setClearingCache(false);
    }
  };

  const handleConfirmSyncAndClear = async () => {
    setSyncAndClearDialogVisible(false);
    setClearingCache(true);
    try {
      await triggerSync({ forceImmediate: true });
      await clearTemporaryCache();
      loadStorage();
    } catch (err) {
      console.warn('[Settings] Error during sync and clear:', err);
    } finally {
      setClearingCache(false);
    }
  };

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
      [dayColors.parchment, lampColors.parchment],
    ),
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.card, lampColors.card],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.hairline, lampColors.hairline],
    ),
  }));

  const animatedAccountCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.primaryDark, lampColors.card],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.primaryDark, lampColors.hairline],
    ),
  }));

  const animatedInkTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.ink, lampColors.ink],
    ),
  }));

  const animatedFawnTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.fawn, lampColors.fawn],
    ),
  }));

  const animatedAccountSubtextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.mutedOnDark, lampColors.fawn],
    ),
  }));

  const animatedPairPillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.pairPillBackground, lampColors.pairPillBackground],
    ),
  }));

  const animatedPairPillTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.pairPillText, lampColors.pairPillText],
    ),
  }));

  const animatedLampTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.lampText, lampColors.lampText],
    ),
  }));

  const dayChevronStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.value,
  }));
  const nightChevronStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.value,
  }));

  const animatedDividerStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.hairline, lampColors.hairline],
    ),
  }));

  const animatedAccountDividerStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      ['#2B2621', lampColors.hairline],
    ),
  }));

  const animatedSecondaryButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.segmentedTrack, '#3A342D'],
    ),
  }));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const isPremium = isPremiumUser();
      const apply = (cap: CapCheck) => {
        if (!cancelled) setTranslationsLeft(cap.remaining === Infinity ? null : cap.remaining);
      };

      // Local cache first (no network) so the real count paints immediately;
      // the server read below overwrites it once it lands.
      checkCachedTranslationCap(isPremium).then((cap) => {
        if (!cap || cancelled) return;
        setTranslationsLeft(cap.remaining === Infinity ? null : cap.remaining);
      });
      checkTranslationCap(isPremium)
        .then(apply)
        .catch(() => {
          if (!cancelled) {
            setTranslationsLeft((prev) => prev ?? FREE_DAILY_TRANSLATION_LIMIT);
          }
        });
      loadStorage();
      void refreshSyncStatus();

      return () => {
        cancelled = true;
      };
    }, [loadStorage]),
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
        <ThemeSegmentedSwitch theme={theme} themeAnim={themeAnim} onThemeChange={requestThemeChange} />
        <CultureEditionBanner compact themeProgress={themeAnim} />

        <Animated.View style={[styles.itemDivider, animatedDividerStyle, { marginVertical: 12 }]} />
        <View style={styles.settingsRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
            <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
              Change themes
            </Animated.Text>
            <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
              {literaryThemeOption.title} · {literaryThemeOption.paletteLabel ?? literaryThemeOption.subtitle}
            </Animated.Text>
          </View>
          <AnimatedPressable
            onPress={() => setLiteraryThemePickerVisible(true)}
            style={[styles.pairPill, animatedPairPillStyle, { borderRadius: radius.pill }]}
          >
            <Animated.Text style={[typography.uiRowTitle, animatedPairPillTextStyle, { fontSize: 12 }]}>
              {literaryThemeOption.title}
            </Animated.Text>
            <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, dayChevronStyle]}>
                <ChevronRightIcon color={dayColors.straw} size={14} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, nightChevronStyle]}>
                <ChevronRightIcon color={lampColors.straw} size={14} />
              </Animated.View>
            </View>
          </AnimatedPressable>
        </View>
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
          <AnimatedPressable
            onPress={() => setMotherTonguePickerVisible(true)}
            style={[styles.pairPill, animatedPairPillStyle, { borderRadius: radius.pill }]}
          >
            <LanguageBadge code={motherTongueOption.code} size={20} isSelected />
            <Animated.Text style={[typography.uiRowTitle, animatedPairPillTextStyle, { fontSize: 12 }]}>
              {motherTongueOption.nativeName}
            </Animated.Text>
          </AnimatedPressable>
        </View>
        <View style={styles.settingsRow}>
          <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
            Default translation pair
          </Animated.Text>
          <AnimatedPressable
            onPress={() => setLanguagePickerVisible(true)}
            style={[styles.pairPill, animatedPairPillStyle, { borderRadius: radius.pill }]}
          >
            <Animated.Text style={[typography.uiRowTitle, animatedPairPillTextStyle, { fontSize: 12 }]}>
              EN → {targetLanguageLabel(targetLanguage)}
            </Animated.Text>
          </AnimatedPressable>
        </View>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Storage
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Pressable
          onPress={() => router.push('/saved-books')}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
              Saved books
            </Animated.Text>
            <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
              {storageUsage
                ? `${(storageUsage.downloadsBytes / (1024 * 1024)).toFixed(1)} MB (${storageUsage.downloadedBookCount} ${storageUsage.downloadedBookCount === 1 ? 'book' : 'books'})`
                : 'Downloaded reading'}
            </Animated.Text>
          </View>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.centered, dayChevronStyle]}>
              <ChevronRightIcon color={dayColors.straw} size={15} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.centered, nightChevronStyle]}>
              <ChevronRightIcon color={lampColors.straw} size={15} />
            </Animated.View>
          </View>
        </Pressable>

        <Animated.View style={[styles.itemDivider, animatedDividerStyle]} />

        <View style={[styles.settingsRow, { paddingVertical: 10 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 13 }]}>
              Temporary app cache
            </Animated.Text>
            <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
              {storageUsage
                ? `${(storageUsage.rebuildableCacheBytes / (1024 * 1024)).toFixed(1)} MB (${storageUsage.cacheEntryCount} entries)`
                : 'Translations & covers'}
            </Animated.Text>
          </View>
          <AnimatedPressable
            onPress={handleClearCache}
            disabled={clearingCache}
            style={[
              styles.upgradeButton,
              animatedSecondaryButtonStyle,
              {
                borderRadius: radius.pill,
                minWidth: 64,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            {clearingCache ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Animated.Text style={[typography.uiRowTitle, animatedInkTextStyle, { fontSize: 11 }]}>Clear</Animated.Text>
            )}
          </AnimatedPressable>
        </View>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginBottom: spacing.sm }]}>
        Account
      </Animated.Text>
      <Animated.View
        style={[
          styles.card,
          animatedAccountCardStyle,
          { borderRadius: radius.card },
        ]}
      >
        <View style={styles.settingsRow}>
          <View>
            <Animated.Text style={[typography.uiRowTitle, animatedLampTextStyle, { fontSize: 13 }]}>
              {isPremium ? (entitlement.source === 'promo' ? 'Promo Pass' : 'Premium Plan') : 'Free Plan'}
            </Animated.Text>
            <Animated.Text
              style={[
                typography.metadataCaption,
                animatedAccountSubtextStyle,
                { fontSize: 11, marginTop: 2 },
              ]}
            >
              {isPremium
                ? 'Unlimited translations'
                : translationsLeft === undefined
                  ? 'Checking translations left…'
                  : `${translationsLeft} translations left today`}
            </Animated.Text>
          </View>
          {isPremium ? (
            <Animated.View
              style={[
                styles.upgradeButton,
                animatedSecondaryButtonStyle,
                {
                  borderRadius: radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Active</Text>
            </Animated.View>
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Upgrade</Text>
            </Pressable>
          )}
        </View>

        <Animated.View style={[styles.itemDivider, animatedAccountDividerStyle]} />

        <Pressable
          onPress={() => setPromoModalVisible(true)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <Animated.Text style={[typography.uiRowTitle, animatedLampTextStyle, { fontSize: 13 }]}>
            Redeem promo code
          </Animated.Text>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.flameAmber} size={14} />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.Text style={[typography.eyebrowLabel, animatedFawnTextStyle, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Cloud Sync
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
            Cloud Sync
          </Animated.Text>
          <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
            {syncSubtitle(syncStatus)}
          </Animated.Text>
        </View>
        <Pressable
          onPress={() => {
            if (syncStatus === 'guest') {
              setAccountProtectionDialogVisible(true);
            } else {
              void triggerSync({ forceImmediate: true });
            }
          }}
          disabled={syncStatus === 'syncing'}
          style={[
            styles.upgradeButton,
            {
              backgroundColor:
                syncStatus === 'syncing'
                  ? colors.fawn
                  : syncStatus === 'guest'
                  ? colors.flameAmber
                  : syncStatus === 'offline_saved' || syncStatus === 'needs_attention'
                  ? colors.flameAmber
                  : (isLamp ? 'rgba(245, 237, 225, 0.08)' : 'rgba(28, 27, 30, 0.06)'),
              borderRadius: radius.pill,
              minWidth: 78,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
            },
          ]}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Text
              style={[
                typography.uiRowTitle,
                {
                  color:
                    syncStatus === 'guest' || syncStatus === 'offline_saved' || syncStatus === 'needs_attention'
                      ? colors.primaryDark
                      : colors.fawn,
                  fontSize: 12,
                },
              ]}
            >
              {syncStatus === 'guest'
                ? 'Log in'
                : syncStatus === 'offline_saved' || syncStatus === 'needs_attention'
                ? 'Retry'
                : 'Sync now'}
            </Text>
          )}
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

      <LiteraryThemePicker
        visible={literaryThemePickerVisible}
        selected={literaryTheme}
        onSelect={(code) => {
          setLiteraryTheme(code);
          setLiteraryThemePickerVisible(false);
        }}
        onClose={() => setLiteraryThemePickerVisible(false)}
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

      <RedeemPromoModal
        visible={promoModalVisible}
        onClose={() => setPromoModalVisible(false)}
        onSuccess={() => {
          loadStorage();
        }}
      />

      <ConfirmDialog
        visible={syncAndClearDialogVisible}
        title="Unsynced Changes Detected"
        message={`You have ${unsyncedCount} offline ${unsyncedCount === 1 ? 'change' : 'changes'} waiting to back up to the cloud. Would you like to sync your reading progress first, then clear the cache?`}
        confirmLabel="Sync & Clear Cache"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSyncAndClear}
        onCancel={() => setSyncAndClearDialogVisible(false)}
      />

      <ConfirmDialog
        visible={offlineBlockedDialogVisible}
        title="Cannot Clear Cache Offline"
        message={`You have ${unsyncedCount} offline ${unsyncedCount === 1 ? 'change' : 'changes'} saved on this device. Reconnect to the internet and sync before clearing cache to prevent losing your progress.`}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setOfflineBlockedDialogVisible(false)}
        onCancel={() => setOfflineBlockedDialogVisible(false)}
      />

      <ConfirmDialog
        visible={accountProtectionDialogVisible}
        title="Log In to Sync"
        message="Cloud Sync requires an authenticated account to back up and sync your reading progress, vocabulary, and highlights across devices. All your data is safely saved on this device."
        confirmLabel="Understood"
        cancelLabel="Close"
        onConfirm={() => setAccountProtectionDialogVisible(false)}
        onCancel={() => setAccountProtectionDialogVisible(false)}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  flagIcon: {
    fontSize: 12,
  },
  upgradeButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
