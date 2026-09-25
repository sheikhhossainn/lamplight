import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  deleteAccount,
  getUserProfile,
  signOutUser,
  updateUserProfile,
} from '@/lib/supabaseAuth';
import { CalendarHeatmapCard } from '@/components/CalendarHeatmapCard';
import { fetchCalendarHeatmapData, type CalendarHeatmapData } from '@/features/analytics/calendarHeatmap';
import { computeUserReadingStats, type UserReadingStats } from '@/features/analytics/statsEngine';
import { computeWeeklyDigest, type WeeklyDigest } from '@/features/analytics/weeklyDigest';
import { canUse, isPremiumUser } from '@/features/subscription/subscriptionState';
import { useTheme } from '@/theme/ThemeProvider';
import { LamplightColor } from '@/theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    displayName: string;
    email: string | null;
    isProtected: boolean;
    createdAt: string | null;
  }>({
    displayName: 'Reader',
    email: null,
    isProtected: false,
    createdAt: null,
  });

  const [stats, setStats] = useState<UserReadingStats | null>(null);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [heatmapData, setHeatmapData] = useState<CalendarHeatmapData | null>(null);

  // Edit Name Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Delete Account Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prof, userStats, weeklyDigestData, calendarData] = await Promise.all([
        getUserProfile(),
        computeUserReadingStats(),
        computeWeeklyDigest(),
        fetchCalendarHeatmapData(52),
      ]);
      setProfile(prof);
      setStats(userStats);
      setDigest(weeklyDigestData);
      setHeatmapData(calendarData);
      setNameInput(prof.displayName);
    } catch (err) {
      console.warn('[Profile] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const isPremium = isPremiumUser();
  const hasInsightsAccess = canUse('reading_insights');

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    setUpdatingName(true);
    setNameError(null);
    try {
      const res = await updateUserProfile(trimmed);
      if (res.success) {
        setProfile((prev) => ({ ...prev, displayName: trimmed }));
        setEditModalVisible(false);
      } else {
        setNameError(res.message || 'Failed to update name.');
      }
    } catch {
      setNameError('Network error updating name.');
    } finally {
      setUpdatingName(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await deleteAccount(true);
      if (res.success) {
        setDeleteModalVisible(false);
        Alert.alert(
          'Account Deleted',
          'Your account and cloud reading data have been permanently erased.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/homescreen') }],
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to delete account. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error during account deletion.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatHoursMinutes = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 14,
            paddingHorizontal: spacing.xl,
            borderBottomColor: colors.hairline,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Text
          style={[
            typography.uiRowTitle,
            { color: colors.ink, fontSize: 16, textAlign: 'center', flex: 1, marginRight: 24 },
          ]}
        >
          Profile & Reading Stats
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.flameAmber} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.card,
                marginBottom: spacing.xl,
              },
            ]}
          >
            <View style={styles.profileRow}>
              {/* Monogram Avatar */}
              <View
                style={[
                  styles.avatarWrap,
                  {
                    backgroundColor: colors.parchment,
                    borderColor: colors.hairline,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <Text style={[typography.wordmark, { color: colors.flameAmber, fontSize: 24 }]}>
                  {profile.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[typography.uiRowTitle, { color: colors.ink, fontSize: 17 }]}
                    numberOfLines={1}
                  >
                    {profile.displayName}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setNameInput(profile.displayName);
                      setNameError(null);
                      setEditModalVisible(true);
                    }}
                    hitSlop={8}
                  >
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        stroke={colors.fawn}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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

                <Text
                  style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {profile.email ?? 'Guest Reader · Local Library'}
                </Text>

                {/* Tier Badge */}
                <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.tierBadge,
                      {
                        backgroundColor: isPremium
                          ? colors.flameAmber
                          : profile.isProtected
                          ? 'rgba(127, 163, 122, 0.2)'
                          : colors.segmentedTrack,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        {
                          color: isPremium
                            ? colors.primaryDark
                            : profile.isProtected
                            ? LamplightColor.highlight.sage
                            : colors.umber,
                          fontSize: 10,
                        },
                      ]}
                    >
                      {isPremium ? 'PREMIUM' : profile.isProtected ? 'FREE ACCOUNT' : 'GUEST'}
                    </Text>
                  </View>

                  {!profile.isProtected ? (
                    <Pressable onPress={() => router.push('/signup' as any)} hitSlop={6}>
                      <Text
                        style={[
                          typography.uiRowTitle,
                          { color: colors.flameAmber, fontSize: 11, textDecorationLine: 'underline' },
                        ]}
                      >
                        Sign up to sync
                      </Text>
                    </Pressable>
                  ) : !isPremium ? (
                    <Pressable onPress={() => router.push('/paywall')} hitSlop={6}>
                      <Text
                        style={[
                          typography.uiRowTitle,
                          { color: colors.flameAmber, fontSize: 11, textDecorationLine: 'underline' },
                        ]}
                      >
                        Upgrade
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* Key Metrics Bento Grid */}
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
            READING VITALITY
          </Text>

          <View style={styles.bentoGrid}>
            {/* Total Time */}
            <View
              style={[
                styles.bentoItem,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                TOTAL TIME READ
              </Text>
              <Text style={[typography.wordmark, { color: colors.flameAmber, fontSize: 22, marginTop: 4 }]}>
                {stats ? formatHoursMinutes(stats.totalReadingSeconds) : '0m'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
                In candlelit sessions
              </Text>
            </View>

            {/* Streak */}
            <View
              style={[
                styles.bentoItem,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                CURRENT STREAK
              </Text>
              <Text style={[typography.wordmark, { color: colors.ink, fontSize: 22, marginTop: 4 }]}>
                {stats?.currentStreakDays ?? 0} {stats?.currentStreakDays === 1 ? 'Day' : 'Days'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
                Best: {stats?.longestStreakDays ?? 0} days
              </Text>
            </View>

            {/* Books Completed */}
            <View
              style={[
                styles.bentoItem,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                BOOKS READ
              </Text>
              <Text style={[typography.wordmark, { color: colors.ink, fontSize: 22, marginTop: 4 }]}>
                {stats?.booksCompletedCount ?? 0}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
                {stats?.booksInProgressCount ?? 0} currently reading
              </Text>
            </View>

            {/* Vocabulary Learned */}
            <View
              style={[
                styles.bentoItem,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                VOCABULARY
              </Text>
              <Text style={[typography.wordmark, { color: colors.ink, fontSize: 22, marginTop: 4 }]}>
                {stats?.totalSavedWords ?? 0}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
                {stats?.masteredWordsCount ?? 0} words mastered
              </Text>
            </View>
          </View>

          {/* Weekly Reading Digest (RET-03) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm }}>
            <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
              WEEKLY READING DIGEST
            </Text>
            {digest?.weekLabel ? (
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                {digest.weekLabel}
              </Text>
            ) : null}
          </View>

          {digest && !digest.hasActivity ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                  paddingVertical: 20,
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, textAlign: 'center' }]}>
                No Reading Sessions This Week
              </Text>
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.umber, textAlign: 'center', marginTop: 6, paddingHorizontal: 16, lineHeight: 18 },
                ]}
              >
                Open any book in your library or explore classical texts to build your weekly habit digest.
              </Text>
              <Pressable
                onPress={() => router.push('/' as any)}
                style={{
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  marginTop: 14,
                }}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.primaryDark, fontSize: 11 }]}>
                  START READING
                </Text>
              </Pressable>
            </View>
          ) : digest ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              {/* 4-Item Metric Summary */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View
                  style={[
                    styles.digestPill,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                >
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                    READING TIME
                  </Text>
                  <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                    {digest.readingMinutes}m
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 2 }]}>
                    {digest.readingDays} of 7 days active
                  </Text>
                </View>

                <View
                  style={[
                    styles.digestPill,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                >
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                    PAGES READ
                  </Text>
                  <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                    {digest.pagesRead}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 2 }]}>
                    Across all sessions
                  </Text>
                </View>

                <View
                  style={[
                    styles.digestPill,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                >
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                    WORDS STUDIED
                  </Text>
                  <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                    {digest.wordsSaved}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 2 }]}>
                    {digest.wordsReviewed} cards reviewed
                  </Text>
                </View>

                <View
                  style={[
                    styles.digestPill,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                >
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                    PEAK RHYTHM
                  </Text>
                  <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                    {digest.mostProductiveTime?.period ?? 'Flexible'}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 2 }]}>
                    {digest.mostProductiveTime?.timeRange ?? 'All hours'}
                  </Text>
                </View>
              </View>

              {/* Current Book Progress */}
              {digest.currentBook ? (
                <View style={{ marginTop: 14 }}>
                  <View style={[styles.divider, { borderBottomColor: colors.hairline, marginBottom: 12 }]} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                        CURRENT BOOK PROGRESS
                      </Text>
                      <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 2 }]} numberOfLines={1}>
                        {digest.currentBook.title}
                      </Text>
                      <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 1 }]}>
                        {digest.currentBook.author} · {digest.currentBook.pagesReadThisWeek} pgs ({digest.currentBook.minutesReadThisWeek}m) this week
                      </Text>
                    </View>
                    <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                      {Math.round(digest.currentBook.percentComplete * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.hairline, marginTop: 8 }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.flameAmber,
                          width: `${Math.min(100, Math.max(0, Math.round(digest.currentBook.percentComplete * 100)))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              {/* Premium Habit Insights & Adaptive Goals */}
              <View style={[styles.divider, { borderBottomColor: colors.hairline, marginVertical: 14 }]} />

              {hasInsightsAccess ? (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                      PREMIUM HABIT INSIGHTS
                    </Text>
                    <View
                      style={{
                        backgroundColor: 'rgba(245, 166, 35, 0.15)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: radius.pill,
                      }}
                    >
                      <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                        ACTIVE
                      </Text>
                    </View>
                  </View>

                  {/* Velocity Trend */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 12 }]}>
                      Reading Velocity
                    </Text>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                      {digest.speedTrend.pagesPerHour} pgs/hr ({digest.speedTrend.trendLabel})
                    </Text>
                  </View>

                  {/* Vocabulary Growth */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 12 }]}>
                      Vocabulary Growth
                    </Text>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                      {digest.vocabularyGrowth.wordsSavedThisWeek} words ({digest.vocabularyGrowth.growthLabel})
                    </Text>
                  </View>

                  {/* Completion Forecast */}
                  {digest.completionForecast ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                      <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 12 }]}>
                        Completion Forecast
                      </Text>
                      <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                        {digest.completionForecast.forecastLabel}
                      </Text>
                    </View>
                  ) : null}

                  {/* Adaptive Anti-Guilt Goal */}
                  <View
                    style={{
                      backgroundColor: colors.parchment,
                      borderColor: colors.hairline,
                      borderWidth: 1,
                      borderRadius: radius.card,
                      padding: 12,
                      marginTop: 10,
                    }}
                  >
                    <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                      ADAPTIVE NEXT-WEEK GOAL
                    </Text>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginTop: 2 }]}>
                      {digest.adaptiveNextWeekGoal.suggestedDays} days · {digest.adaptiveNextWeekGoal.suggestedDailyMinutes} mins/day
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 4, lineHeight: 16 }]}>
                      {digest.adaptiveNextWeekGoal.rationale}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: colors.parchment,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    borderRadius: radius.card,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                      PREMIUM HABIT INSIGHTS
                    </Text>
                    <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                      PLUS / SCHOLAR
                    </Text>
                  </View>
                  <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 6, lineHeight: 16 }]}>
                    Unlock reading velocity trends, book completion forecasting, vocabulary retention curves, and gentle adaptive goals.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/paywall?feature=reading_insights' as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 10,
                      paddingTop: 8,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.hairline,
                    }}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>
                      Upgrade to view insights
                    </Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path d="M9 18l6-6-6-6" stroke={colors.flameAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                </View>
              )}
            </View>
          ) : null}

          {/* Calendar Reading Heatmap (INSIGHT-01) */}
          <View style={{ marginTop: spacing.xl }}>
            <CalendarHeatmapCard
              data={heatmapData}
              loading={loading}
              hasInsightsAccess={hasInsightsAccess}
              onUnlockPress={() => router.push('/paywall?feature=reading_insights&trigger=calendar_heatmap')}
            />
          </View>

          {/* Smart Reading Persona & Habits */}
          <Text
            style={[
              typography.eyebrowLabel,
              { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm },
            ]}
          >
            SMART READING INSIGHTS
          </Text>

          <View
            style={[
              styles.habitCard,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                  LITERARY PERSONA
                </Text>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginTop: 2 }]}>
                  {stats?.readingHabits.personaTitle ?? 'Not enough reading history'}
                </Text>
              </View>
              <View
                style={[
                  styles.habitPill,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                  {stats?.readingHabits.favoriteTimeOfDay ?? 'Awaiting first session'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.metadataCaption,
                { color: colors.umber, lineHeight: 18, marginTop: 8 },
              ]}
            >
              {stats?.readingHabits.personaDescription}
            </Text>

            <View style={[styles.divider, { borderBottomColor: colors.hairline, marginVertical: 12 }]} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                  Avg Session
                </Text>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 2 }]}>
                  {stats && stats.readingHabits.averageSessionMinutes > 0
                    ? `${stats.readingHabits.averageSessionMinutes} mins`
                    : '—'}
                </Text>
              </View>

              <View>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                  Estimated Pace
                </Text>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 2 }]}>
                  {stats && stats.readingHabits.pagesPerHour > 0
                    ? `~${stats.readingHabits.pagesPerHour} pgs/hr`
                    : '—'}
                </Text>
              </View>

              <View>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                  Quotes Captured
                </Text>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 2 }]}>
                  {stats?.totalHighlightsCount ?? 0}
                </Text>
              </View>
            </View>

            {/* Weekly Activity Sparkline */}
            <View style={{ marginTop: 16 }}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10, marginBottom: 8 }]}>
                LAST 7 DAYS ACTIVITY
              </Text>
              <View style={styles.weekRhythmRow}>
                {stats?.weeklyActivity.map((day, idx) => (
                  <View key={idx} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor: day.hasRead ? colors.flameAmber : colors.segmentedTrack,
                          borderColor: day.hasRead ? colors.flameAmber : colors.hairline,
                        },
                      ]}
                    />
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginTop: 4 }]}>
                      {day.dayLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Top Books Read Activity */}
          <Text
            style={[
              typography.eyebrowLabel,
              { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm },
            ]}
          >
            MOST READ BOOKS
          </Text>

          {stats && stats.topBooks.length > 0 ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
              ]}
            >
              {stats.topBooks.map((item, index) => (
                <View key={item.bookId}>
                  {index > 0 && (
                    <View style={[styles.divider, { borderBottomColor: colors.hairline, marginVertical: 10 }]} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 1 }]}>
                        {item.author} · {formatHoursMinutes(item.totalSeconds)} read ({item.pagesRead} pages)
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>
                        {Math.round(item.percentComplete * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                  paddingVertical: 20,
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                No reading history recorded yet. Open any book to begin tracking!
              </Text>
            </View>
          )}

          {/* Account & Data Management */}
          <Text
            style={[
              typography.eyebrowLabel,
              { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm },
            ]}
          >
            DATA & ACCOUNT PRIVACY
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
          >
            <Pressable
              onPress={() => router.push('/terms' as any)}
              style={[styles.settingsRow, { paddingVertical: 10 }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Terms and Conditions
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.straw} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>

            <View style={[styles.divider, { borderBottomColor: colors.hairline }]} />

            <Pressable
              onPress={() => router.push('/privacy' as any)}
              style={[styles.settingsRow, { paddingVertical: 10 }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Global Privacy Policy (GDPR / CCPA / Asian Acts)
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.straw} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>

            {profile.isProtected ? (
              <>
                <View style={[styles.divider, { borderBottomColor: colors.hairline }]} />
                <Pressable
                  onPress={() => setDeleteModalVisible(true)}
                  style={[styles.settingsRow, { paddingVertical: 10 }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.highlight.clay, fontSize: 13 }]}>
                    Delete Account & Purge Data
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M9 18l6-6-6-6" stroke={colors.highlight.clay} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* Edit Name Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)}>
          <Pressable
            style={[
              styles.dialogCard,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
            onPress={() => {}}
          >
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
              Edit Display Name
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}>
              This name will be used on your profile and synchronized notes.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.hairline,
                  color: colors.ink,
                  backgroundColor: colors.parchment,
                  borderRadius: radius.card,
                  marginTop: 14,
                },
              ]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter name"
              placeholderTextColor={colors.straw}
              maxLength={50}
              autoFocus
            />

            {nameError ? (
              <Text style={[typography.metadataCaption, { color: colors.highlight.clay, marginTop: 6 }]}>
                {nameError}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={updatingName}
                style={[styles.modalButton, { borderRadius: radius.pill }]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveName}
                disabled={updatingName}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                ]}
              >
                {updatingName ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDeleteModalVisible(false)}>
          <Pressable
            style={[
              styles.dialogCard,
              { backgroundColor: colors.card, borderColor: colors.highlight.clay, borderRadius: radius.card },
            ]}
            onPress={() => {}}
          >
            <Text style={[typography.uiRowTitle, { color: colors.highlight.clay, fontSize: 16 }]}>
              Delete Account Permanently?
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 6, lineHeight: 18 }]}>
              This action cannot be undone. All your synchronized books, reading sessions, saved words, and profile information will be erased from our cloud servers in compliance with global privacy regulations.
            </Text>

            <Text style={[typography.metadataCaption, { color: colors.ink, marginTop: 14, fontFamily: 'Manrope_700Bold' }]}>
              Type DELETE below to confirm:
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.hairline,
                  color: colors.ink,
                  backgroundColor: colors.parchment,
                  borderRadius: radius.card,
                  marginTop: 6,
                },
              ]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.straw}
              autoCapitalize="characters"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
                style={[styles.modalButton, { borderRadius: radius.pill }]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDeleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.highlight.clay,
                    borderRadius: radius.pill,
                    opacity: deleteConfirmText.trim().toUpperCase() === 'DELETE' ? 1 : 0.5,
                  },
                ]}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color={colors.parchment} />
                ) : (
                  <Text style={[typography.buttonLabel, { color: colors.parchment, fontSize: 13 }]}>
                    Delete Account
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileCard: {
    borderWidth: 1,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoItem: {
    width: (screenWidth - 48 - 10) / 2,
    borderWidth: 1,
    padding: 14,
  },
  habitCard: {
    borderWidth: 1,
    padding: 16,
  },
  habitPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  weekRhythmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  dayCol: {
    alignItems: 'center',
  },
  dayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBackdrop: {
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
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  digestPill: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
