import { router } from 'expo-router';
import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  ChevronLeftIcon,
  CloseIcon,
  MicrophoneIcon,
  SearchIcon,
  StopIcon,
} from '@/components/icons';
import { transcribeAudioUri } from '@/features/scripture-verses/voiceTranscriber';
import { hapticOpenInquiry } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

import {
  clearInquiryCache,
  getRecentInquiries,
  removeCachedInquiry,
  type CachedInquiryItem,
} from '@/features/scripture-qa/inquiryCache';
import { checkAIRateLimit } from '@/features/scripture-qa/inquiryRateLimit';
import {
  CONTROVERSIAL_QUESTIONS,
} from '@/features/scripture-qa/controversialQuestions';
import {
  ScalesOfJusticeIcon,
  SACRED_TRADITION_EMBLEMS,
  IslamEmblem,
} from '@/features/scripture-qa/TraditionEmblems';

type ModalTab = 'ask' | 'critical' | 'recent';

const SUGGESTED_INQUIRIES = [
  {
    theme: 'WARFARE & ETHICS',
    title: 'Women, Children & Non-Combatants in War',
    question: 'Does scriptural law permit fighters to kill women, children, or non-combatants on the enemy side in war?',
  },
  {
    theme: 'MARITAL RIGHTS',
    title: 'Can Women Divorce Their Husbands?',
    question: 'Can women divorce their husbands and dissolve their marriages under scriptural law?',
  },
  {
    theme: 'CHARITY & POVERTY',
    title: 'Obligations to the Poor & Needy',
    question: 'What do scriptures say about charity, wealth redistribution, and caring for the vulnerable?',
  },
  {
    theme: 'SPIRITUAL DISCIPLINE',
    title: 'Fasting & Inner Transformation',
    question: 'What do religions teach regarding fasting, ascetic restraint, and purifying the ego?',
  },
  {
    theme: 'METAPHYSICS & LIFE',
    title: 'The Human Soul & Afterlife',
    question: 'What do scriptures teach about the origin of the human soul, resurrection, and the afterlife?',
  },
  {
    theme: 'CREATION & NATURE',
    title: 'Animals & Ecological Custodianship',
    question: 'What do sacred scriptures command regarding compassion for animals and guardianship of nature?',
  },
  {
    theme: 'ETHICS OF POWER',
    title: 'Just Governance & Authority',
    question: 'What do scriptures say about holding rulers accountable to universal divine justice?',
  },
];

// --- Custom Themed Icons ---

function SparklesIcon({ color = '#F5A623', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
        fill={color}
      />
      <Path
        d="M19 16L19.9 18.1L22 19L19.9 19.9L19 22L18.1 19.9L16 19L18.1 18.1L19 16Z"
        fill={color}
        opacity={0.8}
      />
    </Svg>
  );
}

