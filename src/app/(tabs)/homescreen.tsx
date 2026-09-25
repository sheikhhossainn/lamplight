import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookSpine } from '@/components/BookSpine';
import { CultureEditionBanner } from '@/components/CultureEditionBanner';
import { CultureMotif } from '@/components/CultureMotif';
import { HomeGuideModal } from '@/components/HomeGuideModal';
import { WordsIllustration } from '@/components/NotebookIllustrations';
import { ChevronRightIcon, CloseIcon, QuestionIcon } from '@/components/icons';
import { getBook, listBanglaBooks, listBooks, type BookRow } from '@/db/repositories/books';
import { getSrsMetrics } from '@/db/repositories/savedWords';
import { getSetting, setSetting } from '@/db/repositories/appSettings';
import {
  hideFromContinueReading,
  listActiveReadingPositions,
  listAllReadingPositions,
  type ReadingPosition,
} from '@/db/repositories/readingPosition';
import { getRecentSessions } from '@/db/repositories/readingSessions';
import {
  fetchBanglaBooks,
  type BanglaBookSummary,
} from '@/features/content-ingestion/banglaApi';
import { AOZORA_JAPANESE_BOOKS } from '@/features/content-ingestion/japaneseApi';
import { GONGU_KOREAN_BOOKS } from '@/features/content-ingestion/koreanApi';
import { getMotherTongueOption, getScriptureLabels, useMotherTongue } from '@/features/settings/motherTongue';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { getNativeUiTextStyle, isBengaliText, isJapaneseText, isKoreanText } from '@/theme/typography';
import { hapticOpenInquiry } from '@/lib/haptics';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import {
  getStoredCalibrationData,
  getCalibratedStartingBook,
  getThreeDoorStarterBooks,
  type CalibratedStartingBook,
  type ThreeDoorStarterOption,
} from '@/features/vocabulary/calibration';
import { VocabularyCalibrationModal } from '@/features/vocabulary/VocabularyCalibrationModal';
import {
  getReadingGoal,
  calculateCadencePacing,
  type ReadingGoal,
  type CadencePacing,
} from '@/db/repositories/readingGoals';
import { ReadingCadenceModal } from '@/components/ReadingCadenceModal';
import {
  getTargetReadingLanguage,
  useTargetReadingLanguage,
} from '@/features/settings/targetReadingLanguage';
import { getLiteraryTheme } from '@/features/settings/literaryTheme';
import {
  getLocalRecommendations,
  getDismissedBookIds,
  dismissRecommendation,
  type LocalRecommendation,
} from '@/features/discovery/localRecommendations';
import { MilestoneCelebrationModal } from '@/components/MilestoneCelebrationModal';
import {
  checkAndTriggerMilestone,
  evaluateReadingStatsMilestones,
  type MilestoneConfig,
} from '@/features/milestones/milestoneService';
import { computeUserReadingStats } from '@/features/analytics/statsEngine';
import { getUserProfile } from '@/lib/supabaseAuth';
import { logEvent } from '@/features/analytics/analytics';
import { LapseReturnCard } from '@/components/LapseReturnCard';
import {
  dismissLapseRecovery,
  getLapseRecoveryPrompt,
  recordLapseRecoveryAction,
  type LapseAction,
  type LapsePrompt,
} from '@/features/retention/lapseRecovery';

const { width: screenWidth } = Dimensions.get('window');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const HOME_GUIDE_SEEN_KEY = 'home_guide_shown_once';

function getEnglishGenre(genre?: string): string {
  if (!genre) return 'Classic Literature';
  const g = genre.trim();
  if (g.includes('উপন্যাস') || g.includes('小説') || g.includes('소설')) return 'Novel';
  if (g.includes('ঐতিহাসিক') || g.includes('歴史') || g.includes('역사')) return 'Historical';
  if (g.includes('গোয়েন্দা') || g.includes('推理') || g.includes('추리')) return 'Mystery';
  if (g.includes('নাটক') || g.includes('戯曲') || g.includes('희곡')) return 'Drama';
  if (g.includes('কবিতা') || g.includes('詩') || g.includes('시')) return 'Poetry';
  if (g.includes('গল্প') || g.includes('短編') || g.includes('단편')) return 'Short Stories';
  if (g.includes('কিশোর') || g.includes('童話') || g.includes('동화')) return 'Folklore';
  if (g.includes('প্রবন্ধ') || g.includes('随筆') || g.includes('수필')) return 'Essays';
  return isBengaliText(g) || isJapaneseText(g) || isKoreanText(g) ? 'Classic' : g;
}

type LiterarySpark = {
  quote: string;
  source: string;
  author: string;
  slug?: string;
  lang?: 'bn' | 'ja' | 'ko' | 'en';
};

