import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
import { AccountProtectionModal, type AccountTriggerReason } from '@/components/AccountProtectionModal';
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
  deleteReaderNote,
  exportNotesToJson,
  exportNotesToMarkdown,
  listAllReaderNotes,
  type ReaderNoteWithBook,
} from '@/db/repositories/readerNotes';
import {
  deleteQuranHighlight,
  listAllQuranHighlights,
  type QuranHighlight,
} from '@/db/repositories/quran';
import {
  deleteSavedWord,
  listSavedWords,
  listSavedWordCountsByDay,
  getVocabularyEligibility,
  updateWordSrs,
  type DailySavedWordCount,
  type SavedWord,
  type VocabularyEligibility,
} from '@/db/repositories/savedWords';
import { VocabularyGrowthChart } from '@/features/vocabulary/VocabularyGrowthChart';
import {
  filterWordsByMastery,
  getMasteryFilterCounts,
  getWordMasteryInfo,
  type MasteryFilter,
} from '@/features/vocabulary/mastery';
import { WordDetailModal } from '@/features/vocabulary/WordDetailModal';
import { MilestoneCelebrationModal } from '@/components/MilestoneCelebrationModal';
import { checkAndTriggerMilestone, type MilestoneConfig } from '@/features/milestones/milestoneService';
import { getUserProfile } from '@/lib/supabaseAuth';
import { AddToDeckModal } from '@/components/AddToDeckModal';
import {
  deleteVocabularyDeck,
  listVocabularyDecks,
  listWordsForDeck,
  type VocabularyDeckWithCount,
} from '@/db/repositories/vocabularyDecks';
import {
  deletePendingLookup,
  listPendingLookups,
  resolvePendingLookupsBatch,
  type PendingWordLookup,
} from '@/db/repositories/pendingLookups';
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
import {
  evaluateQuizGate,
  recordWeeklyQuizSampleUsed,
  hasUsedWeeklyQuizSample,
  type QuizMode,
} from '@/features/vocabulary/quizGateService';
import { speakWord, warmUpSpeechEngine } from '@/features/audio/pronunciationEngine';
import { getMotherTongue, getScriptureLabels, useMotherTongue, type ScriptureLabels } from '@/features/settings/motherTongue';
import { hapticFlashcardAction } from '@/lib/haptics';
import { logEvent } from '@/features/analytics/analytics';
import { getAppFlag } from '@/features/config/appConfig';
import { canUse, requireFeature } from '@/features/subscription/subscriptionState';
import { useTheme } from '@/theme/ThemeProvider';
import { getNativeUiTextStyle } from '@/theme/typography';

