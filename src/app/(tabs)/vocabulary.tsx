import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOutUp,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BookSpine } from '@/components/BookSpine';
import { CultureEditionBanner } from '@/components/CultureEditionBanner';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SpeakerIcon, TrashIcon } from '@/components/icons';
import {
  FlashcardsIllustration,
  QuotesIllustration,
  WordsIllustration,
} from '@/components/NotebookIllustrations';
import { SkeletonRows } from '@/components/SkeletonRows';
import { type BookRow, listBooks } from '@/db/repositories/books';
import { listActiveReadingPositions } from '@/db/repositories/readingPosition';
import { deleteSetting, getSetting, setSetting } from '@/db/repositories/appSettings';
import {
  deleteBibleHighlight,
  listAllBibleHighlights,
  type BibleHighlight,
} from '@/db/repositories/bible';
import { deleteHighlight, listAllHighlights, type Highlight } from '@/db/repositories/highlights';
import {
  deleteQuranHighlight,
  listAllQuranHighlights,
  type QuranHighlight,
} from '@/db/repositories/quran';
import {
  deleteSavedWord,
  listSavedWords,
  getVocabularyEligibility,
  updateWordSrs,
  type SavedWord,
  type VocabularyEligibility,
} from '@/db/repositories/savedWords';
import { getUsageNoteCache, getWordCluster, setUsageNoteCache, setWordCluster, type WordCluster, type WordRelated } from '@/db/repositories/wordCache';
import { getBookMeta as getBibleOtBookMeta, getBookVerses as getBibleOtVerses } from '@/features/bible-content/bibleData';
import { getBookMeta as getBibleNtBookMeta, getBookVerses as getBibleNtVerses } from '@/features/bible-content/bibleNtData';
import { getSurahMeta, getSurahVerses } from '@/features/quran-content/quranData';
import { sentenceContaining } from '@/features/reader/engine/words';
import { MIN_REVIEW_WORDS } from '@/features/vocabulary/reviewPrompt';
import {
  calculateNextSrsState,
  getStageLabel,
  getSrsPreviews,
  type SrsRating,
} from '@/features/vocabulary/srsAlgorithm';
import { ClozeChallenge } from '@/features/vocabulary/ClozeChallenge';
import { ClozeResultScreen } from '@/features/vocabulary/ClozeResultScreen';
import { generateWordCluster } from '@/features/vocabulary/clozeEngine';
import { speakWord, warmUpSpeechEngine } from '@/features/audio/pronunciationEngine';
import { getMotherTongue, getScriptureLabels, useMotherTongue, type ScriptureLabels } from '@/features/settings/motherTongue';
import { hapticFlashcardAction } from '@/lib/haptics';
import { logEvent } from '@/features/analytics/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { getNativeUiTextStyle } from '@/theme/typography';

type Tab = 'list' | 'flashcards' | 'quiz' | 'quotes' | 'verses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'Words' },
  { key: 'flashcards', label: 'Review' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'verses', label: 'Verses' },
];
const TAB_KEYS: Tab[] = ['list', 'flashcards', 'quiz', 'quotes', 'verses'];
const SRS_REVIEW_BATCH_SIZE = 20;
const QUIZ_QUESTION_LIMIT = 5;
const MIN_QUIZ_WORDS_PER_BOOK = 5;
const DAILY_REVIEW_CHECKPOINT_KEY = 'vocabulary.daily_review_checkpoint';

type DailyReviewCheckpoint = {
  date: string;
  reviewedWordIds: string[];
  difficultWordIds: string[];
  quizCompleted: boolean;
};

