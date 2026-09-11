import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { WordsIllustration } from '@/components/NotebookIllustrations';
import { ChevronRightIcon, FeelingPromptIcon, SoundWaveIcon } from '@/components/icons';
import { getBook, listBanglaBooks, type BookRow } from '@/db/repositories/books';
import {
  listActiveReadingPositions,
  type ReadingPosition,
} from '@/db/repositories/readingPosition';
import { AMBIENCE_TRACKS } from '@/features/ambience/tracks';
import { setAmbienceTrackId, useAmbienceTrackId } from '@/features/ambience/ambiencePreference';
import { useAmbiencePlayer } from '@/features/ambience/useAmbiencePlayer';
import {
  fetchBanglaBooks,
  type BanglaBookSummary,
} from '@/features/content-ingestion/banglaApi';
import { AOZORA_JAPANESE_BOOKS } from '@/features/content-ingestion/japaneseApi';
import { GONGU_KOREAN_BOOKS } from '@/features/content-ingestion/koreanApi';
import { getMotherTongueOption, useMotherTongue } from '@/features/settings/motherTongue';
import { FeelingPromptModal } from '@/features/scripture-verses/FeelingPromptModal';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { isBengaliText, isJapaneseText, isKoreanText } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

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
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const motherTongue = useMotherTongue();
  const motherTongueOption = getMotherTongueOption(motherTongue);

  useAmbiencePlayer();
  const currentTrackId = useAmbienceTrackId();

  const [loading, setLoading] = useState(true);
  const [latestBook, setLatestBook] = useState<BookRow | null>(null);
  const [latestPosition, setLatestPosition] = useState<ReadingPosition | null>(null);
  const [readyBook, setReadyBook] = useState<BookRow | null>(null);
  const [sparkIndex, setSparkIndex] = useState(0);
  const [feelingModalVisible, setFeelingModalVisible] = useState(false);
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
      if (motherTongue === 'bn') {
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
      } else if (motherTongue === 'ja') {
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
      } else if (motherTongue === 'ko') {
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
          onPress: () => router.push({ pathname: '/reader/[bookId]', params: { bookId: b.id } }),
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
  }, [motherTongue]);

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
      const positions = await listActiveReadingPositions();
      if (positions.length > 0) {
        const sorted = [...positions].sort((a, b) => b.updatedAt - a.updatedAt);
        const topPos = sorted[0];
        const topBookRow = await getBook(topPos.bookId);
        if (topBookRow) {
          setLatestBook(topBookRow);
          setLatestPosition(topPos);
          setReadyBook(null);
          setLoading(false);
          return;
        }
      }

      // Check if user has downloaded any books ready to read
      const banglaBooks = await listBanglaBooks();
      const downloaded = banglaBooks.find((b) => b.isAvailable);
      if (downloaded) {
        setReadyBook(downloaded);
        setLatestBook(null);
        setLatestPosition(null);
      } else {
        setReadyBook(null);
        setLatestBook(null);
        setLatestPosition(null);
      }
    } catch (err) {
      console.warn('[Homescreen] loadProgress failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const greeting = getGreeting();

  const handleOpenBook = (bookId: string) => {
    router.push({
      pathname: '/reader/[bookId]',
      params: { bookId },
    });
  };

  const handleExploreLibrary = () => {
    router.push('/(tabs)/library' as any);
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
          <Text style={[typography.screenTitle, { color: colors.ink }]}>{greeting.title}</Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
            {greeting.subtitle}
          </Text>
        </View>

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
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 12 }]}>
                Your place is kept
              </Text>
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
                    style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}
                    numberOfLines={2}
                  >
                    {latestBook.title}
                  </Text>
                  <Text
                    style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}
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
                    style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}
                    numberOfLines={2}
                  >
                    {readyBook.title}
                  </Text>
                  <Text
                    style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}
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
            },
          ]}
        >
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

          <Text
            style={[
              typography.readingBody,
              {
                color: colors.ink,
                fontSize: 16,
                lineHeight: 26,
                fontStyle: 'italic',
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
                { color: colors.umber, fontSize: 13, flex: 1 },
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
        </View>

        {/* Heart Sanctuary Portal — in English */}
        <View style={{ marginTop: spacing.xl }}>
          <Pressable
            onPress={() => setFeelingModalVisible(true)}
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
                <FeelingPromptIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 17 }]}>
                  Heart Sanctuary
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2, fontSize: 13 }]}>
                  Comfort in sacred scripture
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.readingBody,
                {
                  color: colors.umber,
                  fontSize: 14,
                  lineHeight: 22,
                  marginTop: spacing.md,
                },
              ]}
            >
              Carrying grief, burnout, loneliness, or quiet gratitude? Speak or write your heart. Sacred words from the Quran, Bible, and Vedas meet you where you are.
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
              <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13 }]}>
                Speak or Write Your Heart →
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Sanctuary Ambience Bar */}
        <View style={{ marginTop: spacing.xl }}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SoundWaveIcon color={currentTrackId ? colors.flameAmber : colors.fawn} size={17} />
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginLeft: 6 }]}>
                AMBIENCE
              </Text>
            </View>
            {currentTrackId ? (
              <Pressable onPress={() => setAmbienceTrackId(null)} hitSlop={8}>
                <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12 }]}>
                  Mute
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ambienceScroll}
          >
            {AMBIENCE_TRACKS.map((track) => {
              const isActive = currentTrackId === track.id;
              return (
                <Pressable
                  key={track.id}
                  onPress={() => setAmbienceTrackId(isActive ? null : track.id)}
                  style={[
                    styles.ambienceChip,
                    {
                      backgroundColor: isActive ? colors.flameAmber : colors.card,
                      borderColor: isActive ? colors.flameAmber : colors.hairline,
                      borderWidth: 1,
                      borderRadius: radius.pill,
                      marginRight: spacing.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.buttonLabel,
                      {
                        color: isActive ? colors.primaryDark : colors.ink,
                        fontWeight: isActive ? '600' : '400',
                        fontSize: 13,
                      },
                    ]}
                  >
                    {isActive ? '▶ ' : ''}{track.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
              <Text style={[typography.banglaUiRowTitle, { color: colors.ink, fontSize: 17 }]}>
                বাংলা সাহিত্য (Bengali Classics)
              </Text>
              <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, marginTop: 2, fontSize: 13 }]}>
                বঙ্কিমচন্দ্র, রবীন্দ্রনাথ, শরৎচন্দ্র, বিভূতিভূষণ
              </Text>
            </View>
            <ChevronRightIcon color={colors.fawn} size={16} />
          </Pressable>

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
                Sacred Scriptures
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                Quran, Bible (OT/NT), Torah, Vedas
              </Text>
            </View>
            <ChevronRightIcon color={colors.fawn} size={16} />
          </Pressable>
        </View>
      </ScrollView>

      <FeelingPromptModal
        visible={feelingModalVisible}
        onClose={() => setFeelingModalVisible(false)}
        onSubmit={(text) => {
          setFeelingModalVisible(false);
          router.push({ pathname: '/mood-verses/reflect', params: { text } });
        }}
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
  ambienceScroll: {
    flexDirection: 'row',
    marginTop: 10,
    paddingBottom: 4,
  },
  ambienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
