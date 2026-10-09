import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, ChevronRightIcon, MoonIcon as ThemeMoonIcon, SunIcon as ThemeSunIcon } from '@/components/icons';
import { CultureEditionBanner } from '@/components/CultureEditionBanner';
import { ModeSwitch } from '@/components/ModeSwitch';
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
  getUserProfile,
  updateUserProfile,
} from '@/lib/supabaseAuth';
import * as Haptics from 'expo-haptics';
import { FlameGlow } from '@/components/FlameGlow';
import { UserAvatar } from '@/components/UserAvatar';
import {
  PRESET_AVATARS,
  refreshUserAvatar,
  setUserAvatar,
  useUserAvatar,
} from '@/features/account/userAvatar';
import { coordinateSignOut } from '@/features/account/accountSessionCoordinator';
import { getDb } from '@/db/client';
import { refreshSyncStatus, triggerSync, useSyncStatus, type SyncStatus } from '@/features/sync/syncWorker';
import { getStorageUsage, clearTemporaryCache, getUnsyncedSafetyStatus, type StorageUsage } from '@/features/storage/storageManager';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RedeemPromoModal } from '@/components/RedeemPromoModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useReadingTheme } from '@/features/settings/readingTheme';
import {
  prepareThemeChange,
  requestThemeChange,
  THEME_TRANSITION_DURATION,
  THEME_TRANSITION_EASING,
  themeSelectionProgress,
  themeTransitionProgress,
} from '@/features/settings/themeTransition';
import { hapticFlashcardAction, hapticThemeToggle } from '@/lib/haptics';
import {
  PAGE_STYLE_LIST,
  PageStyleConfig,
  type PageStyleId,
  getPageStyleConfig,
} from '@/features/reader/pageStyles';
import { setPageStyle, usePageStyle } from '@/features/settings/pageStylePrefs';
import { PageStyleSelectorModal } from '@/features/reader/components/PageStyleSelectorModal';
import { setPageTurnSoundEnabled, usePageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import {
  canUse,
  getEntitlementSnapshot,
  subscribeToEntitlements,
  type EntitlementSnapshot,
} from '@/features/subscription/subscriptionState';
import {
  checkCachedTranslationCap,
  checkTranslationCap,
  FREE_DAILY_TRANSLATION_LIMIT,
  GUEST_DAILY_TRANSLATION_LIMIT,
} from '@/features/translation';
import type { CapCheck } from '@/features/translation/capPolicy';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MotherTonguePicker } from '@/components/MotherTonguePicker';
import { LiteraryThemePicker } from '@/components/LiteraryThemePicker';
import { LanguageBadge } from '@/components/LanguageBadge';
import {
  getMotherTongueOption,
  setMotherTongue,
  getHomepageLabels,
  useMotherTongue,
} from '@/features/settings/motherTongue';
import { getCultureCardShape } from '@/theme/cultureShape';
import { getNativeUiTextStyle } from '@/theme/typography';
import {
  getLiteraryThemeOption,
  setLiteraryTheme,
  useLiteraryTheme,
} from '@/features/settings/literaryTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureThemeColors, LamplightColor, Layout, Spacing } from '@/theme/tokens';

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
  // Selection (pill, icons) animates separately from colors — see themeTransition.ts.
  const selectAnim = themeSelectionProgress;

  const handleSelect = (target: 'day' | 'lamp') => {
    if (theme === target) return;
    void hapticThemeToggle();
    onThemeChange(target);
  };

  // Capture the transition snapshot while the finger is down, so release is instant.
  const handlePressIn = (target: 'day' | 'lamp') => {
    if (theme !== target) prepareThemeChange();
  };

  // Width is a layout prop — kept out of the per-frame style so the slide only
  // updates transform (no relayout every frame).
  const pillWidthStyle = useAnimatedStyle(() => {
    const w = segWidth.value;
    return { width: w > 0 ? w : '50%' };
  });

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectAnim.value * segWidth.value }],
  }));

  const sunAnimatedStyle = useAnimatedStyle(() => {
    const p = selectAnim.value;
    const rotate = interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const lampAnimatedStyle = useAnimatedStyle(() => {
    const p = selectAnim.value;
    const rotate = interpolate(p, [0, 1], [-15, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const sunActiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - selectAnim.value,
  }));
  const sunInactiveStyle = useAnimatedStyle(() => ({
    opacity: selectAnim.value,
  }));

  const lampActiveStyle = useAnimatedStyle(() => ({
    opacity: selectAnim.value,
  }));
  const lampInactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - selectAnim.value,
  }));

  const dayContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(selectAnim.value, [0, 1], [1, 0.72], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(selectAnim.value, [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
  }));

  const lampContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(selectAnim.value, [0, 1], [0.72, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(selectAnim.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
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
      [dayColors.primaryDark, '#36322D'],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      ['transparent', 'rgba(245, 166, 35, 0.28)'],
    ),
    borderWidth: interpolate(themeAnim.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }), [dayColors, lampColors]);

  const dayLabelStyle = useAnimatedStyle(() => {
    const activeColor = '#F5EDE1';
    const inactiveColor = interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.umber, lampColors.fawn],
    );
    return {
      color: interpolateColor(selectAnim.value, [0, 1], [activeColor, inactiveColor]),
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
      color: interpolateColor(selectAnim.value, [0, 1], [inactiveColor, activeColor]),
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
          pillWidthStyle,
          pillAnimatedStyle,
        ]}
      />
      <Pressable
        hitSlop={6}
        onPressIn={() => handlePressIn('day')}
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
                <ThemeSunIcon color={lampColors.fawn} size={14} />
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
        onPressIn={() => handlePressIn('lamp')}
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
    canUse('unlimited_learning') ? null : GUEST_DAILY_TRANSLATION_LIMIT,
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

  const [isProtected, setIsProtected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Reader');
  const userAvatarState = useUserAvatar();
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('flame');
  const [accountProtectionModalVisible, setAccountProtectionModalVisible] = useState(false);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [restoreDialogVisible, setRestoreDialogVisible] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const refreshAccountStatus = useCallback(async () => {
    try {
      const [authStatus, email, uid, profile] = await Promise.all([
        isAuthenticatedAccount(),
        getUserEmail(),
        getUserId(),
        getUserProfile().catch(() => null),
      ]);
      setIsProtected(authStatus);
      setUserEmail(email);
      setUserId(uid);
      if (profile?.displayName) {
        setDisplayName(profile.displayName);
      }
      if (profile?.avatarUrl && !profile.avatarUrl.startsWith('http')) {
        const clean = profile.avatarUrl.startsWith('preset:') ? profile.avatarUrl.slice(7) : profile.avatarUrl;
        setSelectedPresetId(clean);
      }
      void refreshUserAvatar();
    } catch (err) {
      console.warn('[Settings] Error refreshing account status:', err);
    }
  }, []);

  const handleOpenPromoModal = () => {
    if (!isProtected) {
      Alert.alert(
        'Account Required',
        'Please sign in or create an account first to redeem a promo code and protect your subscription across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login' as any) },
          { text: 'Create Account', onPress: () => router.push('/signup' as any) },
        ],
      );
      return;
    }
    setPromoModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Display name cannot be empty.');
      return;
    }
    setSavingName(true);
    try {
      await updateUserProfile(trimmed);
      setDisplayName(trimmed);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditNameModalVisible(false);
    } catch (err) {
      console.warn('[Settings] Error saving display name:', err);
      Alert.alert('Error', 'Failed to update reading name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    try {
      await setUserAvatar(`preset:${selectedPresetId}`);
      await refreshUserAvatar();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAvatarModalVisible(false);
    } catch (err) {
      console.warn('[Settings] Error saving avatar:', err);
      Alert.alert('Error', 'Failed to update avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

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
    await coordinateSignOut(true);
    await refreshAccountStatus();
    await refreshSyncStatus();
  };

  const handleSignOutRemoveData = async () => {
    setSignOutDialogVisible(false);
    await coordinateSignOut(false);
    await refreshAccountStatus();
    await refreshSyncStatus();
    loadStorage();
  };

  useEffect(() => {
    return subscribeToEntitlements(setEntitlement);
  }, []);

  const isPremium = entitlement.status === 'premium' || entitlement.status === 'trial' || entitlement.status === 'grace';
  const currentStyleId = usePageStyle();
  const [pageStyleModalVisible, setPageStyleModalVisible] = useState(false);

  const handleSelectPageStyle = (style: PageStyleConfig) => {
    if (style.isPremium && !isPremium) {
      router.push({ pathname: '/paywall', params: { feature: 'premium_page_styles' } });
      return;
    }
    void hapticFlashcardAction('graduate');
    setPageStyle(style.id);
  };

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

  const animatedMiniCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      ['#FDFCFA', '#221F24'],
    ),
    borderColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.hairline, lampColors.hairline],
    ),
  }), [dayColors, lampColors]);

  const animatedSampleBoxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeAnim.value,
      [0, 1],
      [dayColors.parchment, '#18171A'],
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
      const isPremium = canUse('unlimited_learning');
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
            setTranslationsLeft((prev) => prev ?? (isProtected ? FREE_DAILY_TRANSLATION_LIMIT : GUEST_DAILY_TRANSLATION_LIMIT));
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
    <Animated.ScrollView
      style={[styles.container, animatedContainerStyle]}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: insets.top + 16,
        paddingBottom: TAB_BAR_CLEARANCE,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ModeSwitch active="read" />
      <Text style={[getNativeUiTextStyle(motherTongue, 'display'), { color: colors.ink, marginBottom: spacing.lg }]}>
        {getHomepageLabels(motherTongue).settingsTitle}
      </Text>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Appearance
      </Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            ...getCultureCardShape(cultureTheme, radius.card),
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

      {/* Account Section: Standout Guest Card or User Dashboard */}
      {!isProtected ? (
        <Animated.View
          style={[
            styles.card,
            animatedCardStyle,
            {
              ...getCultureCardShape(cultureTheme, radius.card),
              marginBottom: spacing.xl,
              borderColor: colors.flameAmber,
              borderWidth: 1.5,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(245, 166, 35, 0.16)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlameGlow size={24} showTile={false} variant="flicker" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, fontWeight: '700' }]}>
                Sign In or Join Lamplight
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                Protect your library & sync across devices
              </Text>
            </View>
          </View>

          <Text
            style={[
              typography.metadataCaption,
              {
                color: colors.ink,
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 14,
                opacity: 0.88,
              },
            ]}
          >
            Create an account or sign in to safeguard your reading streaks, saved vocabulary, notes, and highlights with free cloud backup and 50 daily translations.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/login' as any);
              }}
              style={({ pressed }) => [
                styles.standoutAuthButton,
                {
                  backgroundColor: isLamp ? '#302A24' : colors.segmentedTrack,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log In to your account"
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Log In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/signup' as any);
              }}
              style={({ pressed }) => [
                styles.standoutAuthButton,
                {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Create a new account"
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }]}>
                Create Account
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.card,
            animatedCardStyle,
            {
              ...getCultureCardShape(cultureTheme, radius.card),
              marginBottom: spacing.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setAvatarModalVisible(true);
              }}
              style={styles.avatarPressable}
              accessibilityRole="button"
              accessibilityLabel="Change reading avatar"
            >
              <UserAvatar
                avatar={userAvatarState.avatar}
                size={52}
                nameFallback={displayName}
                border
              />
              <View
                style={[
                  styles.avatarBadge,
                  {
                    backgroundColor: colors.flameAmber,
                    borderColor: colors.card,
                  },
                ]}
              >
                <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke={colors.primaryDark}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setNameInput(displayName);
                    setEditNameModalVisible(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit display name"
                >
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke={colors.fawn}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>

              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                {userEmail || 'Protected Account'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View
                  style={{
                    backgroundColor: canUse('unlimited_learning') ? 'rgba(245, 166, 35, 0.16)' : (isLamp ? '#2B2620' : colors.segmentedTrack),
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text
                    style={[
                      typography.metadataCaption,
                      {
                        color: canUse('unlimited_learning') ? colors.flameAmber : colors.ink,
                        fontSize: 10,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {canUse('unlimited_learning') ? 'Scholar Tier' : 'Free Reader'}
                  </Text>
                </View>

                {syncStatus === 'syncing' ? (
                  <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 10 }]}>
                    Syncing…
                  </Text>
                ) : (
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10 }]}>
                    Cloud Backup Active
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.itemDivider, { borderBottomColor: colors.hairline, marginVertical: 12 }]} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setAvatarModalVisible(true);
              }}
              style={[
                styles.dashboardPillButton,
                {
                  borderColor: colors.hairline,
                  backgroundColor: isLamp ? '#232026' : colors.parchment,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11, fontWeight: '600' }]}>
                Change Avatar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setNameInput(displayName);
                setEditNameModalVisible(true);
              }}
              style={[
                styles.dashboardPillButton,
                {
                  borderColor: colors.hairline,
                  backgroundColor: isLamp ? '#232026' : colors.parchment,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11, fontWeight: '600' }]}>
                Edit Name
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/profile' as any);
              }}
              style={[
                styles.dashboardPillButton,
                {
                  borderColor: colors.hairline,
                  backgroundColor: isLamp ? '#232026' : colors.parchment,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11, fontWeight: '600' }]}>
                Reading Stats
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

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

        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline, marginVertical: 8 }]} />

        {/* Page typography style */}
        <View style={{ paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Reading page style
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
                {getPageStyleConfig(currentStyleId).name} · {getPageStyleConfig(currentStyleId).tag}
              </Text>
            </View>
            <Pressable
              onPress={() => setPageStyleModalVisible(true)}
              style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 11 }]}>
                Fine-tune
              </Text>
              <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                <ChevronRightIcon color={colors.straw} size={13} />
              </View>
            </Pressable>
          </View>

          {/* Horizontal scroll of page style cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
          >
            {PAGE_STYLE_LIST.map((style) => {
              const isSelected = currentStyleId === style.id;
              const isUnlocked = !style.isPremium || isPremium;
              const sampleFont = motherTongue === 'bn' ? style.banglaFont : style.englishFont;
              const sampleText = motherTongue === 'bn' ? style.previewSampleBangla : style.previewSample;

              return (
                <Pressable
                  key={style.id}
                  onPress={() => handleSelectPageStyle(style)}
                  style={({ pressed }) => [
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.pageStyleMiniCard,
                      { borderRadius: radius.card },
                      isSelected
                        ? { backgroundColor: `${colors.flameAmber}12`, borderColor: colors.flameAmber }
                        : animatedMiniCardStyle,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text
                        style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, flex: 1, marginRight: 4 }]}
                        numberOfLines={1}
                      >
                        {motherTongue === 'bn' ? style.nameBangla : style.name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: style.isPremium
                            ? (isPremium ? `${colors.flameAmber}24` : colors.flameAmber)
                            : `${colors.fawn}1C`,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: radius.pill,
                        }}
                      >
                        <Text
                          style={{
                            color: style.isPremium
                              ? (isPremium ? colors.flameAmber : colors.primaryDark)
                              : colors.fawn,
                            fontSize: 8.5,
                            fontFamily: 'Manrope_700Bold',
                          }}
                        >
                          {style.isPremium ? (isPremium ? 'PREMIUM' : '★ PRO') : 'FREE'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
                      <Text
                        style={[typography.eyebrowLabel, { color: isSelected ? colors.flameAmber : colors.fawn, fontSize: 8.5, flexShrink: 1 }]}
                        numberOfLines={1}
                      >
                        {style.tag}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.5, flexShrink: 0 }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isLamp ? style.background.lampAccent : style.background.dayAccent,
                          }}
                        />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 9 }]} numberOfLines={1}>
                          {style.background.swatchLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Typography & paper background preview */}
                    <View
                      style={[
                        styles.pageStyleSampleBox,
                        {
                          borderRadius: radius.bookCoverOuter,
                          backgroundColor: isLamp ? style.background.lampBackground : style.background.dayBackground,
                          borderColor: isSelected ? colors.flameAmber : (isLamp ? style.background.lampSpineColor : style.background.daySpineColor),
                          borderWidth: 1.5,
                          position: 'relative',
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      {/* Template: Newspaper masthead rule */}
                      {style.background.template === 'newspaper' ? (
                        <View style={{ marginBottom: 4, borderBottomWidth: 1, borderBottomColor: isLamp ? '#333338' : '#1A1A1A', paddingBottom: 2 }}>
                          <View style={{ borderTopWidth: 1, borderTopColor: isLamp ? '#333338' : '#1A1A1A', paddingTop: 1 }}>
                            <Text
                              style={{
                                fontSize: 7,
                                letterSpacing: 0.8,
                                textAlign: 'center',
                                color: isLamp ? style.background.lampTextColor : style.background.dayTextColor,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                              }}
                              numberOfLines={1}
                            >
                              {style.background.previewMasthead}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Template: Oxford gold inner frame */}
                      {style.background.template === 'oxford' ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 3,
                            left: 3,
                            right: 3,
                            bottom: 3,
                            borderWidth: 1,
                            borderColor: `${isLamp ? style.background.lampAccent : style.background.dayAccent}66`,
                            borderRadius: 4,
                          }}
                          pointerEvents="none"
                        />
                      ) : null}

                      {/* Template: Kraft stitched left binding */}
                      {style.background.template === 'kraft' ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 5,
                            width: 2,
                            borderLeftWidth: 1.5,
                            borderLeftColor: isLamp ? 'rgba(238, 214, 191, 0.35)' : 'rgba(100, 60, 25, 0.45)',
                            borderStyle: 'dashed',
                          }}
                          pointerEvents="none"
                        />
                      ) : null}

                      <Text
                        style={{
                          fontFamily: sampleFont,
                          fontSize: 12.5,
                          lineHeight: 20,
                          letterSpacing: style.letterSpacing,
                          color: isLamp ? style.background.lampTextColor : style.background.dayTextColor,
                          paddingLeft: style.background.template === 'kraft' ? 8 : 0,
                        }}
                        numberOfLines={2}
                      >
                        {sampleText}
                      </Text>
                    </View>

                    {/* Status indicator footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text
                        style={[
                          typography.metadataCaption,
                          {
                            color: isSelected
                              ? colors.flameAmber
                              : isUnlocked
                              ? colors.fawn
                              : colors.flameAmber,
                            fontSize: 10.5,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {isSelected ? 'Active' : isUnlocked ? 'Tap to apply' : 'Unlock with Pro'}
                      </Text>
                      {isSelected ? (
                        <View
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: colors.flameAmber,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckIcon color={colors.primaryDark} size={10} />
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Plan & Membership
      </Text>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          {
            borderRadius: radius.card,
            marginBottom: spacing.xl,
            borderColor: isPremium ? `${colors.flameAmber}66` : colors.hairline,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>
              {isPremium ? 'Lamplight Premium' : 'Free Reader Tier'}
            </Text>
            <View
              style={{
                backgroundColor: isPremium ? colors.flameAmber : `${colors.fawn}22`,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.pill,
              }}
            >
              <Text
                style={{
                  color: isPremium ? colors.primaryDark : colors.fawn,
                  fontSize: 10,
                  fontFamily: 'Manrope_700Bold',
                }}
              >
                {isPremium ? 'ACTIVE' : 'FREE'}
              </Text>
            </View>
          </View>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
            {translationsLeft == null ? 'Unlimited lookups' : `${translationsLeft} lookups left today`}
          </Text>
        </View>

        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, lineHeight: 18, marginBottom: 14 }]}>
          {isPremium
            ? 'All 12 artisan page styles & atmospheres, soundscapes, 14 quote cards, and unlimited translations are unlocked.'
            : 'Upgrade to unlock all 12 artisan page styles & atmospheres, unlimited word lookups, complete soundscapes, and cloud sync.'}
        </Text>

        {/* Feature bullets */}
        <View style={{ gap: 6, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: isPremium ? `${colors.flameAmber}33` : `${colors.fawn}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: isPremium ? colors.flameAmber : colors.fawn, fontSize: 9 }}>✦</Text>
            </View>
            <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
              12 Handcrafted Page Styles & Atmospheres (Oxford, Vellum, Sage, Kraft & Washi)
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: isPremium ? `${colors.flameAmber}33` : `${colors.fawn}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: isPremium ? colors.flameAmber : colors.fawn, fontSize: 9 }}>✦</Text>
            </View>
            <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
              Unlimited Vocabulary, Quotes & Daily Translations
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: isPremium ? `${colors.flameAmber}33` : `${colors.fawn}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: isPremium ? colors.flameAmber : colors.fawn, fontSize: 9 }}>✦</Text>
            </View>
            <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
              Full Atmospheric Soundscapes & 14 Artisan Quote Cards
            </Text>
          </View>
        </View>

        {/* Upgrade / Manage Button */}
        <Pressable
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [
            styles.upgradeButton,
            {
              backgroundColor: isPremium ? (isLamp ? '#3A342D' : colors.segmentedTrack) : colors.flameAmber,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 11,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={[
              typography.buttonLabel,
              {
                color: isPremium ? colors.ink : colors.primaryDark,
                fontSize: 13,
                fontWeight: '700',
              },
            ]}
          >
            {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
          </Text>
        </Pressable>
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
        {/* Status header */}
        <View style={styles.settingsRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
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
                    : (isLamp ? 'rgba(245, 237, 225, 0.12)' : 'rgba(0, 0, 0, 0.06)'),
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                }}
              >
                <Text
                  style={{
                    color: isProtected
                      ? (isPremium ? colors.primaryDark : LamplightColor.highlight.sage)
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
                { color: colors.fawn, fontSize: 11, marginTop: 3 },
              ]}
              numberOfLines={1}
            >
              {isProtected
                ? userEmail
                  ? `${userEmail} · ${isPremium ? (entitlement.expiresAt ? `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}` : 'Active') : 'Free Plan (50 lookups/day)'}`
                  : 'Free Plan · Protected'
                : 'Guest mode · 20 lookups/day · Unsynced'}
            </Text>
          </View>

          {/* Action button */}
          {!isProtected ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => router.push('/paywall')}
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                  Upgrade
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAccountProtectionModalVisible(true)}
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: isLamp ? '#3A342D' : colors.segmentedTrack,
                    borderRadius: radius.pill,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 11 }]}>
                  Sync
                </Text>
              </Pressable>
            </View>
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
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: colors.segmentedTrack,
                  borderRadius: radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Active</Text>
            </Pressable>
          )}
        </View>

        {/* View Profile & Reading Stats */}
        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
        <Pressable
          onPress={() => router.push('/profile' as any)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Profile & Reading Stats
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
              Streaks, reading velocity, top books & edit name
            </Text>
          </View>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.fawn} size={14} />
          </View>
        </Pressable>

        {/* Sign in with existing account (for guests) */}
        {!isProtected ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
            <Pressable
              onPress={() => router.push('/login' as any)}
              style={[styles.settingsRow, { paddingVertical: 10 }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                  Sign in with existing account
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
                  Restore your previous reading library and vocabulary
                </Text>
              </View>
              <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRightIcon color={colors.flameAmber} size={14} />
              </View>
            </Pressable>
          </>
        ) : null}

        {/* Copyable Support ID Row */}
        {userId ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
            <View style={[styles.settingsRow, { paddingVertical: 8 }]}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
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
                    backgroundColor: colors.segmentedTrack,
                    borderRadius: radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 11 }]}>
                  {copiedToast ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* Cloud Backup & Sync (for protected accounts) */}
        {isProtected ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
            <View style={[styles.settingsRow, { paddingVertical: 8 }]}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                  Cloud Backup & Sync
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
                  {syncSubtitle(syncStatus)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => router.push('/restore' as any)}
                  disabled={syncStatus === 'syncing'}
                  style={[
                    styles.upgradeButton,
                    {
                      backgroundColor: colors.segmentedTrack,
                      borderRadius: radius.pill,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 11 }]}>
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
        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
        <Pressable
          onPress={handleExportData}
          disabled={exportingData}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
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
              <ChevronRightIcon color={colors.fawn} size={14} />
            </View>
          )}
        </Pressable>

        {/* Redeem promo code */}
        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
        <Pressable
          onPress={handleOpenPromoModal}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Redeem promo code
          </Text>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.flameAmber} size={14} />
          </View>
        </Pressable>

        {/* Sign Out (Protected accounts only) */}
        {isProtected ? (
          <>
            <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />
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
      </Animated.View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Support & Feedback
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
              Help us improve translations, report bugs, or share ideas
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

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        Legal & Privacy
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
          onPress={() => router.push('/terms' as any)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
            Terms and Conditions
          </Text>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.straw} size={14} />
          </View>
        </Pressable>

        <View style={[styles.itemDivider, { borderBottomColor: colors.hairline }]} />

        <Pressable
          onPress={() => router.push('/privacy' as any)}
          style={[styles.settingsRow, { paddingVertical: 10 }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Privacy Policy
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
              EU GDPR, US CCPA/COPPA & Asian Privacy Acts
            </Text>
          </View>
          <View style={{ width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRightIcon color={colors.straw} size={14} />
          </View>
        </Pressable>
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

      <PageStyleSelectorModal
        visible={pageStyleModalVisible}
        onClose={() => setPageStyleModalVisible(false)}
        isBangla={motherTongue === 'bn'}
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

      {/* Edit Display Name Modal */}
      <Modal
        visible={editNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameModalVisible(false)}
      >
        <Pressable
          style={styles.dialogBackdrop}
          onPress={() => setEditNameModalVisible(false)}
        >
          <Pressable
            style={[
              styles.dialogCard,
              {
                backgroundColor: isLamp ? '#232026' : colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.card,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginBottom: 8 }]}>
              Edit Reader Name
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginBottom: 16 }]}>
              This name is shown on your reading profile and synced across devices.
            </Text>

            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor={colors.straw}
              style={[
                styles.dialogInput,
                {
                  color: colors.ink,
                  borderColor: colors.hairline,
                  backgroundColor: isLamp ? '#1C1B1E' : colors.parchment,
                  borderRadius: 8,
                },
              ]}
              autoFocus
              maxLength={40}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Pressable
                onPress={() => setEditNameModalVisible(false)}
                style={[
                  styles.modalButton,
                  {
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    backgroundColor: 'transparent',
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveName}
                disabled={savingName}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    opacity: savingName ? 0.6 : 1,
                  },
                ]}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Change Avatar Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <Pressable
          style={styles.dialogBackdrop}
          onPress={() => setAvatarModalVisible(false)}
        >
          <Pressable
            style={[
              styles.dialogCard,
              {
                backgroundColor: isLamp ? '#232026' : colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.card,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginBottom: 8 }]}>
              Choose Reading Avatar
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginBottom: 16 }]}>
              Select an avatar icon to represent your reading journey.
            </Text>

            <View style={styles.avatarGrid}>
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedPresetId(preset.id);
                    }}
                    style={[
                      styles.avatarGridItem,
                      {
                        borderColor: isSelected ? colors.flameAmber : 'transparent',
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                      },
                    ]}
                  >
                    <UserAvatar
                      avatar={`preset:${preset.id}`}
                      size={44}
                      border={isSelected}
                    />
                    <Text
                      style={[
                        typography.metadataCaption,
                        {
                          color: isSelected ? colors.flameAmber : colors.fawn,
                          fontSize: 10,
                          marginTop: 4,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Pressable
                onPress={() => setAvatarModalVisible(false)}
                style={[
                  styles.modalButton,
                  {
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    backgroundColor: 'transparent',
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveAvatar}
                disabled={savingAvatar}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    opacity: savingAvatar ? 0.6 : 1,
                  },
                ]}
              >
                {savingAvatar ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }]}>
                    Select
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarPressable: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardPillButton: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  avatarGridItem: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
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
    // boxShadow, not elevation: on Android elevation lifts the pill in Z, and the
    // theme-transition snapshot (software draw) sorts by Z before zIndex — so it
    // painted the pill over the active label, making the text vanish mid-switch.
    boxShadow: '0px 1.5px 6px rgba(0, 0, 0, 0.18)',
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
  standoutAuthButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  pageStyleMiniCard: {
    width: 200,
    borderWidth: 1.5,
    padding: 12,
  },
  pageStyleSampleBox: {
    padding: 10,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
});
