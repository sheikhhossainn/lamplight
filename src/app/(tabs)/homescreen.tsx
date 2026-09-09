import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { FlameGlow } from '@/components/FlameGlow';
import { ChevronRightIcon, FeelingPromptIcon, SoundWaveIcon } from '@/components/icons';
import { getBook, type BookRow } from '@/db/repositories/books';
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
import { FeelingPromptModal } from '@/features/scripture-verses/FeelingPromptModal';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { isBengaliText } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

function getEnglishGenre(genre?: string): string {
  if (!genre) return 'Bengali Classic';
  const g = genre.trim();
  if (g.includes('উপন্যাস')) return 'Novel';
  if (g.includes('ঐতিহাসিক')) return 'Historical';
  if (g.includes('গোয়েন্দা')) return 'Mystery';
  if (g.includes('নাটক')) return 'Drama';
  if (g.includes('কবিতা')) return 'Poetry';
  if (g.includes('গল্প') || g.includes('ছোটগল্প')) return 'Short Stories';
  if (g.includes('কিশোর') || g.includes('রূপকথা')) return 'Folklore';
  if (g.includes('প্রবন্ধ')) return 'Essays';
  return isBengaliText(g) ? 'Bengali Classic' : g;
}

type LiterarySpark = {
  quote: string;
  source: string;
  author: string;
  slug?: string;
};

