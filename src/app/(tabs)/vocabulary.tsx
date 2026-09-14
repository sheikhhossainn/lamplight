import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SpeakerIcon, TrashIcon } from '@/components/icons';
import {
  FlashcardsIllustration,
  QuotesIllustration,
  WordsIllustration,
} from '@/components/NotebookIllustrations';
import { SkeletonRows } from '@/components/SkeletonRows';
import { type BookRow, listBooks } from '@/db/repositories/books';
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
import { deleteSavedWord, listSavedWords, updateWordSrs, type SavedWord } from '@/db/repositories/savedWords';
import { getBookMeta as getBibleOtBookMeta, getBookVerses as getBibleOtVerses } from '@/features/bible-content/bibleData';
import { getBookMeta as getBibleNtBookMeta, getBookVerses as getBibleNtVerses } from '@/features/bible-content/bibleNtData';
import { getSurahMeta, getSurahVerses } from '@/features/quran-content/quranData';
import { sentenceContaining } from '@/features/reader/engine/words';
import { MIN_DECK_SIZE } from '@/features/vocabulary/reviewPrompt';
import {
  calculateNextSrsState,
  getSrsPreviews,
  getStageLabel,
  type SrsRating,
} from '@/features/vocabulary/srsAlgorithm';
import { speakWord } from '@/features/audio/pronunciationEngine';
import { hapticFlashcardAction } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'list' | 'flashcards' | 'quotes' | 'verses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'Words' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'verses', label: 'Verses' },
];

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

