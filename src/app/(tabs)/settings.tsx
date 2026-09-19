import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
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
import { triggerSync, useSyncStatus, type SyncStatus } from '@/features/sync/syncWorker';
import { getStorageUsage, clearTemporaryCache, type StorageUsage } from '@/features/storage/storageManager';
import { RedeemPromoModal } from '@/components/RedeemPromoModal';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useReadingTheme } from '@/features/settings/readingTheme';
import { requestThemeChange, themeTransitionProgress } from '@/features/settings/themeTransition';
import { setPageTurnSoundEnabled, usePageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import {
  isPremiumUser,
  getEntitlementSnapshot,
  subscribeToEntitlements,
  type EntitlementSnapshot,
} from '@/features/subscription/subscriptionState';
import { checkCachedTranslationCap, checkTranslationCap } from '@/features/translation';
import type { CapCheck } from '@/features/translation/capPolicy';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MotherTonguePicker } from '@/components/MotherTonguePicker';
import {
  getMotherTongueOption,
  setMotherTongue,
  useMotherTongue,
} from '@/features/settings/motherTongue';
import { getSuggestedThemeForMotherTongue, setLiteraryTheme } from '@/features/settings/literaryTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureThemeColors, Layout, Spacing } from '@/theme/tokens';
import { getNativeUiTextStyle } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const segWidth = useSharedValue(0);

  const handleSelect = (target: 'day' | 'lamp') => {
    const targetVal = target === 'lamp' ? 1 : 0;
    if (theme === target && Math.abs(themeAnim.get() - targetVal) < 0.001) return;
    onThemeChange(target);
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const w = segWidth.value;
    return {
      width: w > 0 ? w : '50%',
      transform: [{ translateX: themeAnim.get() * w }],
    };
  });

  const sunAnimatedStyle = useAnimatedStyle(() => {
    const p = themeAnim.get();
    const rotate = interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const lampAnimatedStyle = useAnimatedStyle(() => {
    const p = themeAnim.get();
    const rotate = interpolate(p, [0, 1], [-15, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const sunActiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.get(),
  }));
  const sunInactiveStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.get(),
  }));

  const lampActiveStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.get(),
  }));
  const lampInactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.get(),
  }));

  const dayContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(themeAnim.get(), [0, 1], [1, 0.55], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(themeAnim.get(), [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
  }));

  const lampContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(themeAnim.get(), [0, 1], [0.55, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(themeAnim.get(), [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
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
      themeAnim.get(),
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
      ? interpolateColor(themeAnim.get(), [0, 1], [dayColors.hairline, lampColors.hairline])
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

function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'offline_saved':
      return 'Offline — changes saved';
    case 'needs_attention':
      return 'Needs attention';
    case 'synced':
    default:
      return 'Synced';
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
  // undefined = not known yet, null = unlimited (premium). Collapsing those two
  // into null made the row flash "Unlimited translations" on every focus while
  // the server round-trip was still in flight.
  const [translationsLeft, setTranslationsLeft] = useState<number | null | undefined>(undefined);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [motherTonguePickerVisible, setMotherTonguePickerVisible] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
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
    setClearingCache(true);
    await clearTemporaryCache();
    loadStorage();
    setClearingCache(false);
  };

  const themeAnim = themeTransitionProgress;

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
      themeAnim.get(),
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
      themeAnim.get(),
      [0, 1],
      [dayColors.hairline, lampColors.hairline],
    ),
  }));

  const animatedAccountDividerStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      themeAnim.get(),
      [0, 1],
      ['#2B2621', lampColors.hairline],
    ),
  }));

  const animatedSecondaryButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.get(),
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
      // the server read below overwrites it once it lands. Only fills a still-
      // unknown value, so a slow cache read can't clobber a fresher server one.
      checkCachedTranslationCap(isPremium).then((cap) => {
        if (!cap || cancelled) return;
        setTranslationsLeft((prev) =>
          prev === undefined ? (cap.remaining === Infinity ? null : cap.remaining) : prev,
        );
      });
      checkTranslationCap(isPremium).then(apply);
      loadStorage();

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
            <Animated.Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), animatedPairPillTextStyle]}>
              {motherTongueOption.flag} {motherTongueOption.nativeName}
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
            {syncStatusLabel(syncStatus)}
          </Animated.Text>
          <Animated.Text style={[typography.metadataCaption, animatedFawnTextStyle, { fontSize: 11, marginTop: 2 }]}>
            {syncStatus === 'syncing'
              ? 'Backing up words and progress…'
              : syncStatus === 'offline_saved'
              ? 'Changes saved locally on device'
              : syncStatus === 'needs_attention'
              ? 'Sync requires attention'
              : 'All words and reading progress synced'}
          </Animated.Text>
        </View>
        <Pressable
          onPress={() => void triggerSync({ forceImmediate: true })}
          disabled={syncStatus === 'syncing'}
          style={[
            styles.upgradeButton,
            {
              backgroundColor: syncStatus === 'syncing' ? colors.fawn : colors.flameAmber,
              borderRadius: radius.pill,
              minWidth: 72,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          {syncStatus === 'syncing' ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>
              Sync now
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
          setLiteraryTheme(getSuggestedThemeForMotherTongue(code));
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

      <RedeemPromoModal
        visible={promoModalVisible}
        onClose={() => setPromoModalVisible(false)}
        onSuccess={() => {
          loadStorage();
        }}
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
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