const LITERARY_SPARKS: LiterarySpark[] = [
  // Bengali Sparks
  {
    quote: 'আলো আমার, আলো ওগো, আলো ভুবন-ভরা—\nআলো নয়ন-ধোওয়া আমার, আলো পরান-হরা।',
    author: 'রবীন্দ্রনাথ ঠাকুর',
    source: 'গীতাঞ্জলি',
    lang: 'bn',
  },
  {
    quote: 'জ্ঞান অর্জনের পথে কোনো বাধা চিরস্থায়ী হতে পারে না। আলোকবর্তিকা একবার প্রজ্বলিত হলে অন্ধকার মিলিয়ে যেতে বাধ্য।',
    author: 'বেগম রোকেয়া',
    source: 'অবরোধ-বাসিনী',
    slug: 'aborodh-basini',
    lang: 'bn',
  },
  {
    quote: 'অরণ্যের এই গভীর নিস্তব্ধতায় মনে হয়, জগতের সমস্ত কলরব মুছে গিয়ে কেবল হৃদয়ের নির্মল সুরটিই বেজে চলেছে।',
    author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
    source: 'আরণ্যক',
    slug: 'aranyak',
    lang: 'bn',
  },
  {
    quote: 'গাহি সাম্যের গান—\nযেখানে আসিয়া এক হয়ে গেছে সব বাধা-ব্যবধান,\nযেখানে মিশেছে হিন্দু-বৌদ্ধ-মুসলিম-ক্রীশ্চান।',
    author: 'কাজী নজরুল ইসলাম',
    source: 'সাম্যবাদী',
    lang: 'bn',
  },

  // Japanese Sparks
  {
    quote: '精神的に向上心のないものは、ばかだ。本当の真実はいつも静寂の中に宿る。',
    author: '夏目漱石',
    source: 'こころ',
    lang: 'ja',
  },
  {
    quote: '雨ニモマケズ、風ニモマケズ、雪ニモ夏ノ暑サニモマケヌ丈夫ナカラダヲモチ。',
    author: '宮沢賢治',
    source: '雨ニモマケズ',
    lang: 'ja',
  },
  {
    quote: '信じられているから走るのだ。真の友情は疑いよりも強く、死よりも尊い。',
    author: '太宰治',
    source: '走れメロス',
    lang: 'ja',
  },
  {
    quote: '人間は、誰も悪人になろうと思って悪人になるのではない。ただ生きんがために迷うのだ。',
    author: '芥川龍之介',
    source: '羅生門',
    lang: 'ja',
  },

  // Korean Sparks
  {
    quote: '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    author: '윤동주',
    source: '서시 (하늘과 바람과 별과 시)',
    lang: 'ko',
  },
  {
    quote: '날개야 다시 돋아라. 날자. 날자. 한 번만 더 날아보자꾸나. 한 번만 더 날아보자.',
    author: '이상',
    source: '날개',
    lang: 'ko',
  },
  {
    quote: '나 보기가 역겨워 가실 때에는 말없이 고이 보내 드리우리다. 영변에 약산 진달래꽃.',
    author: '김소월',
    source: '진달래꽃',
    lang: 'ko',
  },
  {
    quote: '봄은 온 세상에 향기로운 바람을 불어넣으며, 우리 가슴속에 새로운 희망을 틔운다.',
    author: '김유정',
    source: '봄·봄',
    lang: 'ko',
  },

  // World / English Sparks
  {
    quote: '“I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book!”',
    author: 'Jane Austen',
    source: 'Pride and Prejudice',
    lang: 'en',
  },
  {
    quote: '“If you look for perfection, you will never be content. True peace is found in embracing each page of life as it unfolds.”',
    author: 'Leo Tolstoy',
    source: 'War and Peace',
    lang: 'en',
  },
  {
    quote: '“The wound is the place where the Light enters you.”',
    author: 'Rumi',
    source: 'Masnavi',
    lang: 'en',
  },
  {
    quote: '“There is no friend as loyal as a book.”',
    author: 'Ernest Hemingway',
    source: 'Reflections',
    lang: 'en',
  },
];

function getGreeting(): { title: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { title: 'Good morning', subtitle: 'Start your day with a page of calm' };
  }
  if (hour >= 12 && hour < 17) {
    return { title: 'Good afternoon', subtitle: 'A quiet pause in your day' };
  }
  if (hour >= 17 && hour < 21) {
    return { title: 'Good evening', subtitle: 'The lamp is trimmed and glowing' };
  }
  return { title: 'Night reading', subtitle: 'The night is a page, and the lamp its only light' };
}