function HistoryClockIcon({ color = '#1C1B1E', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
      <Path d="M12 7V12L15.5 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function TrashMiniIcon({ color = '#A89982', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightIcon({ color = '#F5A623', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function AskScriptureScreen() {
  const { colors, typography, scheme, radius } = useTheme();
  const isDark = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<ModalTab>('ask');
  const [visitedTabs, setVisitedTabs] = useState<Record<ModalTab, boolean>>({
    ask: true,
    critical: false,
    recent: false,
  });

  const TAB_KEYS = useMemo<ModalTab[]>(() => ['ask', 'critical', 'recent'], []);
  const activeTabIndex = TAB_KEYS.indexOf(activeTab);

  // Synchronous calculation from screen width: marginHorizontal 16 * 2 = 32
  const initialTabBarWidth = Math.max(0, windowWidth - 32);
  const [tabBarWidth, setTabBarWidth] = useState(initialTabBarWidth);

  const tabWidth = tabBarWidth > 0 ? (tabBarWidth - 6) / 3 : 0;
  const indicatorX = useSharedValue(activeTabIndex * tabWidth);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (tabWidth > 0) {
        indicatorX.value = activeTabIndex * tabWidth;
      }
      return;
    }
    if (tabWidth > 0) {
      indicatorX.value = withSpring(activeTabIndex * tabWidth, {
        damping: 24,
        stiffness: 280,
        mass: 0.45,
      });
    }
  }, [activeTabIndex, tabWidth, indicatorX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  const handleSelectTab = (tab: ModalTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    if (tab === 'recent') {
      getRecentInquiries().then(setRecentItems);
    }
    const targetIndex = TAB_KEYS.indexOf(tab);
    if (tabWidth > 0) {
      indicatorX.value = withSpring(targetIndex * tabWidth, {
        damping: 24,
        stiffness: 280,
        mass: 0.45,
      });
    }
  };

  const [askQuery, setAskQuery] = useState('');
  const [debatedSearchQuery, setDebatedSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<CachedInquiryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [rateLimitStatus, setRateLimitStatus] = useState({
    allowed: true,
    remainingSeconds: 0,
    adviceMessage: '',
  });

  useEffect(() => {
    void hapticOpenInquiry();
  }, []);

  // Recording animated pulse
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    if (isRecording) {
      pulseAnim.value = withRepeat(withTiming(1.35, { duration: 750 }), -1, true);
    } else {
      pulseAnim.value = 1;
    }
  }, [isRecording, pulseAnim]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: isRecording ? 0.45 : 0,
  }));

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const submittedThisPress = useRef(false);

  // Load recents & check rate limit once on mount
  useEffect(() => {
    getRecentInquiries().then((items) => {
      setRecentItems(items);
    });
    setRateLimitStatus(checkAIRateLimit());
  }, []);

  // Filter controversial questions
  const filteredControversialQuestions = useMemo(() => {
    let list = CONTROVERSIAL_QUESTIONS;
    if (debatedSearchQuery.trim()) {
      const qLower = debatedSearchQuery.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.question.toLowerCase().includes(qLower) ||
          q.shortTitle.toLowerCase().includes(qLower) ||
          q.categoryLabel.toLowerCase().includes(qLower) ||
          q.dilemmaTag.toLowerCase().includes(qLower) ||
          q.searchKeywords.some((k) => k.toLowerCase().includes(qLower)) ||
          q.traditions.some((t) =>
            t.verses.some(
              (v) =>
                v.book.toLowerCase().includes(qLower) ||
                v.translation.toLowerCase().includes(qLower) ||
                `${v.chapter}:${v.verseNumber}`.includes(qLower),
            ),
          ),
      );
    }
    return list;
  }, [debatedSearchQuery]);

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const text = await transcribeAudioUri(uri, 'auto');
        if (text && text.trim()) {
          setAskQuery(text.trim());
        }
      }
    } catch {
      // Audio transcribe error tolerated
    } finally {
      setIsTranscribing(false);
    }
  };

  const executeSubmission = (targetQuestion: string, initialTradition?: string) => {
    const q = targetQuestion.trim();
    if (!q || submittedThisPress.current) return;
    submittedThisPress.current = true;

    router.push({
      pathname: '/mood-verses/inquiry' as any,
      params: {
        question: q,
        ...(initialTradition && initialTradition !== 'all' ? { tradition: initialTradition } : {}),
      },
    });

    setTimeout(() => {
      submittedThisPress.current = false;
    }, 600);
  };

  const handleDeleteRecent = async (id: string) => {
    await removeCachedInquiry(id);
    const updated = await getRecentInquiries();
    setRecentItems(updated);
  };

  const handleClearAllRecents = () => {
    Alert.alert(
      'Clear Saved Inquiries',
      'Are you sure you want to remove all saved comparative inquiries from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearInquiryCache();
            setRecentItems([]);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment, paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Navigation Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeftIcon color={colors.ink} size={22} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, letterSpacing: 1.5 }]}>
            COMPARATIVE SCRIPTURES
          </Text>
          <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 1 }]}>
            Scripture Inquiry
          </Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* 4-Way Segmented Tabs: [ Ask AI ] [ Debated ] [ Topics ] [ Saved ] */}
      <View
        style={[styles.tabBarContainer, { backgroundColor: colors.segmentedTrack }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - tabBarWidth) > 1) {
            setTabBarWidth(w);
          }
        }}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.slidingIndicator, { backgroundColor: colors.card }, animatedIndicatorStyle]}
          />
        ) : null}

        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          onPress={() => handleSelectTab('ask')}
          style={styles.segmentTab}
        >
          <SparklesIcon color={activeTab === 'ask' ? colors.flameAmber : colors.fawn} size={14} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              typography.uiRowTitle,
              styles.tabLabel,
              { color: activeTab === 'ask' ? colors.ink : colors.fawn },
              activeTab === 'ask' && { fontWeight: '700' },
            ]}
          >
            Ask AI
          </Text>
        </Pressable>

        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          onPress={() => handleSelectTab('critical')}
          style={styles.segmentTab}
        >
          <ScalesOfJusticeIcon color={activeTab === 'critical' ? colors.flameAmber : colors.fawn} size={14} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              typography.uiRowTitle,
              styles.tabLabel,
              { color: activeTab === 'critical' ? colors.ink : colors.fawn },
              activeTab === 'critical' && { fontWeight: '700' },
            ]}
          >
            Debated
          </Text>
        </Pressable>

        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          onPress={() => handleSelectTab('recent')}
          style={styles.segmentTab}
        >
          <HistoryClockIcon color={activeTab === 'recent' ? colors.ink : colors.fawn} size={14} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              typography.uiRowTitle,
              styles.tabLabel,
              { color: activeTab === 'recent' ? colors.ink : colors.fawn },
              activeTab === 'recent' && { fontWeight: '700' },
            ]}
          >
            Saved
          </Text>
          {recentItems.length > 0 ? (
            <View style={[styles.tabBadge, { backgroundColor: isDark ? colors.ember : '#DDD2C0' }]}>
              <Text style={[styles.tabBadgeText, { color: isDark ? colors.lampText : '#5A4C3A' }]}>
                {recentItems.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Optional Rate Limit Cooldown Notice */}
      {!rateLimitStatus.allowed && activeTab === 'ask' ? (
        <View
          style={[
            styles.rateLimitAlert,
            {
              backgroundColor: isDark ? '#2D2619' : '#FDF7E7',
              borderColor: isDark ? '#5C4A26' : '#EADBB6',
            },
          ]}
        >
          <Text
            style={[
              typography.metadataCaption,
              { color: isDark ? '#E5C07B' : '#8A5A16', fontSize: 12, lineHeight: 18 },
            ]}
          >
            ⏳ <Text style={{ fontWeight: '600' }}>AI Cooldown Active ({rateLimitStatus.remainingSeconds}s):</Text>{' '}
            Novel AI search is resting. You can explore debated questions or view your saved offline questions below
            without wait!
          </Text>
        </View>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ASK AI (Dedicated inquiry composer & suggestions)      */}
      {/* ------------------------------------------------------------- */}
      <View style={[styles.tabPaneContainer, { display: activeTab === 'ask' ? 'flex' : 'none' }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.tabContentScroll, { paddingBottom: insets.bottom + 48 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Sanctuary Invitation Banner */}
          <View
            style={[
              styles.aiHeroCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
              },
            ]}
          >
            <View style={styles.aiHeroTopRow}>
              <View
                style={[
                  styles.aiBadge,
                  {
                    backgroundColor: isDark ? '#332918' : '#FDF7E7',
                    borderColor: isDark ? '#554224' : '#EADBB6',
                  },
                ]}
              >
                <SparklesIcon color={colors.flameAmber} size={12} />
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: isDark ? colors.flameAmber : '#8A5A16', fontSize: 10, marginLeft: 5 },
                  ]}
                >
                  4 SACRED TRADITIONS
                </Text>
              </View>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5 }]}>
                Synthesized Study
              </Text>
            </View>

            <Text style={[typography.readingBody, styles.aiHeroDescription, { color: colors.ink }]}>
              Ask any question about commands, ethics, or history. Examines verified scripture verses and classical
              commentaries across the{' '}
              <Text style={{ fontWeight: '600', color: colors.flameAmber }}>Quran</Text>,{' '}
              <Text style={{ fontWeight: '600', color: colors.flameAmber }}>Bible</Text>,{' '}
              <Text style={{ fontWeight: '600', color: colors.flameAmber }}>Torah</Text>, and{' '}
              <Text style={{ fontWeight: '600', color: colors.flameAmber }}>Vedas</Text>.
            </Text>

            <View
              style={[
                styles.zeroVerdictPill,
                {
                  backgroundColor: isDark ? colors.ember : '#F4ECE0',
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Text
                style={[
                  typography.metadataCaption,
                  { color: isDark ? colors.lampText : '#66533A', fontSize: 11.5, lineHeight: 16 },
                ]}
              >
                ⚖️ Strictly balanced • Classical exegesis & Tafsir • Objective scholarship
              </Text>
            </View>
          </View>

          {/* Composer Desk */}
          <View
            style={[
              styles.composerBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
              },
            ]}
          >
            <TextInput
              multiline
              numberOfLines={3}
              value={askQuery}
              onChangeText={setAskQuery}
              placeholder="What do scriptures say about justice, fasting, women, rulers..."
              placeholderTextColor={colors.fawn}
              style={[
                typography.readingBody,
                styles.composerInput,
                { color: colors.ink, minHeight: 80 },
              ]}
            />

            <View style={[styles.composerActionsRow, { borderTopColor: colors.hairline }]}>
              {/* Voice Input Button with Animated Pulse */}
              <View style={styles.micButtonWrapper}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pulseCircle,
                    { backgroundColor: colors.flameAmber },
                    pulseAnimatedStyle,
                  ]}
                />
                <Pressable
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isTranscribing}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.micPill,
                    {
                      backgroundColor: isRecording
                        ? '#D32F2F'
                        : isDark
                        ? colors.ember
                        : '#FBF5EB',
                      borderColor: isRecording ? '#B71C1C' : colors.hairline,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={colors.flameAmber} />
                  ) : isRecording ? (
                    <>
                      <StopIcon color="#FFFFFF" size={13} />
                      <Text
                        style={[
                          typography.eyebrowLabel,
                          { color: '#FFFFFF', fontSize: 10.5, marginLeft: 5 },
                        ]}
                      >
                        STOP LISTENING
                      </Text>
                    </>
                  ) : (
                    <>
                      <MicrophoneIcon color={colors.flameAmber} size={15} />
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.ink, fontSize: 11.5, marginLeft: 5, fontWeight: '600' },
                        ]}
                      >
                        Voice Query
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {askQuery.trim().length > 0 ? (
                <Pressable
                  hitSlop={10}
                  onPress={() => setAskQuery('')}
                  style={styles.clearBtn}
                >
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                    Clear
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Primary Submit Button */}
          <Pressable
            disabled={askQuery.trim().length === 0}
            onPress={() => executeSubmission(askQuery)}
            style={({ pressed }) => [
              styles.primarySubmitBtn,
              {
                backgroundColor:
                  askQuery.trim().length > 0
                    ? colors.flameAmber
                    : isDark
                    ? colors.ember
                    : '#E5DDCF',
                opacity: pressed ? 0.88 : 1,
                borderRadius: radius.card,
              },
            ]}
          >
            <View style={styles.submittingRow}>
              <SparklesIcon
                color={askQuery.trim().length > 0 ? '#1C1B1E' : colors.fawn}
                size={17}
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  typography.uiRowTitle,
                  styles.primarySubmitText,
                  {
                    color: askQuery.trim().length > 0 ? '#1C1B1E' : colors.fawn,
                  },
                ]}
              >
                Examine Across 4 Traditions
              </Text>
              <ArrowRightIcon
                color={askQuery.trim().length > 0 ? '#1C1B1E' : colors.fawn}
                size={15}
              />
            </View>
          </Pressable>

          {/* Inquiry Inspirations Section */}
          <View style={styles.suggestionsHeaderRow}>
            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.fawn, letterSpacing: 1.2 },
              ]}
            >
              PROMPTS & INSPIRATIONS
            </Text>
          </View>

          {SUGGESTED_INQUIRIES.map((item, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                setAskQuery(item.question);
                executeSubmission(item.question);
              }}
              style={({ pressed }) => [
                styles.suggestionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  opacity: pressed ? 0.9 : 1,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View style={styles.suggestionMedallion}>
                <SparklesIcon color={colors.flameAmber} size={15} />
              </View>

              <View style={styles.suggestionTextContainer}>
                <View style={styles.suggestionTagRow}>
                  <Text
                    style={[
                      typography.eyebrowLabel,
                      { color: colors.flameAmber, fontSize: 9.5, letterSpacing: 0.8 },
                    ]}
                  >
                    {item.theme}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}
                >
                  {item.title}
                </Text>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[
                    typography.metadataCaption,
                    { color: colors.umber, fontSize: 12, marginTop: 3, lineHeight: 17 },
                  ]}
                >
                  {item.question}
                </Text>
              </View>

              <View style={styles.suggestionArrowWrap}>
                <ArrowRightIcon color={colors.flameAmber} size={14} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DEBATED (The Most Controversial Theological Inquiries)  */}
      {/* ------------------------------------------------------------- */}
      {visitedTabs.critical ? (
        <View style={[styles.tabPaneContainer, { display: activeTab === 'critical' ? 'flex' : 'none' }]}>
          {/* Search Input Filter */}
          <View style={styles.searchSection}>
            <View
              style={[
                styles.searchInputRow,
                { backgroundColor: colors.card, borderColor: colors.hairline },
              ]}
            >
              <SearchIcon color={colors.fawn} size={16} />
              <TextInput
                value={debatedSearchQuery}
                onChangeText={setDebatedSearchQuery}
                placeholder="Search controversies or verses (4:34, 1 Tim 2, 2:282)..."
                placeholderTextColor={colors.fawn}
                style={[
                  typography.readingBody,
                  styles.searchInput,
                  { color: colors.ink, fontSize: 14 },
                ]}
              />
              {debatedSearchQuery.length > 0 ? (
                <Pressable onPress={() => setDebatedSearchQuery('')} hitSlop={8}>
                  <CloseIcon color={colors.fawn} size={14} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Controversial Questions List */}
          <FlatList
            data={filteredControversialQuestions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>
                  No Inquiries Found
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.fawn, textAlign: 'center', marginTop: 6, lineHeight: 18 },
                  ]}
                >
                  No inquiries match your search term. Clear the search field to view all comparative dossiers.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const totalVerses = item.traditions.reduce((acc, t) => acc + t.verses.length, 0);

              return (
                <Pressable
                  onPress={() => executeSubmission(item.question)}
                  style={({ pressed }) => [
                    styles.questionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                      opacity: pressed ? 0.9 : 1,
                      borderRadius: radius.card,
                    },
                  ]}
                >
                  {/* Clean Single Category Header (Eliminated Redundant Second Stacked Badge) */}
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: isDark ? '#332918' : '#FDF7E7',
                          borderColor: isDark ? '#554224' : '#EADBB6',
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          typography.eyebrowLabel,
                          { color: isDark ? colors.flameAmber : '#8A5A16', fontSize: 10 },
                        ]}
                      >
                        {item.categoryLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Question Title */}
                  <Text
                    style={[
                      typography.screenTitle,
                      styles.questionCardTitle,
                      { color: colors.ink, fontSize: 17, lineHeight: 24 },
                    ]}
                  >
                    {item.question}
                  </Text>

                  {/* Dialectic Box with Balanced Scholarly Tones */}
                  <View
                    style={[
                      styles.controversyDialecticBox,
                      {
                        backgroundColor: isDark ? colors.ember : '#FAF6EE',
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <View style={styles.dialecticItemRow}>
                      <View
                        style={[
                          styles.dialecticPill,
                          {
                            backgroundColor: isDark ? '#3D2525' : '#FDF3F2',
                            borderColor: isDark ? '#5C3434' : '#F2D3D0',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            { color: isDark ? '#E59898' : '#A8322D', fontSize: 9 },
                          ]}
                        >
                          DILEMMA
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, fontSize: 12, lineHeight: 17, flex: 1 },
                        ]}
                      >
                        {item.controversyDossier.criticPosition}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.dialecticItemRow,
                        {
                          marginTop: 8,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.hairline,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dialecticPill,
                          {
                            backgroundColor: isDark ? '#233626' : '#F2F8F3',
                            borderColor: isDark ? '#36533A' : '#D1E6D4',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            { color: isDark ? '#A3D9A8' : '#2E6E38', fontSize: 9 },
                          ]}
                        >
                          EXEGESIS
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, fontSize: 12, lineHeight: 17, flex: 1 },
                        ]}
                      >
                        {item.controversyDossier.scholarlyDefense}
                      </Text>
                    </View>
                  </View>

                  {/* 4 Sacred Tradition Emblems */}
                  <View style={styles.traditionsBadgeRow}>
                    {item.traditions.map((t) => {
                      const EmblemComponent = SACRED_TRADITION_EMBLEMS[t.tradition] ?? IslamEmblem;
                      return (
                        <View
                          key={t.tradition}
                          style={[
                            styles.traditionEmblemPill,
                            {
                              backgroundColor: isDark ? colors.ember : '#FAF4E8',
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <EmblemComponent color={colors.flameAmber} size={13} />
                          <Text
                            style={[
                              styles.traditionPillText,
                              { color: isDark ? colors.lampText : '#68553D' },
                            ]}
                          >
                            {t.tradition === 'quran'
                              ? 'Quran'
                              : t.tradition === 'bible-nt'
                              ? 'NT'
                              : t.tradition === 'torah'
                              ? 'Torah'
                              : 'Vedas'}{' '}
                            ({t.verses.length})
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Card Footer */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.hairline, marginTop: 14 }]}>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, flex: 1 }]}
                    >
                      {totalVerses} primary verses analyzed
                    </Text>
                    <View style={styles.cardFooterAction}>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.flameAmber, fontWeight: '700', marginRight: 4 },
                        ]}
                      >
                        Examine Texts
                      </Text>
                      <ArrowRightIcon color={colors.flameAmber} size={13} />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: RECENT INQUIRIES (Saved on-device persistent cache)    */}
      {/* ------------------------------------------------------------- */}
      {visitedTabs.recent ? (
        <View style={[styles.tabPaneContainer, { display: activeTab === 'recent' ? 'flex' : 'none' }]}>
          {recentItems.length > 0 ? (
            <View style={styles.recentsTopBar}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  typography.eyebrowLabel,
                  { color: colors.fawn, letterSpacing: 1.1, flex: 1, marginRight: 8 },
                ]}
              >
                {recentItems.length} SAVED ON-DEVICE • OFFLINE READY
              </Text>
              <Pressable hitSlop={10} onPress={handleClearAllRecents} style={{ flexShrink: 0 }}>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: isDark ? '#E57373' : '#B24545', fontSize: 12, fontWeight: '600' },
                  ]}
                >
                  Clear All
                </Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={recentItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyRecentWrap}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: isDark ? colors.ember : '#EAE1D2' },
                  ]}
                >
                  <HistoryClockIcon color={colors.fawn} size={28} />
                </View>
                <Text
                  style={[
                    typography.readingBody,
                    { color: colors.ink, fontWeight: '600', marginTop: 14, fontSize: 16 },
                  ]}
                >
                  No Saved Inquiries Yet
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    {
                      color: colors.fawn,
                      textAlign: 'center',
                      marginTop: 6,
                      lineHeight: 20,
                      paddingHorizontal: 24,
                    },
                  ]}
                >
                  Questions you explore in &quot;Ask AI&quot; are automatically saved directly to your device so you can
                  revisit comparative scriptures anytime without internet or wait times.
                </Text>
                <Pressable
                  onPress={() => handleSelectTab('ask')}
                  style={({ pressed }) => [
                    styles.switchAskBtn,
                    {
                      backgroundColor: colors.flameAmber,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={[typography.uiRowTitle, { color: '#1C1B1E', fontSize: 13.5, fontWeight: '700' }]}>
                    Start an Inquiry ➔
                  </Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => executeSubmission(item.query)}
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.hairline,
                    opacity: pressed ? 0.9 : 1,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.recentTopRow}>
                  <View
                    style={[
                      styles.offlinePill,
                      {
                        backgroundColor: isDark ? '#1C3322' : '#E6F4EA',
                        borderColor: isDark ? '#2E5A39' : '#C2E5CA',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: isDark ? '#A3D9A8' : '#1B5E20', fontSize: 9.5 },
                      ]}
                    >
                      SAVED OFFLINE
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.fawn, fontSize: 11.5, marginRight: 12 },
                      ]}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                    <Pressable hitSlop={12} onPress={() => handleDeleteRecent(item.id)}>
                      <TrashMiniIcon color={colors.fawn} size={14} />
                    </Pressable>
                  </View>
                </View>

                <Text
                  numberOfLines={2}
                  style={[
                    typography.uiRowTitle,
                    styles.recentQueryTitle,
                    { color: colors.ink, fontSize: 15 },
                  ]}
                >
                  &quot;{item.query}&quot;
                </Text>

                <View style={styles.recentTraditionsRow}>
                  {item.traditionSummary.map((t) => (
                    <View
                      key={t.tradition}
                      style={[
                        styles.traditionCountBadge,
                        { backgroundColor: isDark ? colors.ember : '#F0E9DC' },
                      ]}
                    >
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: isDark ? colors.lampText : '#5A4C3A', fontSize: 11, fontWeight: '500' },
                        ]}
                      >
                        {t.traditionName} ({t.verseCount})
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  topTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  // Segmented Tabs
  tabBarContainer: {
    position: 'relative',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 6,
    padding: 3,
    borderRadius: 12,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.08,
        shadowRadius: 2.5,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 9,
    gap: 5,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 12,
    flexShrink: 1,
  },
  tabBadge: {
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tabPaneContainer: {
    flex: 1,
    overflow: 'hidden',
  },

  rateLimitAlert: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Tab Content Scroll
  tabContentScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Ask AI Tab Components
  aiHeroCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 14,
  },
  aiHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiHeroDescription: {
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 12,
  },
  zeroVerdictPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },

  composerBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  composerInput: {
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
  },
  composerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  micButtonWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  micPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  primarySubmitBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySubmitText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  suggestionsHeaderRow: {
    marginBottom: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  suggestionMedallion: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5A6231A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  suggestionTagRow: {
    marginBottom: 3,
  },
  suggestionArrowWrap: {
    paddingLeft: 4,
  },

  // Lists & Searches
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Question Card
  questionCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  questionCardTitle: {
    marginBottom: 8,
  },
  questionSnippet: {
    fontSize: 13,
    marginBottom: 12,
  },

  controversyDialecticBox: {
    borderRadius: 10,
    padding: 11,
    marginTop: 6,
    borderWidth: 1,
  },
  dialecticItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dialecticPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 1,
  },

  traditionsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  traditionEmblemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  traditionPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  cardFooterAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  traditionTags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  traditionTagText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  tagDivider: {
    fontSize: 10,
    marginHorizontal: 5,
  },

  // Recent Inquiries Tab
  recentsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  emptyRecentWrap: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchAskBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },
  recentCard: {
    borderWidth: 1,
    padding: 15,
    marginBottom: 10,
  },
  recentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offlinePill: {
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  recentQueryTitle: {
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  recentTraditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  traditionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 5,
  },
});