const LITERARY_SPARKS: LiterarySpark[] = [
  {
    quote: 'আলো আমার, আলো ওগো, আলো ভুবন-ভরা—\nআলো নয়ন-ধোওয়া আমার, আলো পরান-হরা।',
    author: 'রবীন্দ্রনাথ ঠাকুর',
    source: 'গীতাঞ্জলি',
  },
  {
    quote: 'জ্ঞান অর্জনের পথে কোনো বাধা চিরস্থায়ী হতে পারে না। আলোকবর্তিকা একবার প্রজ্বলিত হলে অন্ধকার মিলিয়ে যেতে বাধ্য।',
    author: 'বেগম রোকেয়া',
    source: 'অবরোধ-বাসিনী',
    slug: 'aborodh-basini',
  },
  {
    quote: 'অরণ্যের এই গভীর নিস্তব্ধতায় মনে হয়, জগতের সমস্ত কলরব মুছে গিয়ে কেবল হৃদয়ের নির্মল সুরটিই বেজে চলেছে।',
    author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
    source: 'আরণ্যক',
    slug: 'aranyak',
  },
  {
    quote: '“I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book!”',
    author: 'Jane Austen',
    source: 'Pride and Prejudice',
  },
  {
    quote: '“If you look for perfection, you will never be content. True peace is found in embracing each page of life as it unfolds.”',
    author: 'Leo Tolstoy',
    source: 'War and Peace',
  },
  {
    quote: 'গাহি সাম্যের গান—\nযেখানে আসিয়া এক হয়ে গেছে সব বাধা-ব্যবধান,\nযেখানে মিশেছে হিন্দু-বৌদ্ধ-মুসলিম-ক্রীশ্চান।',
    author: 'কাজী নজরুল ইসলাম',
    source: 'সাম্যবাদী',
  },
  {
    quote: '“The wound is the place where the Light enters you.”',
    author: 'Rumi',
    source: 'Masnavi',
  },
  {
    quote: '“There is no friend as loyal as a book.”',
    author: 'Ernest Hemingway',
    source: 'Reflections',
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

  useAmbiencePlayer();
  const currentTrackId = useAmbienceTrackId();

  const [loading, setLoading] = useState(true);
  const [latestBook, setLatestBook] = useState<BookRow | null>(null);
  const [latestPosition, setLatestPosition] = useState<ReadingPosition | null>(null);
  const [sparkIndex, setSparkIndex] = useState(0);
  const [feelingModalVisible, setFeelingModalVisible] = useState(false);
  const [spotlightBook, setSpotlightBook] = useState<BanglaBookSummary | null>(null);

  const loadSpotlight = useCallback(async () => {
    try {
      const { books } = await fetchBanglaBooks({ limit: 12 });
      if (books.length > 0) {
        const withRichInfo =
          books.find((b) => b.coverUrl && b.synopsis && b.synopsis.length > 30) || books[0];
        setSpotlightBook(withRichInfo);
      }
    } catch {
      // Non-fatal fallback
    }
  }, []);

  useEffect(() => {
    void loadSpotlight();
  }, [loadSpotlight]);

  const handleNextSpark = () => {
    setSparkIndex((prev) => (prev + 1) % LITERARY_SPARKS.length);
  };

  const loadProgress = useCallback(async () => {
    setLoading(true);
    try {
      const positions = await listActiveReadingPositions();
      if (positions.length === 0) {
        setLatestBook(null);
        setLatestPosition(null);
        setLoading(false);
        return;
      }

      // Most recently read book is the first or sorted by updatedAt
      const sorted = [...positions].sort((a, b) => b.updatedAt - a.updatedAt);
      const topPos = sorted[0];

      const topBookRow = await getBook(topPos.bookId);

      setLatestBook(topBookRow);
      setLatestPosition(topPos);
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
        ) : (
          /* New User / Empty Reading State */
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
                <FlameGlow size={58} variant="flicker" />
              </View>
              <Text
                style={[
                  typography.screenTitle,
                  { color: colors.ink, textAlign: 'center', fontSize: 22 },
                ]}
              >
                Welcome to Lamplight
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
            {LITERARY_SPARKS[sparkIndex].quote}
          </Text>

          <View style={styles.sparkFooter}>
            <Text
              style={[
                isBengaliText(LITERARY_SPARKS[sparkIndex].author)
                  ? typography.banglaMetadataCaption
                  : typography.metadataCaption,
                { color: colors.umber, fontSize: 13, flex: 1 },
              ]}
              numberOfLines={1}
            >
              — {LITERARY_SPARKS[sparkIndex].author}
              {LITERARY_SPARKS[sparkIndex].source ? ` (${LITERARY_SPARKS[sparkIndex].source})` : ''}
            </Text>
            {LITERARY_SPARKS[sparkIndex].slug ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/bangla/[slug]',
                    params: { slug: LITERARY_SPARKS[sparkIndex].slug! },
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

        {/* Curator's Pick (Featured Book) — moved down below in English */}
        {spotlightBook ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
                CURATOR'S PICK
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/bangla' } as any)}
                hitSlop={8}
              >
                <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13 }]}>
                  All Bengali Books →
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/bangla/[slug]',
                  params: { slug: spotlightBook.slug },
                })
              }
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
                  bookId={spotlightBook.id}
                  title={spotlightBook.title}
                  coverUrl={spotlightBook.coverUrl}
                  toneIndex={1}
                  onPress={() =>
                    router.push({
                      pathname: '/bangla/[slug]',
                      params: { slug: spotlightBook.slug },
                    })
                  }
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
                        {getEnglishGenre(spotlightBook.genre)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      isBengaliText(spotlightBook.title) ? typography.banglaUiRowTitle : typography.uiRowTitle,
                      { color: colors.ink, fontSize: 18, lineHeight: 26, marginTop: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    {spotlightBook.title}
                  </Text>
                  <Text
                    style={[
                      isBengaliText(spotlightBook.author) ? typography.banglaMetadataCaption : typography.metadataCaption,
                      { color: colors.umber, marginTop: 2, fontSize: 14 },
                    ]}
                    numberOfLines={1}
                  >
                    {spotlightBook.author}
                  </Text>

                  <Text
                    style={[
                      isBengaliText(spotlightBook.synopsis) ? typography.banglaMetadataCaption : typography.metadataCaption,
                      { color: colors.fawn, fontSize: 13, lineHeight: 20, marginTop: 6 },
                    ]}
                    numberOfLines={3}
                  >
                    {spotlightBook.synopsis}
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
                  {spotlightBook.totalChapters > 0 ? `${spotlightBook.totalChapters} Chapters` : 'Complete Work'}
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
