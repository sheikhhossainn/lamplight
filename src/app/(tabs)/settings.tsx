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
import { FeedbackModal } from '@/components/FeedbackModal';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useReadingTheme } from '@/features/settings/readingTheme';
import {
  requestThemeChange,
  THEME_TRANSITION_DURATION,
  THEME_TRANSITION_EASING,
  themeTransitionProgress,
} from '@/features/settings/themeTransition';
import { hapticThemeToggle } from '@/lib/haptics';
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
  const { cultureTheme, radius, typography } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');

  const segWidth = useSharedValue(0);

  const handleSelect = (target: 'day' | 'lamp') => {
    if (theme === target) return;
    void hapticThemeToggle();
    onThemeChange(target);
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const w = segWidth.value;
    return {
      width: w > 0 ? w : '50%',
      transform: [{ translateX: themeAnim.value * w }],
    };
  });

  const sunAnimatedStyle = useAnimatedStyle(() => {
    const p = themeAnim.value;
    const rotate = interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const lampAnimatedStyle = useAnimatedStyle(() => {
    const p = themeAnim.value;
    const rotate = interpolate(p, [0, 1], [-15, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const sunActiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.value,
  }));
  const sunInactiveStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.value,
  }));

  const lampActiveStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.value,
  }));
  const lampInactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.value,
  }));

  const dayContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(themeAnim.value, [0, 1], [1, 0.72], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(themeAnim.value, [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
  }));

  const lampContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(themeAnim.value, [0, 1], [0.72, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(themeAnim.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.segmentedTrack, lampColors.segmentedTrack],
    ),
  }), [dayColors, lampColors]);

  const animatedPillColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.primaryDark, lampColors.primaryDark],
    ),
  }), [dayColors, lampColors]);

  const dayLabelStyle = useAnimatedStyle(() => {
    const activeColor = '#F5EDE1';
    const inactiveColor = interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.umber, lampColors.fawn],
    );
    return {
      color: interpolateColor(themeAnim.value, [0, 1], [activeColor, inactiveColor]),
    };
  }, [dayColors, lampColors]);

  const nightLabelStyle = useAnimatedStyle(() => {
    const activeColor = '#F5EDE1';
    const inactiveColor = interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.umber, lampColors.fawn],
    );
    return {
      color: interpolateColor(themeAnim.value, [0, 1], [inactiveColor, activeColor]),
    };
  }, [dayColors, lampColors]);

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
          animatedPillColorStyle,
          { borderRadius: radius.pill },
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
                <ThemeSunIcon color={dayColors.flameAmber} size={14} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, sunInactiveStyle]}>
                <ThemeSunIcon color={dayColors.umber} size={14} />
              </Animated.View>
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              typography.uiRowTitle,
              dayLabelStyle,
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
                <ThemeMoonIcon color={lampColors.flameAmber} size={14} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centered, lampInactiveStyle]}>
                <ThemeMoonIcon color={dayColors.umber} size={14} />
              </Animated.View>
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              typography.uiRowTitle,
              nightLabelStyle,
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
      <View style={[styles.toggleTrack, { backgroundColor: value ? colors.flameAmber : colors.hairline }]}>
        <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      </View>
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
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
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
  const themeAnim = themeTransitionProgress;
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');

  const animatedContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.parchment, lampColors.parchment],
    ),
  }), [dayColors, lampColors]);

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
  }), [dayColors, lampColors]);

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
      <Text style={[typography.screenTitle, { color: colors.ink, marginBottom: spacing.lg }]}>
        Settings
      </Text>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Appearance
      </Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            borderRadius: radius.card,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginBottom: 10 }]}>
          Reading theme
        </Text>
        <ThemeSegmentedSwitch theme={theme} themeAnim={themeAnim} onThemeChange={requestThemeChange} />
        <CultureEditionBanner compact themeProgress={themeAnim} />

        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline, marginVertical: 12 }]} />
        <View style={styles.settingsRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Change themes
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
              {literaryThemeOption.title} · {literaryThemeOption.paletteLabel ?? literaryThemeOption.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => setLiteraryThemePickerVisible(true)}
            style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
              {literaryThemeOption.title}
            </Text>
            <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <ChevronRightIcon color={colors.straw} size={14} />
            </View>
          </Pressable>
        </View>
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Reading
      </Text>
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
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Page-turn sound</Text>
          <ToggleSwitch value={pageTurnSound} onChange={setPageTurnSoundEnabled} themeAnim={themeAnim} />
        </View>
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Language
      </Text>
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
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Mother tongue
          </Text>
          <Pressable
            onPress={() => setMotherTonguePickerVisible(true)}
            style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
          >
            <LanguageBadge code={motherTongueOption.code} size={20} isSelected />
            <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
              {motherTongueOption.nativeName}
            </Text>
          </Pressable>
        </View>
        <View style={styles.settingsRow}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Default translation pair
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
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Storage
      </Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            borderRadius: radius.card,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push('/saved-books')}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Saved books
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
              {storageUsage
                ? `${(storageUsage.downloadsBytes / (1024 * 1024)).toFixed(1)} MB (${storageUsage.downloadedBookCount} ${storageUsage.downloadedBookCount === 1 ? 'book' : 'books'})`
                : 'Downloaded reading'}
            </Text>
          </View>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.straw} size={15} />
          </View>
        </Pressable>

        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />

        <View style={[styles.settingsRow, { paddingVertical: 10 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Temporary app cache
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
              {storageUsage
                ? `${(storageUsage.rebuildableCacheBytes / (1024 * 1024)).toFixed(1)} MB (${storageUsage.cacheEntryCount} entries)`
                : 'Translations & covers'}
            </Text>
          </View>
          <Pressable
            onPress={handleClearCache}
            disabled={clearingCache}
            style={[
              styles.upgradeButton,
              {
                backgroundColor: isLamp ? '#3A342D' : colors.segmentedTrack,
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
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 11 }]}>Clear</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Account
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isLamp ? colors.card : colors.primaryDark,
            borderColor: isLamp ? colors.hairline : colors.primaryDark,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.settingsRow}>
          <View>
            <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 13 }]}>
              {isPremium ? (entitlement.source === 'promo' ? 'Promo Pass' : 'Premium Plan') : 'Free Plan'}
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                { color: isLamp ? colors.fawn : colors.mutedOnDark, fontSize: 11, marginTop: 2 },
              ]}
            >
              {isPremium
                ? 'Unlimited translations'
                : translationsLeft === undefined
                  ? 'Checking translations left…'
                  : `${translationsLeft} translations left today`}
            </Text>
          </View>
          {isPremium ? (
            <View
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: isLamp ? '#3A342D' : colors.segmentedTrack,
                  borderRadius: radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Active</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Upgrade</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.itemDivider, { borderBottomColor: isLamp ? colors.hairline : '#2B2621' }]} />

        <Pressable
          onPress={() => setPromoModalVisible(true)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 13 }]}>
            Redeem promo code
          </Text>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.flameAmber} size={14} />
          </View>
        </Pressable>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Cloud Sync
      </Text>
      <Animated.View
        style={[
          styles.card,
          styles.settingsRow,
          animatedCardStyle,
          {
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Cloud Sync
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
            {syncSubtitle(syncStatus)}
          </Text>
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

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Feedback
      </Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            borderRadius: radius.card,
          },
        ]}
      >
        <Pressable
          onPress={() => setFeedbackModalVisible(true)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Rate & share feedback
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
              Help us improve translations and features
            </Text>
          </View>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.straw} size={15} />
          </View>
        </Pressable>
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        About
      </Text>
      <Animated.View
        style={[
          styles.card,
          styles.settingsRow,
          animatedCardStyle,
          {
            borderRadius: radius.card,
          },
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

      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
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