export default function Homescreen() {
  const { colors, cultureTheme, typography, spacing, radius, layout, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const targetReadingLanguage = useTargetReadingLanguage();
  const motherTongue = useMotherTongue();
  const motherTongueOption = getMotherTongueOption(motherTongue);
  const scriptureLabels = getScriptureLabels(motherTongue);

  const [loading, setLoading] = useState(true);
  const [latestBook, setLatestBook] = useState<BookRow | null>(null);
  const [latestPosition, setLatestPosition] = useState<ReadingPosition | null>(null);
  const [localRecommendations, setLocalRecommendations] = useState<LocalRecommendation[]>([]);
  const [readyBook, setReadyBook] = useState<BookRow | null>(null);
  const [calibratedBook, setCalibratedBook] = useState<CalibratedStartingBook | null>(null);
  const [isCalibrationSkipped, setIsCalibrationSkipped] = useState(false);
  const [starterDoor, setStarterDoor] = useState<'gentle' | 'balanced' | 'deep'>('balanced');
  const [calibrationModalVisible, setCalibrationModalVisible] = useState(false);
  const [sparkIndex, setSparkIndex] = useState(0);
  const [cadenceGoal, setCadenceGoal] = useState<ReadingGoal | null>(null);
  const [cadenceModalVisible, setCadenceModalVisible] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneConfig | null>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [lapsePrompt, setLapsePrompt] = useState<LapsePrompt | null>(null);
  const [srsMetrics, setSrsMetrics] = useState<{
    totalWords: number;
    dueToday: number;
    masteredCount: number;
  } | null>(null);
  const [spotlight, setSpotlight] = useState<{
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    synopsis: string;
    genre: string;
    totalChapters: number;
    allLabel: string;
    onPress: () => void;
    onAllPress: () => void;
  } | null>(null);

  const loadSpotlight = useCallback(async () => {
    try {
      if (targetReadingLanguage === 'bn') {
        const { books } = await fetchBanglaBooks({ limit: 12 });
        if (books.length > 0) {
          const b =
            books.find((bk) => bk.coverUrl && bk.synopsis && bk.synopsis.length > 30) ||
            books[0];
          setSpotlight({
            id: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl,
            synopsis: b.synopsis,
            genre: b.genre,
            totalChapters: b.totalChapters,
            allLabel: 'All Bengali Books →',
            onPress: () => router.push({ pathname: '/bangla/[slug]', params: { slug: b.slug } } as any),
            onAllPress: () => router.push({ pathname: '/bangla' } as any),
          });
        }
      } else if (targetReadingLanguage === 'ja') {
        const b = AOZORA_JAPANESE_BOOKS[0];
        setSpotlight({
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          synopsis: b.synopsis,
          genre: b.genre,
          totalChapters: b.totalChapters,
          allLabel: 'All Japanese Classics →',
          onPress: () => router.push({ pathname: '/book/[id]', params: { id: b.id } }),
          onAllPress: () => router.push('/(tabs)/library' as any),
        });
      } else if (targetReadingLanguage === 'ko') {
        const b = GONGU_KOREAN_BOOKS[0];
        setSpotlight({
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          synopsis: b.synopsis,
          genre: b.genre,
          totalChapters: b.totalChapters,
          allLabel: 'All Korean Classics →',
          onPress: () =>
            router.push({
              pathname: '/reader/[bookId]',
              params: { bookId: b.id, bookTitle: b.title, bookCoverUrl: b.coverUrl ?? '' },
            }),
          onAllPress: () => router.push('/(tabs)/library' as any),
        });
      } else {
        setSpotlight({
          id: 'pride-and-prejudice',
          title: 'Pride and Prejudice',
          author: 'Jane Austen',
          coverUrl: null,
          synopsis:
            'A timeless romantic masterpiece exploring manners, upbringing, morality, and marriage in 19th-century England.',
          genre: 'Novel',
          totalChapters: 61,
          allLabel: 'Explore Library →',
          onPress: () => router.push('/(tabs)/library' as any),
          onAllPress: () => router.push('/(tabs)/library' as any),
        });
      }
    } catch {
      // Non-fatal fallback
    }
  }, [targetReadingLanguage]);

  useEffect(() => {
    void loadSpotlight();
  }, [loadSpotlight]);

  const userSparks = useMemo(() => {
    const list = LITERARY_SPARKS.filter(
      (s) => !s.lang || s.lang === 'en' || s.lang === motherTongue,
    );
    return list.length > 0 ? list : LITERARY_SPARKS;
  }, [motherTongue]);

  const activeSpark = userSparks[sparkIndex % userSparks.length] ?? userSparks[0];

  const handleNextSpark = () => {
    setSparkIndex((prev) => (prev + 1) % userSparks.length);
  };

  const loadProgress = useCallback(async () => {
    setLoading(true);
    try {
      const metrics = await getSrsMetrics();
      setSrsMetrics(metrics);

      const [dismissedIds, recentSessions, positions, allPositions, catalogBooks] = await Promise.all([
        getDismissedBookIds(),
        getRecentSessions(10),
        listActiveReadingPositions(),
        listAllReadingPositions(),
        listBooks(),
      ]);
      const recommendations = getLocalRecommendations(catalogBooks, allPositions, {
        targetLanguage: targetReadingLanguage,
        recentSessions,
        dismissedBookIds: dismissedIds,
        limit: 4,
      });
      setLocalRecommendations(recommendations);
      if (recommendations.length > 0) {
        logEvent('recommendation_impression', {
          source: 'local_reading_rhythm',
          book_ids: recommendations.map(({ book }) => book.id),
        });
      }
      if (positions.length > 0) {
        const sorted = [...positions].sort((a, b) => b.updatedAt - a.updatedAt);
        const topPos = sorted[0];
        const topBookRow = await getBook(topPos.bookId);
        if (topBookRow) {
          setLatestBook(topBookRow);
          setLatestPosition(topPos);
          const goal = await getReadingGoal(topBookRow.id);
          setCadenceGoal(goal);
        } else {
          setLatestBook(null);
          setLatestPosition(null);
          setCadenceGoal(null);
        }
      } else {
        setLatestBook(null);
        setLatestPosition(null);
        setCadenceGoal(null);
      }

      setReadyBook(null);

      // Always load calibration & curated starting book
      const calib = await getStoredCalibrationData();
      const skipped = Boolean(calib?.isSkipped);
      setIsCalibrationSkipped(skipped);

      const theme = getLiteraryTheme();
      if (skipped) {
        const threeDoor = getThreeDoorStarterBooks(targetReadingLanguage, theme);
        const activeChoice = threeDoor[starterDoor] ?? threeDoor.balanced;
        setCalibratedBook(activeChoice.book);
      } else {
        const startingRec = getCalibratedStartingBook(
          targetReadingLanguage,
          theme,
          calib?.estimatedWords ?? 3500,
        );
        setCalibratedBook(startingRec);
      }
    } catch (err) {
      console.warn('[Homescreen] loadProgress failed:', err);
    } finally {
      setLoading(false);
    }
  }, [targetReadingLanguage, starterDoor]);

  const cadencePacing = useMemo(() => {
    if (!latestBook || !cadenceGoal) return null;
    return calculateCadencePacing({
      goal: cadenceGoal,
      totalChapters: Math.max(1, latestBook.totalChapters),
      currentChapterIndex: latestPosition?.chapterIndex ?? 0,
    });
  }, [latestBook, latestPosition, cadenceGoal]);

  const handleClearCurrentReading = useCallback(async () => {
    if (!latestBook) return;
    const bookId = latestBook.id;
    setLatestBook(null);
    setLatestPosition(null);
    await hideFromContinueReading(bookId);
  }, [latestBook]);

  const handleSelectStarterDoor = useCallback(
    (door: 'gentle' | 'balanced' | 'deep') => {
      setStarterDoor(door);
      const theme = getLiteraryTheme();
      const threeDoor = getThreeDoorStarterBooks(targetReadingLanguage, theme);
      setCalibratedBook(threeDoor[door].book);
      void Haptics.selectionAsync();
    },
    [targetReadingLanguage],
  );

  const [guideVisible, setGuideVisible] = useState(false);
  const guideDismissedInSessionRef = useRef(false);

  const handleCloseGuide = useCallback(() => {
    guideDismissedInSessionRef.current = true;
    setGuideVisible(false);
    void setSetting(HOME_GUIDE_SEEN_KEY, '1');
  }, []);

  const handleNavigateTab = useCallback((tab: 'library' | 'vocabulary' | 'settings') => {
    setGuideVisible(false);
    router.push(`/(tabs)/${tab}` as any);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;
      void (async () => {
        if (!guideDismissedInSessionRef.current) {
          const seen = await getSetting(HOME_GUIDE_SEEN_KEY);
          const shouldShow = seen !== '1';
          if (isFocused && shouldShow && !guideDismissedInSessionRef.current) {
            setGuideVisible(true);
          } else if (seen === '1') {
            guideDismissedInSessionRef.current = true;
          }
        }
        await loadProgress();

        // Evaluate reading stats milestones & ownership milestones
        try {
          const [prof, userStats] = await Promise.all([
            getUserProfile(),
            computeUserReadingStats(),
          ]);
          if (isFocused) {
            setIsGuestUser(!prof.isProtected);
          }

          // 1. Check stats milestones (30 minutes, 7 days)
          const statsMilestone = await evaluateReadingStatsMilestones({
            cumulativeReadingMinutes: Math.floor(userStats.totalReadingSeconds / 60),
            distinctReadingDays: new Set(userStats.weeklyActivity.filter((d) => d.hasRead).map((d) => d.dateStr)).size,
            isBookCompleted: userStats.booksCompletedCount > 0,
          });

          if (isFocused && statsMilestone) {
            setActiveMilestone(statsMilestone);
            return;
          }

          // 2. Check first saved word milestone (if at least one word was saved)
          if (userStats.totalSavedWords >= 1) {
            const wordMilestone = await checkAndTriggerMilestone('first_saved_word');
            if (isFocused && wordMilestone) {
              setActiveMilestone(wordMilestone);
              return;
            }
          }

          // 3. Check gentle lapse recovery prompt
          const lapse = await getLapseRecoveryPrompt();
          if (isFocused && lapse) {
            setLapsePrompt(lapse);
            logEvent('lapse_recovery_displayed', {
              stage: lapse.stage,
              days_since_last_read: lapse.daysSinceLastRead,
              action_type: lapse.primaryAction.type,
            });
          } else if (isFocused) {
            setLapsePrompt(null);
          }
        } catch {
          // Graceful fallback
        }
      })();
      return () => {
        isFocused = false;
      };
    }, [loadProgress]),
  );

  const greeting = getGreeting();

  const handleOpenBook = (bookId: string) => {
    if (latestBook?.id === bookId) {
      router.push({
        pathname: '/reader/[bookId]',
        params: {
          bookId,
          bookTitle: latestBook.title,
          bookCoverUrl: latestBook.coverUrl ?? '',
        },
      });
      return;
    }
    if (bookId.startsWith('bn-') || bookId.startsWith('aozora-') || bookId.startsWith('ko-')) {
      router.push('/(tabs)/library' as any);
      return;
    }
    router.push({
      pathname: '/book/[id]',
      params: { id: bookId },
    });
  };

  const handleExploreLibrary = () => {
    router.push('/(tabs)/library' as any);
  };

  const handleDismissRecommendation = useCallback(async (bookId: string) => {
    logEvent('recommendation_dismissed', { source: 'local_reading_rhythm', book_id: bookId });
    setLocalRecommendations((prev) => prev.filter((r) => r.book.id !== bookId));
    await dismissRecommendation(bookId);
  }, []);

  const handleLapseAction = (action: LapseAction) => {
    if (lapsePrompt) {
      void recordLapseRecoveryAction(lapsePrompt);
    }
    setLapsePrompt(null);
    if (action.type === 'current_book' && action.bookId) {
      handleOpenBook(action.bookId);
    } else {
      router.push(action.route as any);
    }
  };

  const handleDismissLapse = () => {
    if (lapsePrompt) {
      void dismissLapseRecovery(lapsePrompt);
    }
    setLapsePrompt(null);
  };

  const renderCalibratedCard = () => {
    if (!calibratedBook) return null;
    return (
      <View style={{ marginTop: spacing.md }}>
        <Pressable
          onPress={() => handleOpenBook(calibratedBook.id)}
          style={({ pressed }) => [
            styles.featuredCard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              borderColor: 'rgba(245, 166, 35, 0.45)',
              borderWidth: 1.5,
              marginTop: spacing.sm,
              padding: spacing.lg,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          {/* Top Calibrated / Curated Badge Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.8 },
                ]}
              >
                {isCalibrationSkipped ? 'CURATED FOR YOUR TASTE' : 'CALIBRATED FOR YOU'}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: colors.flameAmber,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.pill,
              }}
            >
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.primaryDark, fontSize: 10, letterSpacing: 0.5 },
                ]}
              >
                {isCalibrationSkipped ? 'Curated Classic' : calibratedBook.coverageBadge}
              </Text>
            </View>
          </View>

          {/* Three-Door Comfort Selector for Uncalibrated Readers */}
          {isCalibrationSkipped ? (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md }}>
              {(
                [
                  { key: 'gentle', label: 'Gentle Novella' },
                  { key: 'balanced', label: 'Balanced Classic' },
                  { key: 'deep', label: 'Deep Masterpiece' },
                ] as const
              ).map((door) => {
                const isSelected = starterDoor === door.key;
                return (
                  <Pressable
                    key={door.key}
                    onPress={() => handleSelectStarterDoor(door.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.flameAmber : colors.hairline,
                      backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        {
                          color: isSelected ? colors.flameAmber : colors.umber,
                          fontSize: 9.5,
                          fontWeight: isSelected ? '700' : '500',
                          letterSpacing: 0.3,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {door.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.featuredTop}>
            <BookSpine
              bookId={calibratedBook.id}
              title={calibratedBook.title}
              toneIndex={0}
              onPress={() => handleOpenBook(calibratedBook.id)}
              width={68}
              height={100}
            />
            <View style={styles.featuredInfo}>
              <Text
                style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}
                numberOfLines={2}
              >
                {calibratedBook.title}
              </Text>
              <Text
                style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}
                numberOfLines={1}
              >
                {calibratedBook.author}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: spacing.sm,
                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                  alignSelf: 'flex-start',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                }}
              >
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.flameAmber, fontSize: 11, fontWeight: '600' },
                  ]}
                >
                  {isCalibrationSkipped
                    ? '★ Recommended Starter · Curated by Genre'
                    : `✓ ${calibratedBook.coveragePercent}% Comprehension · Zero Fatigue`}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.quoteBox,
              {
                backgroundColor: colors.libraryBackground,
                borderRadius: radius.card,
                marginTop: spacing.md,
                padding: spacing.md,
              },
            ]}
          >
            <Text
              style={[
                typography.readingBody,
                { color: colors.ink, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
              ]}
              numberOfLines={2}
            >
              “{calibratedBook.synopsis}”
            </Text>

            <Text
              style={[
                typography.metadataCaption,
                { color: colors.fawn, fontSize: 11, marginTop: 6 },
              ]}
              numberOfLines={1}
            >
              {calibratedBook.reason}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
              <Pressable
                onPress={() => router.push('/library')}
                style={[
                  styles.continueButton,
                  {
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.hairline,
                    borderRadius: radius.pill,
                    marginTop: 0,
                  },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.ink, fontSize: 13 }]}>
                  Explore Library
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleOpenBook(calibratedBook.id)}
                style={[
                  styles.continueButton,
                  {
                    flex: 1.4,
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    marginTop: 0,
                  },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                  Start Reading
                </Text>
                <View style={{ marginLeft: 4 }}>
                  <ChevronRightIcon color={colors.primaryDark} size={14} />
                </View>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.screenMargin,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* Top Atmosphere Greeting */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[typography.screenTitle, { color: colors.ink }]}>{greeting.title}</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
                {greeting.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => setGuideVisible(true)}
              hitSlop={12}
              style={styles.helpButton}
              accessibilityLabel="Open App Guide"
            >
              <View style={[styles.helpBadge, { borderColor: colors.hairline, backgroundColor: colors.card }]}>
                <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13, fontWeight: '600' }]}>
                  ?
                </Text>
              </View>
            </Pressable>
          </View>
          <CultureEditionBanner targetReadingLanguage={targetReadingLanguage} />
        </View>

        {/* Gentle Lapse Recovery Welcome Card */}
        {lapsePrompt && (
          <LapseReturnCard
            prompt={lapsePrompt}
            onAction={handleLapseAction}
            onDismiss={handleDismissLapse}
          />
        )}

        {/* Active Reader / Welcome State */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.flameAmber} />
          </View>
        ) : latestBook && latestPosition ? (
          /* Active Reader State: Last Read Book */
          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
                Currently Reading
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 12 }]}>
                  Your place is kept
                </Text>
                <Pressable
                  onPress={handleClearCurrentReading}
                  hitSlop={12}
                  style={{
                    padding: 4,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear currently reading book"
                >
                  <CloseIcon color={colors.fawn} size={14} />
                </Pressable>
              </View>
            </View>

            {/* Featured Active Book Card */}
            <Pressable
              onPress={() => handleOpenBook(latestBook.id)}
              style={[
                styles.featuredCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  marginTop: spacing.sm,
                  padding: spacing.lg,
                },
              ]}
            >
              <View style={styles.featuredTop}>
                <BookSpine
                  bookId={latestBook.id}
                  title={latestBook.title}
                  coverUrl={latestBook.coverUrl}
                  toneIndex={0}
                  onPress={() => handleOpenBook(latestBook.id)}
                  width={68}
                  height={100}
                />
                <View style={styles.featuredInfo}>
                  <Text
                    style={[getNativeUiTextStyle(latestBook.sourceLanguage, 'row'), { color: colors.ink }]}
                    numberOfLines={2}
                  >
                    {latestBook.title}
                  </Text>
                  <Text
                    style={[getNativeUiTextStyle(latestBook.sourceLanguage, 'metadata'), { color: colors.umber, marginTop: 4 }]}
                    numberOfLines={1}
                  >
                    {latestBook.author} · {latestBook.sourceLanguage.toUpperCase()} → {targetLanguageLabel(targetLanguage)}
                  </Text>

                  {/* Progress Bar */}
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: colors.hairline, borderRadius: radius.pill, marginTop: spacing.md },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(6, Math.round(latestPosition.percentComplete * 100))}%`,
                          backgroundColor: colors.flameAmber,
                          borderRadius: radius.pill,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: colors.progressLabel, fontSize: 12, marginTop: 6 },
                    ]}
                  >
                    {Math.round(latestPosition.percentComplete * 100)}% complete · Chapter {latestPosition.chapterIndex + 1}
                  </Text>
                </View>
              </View>

              {/* Reading Cadence / Nightly Goal */}
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setCadenceModalVisible(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: cadenceGoal
                    ? (isLamp ? 'rgba(245, 166, 35, 0.12)' : 'rgba(245, 166, 35, 0.15)')
                    : (isLamp ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                  borderColor: cadenceGoal ? 'rgba(245, 166, 35, 0.35)' : colors.hairline,
                  borderWidth: 1,
                  borderRadius: radius.pill,
                  paddingVertical: 7,
                  paddingHorizontal: spacing.md,
                  marginTop: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{ fontSize: 13 }}>{cadenceGoal ? '🕯️' : '⏳'}</Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      {
                        color: cadenceGoal ? colors.flameAmber : colors.fawn,
                        fontWeight: cadenceGoal ? '700' : '500',
                        fontSize: 12,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {cadencePacing
                      ? `Cadence: ${cadencePacing.daysRemaining} days left · ${cadencePacing.requiredChaptersToday} ch/day`
                      : 'Set target days & daily reading pace'}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    {
                      color: cadenceGoal ? colors.flameAmber : colors.fawn,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    },
                  ]}
                >
                  {cadenceGoal ? 'Adjust →' : 'Set Goal →'}
                </Text>
              </Pressable>

              {/* Literary Encouragement & Action */}
              <View
                style={[
                  styles.quoteBox,
                  {
                    backgroundColor: colors.libraryBackground,
                    borderRadius: radius.card,
                    marginTop: spacing.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.readingBody,
                    { color: colors.ink, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
                  ]}
                >
                  &ldquo;A quiet chapter waits for you. Return to where your thoughts were left.&rdquo;
                </Text>

                <Pressable
                  onPress={() => handleOpenBook(latestBook.id)}
                  style={[
                    styles.continueButton,
                    { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.md },
                  ]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 14 }]}>
                    Continue Reading
                  </Text>
                  <View style={{ marginLeft: 6 }}>
                    <ChevronRightIcon color={colors.primaryDark} size={15} />
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </View>
        ) : calibratedBook ? (
          renderCalibratedCard()
        ) : readyBook ? (
          /* Ready to Read State: Downloaded Book */
          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
                Ready to Read
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 12 }]}>
                Downloaded on device
              </Text>
            </View>

            <Pressable
              onPress={() => handleOpenBook(readyBook.id)}
              style={[
                styles.featuredCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  marginTop: spacing.sm,
                  padding: spacing.lg,
                },
              ]}
            >
              <View style={styles.featuredTop}>
                <BookSpine
                  bookId={readyBook.id}
                  title={readyBook.title}
                  coverUrl={readyBook.coverUrl}
                  toneIndex={0}
                  onPress={() => handleOpenBook(readyBook.id)}
                  width={68}
                  height={100}
                />
                <View style={styles.featuredInfo}>
                  <Text
                    style={[getNativeUiTextStyle(readyBook.sourceLanguage, 'row'), { color: colors.ink }]}
                    numberOfLines={2}
                  >
                    {readyBook.title}
                  </Text>
                  <Text
                    style={[getNativeUiTextStyle(readyBook.sourceLanguage, 'metadata'), { color: colors.umber, marginTop: 4 }]}
                    numberOfLines={1}
                  >
                    {readyBook.author ? `${readyBook.author} · ` : ''}{readyBook.sourceLanguage === 'bn' ? 'বাংলা সাহিত্য' : 'Classic Edition'}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: spacing.md,
                      backgroundColor: colors.parchment,
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                    }}
                  >
                    <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '600' }]}>
                      ✓ Ready for offline reading
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.quoteBox,
                  {
                    backgroundColor: colors.libraryBackground,
                    borderRadius: radius.card,
                    marginTop: spacing.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.readingBody,
                    { color: colors.ink, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
                  ]}
                  numberOfLines={2}
                >
                  {readyBook.synopsis && readyBook.synopsis.length > 20
                    ? `“${readyBook.synopsis.slice(0, 120)}…”`
                    : '“The book is downloaded and waiting. Tap below to begin chapter one.”'}
                </Text>

                <Pressable
                  onPress={() => handleOpenBook(readyBook.id)}
                  style={[
                    styles.continueButton,
                    { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.md },
                  ]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 14 }]}>
                    Start Reading Now
                  </Text>
                  <View style={{ marginLeft: 6 }}>
                    <ChevronRightIcon color={colors.primaryDark} size={15} />
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </View>
        ) : (
          /* New User / Empty Reading State with meaningful illustration */
          <View style={{ marginTop: spacing.lg }}>
            <View
              style={[
                styles.welcomeHero,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  padding: spacing.xl,
                  alignItems: 'center',
                },
              ]}
            >
              <View style={{ marginBottom: spacing.md }}>
                <WordsIllustration />
              </View>
              <Text
                style={[
                  typography.screenTitle,
                  { color: colors.ink, textAlign: 'center', fontSize: 22 },
                ]}
              >
                Begin Your Journey
              </Text>
              <Text
                style={[
                  typography.readingBody,
                  {
                    color: colors.umber,
                    textAlign: 'center',
                    fontSize: 14,
                    lineHeight: 23,
                    marginTop: spacing.sm,
                    marginBottom: spacing.lg,
                  },
                ]}
              >
                A quiet haven for distraction-free reading, bilingual vocabulary learning, and timeless literature. Pick a book from the shelves to begin your journey.
              </Text>

              <Pressable
                onPress={handleExploreLibrary}
                style={[
                  styles.exploreButton,
                  { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 15 }]}>
                  Explore Libraries
                </Text>
                <View style={{ marginLeft: 6 }}>
                  <ChevronRightIcon color={colors.primaryDark} size={16} />
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* The Daily Flame — Language Learner Habit Ritual */}
        {srsMetrics && srsMetrics.totalWords > 0 ? (
          <View
            style={[
              styles.sparkCard,
              {
                backgroundColor: colors.card,
                borderColor: srsMetrics.dueToday > 0 ? 'rgba(245, 166, 35, 0.45)' : colors.hairline,
                borderWidth: 1,
                borderRadius: radius.card,
                marginTop: spacing.xl,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.sparkHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: srsMetrics.dueToday > 0 ? colors.flameAmber : '#27AE60',
                  }}
                />
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 11 }]}>
                  {srsMetrics.dueToday > 0 ? 'DAILY MEMORY HABIT' : 'DAILY FLAME LIT'}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.libraryBackground,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                  {srsMetrics.masteredCount} Mastered · {srsMetrics.totalWords} Saved
                </Text>
              </View>
            </View>

            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginTop: spacing.sm }]}>
              {srsMetrics.dueToday > 0
                ? `${srsMetrics.dueToday} word${srsMetrics.dueToday === 1 ? '' : 's'} waiting for review`
                : 'All memory cards reviewed for today'}
            </Text>

            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4, lineHeight: 18 }]}>
              {srsMetrics.dueToday > 0
                ? 'Practice spaced recall for 2 minutes to lock these literary words into permanent memory.'
                : 'Your language memory sanctuary is bright. Keep reading to discover new vocabulary.'}
            </Text>

            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/vocabulary', params: { tab: 'flashcards' } })}
              style={[
                styles.continueButton,
                {
                  backgroundColor: srsMetrics.dueToday > 0 ? colors.flameAmber : colors.libraryBackground,
                  borderRadius: radius.pill,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Text
                style={[
                  typography.buttonLabel,
                  { color: srsMetrics.dueToday > 0 ? colors.primaryDark : colors.flameAmber, fontSize: 13 },
                ]}
              >
                {srsMetrics.dueToday > 0 ? 'Review Due Words Now' : 'Open Flashcard Studio'}
              </Text>
              <View style={{ marginLeft: 6 }}>
                <ChevronRightIcon
                  color={srsMetrics.dueToday > 0 ? colors.primaryDark : colors.flameAmber}
                  size={14}
                />
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Daily Literary Spark — placed just below Current Reading */}
        <View
          style={[
            styles.sparkCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: radius.card,
              marginTop: spacing.xl,
              padding: spacing.md,
              overflow: 'hidden',
            },
          ]}
        >
          <CultureMotif theme={cultureTheme} color={colors.umber} opacity={0.72} />
          <View style={styles.sparkHeader}>
            <View style={styles.sparkTagRow}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 12 }]}>
                DAILY SPARK
              </Text>
            </View>
            <Pressable
              onPress={handleNextSpark}
              hitSlop={8}
              style={[
                styles.shuffleButton,
                { backgroundColor: colors.libraryBackground, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12 }]}>
                ✦ Next Quote
              </Text>
            </Pressable>
          </View>

          <Animated.View
            key={`${motherTongue}-${sparkIndex}`}
            entering={FadeIn.duration(180).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
          >
            <Text
              style={[
                isBengaliText(activeSpark.quote)
                  ? typography.banglaReadingBody
                  : typography.readingBody,
                {
                  color: colors.ink,
                  fontSize: isBengaliText(activeSpark.quote) ? 20 : 17,
                  lineHeight: isBengaliText(activeSpark.quote) ? 34 : 30,
                  fontStyle: isBengaliText(activeSpark.quote) ? 'normal' : 'italic',
                  marginVertical: spacing.sm,
                },
              ]}
            >
              {activeSpark.quote}
            </Text>
            <View style={styles.sparkFooter}>
              <Text
                style={[
                  isBengaliText(activeSpark.author)
                    ? typography.banglaMetadataCaption
                    : typography.metadataCaption,
                  { color: colors.umber, fontSize: isBengaliText(activeSpark.author) ? 15 : 13, flex: 1 },
                ]}
                numberOfLines={1}
              >
                — {activeSpark.author}
                {activeSpark.source ? ` (${activeSpark.source})` : ''}
              </Text>
              {activeSpark.slug ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/bangla/[slug]',
                      params: { slug: activeSpark.slug! },
                    })
                  }
                  hitSlop={8}
                >
                  <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13, fontWeight: '600' }]}>
                    Read →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </View>

        {/* Comparative Scripture Inquiry Card */}
        <View style={{ marginTop: spacing.xl }}>
          <Pressable
            onPress={() => {
              void hapticOpenInquiry();
              router.push('/mood-verses/ask');
            }}
            style={[
              styles.sanctuaryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                borderRadius: radius.card,
                padding: spacing.lg,
              },
            ]}
          >
            <View style={styles.sanctuaryHeader}>
              <View style={[styles.sanctuaryIconCircle, { backgroundColor: colors.flameAmber + '22' }]}>
                <QuestionIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[getNativeUiTextStyle(motherTongue, 'row'), { color: colors.ink }]}>
                  {scriptureLabels.comparativeTitle}
                </Text>
                <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.fawn, marginTop: 2 }]}>
                  {scriptureLabels.comparativeSubtitle}
                </Text>
              </View>
            </View>

            <Text
              style={[
                getNativeUiTextStyle(motherTongue, 'metadata'),
                {
                  color: colors.umber,
                  marginTop: spacing.md,
                },
              ]}
            >
              {scriptureLabels.comparativeBody}
            </Text>

            <View
              style={[
                styles.sanctuaryButton,
                {
                  backgroundColor: colors.libraryBackground,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: radius.pill,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.flameAmber }]}>
                {scriptureLabels.askLabel.replace('✦', '➔')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Curator's Pick (Featured Book) — Dynamic by Mother Tongue */}
        {spotlight ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
                CURATOR'S PICK · {motherTongueOption.shelfTitle.toUpperCase()}
              </Text>
              <Pressable
                onPress={spotlight.onAllPress}
                hitSlop={8}
              >
                <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13 }]}>
                  {spotlight.allLabel}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={spotlight.onPress}
              style={[
                styles.spotlightCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: radius.card,
                  marginTop: spacing.sm,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.spotlightRow}>
                <BookSpine
                  bookId={spotlight.id}
                  title={spotlight.title}
                  coverUrl={spotlight.coverUrl}
                  toneIndex={1}
                  onPress={spotlight.onPress}
                  width={72}
                  height={108}
                />
                <View style={styles.spotlightInfo}>
                  <View style={styles.spotlightBadgeRow}>
                    <View
                      style={[
                        styles.genreBadge,
                        {
                          backgroundColor: colors.pairPillBackground,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.pairPillText, fontSize: 11, fontWeight: '600' },
                        ]}
                      >
                        {getEnglishGenre(spotlight.genre)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      isBengaliText(spotlight.title) ? typography.banglaUiRowTitle : typography.uiRowTitle,
                      { color: colors.ink, fontSize: 18, lineHeight: 26, marginTop: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    {spotlight.title}
                  </Text>
                  <Text
                    style={[
                      isBengaliText(spotlight.author) ? typography.banglaMetadataCaption : typography.metadataCaption,
                      { color: colors.umber, marginTop: 2, fontSize: 14 },
                    ]}
                    numberOfLines={1}
                  >
                    {spotlight.author}
                  </Text>

                  <Text
                    style={[
                      isBengaliText(spotlight.synopsis) ? typography.banglaMetadataCaption : typography.metadataCaption,
                      { color: colors.fawn, fontSize: 13, lineHeight: 20, marginTop: 6 },
                    ]}
                    numberOfLines={3}
                  >
                    {spotlight.synopsis}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.spotlightActionRow,
                  { borderTopColor: colors.hairline, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.sm },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                  {spotlight.totalChapters > 0 ? `${spotlight.totalChapters} Chapters` : 'Complete Work'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 14 }]}>
                    View Book
                  </Text>
                  <ChevronRightIcon color={colors.flameAmber} size={14} />
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {localRecommendations.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
                FROM YOUR READING RHYTHM
              </Text>
              <Pressable onPress={handleExploreLibrary} hitSlop={8}>
                <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13 }]}>
                  Library →
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm }}
            >
              {localRecommendations.map(({ book, reason }, index) => (
                <View
                  key={book.id}
                  style={[
                    styles.localRecommendationCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                      borderRadius: radius.card,
                      position: 'relative',
                    },
                  ]}
                >
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel={`Dismiss recommendation for ${book.title}`}
                    accessibilityRole="button"
                    onPress={() => handleDismissRecommendation(book.id)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 2,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.hairline,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CloseIcon size={10} color={colors.fawn} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      logEvent('recommendation_opened', { source: 'local_reading_rhythm', book_id: book.id });
                      handleOpenBook(book.id);
                    }}
                  >
                    <BookSpine
                      bookId={book.id}
                      title={book.title}
                      coverUrl={book.coverUrl}
                      toneIndex={index + 2}
                      onPress={() => {
                        logEvent('recommendation_opened', { source: 'local_reading_rhythm', book_id: book.id });
                        handleOpenBook(book.id);
                      }}
                      width={56}
                      height={82}
                    />
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginTop: 8 }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                      {book.author}
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, lineHeight: 14, marginTop: 7 }]} numberOfLines={2}>
                      {reason}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Discover Curated Collections */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.md }]}>
            Discover Curated Collections
          </Text>

          <Pressable
            onPress={handleExploreLibrary}
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.card,
                borderRadius: radius.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                marginBottom: spacing.sm,
                padding: spacing.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>
                Classic Literature
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                Austen, Tolstoy, Dostoyevsky, Cervantes
              </Text>
            </View>
            <ChevronRightIcon color={colors.fawn} size={16} />
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/bangla' } as any)}
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.card,
                borderRadius: radius.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                marginBottom: spacing.sm,
                padding: spacing.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.banglaUiRowTitle, { color: colors.ink }]}>
                বাংলা সাহিত্য (Bengali Classics)
              </Text>
              <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                বঙ্কিমচন্দ্র, রবীন্দ্রনাথ, শরৎচন্দ্র, বিভূতিভূষণ
              </Text>
            </View>
            <ChevronRightIcon color={colors.fawn} size={16} />
          </Pressable>

          <Pressable
            onPress={() => {
              void hapticOpenInquiry();
              router.push('/mood-verses/ask');
            }}
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.card,
                borderRadius: radius.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                marginBottom: spacing.sm,
                padding: spacing.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[getNativeUiTextStyle(motherTongue, 'row'), { color: colors.ink }]}>
                {scriptureLabels.sacredTitle}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                {scriptureLabels.quran}, {scriptureLabels.oldTestament}/{scriptureLabels.newTestament}, {scriptureLabels.torah}, {scriptureLabels.vedas}
              </Text>
            </View>
            <ChevronRightIcon color={colors.fawn} size={16} />
          </Pressable>
        </View>
      </ScrollView>
      <HomeGuideModal
        visible={guideVisible}
        onClose={handleCloseGuide}
        onNavigateTab={handleNavigateTab}
      />
      <VocabularyCalibrationModal
        visible={calibrationModalVisible}
        onClose={() => setCalibrationModalVisible(false)}
        onCalibrated={(estimate) => {
          setIsCalibrationSkipped(false);
          setCalibratedBook(estimate.startingBook);
        }}
      />
      {latestBook ? (
        <ReadingCadenceModal
          visible={cadenceModalVisible}
          bookId={latestBook.id}
          bookTitle={latestBook.title}
          totalChapters={Math.max(1, latestBook.totalChapters)}
          currentChapterIndex={latestPosition?.chapterIndex ?? 0}
          onClose={() => setCadenceModalVisible(false)}
          onGoalSaved={(newGoal: ReadingGoal) => {
            setCadenceGoal(newGoal);
          }}
        />
      ) : null}

      <MilestoneCelebrationModal
        visible={activeMilestone != null}
        milestone={activeMilestone}
        isGuest={isGuestUser}
        onClose={() => setActiveMilestone(null)}
        onProtectAccount={() => router.push('/signup' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {},
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  helpButton: {
    paddingTop: 2,
  },
  helpBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredCard: {},
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  quoteBox: {},
  continueButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  explorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  welcomeHero: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  exploreButton: {
    height: 48,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkCard: {},
  sparkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sparkTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shuffleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sparkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightCard: {},
  localRecommendationCard: {
    width: 142,
    minHeight: 194,
    borderWidth: 1,
    padding: 10,
  },
  spotlightRow: {
    flexDirection: 'row',
  },
  spotlightInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  spotlightBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  genreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spotlightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sanctuaryCard: {},
  sanctuaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sanctuaryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sanctuaryButton: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