type Tab = 'list' | 'flashcards' | 'quiz' | 'quotes' | 'notes' | 'verses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'Words' },
  { key: 'flashcards', label: 'Review' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'notes', label: 'Notes' },
  { key: 'verses', label: 'Verses' },
];
const TAB_KEYS: Tab[] = ['list', 'flashcards', 'quiz', 'quotes', 'notes', 'verses'];
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
  const [growthCounts, setGrowthCounts] = useState<DailySavedWordCount[]>([]);
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const [selectedWordForDetail, setSelectedWordForDetail] = useState<SavedWord | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneConfig | null>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [accountModalTrigger, setAccountModalTrigger] = useState<AccountTriggerReason>('quiz_gate');
  const [decks, setDecks] = useState<VocabularyDeckWithCount[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckWords, setDeckWords] = useState<SavedWord[] | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [addToDeckModalVisible, setAddToDeckModalVisible] = useState(false);
  const [wordsForAddToDeck, setWordsForAddToDeck] = useState<SavedWord[]>([]);
  const [eligibility, setEligibility] = useState<VocabularyEligibility | null>(null);
  const [recentBookId, setRecentBookId] = useState<string | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [quotes, setQuotes] = useState<Highlight[]>([]);
  const [readerNotes, setReaderNotes] = useState<ReaderNoteWithBook[]>([]);
  const [quranHighlights, setQuranHighlights] = useState<QuranHighlight[]>([]);
  const [bibleHighlights, setBibleHighlights] = useState<BibleHighlight[]>([]);
  const [pendingLookups, setPendingLookups] = useState<PendingWordLookup[]>([]);
  const [collapsedWordBooks, setCollapsedWordBooks] = useState<Record<string, boolean>>({});
  const [collapsedQuoteBooks, setCollapsedQuoteBooks] = useState<Record<string, boolean>>({});
  const [collapsedNoteBooks, setCollapsedNoteBooks] = useState<Record<string, boolean>>({});
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

  const toggleNoteBook = (bookId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedNoteBooks((prev) => ({ ...prev, [bookId]: !prev[bookId] }));
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
      listPendingLookups().catch(() => []),
      listAllReaderNotes().catch(() => []),
      listSavedWordCountsByDay(30).catch(() => []),
      listVocabularyDecks().catch(() => []),
    ]).then(([w, b, q, qv, bv, nextEligibility, positions, pending, notes, counts, deckList]) => {
      setWords(w);
      setGrowthCounts(counts);
      setEligibility(nextEligibility);
      setRecentBookId(positions[0]?.bookId ?? null);
      setBooks(b);
      setQuotes(q);
      setQuranHighlights(qv);
      setBibleHighlights(bv);
      setPendingLookups(pending);
      setReaderNotes(notes);
      setDecks(deckList);
      setLoaded(true);
      void getUserProfile().then((prof) => setIsGuestUser(!prof.isProtected)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!selectedDeckId) {
      setDeckWords(null);
      return;
    }
    let cancelled = false;
    void listWordsForDeck(selectedDeckId).then((dw) => {
      if (!cancelled) setDeckWords(dw);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDeckId]);

  useFocusEffect(
    useCallback(() => {
      reload();
      void resolvePendingLookupsBatch()
        .then((res) => {
          if (res.resolvedCount > 0) reload();
        })
        .catch(() => {});
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

  const confirmRemovePendingLookup = useCallback(
    (lookup: PendingWordLookup) => {
      setConfirm({
        title: 'Remove pending word',
        message: `Remove “${lookup.sourceWord}” from pending translations?`,
        onConfirm: async () => {
          await deletePendingLookup(lookup.id);
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
  const wordsToFilter = useMemo(() => {
    if (selectedDeckId && deckWords) return deckWords;
    return words;
  }, [selectedDeckId, deckWords, words]);
  const filterCounts = useMemo(() => getMasteryFilterCounts(wordsToFilter), [wordsToFilter]);
  const filteredWords = useMemo(
    () => filterWordsByMastery(wordsToFilter, masteryFilter),
    [wordsToFilter, masteryFilter],
  );
  const groups = filteredWords.reduce<Record<string, SavedWord[]>>((acc, word) => {
    (acc[word.bookId] ??= []).push(word);
    return acc;
  }, {});

  const toggleWordSelection = (wordId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };
  const quoteGroups = quotes.reduce<Record<string, Highlight[]>>((acc, quote) => {
    (acc[quote.bookId] ??= []).push(quote);
    return acc;
  }, {});
  const noteGroups = useMemo(() => {
    return readerNotes.reduce<Record<string, ReaderNoteWithBook[]>>((acc, note) => {
      (acc[note.bookId] ??= []).push(note);
      return acc;
    }, {});
  }, [readerNotes]);

  const confirmRemoveNote = (note: ReaderNoteWithBook) => {
    setConfirm({
      title: 'Delete note?',
      message: 'This note will be permanently removed.',
      onConfirm: async () => {
        setReaderNotes((prev) => prev.filter((n) => n.id !== note.id));
        await deleteReaderNote(note.id);
        setConfirm(null);
      },
    });
  };

  const handleExportNotes = () => {
    if (readerNotes.length === 0) return;
    Alert.alert('Export Notes', 'Choose an export format:', [
      {
        text: 'Markdown (.md)',
        onPress: () => {
          void Share.share({
            message: exportNotesToMarkdown(readerNotes),
            title: 'Lamplight Notes',
          });
        },
      },
      {
        text: 'JSON (.json)',
        onPress: () => {
          void Share.share({
            message: exportNotesToJson(readerNotes),
            title: 'Lamplight Notes JSON',
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {tab === 'notes' && readerNotes.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export reading notes"
              hitSlop={8}
              onPress={handleExportNotes}
              style={({ pressed }) => [
                {
                  backgroundColor: `${colors.flameAmber}18`,
                  borderColor: `${colors.flameAmber}44`,
                  borderWidth: 1,
                  borderRadius: radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', fontSize: 11 }]}>
                Export
              </Text>
            </Pressable>
          ) : null}
          <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>
            {tab === 'quotes'
              ? `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`
              : tab === 'notes'
                ? `${readerNotes.length} ${readerNotes.length === 1 ? 'note' : 'notes'}`
                : tab === 'verses'
                  ? `${verses.length} ${verses.length === 1 ? 'verse' : 'verses'}`
                  : `${words.length} ${words.length === 1 ? 'word' : 'words'}`}
          </Text>
        </View>
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
        ) : !selectedDeckId && (eligibility?.totalSaved ?? 0) < MIN_REVIEW_WORDS ? (
          <LockedReview totalSaved={eligibility?.totalSaved ?? 0} recentBookId={recentBookId} />
        ) : (
          <FlashcardDeck
            words={wordsToFilter}
            books={books}
            dueCount={selectedDeckId ? wordsToFilter.length : (eligibility?.dueCount ?? 0)}
            onWordUpdated={reload}
            onNavigateToStudySynonyms={handleNavigateToStudySynonyms}
            initialConfig={flashcardInit}
            onClearInitialConfig={() => setFlashcardInit(null)}
            onMilestone={(m) => setActiveMilestone(m)}
          />
        )
      ) : tab === 'quiz' ? (
        !loaded || !eligibility ? (
          <SkeletonRows />
        ) : (
          <QuizTab
            eligibility={eligibility}
            books={books}
            words={wordsToFilter}
            isGuest={isGuestUser}
            onUnlockQuiz={() => {
              setAccountModalTrigger('quiz_gate');
              setAccountModalVisible(true);
            }}
          />
        )
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
      ) : tab === 'notes' ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {!loaded ? (
            <SkeletonRows />
          ) : readerNotes.length === 0 ? (
            <EmptyPrompt variant="notes" message="Notes you jot down while reading will appear here." />
          ) : (
            Object.entries(noteGroups).map(([bookId, groupNotes]) => {
              const book = getBook(bookId);
              const title = book?.title ?? groupNotes[0]?.bookTitle ?? bookId;
              const isCollapsed = Boolean(collapsedNoteBooks[bookId]);
              const coverUrl = book?.coverUrl ?? groupNotes[0]?.coverImage;

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
                    onPress={() => toggleNoteBook(bookId)}
                    style={styles.cardHeader}
                  >
                    <View style={styles.coverThumbnailWrapper}>
                      {coverUrl ? (
                        <Image
                          source={{ uri: coverUrl }}
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
                          {groupNotes.length} {groupNotes.length === 1 ? 'note' : 'notes'}
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
                      {groupNotes.map((note, index) => (
                        <View
                          key={note.id}
                          style={[
                            styles.quoteRow,
                            index < groupNotes.length - 1 && [
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
                                  bookId: note.bookId,
                                  jumpChapter: String(note.chapterIndex),
                                  jumpPage: String(note.pageIndex),
                                },
                              })
                            }
                            style={styles.quoteMainContent}
                          >
                            <View style={styles.noteLocationRow}>
                              <Text
                                style={[
                                  typography.metadataCaption,
                                  { color: colors.flameAmber, fontWeight: '600', fontSize: 11 },
                                ]}
                              >
                                Ch. {note.chapterIndex + 1} · Page {note.pageIndex + 1}
                              </Text>
                              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                                {new Date(note.updatedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                            </View>
                            <Text
                              numberOfLines={4}
                              style={[typography.readingBody, { color: colors.ink, fontSize: 15, lineHeight: 22 }]}
                            >
                              {note.noteText}
                            </Text>
                          </Pressable>

                          <View style={styles.itemActions}>
                            <Pressable
                              hitSlop={8}
                              onPress={() =>
                                router.push({
                                  pathname: '/reader/[bookId]',
                                  params: {
                                    bookId: note.bookId,
                                    jumpChapter: String(note.chapterIndex),
                                    jumpPage: String(note.pageIndex),
                                  },
                                })
                              }
                              style={styles.actionIconBtn}
                              accessibilityLabel="Jump to note location in book"
                            >
                              <ChevronRightIcon color={colors.straw} size={15} />
                            </Pressable>
                            <Pressable
                              hitSlop={8}
                              onPress={() => confirmRemoveNote(note)}
                              style={styles.actionIconBtn}
                              accessibilityLabel="Delete note"
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
              {words.length > 0 ? (
                <>
                  <VocabularyGrowthChart counts={growthCounts} totalWords={words.length} />

                  {/* Study Decks Bar (LEARN-03) */}
                  <View style={{ marginBottom: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                        STUDY DECKS
                      </Text>
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync().catch(() => {});
                          setIsMultiSelectMode((prev) => !prev);
                          if (isMultiSelectMode) setSelectedWordIds(new Set());
                        }}
                        hitSlop={8}
                      >
                        <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 11 }]}>
                          {isMultiSelectMode ? 'Done' : 'Select'}
                        </Text>
                      </Pressable>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: spacing.xs, alignItems: 'center' }}
                    >
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync().catch(() => {});
                          setSelectedDeckId(null);
                        }}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: selectedDeckId === null ? colors.primaryDark : colors.card,
                            borderColor: selectedDeckId === null ? colors.primaryDark : colors.hairline,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            {
                              color: selectedDeckId === null ? colors.parchment : colors.umber,
                              fontSize: 10,
                            },
                          ]}
                        >
                          ALL WORDS ({words.length})
                        </Text>
                      </Pressable>

                      {decks.map((deck) => {
                        const isDeckSelected = selectedDeckId === deck.id;
                        return (
                          <Pressable
                            key={deck.id}
                            onPress={() => {
                              void Haptics.selectionAsync().catch(() => {});
                              setSelectedDeckId(isDeckSelected ? null : deck.id);
                            }}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: isDeckSelected ? colors.primaryDark : colors.card,
                                borderColor: isDeckSelected ? colors.flameAmber : colors.hairline,
                                borderRadius: radius.pill,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              },
                            ]}
                          >
                            <Text style={{ color: colors.flameAmber, fontSize: 9 }}>✦</Text>
                            <Text
                              style={[
                                typography.eyebrowLabel,
                                {
                                  color: isDeckSelected ? colors.flameAmber : colors.umber,
                                  fontSize: 10,
                                },
                              ]}
                            >
                              {deck.name.toUpperCase()} ({deck.wordCount})
                            </Text>
                          </Pressable>
                        );
                      })}

                      <Pressable
                        onPress={() => {
                          if (!canUse('unlimited_learning')) {
                            router.push({
                              pathname: '/paywall',
                              params: { feature: 'unlimited_learning', trigger: 'custom_deck' },
                            });
                            return;
                          }
                          setWordsForAddToDeck([]);
                          setAddToDeckModalVisible(true);
                        }}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.hairline,
                            borderRadius: radius.pill,
                            borderStyle: 'dashed',
                          },
                        ]}
                      >
                        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                          + NEW DECK
                        </Text>
                      </Pressable>
                    </ScrollView>
                  </View>

                  {/* Active Deck Card */}
                  {selectedDeckId && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isLamp ? '#232023' : 'rgba(245, 166, 35, 0.1)',
                        borderColor: isLamp ? 'rgba(245, 166, 35, 0.25)' : 'rgba(245, 166, 35, 0.35)',
                        borderWidth: 1,
                        borderRadius: radius.card,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        marginBottom: spacing.sm,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                          ACTIVE STUDY DECK
                        </Text>
                        <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 2 }]}>
                          {decks.find((d) => d.id === selectedDeckId)?.name ?? 'Study Deck'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable
                          onPress={() => {
                            const currentDeck = decks.find((d) => d.id === selectedDeckId);
                            if (!currentDeck) return;
                            setConfirm({
                              title: 'Delete study deck?',
                              message: `Delete “${currentDeck.name}”? All saved words will remain in your library.`,
                              onConfirm: async () => {
                                await deleteVocabularyDeck(currentDeck.id);
                                setSelectedDeckId(null);
                                reload();
                              },
                            });
                          }}
                          hitSlop={8}
                          style={{ padding: 4 }}
                        >
                          <TrashIcon color={colors.straw} size={15} />
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            void Haptics.selectionAsync().catch(() => {});
                            setTab('flashcards');
                          }}
                          style={{
                            backgroundColor: colors.flameAmber,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: radius.pill,
                          }}
                        >
                          <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 11.5, fontWeight: '700' }]}>
                            Study Deck →
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Mastery Filter Bar (LEARN-02) */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: spacing.sm, alignItems: 'center' }}
                    style={{ marginBottom: spacing.sm }}
                  >
                    {(['all', 'due', 'learning', 'mastered', 'difficult', 'new'] as MasteryFilter[]).map(
                      (filterKey) => {
                        const isSelected = masteryFilter === filterKey;
                        const count = filterCounts[filterKey];
                        const label =
                          filterKey === 'all'
                            ? `All (${count})`
                            : filterKey === 'due'
                            ? `Due (${count})`
                            : filterKey === 'learning'
                            ? `Learning (${count})`
                            : filterKey === 'mastered'
                            ? `Mastered (${count})`
                            : filterKey === 'difficult'
                            ? `Difficult (${count})`
                            : `New (${count})`;

                        return (
                          <Pressable
                            key={filterKey}
                            onPress={() => {
                              void Haptics.selectionAsync().catch(() => {});
                              setMasteryFilter(filterKey);
                            }}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: isSelected ? colors.primaryDark : colors.card,
                                borderColor: isSelected ? colors.primaryDark : colors.hairline,
                                borderRadius: radius.pill,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                typography.eyebrowLabel,
                                {
                                  color: isSelected ? colors.parchment : colors.umber,
                                  fontSize: 10,
                                },
                              ]}
                            >
                              {label.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </ScrollView>
                </>
              ) : null}

              {pendingLookups.length > 0 ? (
                <View
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.coverThumbnailWrapper}>
                      <View style={[styles.coverFallback, { backgroundColor: isLamp ? '#3A342D' : '#DFD4C2' }]}>
                        <View style={[styles.coverAccentBar, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[styles.coverFallbackInitials, { color: colors.flameAmber, fontSize: 13 }]}>
                          ⏳
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerInfo}>
                      <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, fontWeight: '600' }]}>
                        Waiting for translation
                      </Text>
                      <View style={styles.countRow}>
                        <View style={[styles.countDot, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                          {pendingLookups.length} {pendingLookups.length === 1 ? 'word' : 'words'} offline
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.expandedContent}>
                    {pendingLookups.map((lookup, index) => (
                      <View
                        key={lookup.id}
                        style={[
                          styles.wordRow,
                          index < pendingLookups.length - 1 && [
                            styles.itemDivider,
                            { borderBottomColor: isLamp ? '#332E27' : '#EAE1D3' },
                          ],
                        ]}
                      >
                        <View style={styles.wordMainContent}>
                          <View style={styles.wordHeaderLine}>
                            <Text style={[typography.translatedWordInline, { color: colors.ink, fontSize: 15 }]}>
                              {lookup.sourceWord}
                            </Text>
                            <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 11, fontStyle: 'italic' }]}>
                              {lookup.status === 'resolving' ? 'Translating...' : 'Will resolve online'}
                            </Text>
                          </View>
                          {lookup.contextSentence ? (
                            <Text
                              numberOfLines={2}
                              style={[
                                typography.metadataCaption,
                                styles.contextSentenceText,
                                { color: isLamp ? '#B3A898' : '#736B60', marginTop: 4 },
                              ]}
                            >
                              &ldquo;{lookup.contextSentence}&rdquo;
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.itemActions}>
                          <Pressable
                            hitSlop={8}
                            onPress={() => confirmRemovePendingLookup(lookup)}
                            style={styles.actionIconBtn}
                          >
                            <TrashIcon color={colors.straw} size={16} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {words.length === 0 && pendingLookups.length === 0 ? (
                <EmptyPrompt variant="list" message="Words you save while reading will appear here." />
              ) : Object.keys(groups).length === 0 && words.length > 0 ? (
                <View
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.hairline,
                      padding: spacing.lg,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, textAlign: 'center' }]}>
                    No words matching "{masteryFilter.toUpperCase()}"
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4, textAlign: 'center' }]}>
                    Try selecting another filter or continue reading to add words.
                  </Text>
                  <Pressable
                    onPress={() => setMasteryFilter('all')}
                    style={{
                      marginTop: 10,
                      backgroundColor: colors.parchment,
                      borderColor: colors.hairline,
                      borderWidth: 1,
                      borderRadius: radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                      VIEW ALL WORDS
                    </Text>
                  </Pressable>
                </View>
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
                      {groupWords.map((word, index) => {
                        const masteryInfo = getWordMasteryInfo(word);
                        const stageColor =
                          masteryInfo.primaryStage === 'mastered'
                            ? colors.highlight.sage
                            : masteryInfo.primaryStage === 'reviewing'
                            ? colors.flameAmber
                            : masteryInfo.primaryStage === 'learning'
                            ? colors.highlight.amber
                            : colors.fawn;

                        return (
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
                              onPress={() => {
                                if (isMultiSelectMode) {
                                  toggleWordSelection(word.id);
                                } else {
                                  setSelectedWordForDetail(word);
                                }
                              }}
                              style={styles.wordMainContent}
                            >
                              <View style={styles.wordHeaderLine}>
                                {isMultiSelectMode && (
                                  <View
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 9,
                                      borderWidth: 1.5,
                                      borderColor: selectedWordIds.has(word.id) ? colors.flameAmber : colors.fawn,
                                      backgroundColor: selectedWordIds.has(word.id) ? colors.flameAmber : 'transparent',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: 8,
                                    }}
                                  >
                                    {selectedWordIds.has(word.id) && (
                                      <Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: '800' }}>✓</Text>
                                    )}
                                  </View>
                                )}
                                <Text style={[typography.translatedWordInline, { color: colors.ink, fontSize: 15, flex: 1, marginRight: 6 }]}>
                                  {word.sourceWord}{' '}
                                  <Text style={[getNativeUiTextStyle(motherTongue, 'row'), { color: colors.fawn }]}>
                                    → {word.translation}
                                  </Text>
                                </Text>
                                <View
                                  style={[
                                    styles.masteryPill,
                                    {
                                      backgroundColor:
                                        masteryInfo.primaryStage === 'mastered'
                                          ? 'rgba(127, 163, 122, 0.15)'
                                          : masteryInfo.isDue
                                          ? 'rgba(245, 166, 35, 0.15)'
                                          : colors.parchment,
                                      borderColor: colors.hairline,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      typography.eyebrowLabel,
                                      {
                                        color: stageColor,
                                        fontSize: 8.5,
                                      },
                                    ]}
                                  >
                                    {masteryInfo.stageLabel.toUpperCase()}{masteryInfo.isDue ? ' · DUE' : ''}
                                  </Text>
                                </View>
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
                        );
                      })}
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

      <WordDetailModal
        visible={selectedWordForDetail != null}
        word={selectedWordForDetail}
        bookTitle={selectedWordForDetail ? bookTitle(selectedWordForDetail.bookId) : undefined}
        onClose={() => setSelectedWordForDetail(null)}
        onReadInBook={(w) => {
          setSelectedWordForDetail(null);
          router.push({
            pathname: '/reader/[bookId]',
            params: {
              bookId: w.bookId,
              jumpChapter: String(w.chapterIndex),
              jumpPage: String(w.pageIndex),
            },
          });
        }}
        onDeleteWord={(w) => {
          setSelectedWordForDetail(null);
          confirmRemoveWord(w);
        }}
        onAddToDeck={(w) => {
          setWordsForAddToDeck([w]);
          setAddToDeckModalVisible(true);
        }}
      />

      <MilestoneCelebrationModal
        visible={activeMilestone != null}
        milestone={activeMilestone}
        isGuest={isGuestUser}
        onClose={() => setActiveMilestone(null)}
        onProtectAccount={() => router.push('/signup' as any)}
      />

      <AccountProtectionModal
        visible={accountModalVisible}
        trigger={accountModalTrigger}
        onClose={() => setAccountModalVisible(false)}
        onSuccess={() => {
          setIsGuestUser(false);
          setAccountModalVisible(false);
          reload();
        }}
      />

      <AddToDeckModal
        visible={addToDeckModalVisible}
        words={wordsForAddToDeck}
        onClose={() => {
          setAddToDeckModalVisible(false);
          setWordsForAddToDeck([]);
        }}
        onDecksUpdated={reload}
      />

      {/* Multi-Select Floating Action Bar */}
      {isMultiSelectMode && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 20,
            right: 20,
            backgroundColor: colors.primaryDark,
            borderRadius: radius.pill,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            paddingHorizontal: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <Text style={[typography.buttonLabel, { color: colors.parchment, fontSize: 13 }]}>
            {selectedWordIds.size} {selectedWordIds.size === 1 ? 'word' : 'words'} selected
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedWordIds(new Set());
              }}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 12.5 }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={selectedWordIds.size === 0}
              onPress={() => {
                const wordsToAdd = words.filter((w) => selectedWordIds.has(w.id));
                setWordsForAddToDeck(wordsToAdd);
                setAddToDeckModalVisible(true);
              }}
              style={{
                backgroundColor: selectedWordIds.size > 0 ? colors.flameAmber : 'rgba(245, 166, 35, 0.4)',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: radius.pill,
              }}
            >
              <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 12.5, fontWeight: '700' }]}>
                Add to Deck
              </Text>
            </Pressable>
          </View>
        </View>
      )}
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