function localDateKey(nowMs: number = Date.now()): string {
  const date = new Date(nowMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Normalized shape for a bookmarked verse regardless of which scripture it
// came from — Quran (quran_highlights) and Bible OT/NT (bible_highlights,
// shared table, see docs/scriptures.md) each map into this before grouping/render.
type SavedVerseEntry = {
  id: string;
  groupTitle: string;
  reference: string;
  snippet: string;
  createdAt: number;
  onOpen: () => void;
  onRemove: () => Promise<void>;
};

function buildQuranVerseEntries(highlights: QuranHighlight[], labels: ScriptureLabels): SavedVerseEntry[] {
  return highlights.map((h) => {
    const meta = getSurahMeta(h.surahNumber);
    const verse = getSurahVerses(h.surahNumber).find((v) => v.number === h.verseNumber);
    return {
      id: h.id,
      groupTitle: meta ? `${meta.nameEnglish} · ${labels.quran}` : labels.quran,
      reference: `${labels.verse} ${h.verseNumber}`,
      snippet: verse?.textEnglish ?? '',
      createdAt: h.createdAt,
      onOpen: () =>
        router.push({
          pathname: '/quran/[surahNumber]',
          params: { surahNumber: String(h.surahNumber), jumpVerse: String(h.verseNumber) },
        }),
      onRemove: () => deleteQuranHighlight(h.id),
    };
  });
}

function buildBibleVerseEntries(highlights: BibleHighlight[], labels: ScriptureLabels): SavedVerseEntry[] {
  return highlights.map((h) => {
    const otMeta = getBibleOtBookMeta(h.bookId);
    const isNt = !otMeta;
    const meta = otMeta ?? getBibleNtBookMeta(h.bookId);
    const verses = isNt ? getBibleNtVerses(h.bookId) : getBibleOtVerses(h.bookId);
    const verse = verses.find((v) => v.chapter === h.chapter && v.verse.number === h.verse);
    const bookName = meta?.name ?? h.bookId;
    return {
      id: h.id,
      groupTitle: `${bookName} · ${isNt ? labels.newTestament : labels.oldTestament}`,
      reference: `${bookName} ${h.chapter}:${h.verse}`,
      snippet: verse?.verse.text ?? '',
      createdAt: h.createdAt,
      onOpen: () =>
        router.push({
          pathname: isNt ? '/bible-nt/[bookId]' : '/bible/[bookId]',
          params: { bookId: h.bookId, jumpChapter: String(h.chapter), jumpVerse: String(h.verse) },
        }),
      onRemove: () => deleteBibleHighlight(h.id),
    };
  });
}

export default function VocabularyScreen() {
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const motherTongue = useMotherTongue();
  const scriptureLabels = getScriptureLabels(motherTongue);
  const isLamp = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [eligibility, setEligibility] = useState<VocabularyEligibility | null>(null);
  const [recentBookId, setRecentBookId] = useState<string | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [quotes, setQuotes] = useState<Highlight[]>([]);
  const [quranHighlights, setQuranHighlights] = useState<QuranHighlight[]>([]);
  const [bibleHighlights, setBibleHighlights] = useState<BibleHighlight[]>([]);
  const [collapsedWordBooks, setCollapsedWordBooks] = useState<Record<string, boolean>>({});
  const [collapsedQuoteBooks, setCollapsedQuoteBooks] = useState<Record<string, boolean>>({});
  const [collapsedVerseGroups, setCollapsedVerseGroups] = useState<Record<string, boolean>>({});

  const toggleWordBook = (bookId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedWordBooks((prev) => ({ ...prev, [bookId]: !(prev[bookId] ?? true) }));
  };

  const toggleQuoteBook = (bookId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedQuoteBooks((prev) => ({ ...prev, [bookId]: !prev[bookId] }));
  };

  const toggleVerseGroup = (groupTitle: string) => {
    void Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedVerseGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };
  // The daily review prompt lands here with tab=flashcards, so it opens on the
  // deck rather than dropping the reader on the word list to find it.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(
    params.tab === 'flashcards' || params.tab === 'review' ? 'flashcards' : params.tab === 'quiz' ? 'quiz' : 'list',
  );
  const [studyingSynonymsForQuiz, setStudyingSynonymsForQuiz] = useState<SavedWord[] | null>(null);
  const [flashcardInit, setFlashcardInit] = useState<{ phase: 'challenge'; mode: 'synonyms' } | null>(null);

  const handleNavigateToStudySynonyms = (wordsToStudy: SavedWord[]) => {
    setStudyingSynonymsForQuiz(wordsToStudy);
    const bookIds = Array.from(new Set(wordsToStudy.map((w) => w.bookId)));
    setCollapsedWordBooks((prev) => {
      const next = { ...prev };
      bookIds.forEach((bId) => {
        next[bId] = false;
      });
      return next;
    });
    setTab('list');
  };

  // One themed confirm for both remove flows (word / quote), replacing the OS
  // alert. Holds the title/message and the action to run on confirm.
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    Promise.all([
      listSavedWords(),
      listBooks(),
      listAllHighlights(),
      listAllQuranHighlights(),
      listAllBibleHighlights(),
      getVocabularyEligibility(),
      listActiveReadingPositions(),
    ]).then(([w, b, q, qv, bv, nextEligibility, positions]) => {
      setWords(w);
      setEligibility(nextEligibility);
      setRecentBookId(positions[0]?.bookId ?? null);
      setBooks(b);
      setQuotes(q);
      setQuranHighlights(qv);
      setBibleHighlights(bv);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // The tab screen stays mounted, so the initial state above only covers a cold
  // launch — arriving here from the review prompt has to switch the tab too.
  useEffect(() => {
    if (params.tab === 'flashcards' || params.tab === 'review') setTab('flashcards');
    if (params.tab === 'quiz') setTab('quiz');
  }, [params.tab]);

  useEffect(() => {
    if (tab !== 'flashcards' || !eligibility) return;
    if (eligibility.totalSaved < MIN_REVIEW_WORDS) {
      logEvent('review_locked_viewed', { total_saved: eligibility.totalSaved, remaining: MIN_REVIEW_WORDS - eligibility.totalSaved });
    } else {
      logEvent('review_unlocked', { total_saved: eligibility.totalSaved, trigger: 'notebook' });
    }
  }, [eligibility, tab]);

  const confirmRemoveWord = useCallback(
    (word: SavedWord) => {
      setConfirm({
        title: 'Remove word',
        message: `Remove “${word.sourceWord}” from your vocabulary?`,
        onConfirm: async () => {
          await deleteSavedWord(word.id);
          reload();
        },
      });
    },
    [reload],
  );

  const confirmRemoveQuote = useCallback(
    (quote: Highlight) => {
      setConfirm({
        title: 'Remove quote',
        message: 'Remove this saved quote?',
        onConfirm: async () => {
          await deleteHighlight(quote.id);
          reload();
        },
      });
    },
    [reload],
  );

  const confirmRemoveVerse = useCallback(
    (entry: SavedVerseEntry) => {
      setConfirm({
        title: 'Remove bookmark',
        message: 'Remove this saved verse?',
        onConfirm: async () => {
          await entry.onRemove();
          reload();
        },
      });
    },
    [reload],
  );

  const bookTitle = (bookId: string) => books.find((b) => b.id === bookId)?.title ?? bookId;
  const getBook = (bookId: string) => books.find((b) => b.id === bookId);
  const groups = words.reduce<Record<string, SavedWord[]>>((acc, word) => {
    (acc[word.bookId] ??= []).push(word);
    return acc;
  }, {});
  const quoteGroups = quotes.reduce<Record<string, Highlight[]>>((acc, quote) => {
    (acc[quote.bookId] ??= []).push(quote);
    return acc;
  }, {});
  const verses = useMemo(
    () =>
      [...buildQuranVerseEntries(quranHighlights, scriptureLabels), ...buildBibleVerseEntries(bibleHighlights, scriptureLabels)].sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
    [quranHighlights, bibleHighlights, scriptureLabels],
  );
  const verseGroups = verses.reduce<Record<string, SavedVerseEntry[]>>((acc, entry) => {
    (acc[entry.groupTitle] ??= []).push(entry);
    return acc;
  }, {});

  const [segmentedWidth, setSegmentedWidth] = useState(0);
  const activeTabIndex = TAB_KEYS.indexOf(tab);
  const tabWidth = segmentedWidth > 0 ? (segmentedWidth - 8) / TABS.length : 0;
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
        damping: 26,
        stiffness: 280,
        mass: 0.45,
      });
    }
  }, [activeTabIndex, tabWidth, indicatorX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.parchment, paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.screenTitle, { color: colors.ink }]}>Notebook</Text>
        <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>
          {tab === 'quotes'
            ? `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`
            : tab === 'verses'
              ? `${verses.length} ${verses.length === 1 ? 'verse' : 'verses'}`
              : `${words.length} ${words.length === 1 ? 'word' : 'words'}`}
        </Text>
      </View>
      <CultureEditionBanner compact />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.sm, alignItems: 'flex-start' }}
        style={[styles.segmentedScroll, { marginTop: spacing.sm, marginBottom: spacing.md }]}
      >
      <View
        style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill, position: 'relative' }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - segmentedWidth) > 1) setSegmentedWidth(w);
        }}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: 4,
                backgroundColor: colors.primaryDark,
                borderRadius: radius.pill,
              },
              animatedIndicatorStyle,
            ]}
          />
        ) : null}

        {TABS.map(({ key, label }) => {
          const isSelected = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => {});
                setTab(key);
              }}
              style={[
                styles.segment,
                tabWidth === 0 && isSelected && { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
              ]}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    fontSize: 12,
                    color: isSelected ? colors.lampText : colors.fawn,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === 'flashcards' ? (
        !loaded ? (
          <SkeletonRows />
        ) : (eligibility?.totalSaved ?? 0) < MIN_REVIEW_WORDS ? (
          <LockedReview totalSaved={eligibility?.totalSaved ?? 0} recentBookId={recentBookId} />
        ) : (
          <FlashcardDeck
            words={words}
            books={books}
            dueCount={eligibility?.dueCount ?? 0}
            onWordUpdated={reload}
            onNavigateToStudySynonyms={handleNavigateToStudySynonyms}
            initialConfig={flashcardInit}
            onClearInitialConfig={() => setFlashcardInit(null)}
          />
        )
      ) : tab === 'quiz' ? (
        !loaded || !eligibility ? <SkeletonRows /> : <QuizTab eligibility={eligibility} books={books} words={words} />
      ) : tab === 'quotes' ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {!loaded ? (
            <SkeletonRows />
          ) : quotes.length === 0 ? (
            <EmptyPrompt variant="quotes" message="Quotes you save while reading will appear here." />
          ) : (
            Object.entries(quoteGroups).map(([bookId, groupQuotes]) => {
              const book = getBook(bookId);
              const title = book?.title ?? bookId;
              const isCollapsed = Boolean(collapsedQuoteBooks[bookId]);

              return (
                <View
                  key={bookId}
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleQuoteBook(bookId)}
                    style={styles.cardHeader}
                  >
                    <View style={styles.coverThumbnailWrapper}>
                      {book?.coverUrl ? (
                        <Image
                          source={{ uri: book.coverUrl }}
                          style={styles.coverThumbnailImage}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View style={[styles.coverFallback, { backgroundColor: isLamp ? '#3A342D' : '#DFD4C2' }]}>
                          <View style={[styles.coverAccentBar, { backgroundColor: colors.flameAmber }]} />
                          <Text style={[styles.coverFallbackInitials, { color: colors.ink }]}>
                            {title.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.headerInfo}>
                      <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, fontWeight: '600' }]}>
                        {title}
                      </Text>
                      <View style={styles.countRow}>
                        <View style={[styles.countDot, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                          {groupQuotes.length} {groupQuotes.length === 1 ? 'quote' : 'quotes'} saved
                        </Text>
                      </View>
                    </View>

                    <View style={styles.expandIconBox}>
                      {isCollapsed ? (
                        <ChevronRightIcon color={colors.straw} size={18} />
                      ) : (
                        <ChevronDownIcon color={colors.straw} size={18} />
                      )}
                    </View>
                  </Pressable>

                  {!isCollapsed ? (
                    <View style={styles.expandedContent}>
                      {groupQuotes.map((quote, index) => (
                        <View
                          key={quote.id}
                          style={[
                            styles.quoteRow,
                            index < groupQuotes.length - 1 && [
                              styles.itemDivider,
                              { borderBottomColor: isLamp ? '#332E27' : '#EAE1D3' },
                            ],
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: quote.id } })
                            }
                            style={styles.quoteMainContent}
                          >
                            <Text numberOfLines={4} style={[typography.poeticTagline, { color: colors.ink, lineHeight: 22 }]}>
                              &ldquo;{quote.quoteText}&rdquo;
                            </Text>
                          </Pressable>

                          <View style={styles.itemActions}>
                            <Pressable
                              hitSlop={8}
                              onPress={() =>
                                router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: quote.id } })
                              }
                              style={styles.actionIconBtn}
                            >
                              <ChevronRightIcon color={colors.straw} size={15} />
                            </Pressable>
                            <Pressable
                              hitSlop={8}
                              onPress={() => confirmRemoveQuote(quote)}
                              style={styles.actionIconBtn}
                            >
                              <TrashIcon color={colors.straw} size={16} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : tab === 'verses' ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {!loaded ? (
            <SkeletonRows />
          ) : verses.length === 0 ? (
            <EmptyPrompt variant="verses" message="Bookmark verses while reading scripture to see them here." />
          ) : (
            Object.entries(verseGroups).map(([groupTitle, groupVerses]) => {
              const isCollapsed = Boolean(collapsedVerseGroups[groupTitle]);

              return (
                <View
                  key={groupTitle}
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleVerseGroup(groupTitle)}
                    style={styles.cardHeader}
                  >
                    <View style={styles.coverThumbnailWrapper}>
                      <View style={[styles.scriptureBadgeFallback, { backgroundColor: isLamp ? '#2E2924' : '#E8DFCE' }]}>
                        <View style={[styles.coverAccentBar, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[styles.scriptureBadgeGlyph, { color: colors.flameAmber }]}>
                          📜
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerInfo}>
                      <Text numberOfLines={1} style={[getNativeUiTextStyle(motherTongue, 'row'), { color: colors.ink }]}>
                        {groupTitle}
                      </Text>
                      <View style={styles.countRow}>
                        <View style={[styles.countDot, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.fawn }]}>
                          {groupVerses.length} {scriptureLabels.verse}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.expandIconBox}>
                      {isCollapsed ? (
                        <ChevronRightIcon color={colors.straw} size={18} />
                      ) : (
                        <ChevronDownIcon color={colors.straw} size={18} />
                      )}
                    </View>
                  </Pressable>

                  {!isCollapsed ? (
                    <View style={styles.expandedContent}>
                      {groupVerses.map((entry, index) => (
                        <View
                          key={entry.id}
                          style={[
                            styles.verseRow,
                            index < groupVerses.length - 1 && [
                              styles.itemDivider,
                              { borderBottomColor: isLamp ? '#332E27' : '#EAE1D3' },
                            ],
                          ]}
                        >
                          <Pressable
                            onPress={entry.onOpen}
                            style={styles.verseMainContent}
                          >
                            <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.ink }]}>
                              {entry.reference}
                            </Text>
                            {entry.snippet ? (
                              <Text
                                numberOfLines={3}
                                style={[
                                  getNativeUiTextStyle(motherTongue, 'metadata'),
                                  styles.contextSentenceText,
                                  { color: isLamp ? '#B3A898' : '#736B60', marginTop: 4 },
                                ]}
                              >
                                &ldquo;{entry.snippet}&rdquo;
                              </Text>
                            ) : null}
                          </Pressable>

                          <View style={styles.itemActions}>
                            <Pressable
                              hitSlop={8}
                              onPress={entry.onOpen}
                              style={styles.actionIconBtn}
                            >
                              <ChevronRightIcon color={colors.straw} size={15} />
                            </Pressable>
                            <Pressable
                              hitSlop={8}
                              onPress={() => confirmRemoveVerse(entry)}
                              style={styles.actionIconBtn}
                            >
                              <TrashIcon color={colors.straw} size={16} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {!loaded ? (
            <SkeletonRows />
          ) : (
            <>
              {words.length === 0 ? (
                <EmptyPrompt variant="list" message="Words you save while reading will appear here." />
              ) : Object.entries(groups).map(([bookId, groupWords]) => {
              const book = getBook(bookId);
              const title = book?.title ?? bookId;
              const isCollapsed = collapsedWordBooks[bookId] ?? true;

              return (
                <View
                  key={bookId}
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleWordBook(bookId)}
                    style={styles.cardHeader}
                  >
                    <View style={styles.coverThumbnailWrapper}>
                      {book?.coverUrl ? (
                        <Image
                          source={{ uri: book.coverUrl }}
                          style={styles.coverThumbnailImage}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View style={[styles.coverFallback, { backgroundColor: isLamp ? '#3A342D' : '#DFD4C2' }]}>
                          <View style={[styles.coverAccentBar, { backgroundColor: colors.flameAmber }]} />
                          <Text style={[styles.coverFallbackInitials, { color: colors.ink }]}>
                            {title.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.headerInfo}>
                      <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, fontWeight: '600' }]}>
                        {title}
                      </Text>
                      <View style={styles.countRow}>
                        <View style={[styles.countDot, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                          {groupWords.length} {groupWords.length === 1 ? 'word' : 'words'} saved
                        </Text>
                      </View>
                    </View>

                    <View style={styles.expandIconBox}>
                      {isCollapsed ? (
                        <ChevronRightIcon color={colors.straw} size={18} />
                      ) : (
                        <ChevronDownIcon color={colors.straw} size={18} />
                      )}
                    </View>
                  </Pressable>

                  {!isCollapsed ? (
                    <View style={styles.expandedContent}>
                      {groupWords.map((word, index) => (
                        <View
                          key={word.id}
                          style={[
                            styles.wordRow,
                            index < groupWords.length - 1 && [
                              styles.itemDivider,
                              { borderBottomColor: isLamp ? '#332E27' : '#EAE1D3' },
                            ],
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/reader/[bookId]',
                                params: {
                                  bookId: word.bookId,
                                  jumpChapter: String(word.chapterIndex),
                                  jumpPage: String(word.pageIndex),
                                },
                              })
                            }
                            style={styles.wordMainContent}
                          >
                            <View style={styles.wordHeaderLine}>
                              <Text style={[typography.translatedWordInline, { color: colors.ink, fontSize: 15 }]}>
                                {word.sourceWord}{' '}
                                <Text style={[getNativeUiTextStyle(motherTongue, 'row'), { color: colors.fawn }]}>
                                  → {word.translation}
                                </Text>
                              </Text>
                            </View>

                            {word.contextSentence ? (
                              <Text
                                numberOfLines={3}
                                style={[
                                  typography.metadataCaption,
                                  styles.contextSentenceText,
                                  { color: isLamp ? '#B3A898' : '#736B60' },
                                ]}
                              >
                                &ldquo;{sentenceContaining(word.contextSentence, word.sourceWord)}&rdquo;
                              </Text>
                            ) : null}
                            <WordRowCluster word={word} />
                          </Pressable>

                          <View style={styles.itemActions}>
                            <Pressable
                              hitSlop={8}
                              onPress={() => void speakWord(word.sourceWord, word.sourceLang)}
                              style={styles.actionIconBtn}
                            >
                              <SpeakerIcon color={colors.flameAmber} size={16} />
                            </Pressable>
                            <Pressable
                              hitSlop={8}
                              onPress={() => confirmRemoveWord(word)}
                              style={styles.actionIconBtn}
                            >
                              <TrashIcon color={colors.straw} size={16} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
              })}
            </>
          )}
        </ScrollView>
      )}
      </View>

      {studyingSynonymsForQuiz && tab === 'list' ? (
        <View
          style={[
            styles.studyBanner,
            {
              backgroundColor: isLamp ? '#26221D' : '#FFFFFF',
              borderColor: colors.flameAmber,
              bottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
              ⚡ SYNONYMS & ANTONYMS PREP
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
              Review word chips above, then test yourself
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setStudyingSynonymsForQuiz(null);
              setFlashcardInit({ phase: 'challenge', mode: 'synonyms' });
              setTab('flashcards');
            }}
            style={[styles.studyBannerBtn, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 12 }]}>
              Take Quiz →
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirm != null}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

function WordRowCluster({ word }: { word: SavedWord }) {
  const { colors, typography } = useTheme();
  const motherTongue = useMotherTongue();
  const [cluster, setCluster] = useState<WordCluster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadData = useCallback(async () => {
    const cached = await getWordCluster(word.id, motherTongue);
    if (cached) {
      setCluster(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const gen = await generateWordCluster(word.sourceWord, word.translation, motherTongue);
      if (gen) {
        setCluster(gen);
        await setWordCluster(word.id, motherTongue, gen);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [motherTongue, word.id, word.sourceWord, word.translation]);

  const showDetails = () => {
    setExpanded(true);
    if (!cluster) void loadData();
  };

  if (!expanded) {
    return (
      <Pressable onPress={showDetails} style={{ marginTop: 8 }}>
        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>Usage & related words</Text>
      </Pressable>
    );
  }

  if (loading && !cluster) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <ActivityIndicator size="small" color={colors.flameAmber} />
        <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 11 }]}>
          Loading usage & synonyms…
        </Text>
      </View>
    );
  }

  if (error && !cluster) {
    return (
      <Pressable
        onPress={() => void loadData()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
      >
        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
          Details unavailable · <Text style={{ color: colors.flameAmber, fontWeight: '600' }}>Tap to retry</Text>
        </Text>
      </Pressable>
    );
  }

  if (!cluster) return null;

  return (
    <View style={{ marginTop: 8 }}>
      {cluster.usageNote ? (
        <View style={{ marginBottom: 6 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9, marginBottom: 2 }]}>
            WHEN & WHY USED
          </Text>
          <Text
            numberOfLines={3}
            style={[
              getNativeUiTextStyle(motherTongue, 'metadata'),
              { color: colors.fawn, fontStyle: 'italic' },
            ]}
          >
            {cluster.usageNote}
          </Text>
        </View>
      ) : null}

      {cluster.synonyms && cluster.synonyms.length > 0 ? (
        <View style={{ marginBottom: 6 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.straw, fontSize: 9, marginBottom: 4 }]}>
            SYNONYMS{' '}
            <Text style={[getNativeUiTextStyle('bn', 'metadata'), { color: colors.straw, fontSize: 13 }]}>
              (সমার্থক শব্দ)
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cluster.synonyms.map((syn, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: 'rgba(39,174,96,0.1)',
                  borderColor: 'rgba(39,174,96,0.3)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={[typography.metadataCaption, { fontSize: 12, color: colors.ink }]}>
                  <Text style={{ fontWeight: '600' }}>{syn.word}</Text>
                  {syn.meaning ? (
                    <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.ink }]}> · {syn.meaning}</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {cluster.antonyms && cluster.antonyms.length > 0 ? (
        <View>
          <Text style={[typography.eyebrowLabel, { color: colors.straw, fontSize: 9, marginBottom: 4 }]}>
            ANTONYMS{' '}
            <Text style={[getNativeUiTextStyle('bn', 'metadata'), { color: colors.straw, fontSize: 13 }]}>
              (বিপরীত শব্দ)
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cluster.antonyms.map((ant, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: 'rgba(184,84,80,0.1)',
                  borderColor: 'rgba(184,84,80,0.3)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={[typography.metadataCaption, { fontSize: 12, color: colors.ink }]}>
                  <Text style={{ fontWeight: '600' }}>{ant.word}</Text>
                  {ant.meaning ? (
                    <Text style={[getNativeUiTextStyle(motherTongue, 'metadata'), { color: colors.ink }]}> · {ant.meaning}</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// One empty-state layout for all four segments so the caption and CTA sit at
// the same position no matter which tab is active. Verses reuses the Quotes
// illustration (both are a "saved passage" card) rather than a new bespoke
// animation.
function EmptyPrompt({ message, variant }: { message: string; variant: Tab }) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={[styles.emptyState, { marginTop: spacing.lg }]}>
      <View style={{ marginBottom: spacing.lg }}>
        {variant === 'list' ? (
          <WordsIllustration />
        ) : variant === 'flashcards' ? (
          <FlashcardsIllustration />
        ) : (
          <QuotesIllustration />
        )}
      </View>
      <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center' }]}>{message}</Text>
      <Pressable
        onPress={() => router.push('/library')}
        style={[
          styles.emptyCta,
          { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.lg },
        ]}
      >
        <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Browse books to read</Text>
      </Pressable>
    </View>
  );
}

// Fisher-Yates. Save order is a poor review order — it lets you learn a card by
// its position in the deck instead of by the word.
// Sort so words due for review come first, then shuffle the due and non-due sets.
// A due backlog is split into small, finishable sessions rather than one flood.
function srsSorted(words: SavedWord[], dueOnly: boolean = true): SavedWord[] {
  const now = Date.now();
  const due = words.filter((w) => (w.srsDueDate || 0) <= now);
  const future = words.filter((w) => (w.srsDueDate || 0) > now);

  const shuffleArray = (arr: SavedWord[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  if (dueOnly && due.length > 0) {
    const dueGroups = new Map<number, SavedWord[]>();
    due.forEach((word) => {
      const key = word.srsDueDate || 0;
      dueGroups.set(key, [...(dueGroups.get(key) ?? []), word]);
    });
    return [...dueGroups.entries()]
      .sort(([firstDue], [secondDue]) => firstDue - secondDue)
      .flatMap(([, group]) => shuffleArray(group))
      .slice(0, SRS_REVIEW_BATCH_SIZE);
  }
  return shuffleArray([...due, ...future]).slice(0, Math.min(10, words.length));
}

function LockedReview({ totalSaved, recentBookId }: { totalSaved: number; recentBookId: string | null }) {
  const { colors, typography, spacing, radius } = useTheme();
  const remaining = MIN_REVIEW_WORDS - totalSaved;
  const destination = recentBookId
    ? { pathname: '/reader/[bookId]' as const, params: { bookId: recentBookId } }
    : '/library';
  return (
    <View style={[styles.emptyState, { marginTop: spacing.lg }]}>
      <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center' }]}>Build your first review set</Text>
      <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.sm }]}>
        {totalSaved} of {MIN_REVIEW_WORDS} words saved
      </Text>
      <View accessibilityLabel={`${totalSaved} of ${MIN_REVIEW_WORDS} words saved`} style={[styles.unlockSteps, { marginTop: spacing.md }]}>
        {Array.from({ length: MIN_REVIEW_WORDS }, (_, index) => (
          <View key={index} style={[styles.unlockStep, { backgroundColor: index < totalSaved ? colors.flameAmber : colors.segmentedTrack }]} />
        ))}
      </View>
      <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center', marginTop: spacing.md }]}>
        Save {remaining} more {remaining === 1 ? 'word' : 'words'} while reading to start reviewing.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(destination)}
        style={[styles.emptyCta, { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.lg }]}
      >
        <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>{recentBookId ? 'Continue reading' : 'Browse books'}</Text>
      </Pressable>
    </View>
  );
}

type QuizState = 'NO_ELIGIBLE_BOOKS' | 'BOOK_PICKER' | 'MODE_PICKER' | 'IN_QUIZ' | 'RESULT';
type QuizMode = 'normal' | 'fresh' | 'synonyms';

function weekKey(nowMs: number = Date.now()): string {
  const date = new Date(nowMs);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return localDateKey(date.getTime());
}

function QuizTab({ eligibility, books, words }: { eligibility: VocabularyEligibility; books: BookRow[]; words: SavedWord[] }) {
  const { colors, typography, spacing, radius } = useTheme();
  const eligibleBooks = useMemo(
    () => eligibility.perBook.filter((entry) => entry.savedCount >= MIN_QUIZ_WORDS_PER_BOOK),
    [eligibility.perBook],
  );
  const [state, setState] = useState<QuizState>(eligibleBooks.length > 0 ? 'BOOK_PICKER' : 'NO_ELIGIBLE_BOOKS');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>('normal');
  const [quizWords, setQuizWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<{ word: SavedWord; correct: boolean }[]>([]);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state === 'NO_ELIGIBLE_BOOKS' && eligibleBooks.length > 0) setState('BOOK_PICKER');
    if (eligibleBooks.length === 0 && state !== 'IN_QUIZ' && state !== 'RESULT') setState('NO_ELIGIBLE_BOOKS');
  }, [eligibleBooks.length, state]);

  useEffect(() => {
    if (state === 'BOOK_PICKER') logEvent('quiz_book_picker_viewed', { eligible_book_count: eligibleBooks.length });
  }, [eligibleBooks.length, state]);

  const wordsForSelectedBook = useMemo(
    () => words.filter((word) => word.bookId === selectedBookId),
    [selectedBookId, words],
  );
  const bookForId = (bookId: string) => books.find((book) => book.id === bookId);
  const shuffledBookWords = (bookWords: SavedWord[]) => [...bookWords]
    .sort(() => Math.random() - 0.5)
    .slice(0, QUIZ_QUESTION_LIMIT);

  const startMode = async (nextMode: QuizMode) => {
    const scopedWords = shuffledBookWords(wordsForSelectedBook);
    if (scopedWords.length === 0) return;
    setAccessMessage(null);
    let compatibleWords = scopedWords;
    if (nextMode === 'synonyms') {
      compatibleWords = (
        await Promise.all(scopedWords.map(async (word) => {
          const cluster = await getWordCluster(word.id, getMotherTongue());
          const optionCount = (cluster?.synonyms.length ?? 0) + (cluster?.antonyms.length ?? 0);
          return optionCount >= 2 ? word : null;
        }))
      ).filter((word): word is SavedWord => word != null);
      if (compatibleWords.length === 0) {
        setAccessMessage('Similar-word data is not ready for this book yet. Try From the book instead.');
        return;
      }
    }
    if (nextMode !== 'normal') {
      const sampleKey = `vocabulary.advanced_quiz_sample.${weekKey()}`;
      if (await getSetting(sampleKey)) {
        logEvent('paywall_viewed', { trigger: 'advanced_quiz_sample_used', feature: nextMode });
        router.push('/paywall');
        return;
      }
      await setSetting(sampleKey, '1');
      logEvent('premium_sample_used', { feature: nextMode });
    }
    setQuizWords(compatibleWords);
    setMode(nextMode);
    setState('IN_QUIZ');
    logEvent('quiz_started', { book_id: selectedBookId ?? 'unknown', mode: nextMode, question_count: compatibleWords.length, entitlement_source: nextMode === 'normal' ? 'free' : 'sample' });
  };

  const openBook = (entry: VocabularyEligibility['perBook'][number], latestWord?: SavedWord) => {
    if (entry.savedCount >= MIN_QUIZ_WORDS_PER_BOOK) {
      setSelectedBookId(entry.bookId);
      setState('MODE_PICKER');
      logEvent('quiz_book_selected', { book_id: entry.bookId, saved_count: entry.savedCount });
    } else if (latestWord) {
      router.push({ pathname: '/reader/[bookId]', params: { bookId: latestWord.bookId, jumpChapter: String(latestWord.chapterIndex), jumpPage: String(latestWord.pageIndex) } });
    }
  };

  const bookRows = (entries: VocabularyEligibility['perBook']) => entries.map((entry, index) => {
    const book = bookForId(entry.bookId);
    const latestWord = words.filter((word) => word.bookId === entry.bookId).sort((a, b) => b.createdAt - a.createdAt)[0];
    return (
      <Pressable
        key={entry.bookId}
        accessibilityRole="button"
        onPress={() => openBook(entry, latestWord)}
        style={[styles.quizBookRow, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}
      >
        <BookSpine bookId={entry.bookId} title={book?.title ?? 'Unknown book'} toneIndex={index} onPress={() => openBook(entry, latestWord)} coverUrl={book?.coverUrl} width={42} height={62} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>{book?.title ?? 'Unknown book'}</Text>
          {book ? <Text numberOfLines={1} style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>{book.author}</Text> : null}
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 3 }]}>
            {entry.savedCount >= MIN_QUIZ_WORDS_PER_BOOK
              ? `${entry.savedCount} saved words${entry.dueCount > 0 ? ` · ${entry.dueCount} due` : ''}`
              : `${entry.savedCount}/5 words · save ${MIN_QUIZ_WORDS_PER_BOOK - entry.savedCount} more`}
          </Text>
        </View>
      </Pressable>
    );
  });

  if (state === 'IN_QUIZ') {
    return <ClozeChallenge words={quizWords} mode={mode} maxQuestions={QUIZ_QUESTION_LIMIT} onDone={(nextResults) => { setResults(nextResults); setState('RESULT'); }} />;
  }
  if (state === 'RESULT') {
    return <ClozeResultScreen results={results} onRetakeWithRelatedWords={() => setState('MODE_PICKER')} onDone={() => setState('MODE_PICKER')} />;
  }
  if (state === 'NO_ELIGIBLE_BOOKS') {
    const progressBooks = [...eligibility.perBook]
      .filter((entry) => entry.savedCount > 0 && entry.savedCount < MIN_QUIZ_WORDS_PER_BOOK)
      .sort((first, second) => second.savedCount - first.savedCount || second.latestSavedAt - first.latestSavedAt);
    return (
      <ScrollView contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.translatedWordPopup, { color: colors.ink }]}>Book Quiz</Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs, marginBottom: spacing.lg }]}>Save 5 words from one book to unlock its quiz.</Text>
        {progressBooks.length > 0 ? bookRows(progressBooks) : <EmptyPrompt variant="quiz" message="Words you save from a book will build its quiz here." />}
      </ScrollView>
    );
  }
  if (state === 'BOOK_PICKER') {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.translatedWordPopup, { color: colors.ink }]}>Choose a book</Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs, marginBottom: spacing.lg }]}>Each quiz draws from one book only.</Text>
        {bookRows(eligibleBooks)}
      </ScrollView>
    );
  }

  const selectedBook = selectedBookId ? bookForId(selectedBookId) : null;
  return (
    <ScrollView contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => setState('BOOK_PICKER')}><Text style={[typography.metadataCaption, { color: colors.flameAmber }]}>← Change book</Text></Pressable>
      <Text style={[typography.translatedWordPopup, { color: colors.ink, marginTop: spacing.md }]}>{selectedBook?.title ?? 'Book Quiz'}</Text>
      <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs, marginBottom: spacing.lg }]}>Choose how you want to practice.</Text>
      {([
        ['normal', 'From the book', 'Original context cloze · Free'],
        ['fresh', 'New sentence', 'A fresh context · one free session each week'],
        ['synonyms', 'Similar words', 'Synonym and antonym choices · one free session each week'],
      ] as const).map(([nextMode, label, detail]) => (
        <Pressable key={nextMode} onPress={() => void startMode(nextMode)} style={[styles.quizMode, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink }]}>{label}</Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>{detail}</Text>
        </Pressable>
      ))}
      {accessMessage ? <Text accessibilityLiveRegion="polite" style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center', marginTop: spacing.md }]}>{accessMessage}</Text> : null}
    </ScrollView>
  );
}

