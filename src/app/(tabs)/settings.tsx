import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { AccountProtectionModal } from '@/components/AccountProtectionModal';
import {
  isAuthenticatedAccount,
  getUserEmail,
  getUserId,
  signOutUser,
} from '@/lib/supabaseAuth';
import { getDb } from '@/db/client';
import { refreshSyncStatus, triggerSync, useSyncStatus, type SyncStatus } from '@/features/sync/syncWorker';
import { getStorageUsage, clearTemporaryCache, getUnsyncedSafetyStatus, type StorageUsage } from '@/features/storage/storageManager';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RedeemPromoModal } from '@/components/RedeemPromoModal';
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
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>(getEntitlementSnapshot());

  const [isProtected, setIsProtected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountProtectionModalVisible, setAccountProtectionModalVisible] = useState(false);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [restoreDialogVisible, setRestoreDialogVisible] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const refreshAccountStatus = useCallback(async () => {
    try {
      const [authStatus, email, uid] = await Promise.all([
        isAuthenticatedAccount(),
        getUserEmail(),
        getUserId(),
      ]);
      setIsProtected(authStatus);
      setUserEmail(email);
      setUserId(uid);
    } catch (err) {
      console.warn('[Settings] Error refreshing account status:', err);
    }
  }, []);

  const handleCopySupportId = async () => {
    if (!userId) return;
    await Clipboard.setStringAsync(userId);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      const db = await getDb();
      const [savedWords, highlights, readingPositions, shelves, shelfItems, reviewEvents, quizAttempts] =
        await Promise.all([
          db.getAllAsync('SELECT * FROM saved_words'),
          db.getAllAsync('SELECT * FROM highlights'),
          db.getAllAsync('SELECT * FROM reading_positions'),
          db.getAllAsync('SELECT * FROM shelves'),
          db.getAllAsync('SELECT * FROM shelf_items'),
          db.getAllAsync('SELECT * FROM review_events'),
          db.getAllAsync('SELECT * FROM quiz_attempts'),
        ]);

      const payload = {
        app: 'Lamplight',
        version: Constants.expoConfig?.version ?? '1.0.0',
        exportedAt: new Date().toISOString(),
        userId: userId ?? 'guest',
        data: {
          savedWords,
          highlights,
          readingPositions,
          shelves,
          shelfItems,
          reviewEvents,
          quizAttempts,
        },
      };

      const file = new File(Paths.cache, `lamplight-backup-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Lamplight Reading Data',
          UTI: 'public.json',
        });
      }
    } catch (err) {
      console.warn('[Settings] Failed to export data:', err);
    } finally {
      setExportingData(false);
    }
  };

  const handleConfirmRestore = async () => {
    setRestoreDialogVisible(false);
    try {
      await triggerSync({ forceImmediate: true });
      loadStorage();
      await refreshAccountStatus();
    } catch (err) {
      console.warn('[Settings] Failed to restore backup:', err);
    }
  };

  const handleSignOutKeepData = async () => {
    setSignOutDialogVisible(false);
    await signOutUser(true);
    await refreshAccountStatus();
    await refreshSyncStatus();
  };

  const handleSignOutRemoveData = async () => {
    setSignOutDialogVisible(false);
    await signOutUser(false);
    await refreshAccountStatus();
    await refreshSyncStatus();
    loadStorage();
  };

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
      void refreshAccountStatus();

      return () => {
        cancelled = true;
      };
    }, [loadStorage, refreshAccountStatus]),
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
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
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
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Reading
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
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
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Language
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
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
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Storage
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
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
      </View>

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
            marginBottom: spacing.xl,
          },
        ]}
      >
        {/* Status header */}
        <View style={styles.settingsRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 13 }]}>
                {isProtected
                  ? isPremium
                    ? 'Premium Plan'
                    : 'Protected Account'
                  : 'Guest Library'}
              </Text>
              <View
                style={{
                  backgroundColor: isProtected
                    ? (isPremium ? colors.flameAmber : 'rgba(127, 163, 122, 0.25)')
                    : 'rgba(245, 237, 225, 0.12)',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                }}
              >
                <Text
                  style={{
                    color: isProtected
                      ? (isPremium ? colors.primaryDark : '#7FA37A')
                      : colors.fawn,
                    fontSize: 10,
                    fontFamily: 'Manrope_700Bold',
                  }}
                >
                  {isProtected ? (isPremium ? 'PREMIUM' : 'PROTECTED') : 'GUEST'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.metadataCaption,
                { color: isLamp ? colors.fawn : colors.mutedOnDark, fontSize: 11, marginTop: 3 },
              ]}
              numberOfLines={1}
            >
              {isProtected
                ? userEmail
                  ? `${userEmail} · ${isPremium ? (entitlement.expiresAt ? `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}` : 'Active') : 'Free Plan'}`
                  : 'Free Plan · Protected'
                : 'Your library is only on this device'}
            </Text>
          </View>

          {/* Action button */}
          {!isProtected ? (
            <Pressable
              onPress={() => setAccountProtectionModalVisible(true)}
              style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>
                Protect and sync
              </Text>
            </Pressable>
          ) : !isPremium ? (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>
                Upgrade
              </Text>
            </Pressable>
          ) : (
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
          )}
        </View>

        {/* Copyable Support ID Row */}
        {userId ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: isLamp ? colors.hairline : '#2B2621' }]} />
            <View style={[styles.settingsRow, { paddingVertical: 8 }]}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 12 }]}>
                  Support ID
                </Text>
                <Text
                  style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}
                  numberOfLines={1}
                >
                  {userId}
                </Text>
              </View>
              <Pressable
                onPress={handleCopySupportId}
                hitSlop={8}
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: isLamp ? colors.segmentedTrack : 'rgba(245, 237, 225, 0.08)',
                    borderRadius: radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 11 }]}>
                  {copiedToast ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* Cloud Backup & Sync (for protected accounts) */}
        {isProtected ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: isLamp ? colors.hairline : '#2B2621' }]} />
            <View style={[styles.settingsRow, { paddingVertical: 8 }]}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 12 }]}>
                  Cloud Backup & Sync
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
                  {syncSubtitle(syncStatus)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setRestoreDialogVisible(true)}
                  disabled={syncStatus === 'syncing'}
                  style={[
                    styles.upgradeButton,
                    {
                      backgroundColor: isLamp ? colors.segmentedTrack : 'rgba(245, 237, 225, 0.08)',
                      borderRadius: radius.pill,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 11 }]}>
                    Restore
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void triggerSync({ forceImmediate: true })}
                  disabled={syncStatus === 'syncing'}
                  style={[
                    styles.upgradeButton,
                    {
                      backgroundColor:
                        syncStatus === 'syncing'
                          ? colors.fawn
                          : colors.flameAmber,
                      borderRadius: radius.pill,
                      paddingHorizontal: 11,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                      Back up now
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {/* Export Reading Data */}
        <View style={[styles.itemDivider, { borderBottomColor: isLamp ? colors.hairline : '#2B2621' }]} />
        <Pressable
          onPress={handleExportData}
          disabled={exportingData}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: isLamp ? colors.ink : colors.lampText, fontSize: 13 }]}>
              Export reading data
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
              JSON backup of words, highlights & reading positions
            </Text>
          </View>
          {exportingData ? (
            <ActivityIndicator size="small" color={colors.flameAmber} />
          ) : (
            <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRightIcon color={isLamp ? colors.straw : colors.fawn} size={14} />
            </View>
          )}
        </Pressable>

        {/* Redeem promo code */}
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

        {/* Sign Out (Protected accounts only) */}
        {isProtected ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: isLamp ? colors.hairline : '#2B2621' }]} />
            <Pressable
              onPress={() => setSignOutDialogVisible(true)}
              style={[styles.settingsRow, { paddingVertical: 10 }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.highlight.clay, fontSize: 13 }]}>
                Sign out
              </Text>
              <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRightIcon color={colors.highlight.clay} size={14} />
              </View>
            </Pressable>
          </>
        ) : null}
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        About
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
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
      </View>

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

      <AccountProtectionModal
        visible={accountProtectionModalVisible}
        onClose={() => setAccountProtectionModalVisible(false)}
        onSuccess={() => {
          void refreshAccountStatus();
          void refreshSyncStatus();
          loadStorage();
        }}
      />

      <ConfirmDialog
        visible={restoreDialogVisible}
        title="Restore Library Backup"
        message="This will sync and pull your latest backed up reading progress, saved words, and highlights from your account into this device."
        confirmLabel="Restore"
        cancelLabel="Cancel"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreDialogVisible(false)}
      />

      <Modal
        visible={signOutDialogVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSignOutDialogVisible(false)}
      >
        <Pressable style={styles.dialogBackdrop} onPress={() => setSignOutDialogVisible(false)}>
          <Pressable
            style={[
              styles.dialogCard,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
            onPress={() => {}}
          >
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
              Sign out of Lamplight?
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
              Would you like to keep your reading progress and saved vocabulary on this device, or remove it?
            </Text>

            <View style={{ marginTop: spacing.lg, gap: 10 }}>
              <Pressable
                onPress={handleSignOutKeepData}
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    paddingVertical: 12,
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                  Keep data on this device
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSignOutRemoveData}
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.highlight.clay,
                    borderRadius: radius.pill,
                    paddingVertical: 12,
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.highlight.clay, fontSize: 13 }]}>
                  Remove data from this device
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSignOutDialogVisible(false)}
                style={{ paddingVertical: 8, alignItems: 'center' }}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
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