function QuizTab({
  eligibility,
  books,
  words,
  isGuest = false,
  onUnlockQuiz,
}: {
  eligibility: VocabularyEligibility;
  books: BookRow[];
  words: SavedWord[];
  isGuest?: boolean;
  onUnlockQuiz?: () => void;
}) {
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const isPremiumUser = canUse('advanced_quiz');
  const [weeklySampleUsed, setWeeklySampleUsed] = useState(false);
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
    void (async () => {
      const used = await hasUsedWeeklyQuizSample();
      setWeeklySampleUsed(used);
    })();
  }, [state]);

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
    let hasCachedData = true;
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
        hasCachedData = false;
        setAccessMessage('Similar-word data is not ready for this book yet. Try From the book instead.');
        return;
      }
    }

    const gate = await evaluateQuizGate(nextMode, { hasCachedData, isGuest });
    if (!gate.allowed) {
      if (gate.status === 'auth_required') {
        onUnlockQuiz?.();
        return;
      }
      if (gate.status === 'service_disabled') {
        Alert.alert('Quizzes Unavailable', gate.reason ?? 'Vocabulary quizzes are temporarily unavailable.');
        return;
      }
      if (gate.status === 'offline_unavailable') {
        setAccessMessage(gate.reason ?? 'Internet connection required for this quiz mode.');
        return;
      }
      if (gate.status === 'subscription_required') {
        logEvent('paywall_viewed', { trigger: gate.trigger, feature: 'advanced_quiz', quiz_mode: nextMode });
        router.push({
          pathname: '/paywall',
          params: { feature: 'advanced_quiz', trigger: gate.trigger, quiz_mode: nextMode } as any,
        });
        return;
      }
    }

    if (gate.source === 'weekly_sample') {
      await recordWeeklyQuizSampleUsed();
      setWeeklySampleUsed(true);
      logEvent('premium_sample_used', { feature: nextMode });
    }

    setQuizWords(compatibleWords);
    setMode(nextMode);
    setState('IN_QUIZ');
    logEvent('quiz_started', {
      book_id: selectedBookId ?? 'unknown',
      mode: nextMode,
      question_count: compatibleWords.length,
      entitlement_source: gate.source ?? 'free',
    });
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

  if (isGuest) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: radius.card,
            padding: spacing.xl,
            alignItems: 'center',
          }}
        >
          <View style={{ marginBottom: spacing.md, alignItems: 'center' }}>
            <FlashcardsIllustration />
          </View>

          <Text
            style={[
              typography.translatedWordPopup,
              { color: colors.ink, textAlign: 'center', fontSize: 20, marginBottom: spacing.xs },
            ]}
          >
            Unlock Weekly Vocabulary Quizzes
          </Text>

          <Text
            style={[
              typography.readingBody,
              {
                color: colors.fawn,
                textAlign: 'center',
                fontSize: 14,
                lineHeight: 21,
                marginBottom: spacing.lg,
              },
            ]}
          >
            Turn words discovered in your books into lasting memory through gentle cloze quizzes and weekly spaced review.
          </Text>

          {/* Value Props Box */}
          <View
            style={{
              width: '100%',
              backgroundColor: isLamp ? '#231F27' : '#F2ECE4',
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.hairline,
              padding: spacing.md,
              marginBottom: spacing.xl,
              gap: spacing.sm,
            }}
          >
            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.flameAmber, fontSize: 10, letterSpacing: 1.2, marginBottom: 2 },
              ]}
            >
              FREE ACCOUNT INCLUDES
            </Text>
            {[
              'Weekly Spaced-Repetition Quizzes',
              '50 Daily Translations (up from 20)',
              'Save 30 Words & 15 Quotes per Book',
              'Automatic Cloud Sync Across Devices',
            ].map((perk, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                  {perk}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onUnlockQuiz}
            style={{
              width: '100%',
              backgroundColor: colors.flameAmber,
              paddingVertical: 14,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={[
                typography.buttonLabel,
                { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
              ]}
            >
              Create Free Account to Unlock
            </Text>
          </Pressable>

          <Text
            style={[
              typography.metadataCaption,
              { color: colors.fawn, textAlign: 'center', marginTop: spacing.md, fontSize: 12 },
            ]}
          >
            Free forever · No credit card required
          </Text>
        </View>
      </ScrollView>
    );
  }

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
        [
          'fresh',
          'New sentence',
          isPremiumUser
            ? 'A fresh context · Unlimited with Premium'
            : weeklySampleUsed
              ? 'A fresh context · Weekly sample used · Premium'
              : 'A fresh context · 1 free sample this week',
        ],
        [
          'synonyms',
          'Similar words',
          isPremiumUser
            ? 'Synonym and antonym choices · Unlimited with Premium'
            : weeklySampleUsed
              ? 'Synonym and antonym choices · Weekly sample used · Premium'
              : 'Synonym and antonym choices · 1 free sample this week',
        ],
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
  onMilestone,
}: {
  words: SavedWord[];
  books: BookRow[];
  dueCount: number;
  onWordUpdated?: () => void;
  onNavigateToStudySynonyms?: (wordsToStudy: SavedWord[]) => void;
  initialConfig?: { phase: 'challenge'; mode: 'synonyms' } | null;
  onClearInitialConfig?: () => void;
  onMilestone?: (milestone: MilestoneConfig) => void;
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
        if (onMilestone) {
          void checkAndTriggerMilestone('first_completed_review').then((m) => {
            if (m) onMilestone(m);
          });
        }
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

  const startQuiz = async (mode: 'normal' | 'synonyms' = 'normal') => {
    const gate = await evaluateQuizGate(mode);
    if (!gate.allowed) {
      if (gate.status === 'service_disabled') {
        Alert.alert(
          'Quizzes Unavailable',
          gate.reason ?? 'Vocabulary quizzes are temporarily paused for service maintenance. Flashcard review remains fully available.',
        );
        return;
      }
      if (gate.status === 'offline_unavailable') {
        Alert.alert('Connection Needed', gate.reason ?? 'Internet connection required for this quiz mode.');
        return;
      }
      if (gate.status === 'subscription_required') {
        logEvent('paywall_viewed', { trigger: gate.trigger, feature: 'advanced_quiz', quiz_mode: mode });
        router.push({
          pathname: '/paywall',
          params: { feature: 'advanced_quiz', trigger: gate.trigger, quiz_mode: mode } as any,
        });
        return;
      }
    }

    if (gate.source === 'weekly_sample') {
      await recordWeeklyQuizSampleUsed();
      logEvent('premium_sample_used', { feature: mode });
    }

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
        onRetakeWithRelatedWords={() => void startQuiz('synonyms')}
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
              onPress={() => void startQuiz()}
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
  noteLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  masteryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
});