function buildQuranVerseEntries(highlights: QuranHighlight[]): SavedVerseEntry[] {
  return highlights.map((h) => {
    const meta = getSurahMeta(h.surahNumber);
    const verse = getSurahVerses(h.surahNumber).find((v) => v.number === h.verseNumber);
    return {
      id: h.id,
      groupTitle: meta ? `${meta.nameEnglish} · Quran` : 'Quran',
      reference: `Verse ${h.verseNumber}`,
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

function buildBibleVerseEntries(highlights: BibleHighlight[]): SavedVerseEntry[] {
  return highlights.map((h) => {
    const otMeta = getBibleOtBookMeta(h.bookId);
    const isNt = !otMeta;
    const meta = otMeta ?? getBibleNtBookMeta(h.bookId);
    const verses = isNt ? getBibleNtVerses(h.bookId) : getBibleOtVerses(h.bookId);
    const verse = verses.find((v) => v.chapter === h.chapter && v.verse.number === h.verse);
    const bookName = meta?.name ?? h.bookId;
    return {
      id: h.id,
      groupTitle: `${bookName} · ${isNt ? 'New Testament' : 'Old Testament'}`,
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
  const isLamp = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [quotes, setQuotes] = useState<Highlight[]>([]);
  const [quranHighlights, setQuranHighlights] = useState<QuranHighlight[]>([]);
  const [bibleHighlights, setBibleHighlights] = useState<BibleHighlight[]>([]);
  const [collapsedWordBooks, setCollapsedWordBooks] = useState<Record<string, boolean>>({});
  const [collapsedQuoteBooks, setCollapsedQuoteBooks] = useState<Record<string, boolean>>({});
  const [collapsedVerseGroups, setCollapsedVerseGroups] = useState<Record<string, boolean>>({});

  const toggleWordBook = (bookId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setCollapsedWordBooks((prev) => ({ ...prev, [bookId]: !prev[bookId] }));
  };

  const toggleQuoteBook = (bookId: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setCollapsedQuoteBooks((prev) => ({ ...prev, [bookId]: !prev[bookId] }));
  };

  const toggleVerseGroup = (groupTitle: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setCollapsedVerseGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };
  // The daily review prompt lands here with tab=flashcards, so it opens on the
  // deck rather than dropping the reader on the word list to find it.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'flashcards' ? 'flashcards' : 'list');
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
    ]).then(([w, b, q, qv, bv]) => {
      setWords(w);
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
    if (params.tab === 'flashcards') setTab('flashcards');
  }, [params.tab]);

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
      [...buildQuranVerseEntries(quranHighlights), ...buildBibleVerseEntries(bibleHighlights)].sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
    [quranHighlights, bibleHighlights],
  );
  const verseGroups = verses.reduce<Record<string, SavedVerseEntry[]>>((acc, entry) => {
    (acc[entry.groupTitle] ??= []).push(entry);
    return acc;
  }, {});

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

      <View style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}>
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.segment, tab === key && { backgroundColor: colors.primaryDark, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { fontSize: 12, color: tab === key ? colors.lampText : colors.fawn }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'flashcards' ? (
        !loaded ? (
          <SkeletonRows />
        ) : words.length === 0 ? (
          <EmptyPrompt variant="flashcards" message="Save words while reading to build your flashcard deck." />
        ) : words.length < MIN_DECK_SIZE ? (
          <EmptyPrompt
            variant="flashcards"
            message={`Read ${MIN_DECK_SIZE - words.length} more word${
              MIN_DECK_SIZE - words.length === 1 ? '' : 's'
            } to test your memory.`}
          />
        ) : (
          <FlashcardDeck words={words} books={books} onWordUpdated={reload} />
        )
      ) : tab === 'quotes' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
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
                      backgroundColor: isLamp ? '#23201D' : '#F7F2E9',
                      borderColor: isLamp ? '#36312B' : '#E6DDD0',
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
          contentContainerStyle={{ paddingBottom: 48 }}
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
                      backgroundColor: isLamp ? '#23201D' : '#F7F2E9',
                      borderColor: isLamp ? '#36312B' : '#E6DDD0',
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
                      <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, fontWeight: '600' }]}>
                        {groupTitle}
                      </Text>
                      <View style={styles.countRow}>
                        <View style={[styles.countDot, { backgroundColor: colors.flameAmber }]} />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                          {groupVerses.length} {groupVerses.length === 1 ? 'verse' : 'verses'} saved
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
                            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, fontWeight: '600' }]}>
                              {entry.reference}
                            </Text>
                            {entry.snippet ? (
                              <Text
                                numberOfLines={3}
                                style={[
                                  typography.metadataCaption,
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
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {!loaded ? (
            <SkeletonRows />
          ) : words.length === 0 ? (
            <EmptyPrompt variant="list" message="Words you save while reading will appear here." />
          ) : (
            Object.entries(groups).map(([bookId, groupWords]) => {
              const book = getBook(bookId);
              const title = book?.title ?? bookId;
              const isCollapsed = Boolean(collapsedWordBooks[bookId]);

              return (
                <View
                  key={bookId}
                  style={[
                    styles.collectionCard,
                    {
                      backgroundColor: isLamp ? '#23201D' : '#F7F2E9',
                      borderColor: isLamp ? '#36312B' : '#E6DDD0',
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
                                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
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
                          </Pressable>

                          <View style={styles.itemActions}>
                            <Pressable
                              hitSlop={8}
                              onPress={() => void speakWord(word.sourceWord, 'en')}
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
            })
          )}
        </ScrollView>
      )}

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
// Sort so words due for review come first, then shuffle the due and non-due sets
function srsSorted(words: SavedWord[]): SavedWord[] {
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

  return [...shuffleArray(due), ...shuffleArray(future)];
}

function FlashcardDeck({
  words,
  books,
  onWordUpdated,
}: {
  words: SavedWord[];
  books: BookRow[];
  onWordUpdated?: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Keyed on the word ids so reload doesn't reshuffle mid-review
  const wordIds = words.map((w) => w.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deck = useMemo(() => srsSorted(words), [wordIds]);

  const clampedIndex = deck.length > 0 ? index % deck.length : 0;
  const word = deck[clampedIndex];
  const bookTitle = word ? books.find((b) => b.id === word.bookId)?.title ?? '' : '';

  const now = Date.now();
  const dueCount = useMemo(() => words.filter((w) => (w.srsDueDate || 0) <= now).length, [words, now]);

  const goTo = (nextIndex: number) => {
    setFlipped(false);
    setIndex((nextIndex + deck.length) % deck.length);
  };

  const handleRate = async (rating: SrsRating) => {
    if (!word) return;
    const currentState = {
      stage: word.srsStage,
      intervalDays: word.srsIntervalDays,
      easeFactor: word.srsEaseFactor,
      reps: word.srsReps,
      lapses: word.srsLapses,
      dueDate: word.srsDueDate,
    };
    const nextState = calculateNextSrsState(currentState, rating);
    await updateWordSrs(word.id, nextState);
    void hapticFlashcardAction(rating === 'again' ? 'flip' : 'graduate');
    goTo(clampedIndex + 1);
    onWordUpdated?.();
  };

  if (!word) return null;

  const currentSrsState = {
    stage: word.srsStage,
    intervalDays: word.srsIntervalDays,
    easeFactor: word.srsEaseFactor,
    reps: word.srsReps,
    lapses: word.srsLapses,
    dueDate: word.srsDueDate,
  };
  const previews = getSrsPreviews(currentSrsState);

  const stageColor =
    word.srsStage === 3
      ? colors.flameAmber
      : word.srsStage === 2
        ? '#8A7F6E'
        : word.srsStage === 1
          ? colors.fawn
          : colors.straw;

  return (
    <View style={styles.deckWrap}>
      {/* SRS Header: Progress + Stage */}
      <View style={styles.srsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>
            {clampedIndex + 1} / {deck.length}
          </Text>
          {dueCount > 0 ? (
            <View style={[styles.dueBadge, { backgroundColor: 'rgba(245,166,35,0.18)' }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                {dueCount} due
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.stageBadge, { borderColor: stageColor }]}>
          <Text style={[typography.eyebrowLabel, { color: stageColor, fontSize: 10 }]}>
            {getStageLabel(word.srsStage)}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          void hapticFlashcardAction('flip');
          setFlipped((f) => !f);
        }}
        style={[styles.flashcard, { backgroundColor: colors.card, borderRadius: radius.card }]}
      >
        {flipped ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[typography.translatedWordPopup, { color: colors.flameAmber, textAlign: 'center' }]}>
                {word.translation}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => void speakWord(word.sourceWord, word.sourceLang, 'normal')}
                style={styles.cardSpeakerBtn}
              >
                <SpeakerIcon color={colors.flameAmber} size={15} />
              </Pressable>
            </View>
            <Text
              style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.md, textAlign: 'center' }]}
            >
              {bookTitle}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                typography.metadataCaption,
                { color: colors.textFaint, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              &ldquo;{sentenceContaining(word.contextSentence, word.sourceWord)}&rdquo;
            </Text>

            {/* 4-Button SM-2 Grading Controls */}
            <View style={styles.srsRatingGrid}>
              {previews.map((p) => {
                const btnColor =
                  p.rating === 'again'
                    ? '#B85450'
                    : p.rating === 'hard'
                      ? '#D68910'
                      : p.rating === 'good'
                        ? '#27AE60'
                        : colors.flameAmber;
                return (
                  <Pressable
                    key={p.rating}
                    onPress={() => void handleRate(p.rating)}
                    style={[styles.srsRateBtn, { backgroundColor: colors.primaryDark, borderColor: btnColor }]}
                  >
                    <Text style={[typography.uiRowTitle, { color: btnColor, fontSize: 11 }]}>{p.label}</Text>
                    <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9, marginTop: 1 }]}>
                      {p.intervalDisplay}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center' }]}>
                {word.sourceWord}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => void speakWord(word.sourceWord, word.sourceLang, 'normal')}
                style={styles.cardSpeakerBtn}
              >
                <SpeakerIcon color={colors.flameAmber} size={15} />
              </Pressable>
            </View>
            <Text
              numberOfLines={3}
              style={[
                typography.metadataCaption,
                { color: colors.textFaint, marginTop: spacing.md, textAlign: 'center' },
              ]}
            >
              &ldquo;{sentenceContaining(word.contextSentence, word.sourceWord)}&rdquo;
            </Text>
            <Text style={[typography.eyebrowLabel, { color: colors.straw, marginTop: spacing.lg }]}>
              Tap to reveal meaning
            </Text>
          </>
        )}
      </Pressable>

      <View style={[styles.deckNav, { marginTop: spacing.lg }]}>
        <Pressable
          onPress={() => {
            void hapticFlashcardAction('flip');
            goTo(clampedIndex - 1);
          }}
          style={[styles.deckNavButton, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}
        >
          <ChevronLeftIcon color={colors.ink} size={18} />
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticFlashcardAction('graduate');
            goTo(clampedIndex + 1);
          }}
          style={[styles.deckNavButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <ChevronRightIcon color={colors.primaryDark} size={18} />
        </Pressable>
      </View>
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
    marginBottom: 18,
  },
  segment: {
    flex: 1,
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
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cardSpeakerBtn: {
    padding: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  srsRatingGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    width: '100%',
  },
  srsRateBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
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
});