function selectQuizWords(completedWords: SavedWord[], difficultWords: SavedWord[]): SavedWord[] {
  const difficultIds = new Set(difficultWords.map((word) => word.id));
  const prioritized = completedWords.filter((word) => difficultIds.has(word.id));
  const remaining = completedWords.filter((word) => !difficultIds.has(word.id));

  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
  }

  return [...prioritized, ...remaining].slice(0, QUIZ_QUESTION_LIMIT);
}

function FlashcardDeck({
  words,
  books,
  dueCount,
  onWordUpdated,
  onNavigateToStudySynonyms,
  initialConfig,
  onClearInitialConfig,
}: {
  words: SavedWord[];
  books: BookRow[];
  dueCount: number;
  onWordUpdated?: () => void;
  onNavigateToStudySynonyms?: (wordsToStudy: SavedWord[]) => void;
  initialConfig?: { phase: 'challenge'; mode: 'synonyms' } | null;
  onClearInitialConfig?: () => void;
}) {
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const [flipped, setFlipped] = useState(false);

  // 3D flip animation: 0 = front, 1 = back
  const flipAnim = useSharedValue(0);
  const handleFlip = () => {
    void hapticFlashcardAction('flip');
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    flipAnim.value = withSpring(nextFlipped ? 1 : 0, { mass: 0.8, damping: 14, stiffness: 120 });
  };

  const frontAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipAnim.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` },
    ],
    backfaceVisibility: 'hidden' as const,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipAnim.value, [0, 1], [-180, 0], Extrapolation.CLAMP)}deg` },
    ],
    backfaceVisibility: 'hidden' as const,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  // Progress bar: fraction of deck completed
  const progressAnim = useSharedValue(0);
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  const [sessionStartTime, setSessionStartTime] = useState(() => Date.now());
  const [ratingFeedback, setRatingFeedback] = useState<string | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [difficultWords, setDifficultWords] = useState<SavedWord[]>([]);
  const [quizWords, setQuizWords] = useState<SavedWord[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isCheckpointLoaded, setIsCheckpointLoaded] = useState(false);
  const [isPracticeSession, setIsPracticeSession] = useState(false);
  const ratingLock = useRef(false);

  // Active recall session queue.
  // Rating 'again' moves the word to the back of the queue.
  // Rating 'hard'/'good'/'easy' graduates the card from this session.
  const [sessionQueue, setSessionQueue] = useState<SavedWord[]>(() => srsSorted(words));
  const [completedWords, setCompletedWords] = useState<SavedWord[]>([]);
  const [initialDeckSize, setInitialDeckSize] = useState(() => {
    const queue = srsSorted(words);
    return queue.length > 0 ? queue.length : words.length;
  });

  // Pre-warm native TTS so the very first tap responds immediately
  useEffect(() => {
    warmUpSpeechEngine();
  }, []);

  // Keep the reading context separate from the answer so the card still tests
  // active recall. It is always reset before the next card.
  const [isContextVisible, setIsContextVisible] = useState(false);
  const [isSemanticHintVisible, setIsSemanticHintVisible] = useState(false);
  const [currentCluster, setCurrentCluster] = useState<WordCluster | null>(null);

  // Sync session queue if word list changes
  const wordIds = words.map((w) => w.id).join(',');
  useEffect(() => {
    const startTime = Date.now();
    setSessionStartTime(startTime);
    const queue = srsSorted(words);
    setSessionQueue(queue);
    setInitialDeckSize(queue.length > 0 ? queue.length : words.length);
    setCompletedWords([]);
    setRatingFeedback(null);
    setIsSessionComplete(false);
    setDifficultWords([]);
    setQuizWords([]);
    setQuizCompleted(false);
    setIsPracticeSession(false);
    flipAnim.value = 0;
    progressAnim.value = 0;
    setFlipped(false);
    setIsContextVisible(false);
    setIsSemanticHintVisible(false);
    setCurrentCluster(null);
  }, [wordIds]);

  useEffect(() => {
    let cancelled = false;
    setIsCheckpointLoaded(false);

    void (async () => {
      try {
        const rawCheckpoint = await getSetting(DAILY_REVIEW_CHECKPOINT_KEY);
        if (cancelled) return;
        const checkpoint = rawCheckpoint ? JSON.parse(rawCheckpoint) as DailyReviewCheckpoint : null;
        if (!checkpoint || checkpoint.date !== localDateKey()) return;

        const wordsById = new Map(words.map((word) => [word.id, word]));
        const reviewed = checkpoint.reviewedWordIds
          .map((id) => wordsById.get(id))
          .filter((word): word is SavedWord => Boolean(word));
        if (reviewed.length === 0) return;

        setSessionStartTime(Date.now());
        setSessionQueue([]);
        setInitialDeckSize(reviewed.length);
        setCompletedWords(reviewed);
        setDifficultWords(
          checkpoint.difficultWordIds
            .map((id) => wordsById.get(id))
            .filter((word): word is SavedWord => Boolean(word)),
        );
        setQuizCompleted(Boolean(checkpoint.quizCompleted));
        setIsSessionComplete(true);
        setPhase('prompt');
      } catch {
        // A malformed checkpoint is treated as expired rather than blocking review.
      } finally {
        if (!cancelled) setIsCheckpointLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wordIds]);

  useEffect(() => {
    if (!isCheckpointLoaded || !isSessionComplete) return;
    const checkpoint: DailyReviewCheckpoint = {
      date: localDateKey(),
      reviewedWordIds: completedWords.map((word) => word.id),
      difficultWordIds: difficultWords.map((word) => word.id),
      quizCompleted,
    };
    void setSetting(DAILY_REVIEW_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  }, [completedWords, difficultWords, isCheckpointLoaded, isSessionComplete, quizCompleted]);

  const currentWord = sessionQueue[0];
  const bookTitle = currentWord ? books.find((b) => b.id === currentWord.bookId)?.title ?? '' : '';

  useEffect(() => {
    setIsContextVisible(false);
    setIsSemanticHintVisible(false);
    setCurrentCluster(null);

    if (!currentWord) return;

    let cancelled = false;
    void getWordCluster(currentWord.id, getMotherTongue()).then((cluster) => {
      if (!cancelled) setCurrentCluster(cluster);
    });

    return () => {
      cancelled = true;
    };
  }, [currentWord?.id]);

  type Phase = 'review' | 'prompt' | 'challenge' | 'result';
  const [phase, setPhase] = useState<Phase>(initialConfig?.phase ?? 'review');
  const [quizMode, setQuizMode] = useState<'normal' | 'fresh' | 'synonyms'>(initialConfig?.mode ?? 'normal');
  const [challengeResults, setChallengeResults] = useState<{ word: SavedWord; correct: boolean }[]>([]);

  useEffect(() => {
    if (initialConfig) {
      setPhase(initialConfig.phase);
      setQuizMode(initialConfig.mode);
      onClearInitialConfig?.();
    }
  }, [initialConfig, onClearInitialConfig]);

  // Remaining due count decrements as due cards are graduated in this session
  const remainingDueCount = useMemo(() => {
    return sessionQueue.filter((w) => (w.srsDueDate || 0) <= sessionStartTime).length;
  }, [sessionQueue, sessionStartTime]);
  const totalDueCount = useMemo(
    () => words.filter((word) => (word.srsDueDate || 0) <= sessionStartTime).length,
    [words, sessionStartTime],
  );

  const handleRate = async (rating: SrsRating) => {
    if (!currentWord || ratingLock.current) return;
    ratingLock.current = true;
    setIsContextVisible(false);
    setIsSemanticHintVisible(false);
    const currentState = {
      stage: currentWord.srsStage,
      intervalDays: currentWord.srsIntervalDays,
      easeFactor: currentWord.srsEaseFactor,
      reps: currentWord.srsReps,
      lapses: currentWord.srsLapses,
      dueDate: currentWord.srsDueDate,
    };
    const nextState = calculateNextSrsState(currentState, rating);
    try {
      await updateWordSrs(currentWord.id, nextState);
    } catch (error) {
      console.warn('[Vocabulary] Failed to update SRS rating:', error);
      ratingLock.current = false;
      return;
    }
    const ratingLabel = rating.charAt(0).toUpperCase() + rating.slice(1);
    setRatingFeedback(
      rating === 'again'
        ? `${ratingLabel} · Review again in under 10 minutes`
        : `${ratingLabel} · Scheduled for ${nextState.intervalDays} day${nextState.intervalDays === 1 ? '' : 's'}`,
    );
    void hapticFlashcardAction(rating === 'again' ? 'flip' : 'graduate');
    if (rating === 'again' || rating === 'hard') {
      setDifficultWords((previous) => (
        previous.some((word) => word.id === currentWord.id) ? previous : [...previous, currentWord]
      ));
    }
    onWordUpdated?.();

    // Reset card to front face
    flipAnim.value = withTiming(0, { duration: 0 });
    setFlipped(false);

    if (rating === 'again') {
      // Re-queue card to end of session queue so user is tested on it again
      setSessionQueue((prev) => [...prev.slice(1), currentWord]);
    } else {
      // Graduate card from the current session.
      const nextQueue = sessionQueue.slice(1);
      const newCompleted = completedWords.length + 1;
      const total = initialDeckSize > 0 ? initialDeckSize : 1;
      progressAnim.value = withTiming(nextQueue.length === 0 ? 1 : Math.min(newCompleted / total, 1), { duration: 400 });
      setCompletedWords((prev) => [...prev, currentWord]);
      setSessionQueue(nextQueue);
      if (nextQueue.length === 0) {
        setIsSessionComplete(true);
        setPhase('prompt');
        logEvent('review_completed', {
          reviewed: newCompleted,
          difficult: difficultWords.length + (rating === 'hard' ? 1 : 0),
          duration_ms: Date.now() - sessionStartTime,
        });
      }
    }
    ratingLock.current = false;
  };

  useEffect(() => {
    if (!ratingFeedback) return;
    const timeout = setTimeout(() => setRatingFeedback(null), 2200);
    return () => clearTimeout(timeout);
  }, [ratingFeedback]);

  const startReviewSession = (reviewWords: SavedWord[], practice: boolean = false) => {
    if (reviewWords.length === 0) return;
    const startTime = Date.now();
    setSessionStartTime(startTime);
    setSessionQueue(reviewWords);
    setInitialDeckSize(reviewWords.length);
    setCompletedWords([]);
    setDifficultWords([]);
    setQuizWords([]);
    setQuizCompleted(false);
    setIsSessionComplete(false);
    setIsPracticeSession(practice);
    logEvent('review_started', { source: practice ? 'practice' : 'notebook', due_count: dueCount, batch_size: reviewWords.length });
    void deleteSetting(DAILY_REVIEW_CHECKPOINT_KEY);
    flipAnim.value = 0;
    progressAnim.value = 0;
    setPhase('review');
    setFlipped(false);
  };

  const startQuiz = (mode: 'normal' | 'synonyms' = 'normal') => {
    const pool = completedWords.length > 0 ? completedWords : words;
    if (quizWords.length === 0) {
      setQuizWords(selectQuizWords(pool, difficultWords));
    }
    setQuizMode(mode);
    setPhase('challenge');
  };

  if (!isCheckpointLoaded) {
    return (
      <View style={[styles.deckWrap, { alignItems: 'center', justifyContent: 'center', minHeight: 320 }]}>
        <ActivityIndicator color={colors.flameAmber} />
      </View>
    );
  }

  if (phase === 'review' && !isSessionComplete && dueCount === 0 && !isPracticeSession) {
    const nextDue = words
      .map((word) => word.srsDueDate)
      .filter((dueDate) => dueDate > Date.now())
      .sort((first, second) => first - second)[0];
    return (
      <View style={[styles.deckWrap, { paddingHorizontal: spacing.md, alignItems: 'center' }]}>
        <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center' }]}>You’re caught up</Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.sm }]}>
          {nextDue ? `Your next card is due ${new Date(nextDue).toLocaleString()}.` : 'No cards are scheduled yet.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Practice vocabulary anyway"
          onPress={() => startReviewSession(srsSorted(words, false), true)}
          style={[styles.emptyCta, { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.lg }]}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Practice anyway</Text>
        </Pressable>
      </View>
    );
  }

  // Challenge phase
  if (phase === 'challenge') {
    const challengePool = quizWords.length > 0 ? quizWords : completedWords.length > 0 ? completedWords : words;
    return (
      <ClozeChallenge
        words={challengePool}
        mode={quizMode}
        maxQuestions={QUIZ_QUESTION_LIMIT}
        onDone={(results) => {
          setChallengeResults(results);
          setPhase('result');
        }}
      />
    );
  }

  // Result phase
  if (phase === 'result') {
    return (
      <ClozeResultScreen
        results={challengeResults}
        onRetakeWithRelatedWords={() => startQuiz('synonyms')}
        onDone={() => {
          setQuizCompleted(true);
          setIsSessionComplete(true);
          setPhase('prompt');
          setChallengeResults([]);
        }}
      />
    );
  }

  // Session Completion Screen — shown ONLY when all cards have been reviewed
  if (isSessionComplete || phase === 'prompt' || !currentWord) {
    const reviewedCount = completedWords.length > 0 ? completedWords.length : initialDeckSize;
    return (
      <Animated.View
        entering={FadeInDown.duration(200).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System)}
        style={[styles.deckWrap, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }]}
      >
        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 13, letterSpacing: 1.5, marginBottom: spacing.xs }]}>
          REVIEW COMPLETE
        </Text>
        <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center', marginBottom: spacing.md }]}>
          Session Finished
        </Text>

        <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: spacing.md }]}>
          {reviewedCount} word{reviewedCount === 1 ? '' : 's'} reviewed
        </Text>

        <View
          style={[
            styles.completionAction,
            {
              backgroundColor: colors.segmentedTrack,
              borderColor: colors.hairline,
              borderRadius: radius.card,
              marginTop: spacing.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', lineHeight: 20, marginBottom: quizCompleted ? 0 : spacing.sm }]}
          >
            {quizCompleted
              ? 'Today’s review and quiz are complete. Come back tomorrow for a fresh set.'
              : totalDueCount > 0
                ? `${totalDueCount} due card${totalDueCount === 1 ? '' : 's'} remain. Take the next batch when you are ready.`
                : 'Ready for one more round? Test your memory with a short fill-in-the-blank quiz.'}
          </Text>
          {!quizCompleted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take the fill-in-the-blank quiz"
              onPress={() => startQuiz()}
              style={[
                styles.completionQuizButton,
                { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 15 }]}>
                Take the Fill-in-the-Blank Quiz
              </Text>
            </Pressable>
          ) : null}
        </View>
        {difficultWords.length > 0 ? (
          <View
            style={[
              styles.reviewAgainSection,
              { borderColor: colors.hairline, borderRadius: radius.card, marginTop: spacing.md, padding: spacing.md },
            ]}
          >
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>REVIEW AGAIN</Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs }]}>You marked these as difficult.</Text>
            <View style={[styles.difficultWordList, { marginTop: spacing.sm }]}>
              {difficultWords.slice(0, 4).map((word) => (
                <Text key={word.id} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]} numberOfLines={1}>
                  {word.sourceWord} · {word.translation}
                </Text>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review difficult words again"
              onPress={() => startReviewSession(difficultWords)}
              style={[styles.reviewAgainButton, { borderColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.md }]}
            >
              <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 13 }]}>Review difficult words</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.md, textAlign: 'center' }]}>Clean review — no difficult words this session.</Text>
        )}
        {totalDueCount > 0 ? (
          <Pressable
            onPress={() => {
              startReviewSession(srsSorted(words));
            }}
            style={{ marginTop: spacing.lg }}
          >
            <Text style={[typography.eyebrowLabel, { color: colors.straw }]}>
              Continue review
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    );
  }

  const stageColor =
    currentWord.srsStage === 3
      ? colors.flameAmber
      : currentWord.srsStage === 2
        ? '#8A7F6E'
        : currentWord.srsStage === 1
          ? colors.fawn
          : colors.straw;

  return (
    <View style={styles.deckWrap}>
      {/* Header: Progress + Stage */}
      <View style={styles.srsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
            Card {Math.min(completedWords.length + 1, initialDeckSize)} of {initialDeckSize}
          </Text>
          {remainingDueCount > 0 ? (
            <View style={[styles.dueBadge, { backgroundColor: 'rgba(245,166,35,0.18)' }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                {remainingDueCount} in session · {totalDueCount} due
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.stageBadge, { borderColor: stageColor }]}>
          <Text style={[typography.eyebrowLabel, { color: stageColor, fontSize: 10 }]}>
            {getStageLabel(currentWord.srsStage)}
          </Text>
        </View>
      </View>

      <View style={styles.ratingFeedbackSlot}>
        {ratingFeedback ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            entering={FadeInDown.duration(180).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutUp.duration(160).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System)}
            style={[
              styles.ratingFeedback,
              { backgroundColor: colors.segmentedTrack, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
          >
            <Text style={[typography.metadataCaption, { color: colors.ink, textAlign: 'center' }]}>
              {ratingFeedback}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Progress Bar */}
      <View style={{ height: 3, backgroundColor: isLamp ? 'rgba(255,255,255,0.08)' : 'rgba(28,27,30,0.08)', borderRadius: 2, marginBottom: spacing.md, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 3, backgroundColor: colors.flameAmber, borderRadius: 2 }, progressBarStyle]} />
      </View>

      {/* Flashcard — 3D flip container */}
      <View style={[styles.flashcard, { borderRadius: radius.card }]}>
        {/* CARD FRONT */}
        <Animated.View
          pointerEvents={flipped ? 'none' : 'box-none'}
          style={[
            styles.flashcard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              padding: 20,
              justifyContent: 'center',
              alignItems: 'center',
            },
            frontAnimStyle,
          ]}
        >
          {/* English Word + Speaker */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
            <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center', fontSize: 24, lineHeight: 32 }]}>
              {currentWord.sourceWord}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => void speakWord(currentWord.sourceWord, currentWord.sourceLang, 'normal')}
              style={styles.cardSpeakerBtn}
            >
              <SpeakerIcon color={colors.flameAmber} size={18} />
            </Pressable>
          </View>

          {/* Active Recall Prompt & Progressive Hints */}
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.card,
              backgroundColor: isLamp ? '#23201D' : '#F7F2E9',
              borderColor: isLamp ? '#36312B' : '#E6DDD0',
              borderWidth: 1,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, textAlign: 'center', lineHeight: 18 }]}>
              What does this word mean?
            </Text>
            <Text style={[getNativeUiTextStyle('bn', 'metadata'), { color: colors.fawn, marginTop: 2, textAlign: 'center' }]}>
              অর্থ কী? মনে করার চেষ্টা করুন
            </Text>

            {isContextVisible && currentWord.contextSentence ? (
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: isLamp ? '#36312B' : '#E6DDD0',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9, letterSpacing: 0.8, marginBottom: 3 }]}>
                  CONTEXT FROM {bookTitle ? bookTitle.toUpperCase() : 'READING'}
                </Text>
                <Text
                  numberOfLines={3}
                  style={[
                    typography.metadataCaption,
                    { color: colors.fawn, fontStyle: 'italic', textAlign: 'center', lineHeight: 17, fontSize: 12 },
                  ]}
                >
                  &ldquo;{sentenceContaining(currentWord.contextSentence, currentWord.sourceWord)}&rdquo;
                </Text>
              </View>
            ) : null}

            {isSemanticHintVisible ? (
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: isLamp ? '#36312B' : '#E6DDD0',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9, letterSpacing: 0.8, marginBottom: 3 }]}>
                  SEMANTIC CLUE
                </Text>
                {currentCluster?.synonyms?.length ? (
                  <Text style={[typography.metadataCaption, { color: colors.ink, textAlign: 'center', fontSize: 12 }]}>
                    Similar to:{' '}
                    <Text style={{ color: colors.flameAmber, fontWeight: '600' }}>
                      {currentCluster.synonyms.map((synonym) => synonym.word).join(', ')}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', fontSize: 12, lineHeight: 17 }]}>
                    Think about the word’s role in the sentence, then reveal the meaning when you are ready.
                  </Text>
                )}
              </View>
            ) : null}

          </View>

          {/* Action Area */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 16,
              width: '100%',
            }}
          >
            {currentWord.contextSentence && !isContextVisible ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  void hapticFlashcardAction('flip');
                  setIsContextVisible(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: isLamp ? 'rgba(255,255,255,0.06)' : 'rgba(43,38,33,0.05)',
                  borderWidth: 1,
                  borderColor: isLamp ? 'rgba(255,255,255,0.14)' : 'rgba(43,38,33,0.12)',
                }}
              >
                <Text
                  style={[
                    typography.buttonLabel,
                    { color: colors.ink, fontSize: 12, letterSpacing: 0.2 },
                  ]}
                >
                  Show context
                </Text>
              </Pressable>
            ) : null}

            {!isSemanticHintVisible && (!currentWord.contextSentence || isContextVisible) ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  void hapticFlashcardAction('flip');
                  setIsSemanticHintVisible(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: isLamp ? 'rgba(255,255,255,0.06)' : 'rgba(43,38,33,0.05)',
                  borderWidth: 1,
                  borderColor: isLamp ? 'rgba(255,255,255,0.14)' : 'rgba(43,38,33,0.12)',
                }}
              >
                <Text style={[typography.buttonLabel, { color: colors.ink, fontSize: 12, letterSpacing: 0.2 }]}>
                  More clues
                </Text>
              </Pressable>
            ) : null}

            {/* Primary Solid Button */}
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                handleFlip();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: colors.flameAmber,
              }}
            >
              <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }]}>
                Reveal Meaning →
              </Text>
            </Pressable>
          </View>


        </Animated.View>

        {/* CARD BACK */}
        <Animated.View
          pointerEvents={flipped ? 'box-none' : 'none'}
          style={[
            styles.flashcard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              padding: 20,
              justifyContent: 'center',
              alignItems: 'center',
            },
            backAnimStyle,
          ]}
        >
          {/* English Source Word with Audio */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 38, marginBottom: 6 }}>
            <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center', fontSize: 22, lineHeight: 30, paddingVertical: 2 }]}>
              {currentWord.sourceWord}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => void speakWord(currentWord.sourceWord, currentWord.sourceLang, 'normal')}
              style={styles.cardSpeakerBtn}
            >
              <SpeakerIcon color={colors.flameAmber} size={18} />
            </Pressable>
          </View>

          {/* Mother Tongue Translation Section */}
          <View
            style={{
              marginTop: spacing.md,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: radius.card,
              backgroundColor: isLamp ? '#23201D' : '#F7F2E9',
              borderColor: isLamp ? '#36312B' : '#E6DDD0',
              borderWidth: 1,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, letterSpacing: 1, marginBottom: 4 }]}>
              MEANING
            </Text>
            <Text style={[typography.translatedWordPopup, { color: colors.flameAmber, textAlign: 'center', fontSize: 20, lineHeight: 28 }]}>
              {currentWord.translation}
            </Text>
          </View>

          {/* Book context quote */}
          {bookTitle ? (
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.md, textAlign: 'center' }]}>
              {bookTitle}
            </Text>
          ) : null}
          {currentWord.contextSentence ? (
            <Text
              numberOfLines={2}
              style={[
                typography.metadataCaption,
                { color: colors.textFaint, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              &ldquo;{sentenceContaining(currentWord.contextSentence, currentWord.sourceWord)}&rdquo;
            </Text>
          ) : null}

          <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.lg }]}>
            How well did you remember it?
          </Text>
          <View style={styles.srsRatingGrid}>
            {getSrsPreviews({
              stage: currentWord.srsStage,
              intervalDays: currentWord.srsIntervalDays,
              easeFactor: currentWord.srsEaseFactor,
              reps: currentWord.srsReps,
              lapses: currentWord.srsLapses,
              dueDate: currentWord.srsDueDate,
            }).map((preview) => {
              return (
                <Pressable
                  key={preview.rating}
                  accessibilityRole="button"
                  accessibilityLabel={`${preview.label}, review in ${preview.intervalDisplay}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    void handleRate(preview.rating);
                  }}
                  style={[styles.srsRateBtn, { backgroundColor: colors.segmentedTrack, borderColor: colors.hairline }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>{preview.label}</Text>
                  <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 10, marginTop: 2 }]}>
                    {preview.intervalDisplay}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {/* Bottom Bar: Skip / Next Word forward navigation */}
      {!flipped && sessionQueue.length > 1 ? (
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Pressable
            onPress={() => {
              void hapticFlashcardAction('graduate');
              flipAnim.value = withTiming(0, { duration: 0 });
              setFlipped(false);
              setIsContextVisible(false);
              setIsSemanticHintVisible(false);
              setSessionQueue((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
            }}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.segmentedTrack,
              borderWidth: 1,
              borderRadius: radius.pill,
              paddingHorizontal: 28,
              paddingVertical: 11,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={[typography.buttonLabel, { color: colors.ink, fontSize: 13 }]}>
              Next Word →
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
  },
  segmentedScroll: {
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  segment: {
    width: 68,
    alignItems: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowTrash: {
    padding: 4,
  },
  collectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  coverThumbnailWrapper: {
    width: 38,
    height: 52,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  coverThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coverAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3.5,
  },
  coverFallbackInitials: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scriptureBadgeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scriptureBadgeGlyph: {
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  countDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  expandIconBox: {
    paddingLeft: 8,
    paddingRight: 4,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(43,38,33,0.06)',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  wordMainContent: {
    flex: 1,
    minWidth: 0,
  },
  wordHeaderLine: {
    marginBottom: 3,
  },
  contextSentenceText: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 8,
  },
  quoteMainContent: {
    flex: 1,
    minWidth: 0,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  verseMainContent: {
    flex: 1,
    minWidth: 0,
  },
  itemDivider: {
    borderBottomWidth: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  actionIconBtn: {
    padding: 6,
  },
  emptyState: {
    paddingHorizontal: 8,
  },
  emptyCta: {
    height: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockSteps: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  unlockStep: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  quizBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  quizMode: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  deckWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  srsHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  flashcard: {
    width: '100%',
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardSpeakerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  srsRatingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  srsRateBtn: {
    width: '48.5%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ratingFeedback: {
    width: '100%',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingFeedbackSlot: {
    minHeight: 42,
    marginBottom: 10,
  },
  completionAction: {
    width: '100%',
    borderWidth: 1,
  },
  completionQuizButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  reviewAgainSection: {
    width: '100%',
    borderWidth: 1,
  },
  difficultWordList: {
    gap: 6,
  },
  reviewAgainButton: {
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  deckNav: {
    flexDirection: 'row',
    gap: 16,
  },
  deckNavButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextHintWrap: {
    width: '100%',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  contextHintBox: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  contextBlurredText: {
    color: 'transparent',
    textShadowRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
  },
  contextBadgeOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  contextRevealedBox: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  studyBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },
  studyBannerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
});

