import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon } from '@/components/icons';
import {
  createBibleHighlight,
  deleteBibleHighlight,
  getBibleReadingPosition,
  listBibleHighlightsForBook,
  saveBibleWord,
  upsertBibleReadingPosition,
  type BibleHighlight,
} from '@/db/repositories/bible';
import { getBookMeta, getBookVerses } from '@/features/bible-content/bibleData';
import { TappableWords } from '@/features/reader/components/TappableWords';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { cleanWordForLookup } from '@/features/reader/engine/words';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type FlatVerse = { chapter: number; verse: { number: number; text: string; commentary?: string } };

type HeldWord = {
  word: string;
  chapter: number;
  verseNumber: number;
  anchor: { x: number; y: number };
};

function verseKey(chapter: number, verse: number): string {
  return `${chapter}:${verse}`;
}

export default function BibleVerseReaderScreen() {
  const { bookId, jumpChapter, jumpVerse } = useLocalSearchParams<{
    bookId: string;
    jumpChapter?: string;
    jumpVerse?: string;
  }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const listRef = useRef<FlatList<FlatVerse>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookMeta = getBookMeta(bookId);
  const verses = useMemo(() => getBookVerses(bookId), [bookId]);

  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);
  const [heldWord, setHeldWord] = useState<HeldWord | null>(null);
  const [activeWord, setActiveWord] = useState<HeldWord | null>(null);
  const [expandedInterpretation, setExpandedInterpretation] = useState<Set<string>>(new Set());

  const toggleInterpretation = useCallback((chapter: number, verseNumber: number) => {
    const key = verseKey(chapter, verseNumber);
    setExpandedInterpretation((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    void listBibleHighlightsForBook(bookId).then(setHighlights);
  }, [bookId]);

  const [landingVerseKey, setLandingVerseKey] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initialScrollDone = useRef(false);
  const isUserInteracting = useRef(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const initialTargetIndex = useMemo(() => {
    if (jumpChapter && jumpVerse) {
      return verses.findIndex(
        (v) => v.chapter === Number(jumpChapter) && v.verse.number === Number(jumpVerse),
      );
    }
    return -1;
  }, [jumpChapter, jumpVerse, verses]);

  useEffect(() => {
    void (async () => {
      const existing = await getBibleReadingPosition(bookId);
      const targetChapter = jumpChapter ? Number(jumpChapter) : (existing?.chapter ?? 1);
      const targetVerse = jumpVerse ? Number(jumpVerse) : (existing?.verse ?? 1);
      await upsertBibleReadingPosition({ bookId, chapter: targetChapter, verse: targetVerse });
    })();
  }, [bookId]);

  useEffect(() => {
    if (!isReady) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let landingTimer: ReturnType<typeof setTimeout> | null = null;

    const performScroll = (targetIndex: number, targetKey: string) => {
      if (targetIndex > 0) {
        const schedule = typeof requestIdleCallback === 'function'
          ? requestIdleCallback
          : (fn: () => void) => setTimeout(fn, 60);
        const cancel = typeof cancelIdleCallback === 'function'
          ? cancelIdleCallback
          : clearTimeout;

        const idleId = schedule(() => {
          timer = setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({
                index: targetIndex,
                viewPosition: 0,
                animated: true,
              });
            } catch {
              // Gracefully handled by onScrollToIndexFailed
            }
            initialScrollDone.current = true;
            setLandingVerseKey(targetKey);
            landingTimer = setTimeout(() => {
              setLandingVerseKey(null);
            }, 1800);
          }, 60);
        });
        return () => cancel(idleId as any);
      } else {
        initialScrollDone.current = true;
      }
    };

    if (jumpChapter && jumpVerse) {
      const cNum = Number(jumpChapter);
      const vNum = Number(jumpVerse);
      const index = verses.findIndex(
        (v) => v.chapter === cNum && v.verse.number === vNum,
      );
      performScroll(index, verseKey(cNum, vNum));
    } else {
      void getBibleReadingPosition(bookId).then((pos) => {
        if (pos) {
          const index = verses.findIndex(
            (v) => v.chapter === pos.chapter && v.verse.number === pos.verse,
          );
          performScroll(index, verseKey(pos.chapter, pos.verse));
        } else {
          initialScrollDone.current = true;
        }
      });
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (landingTimer) clearTimeout(landingTimer);
    };
  }, [jumpChapter, jumpVerse, verses, bookId, isReady]);

  const highlightByVerse = useMemo(
    () => new Map(highlights.map((h) => [verseKey(h.chapter, h.verse), h])),
    [highlights],
  );

  const persistPosition = useCallback(
    (chapter: number, verse: number) => {
      if (!isUserInteracting.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void upsertBibleReadingPosition({ bookId, chapter, verse });
      }, 800);
    },
    [bookId],
  );

  const handleToggleHighlight = useCallback(
    async (chapter: number, verseNumber: number) => {
      const existing = highlightByVerse.get(verseKey(chapter, verseNumber));
      if (existing) {
        setHighlights((prev) => prev.filter((h) => h.id !== existing.id));
        await deleteBibleHighlight(existing.id);
      } else {
        const created = await createBibleHighlight({ bookId, chapter, verse: verseNumber, colorKey: 'amber' });
        setHighlights((prev) => [...prev, created]);
      }
    },
    [bookId, highlightByVerse],
  );

  const handleSaveTranslation = useCallback(
    async (translation: string) => {
      if (!activeWord) return;
      await saveBibleWord({
        bookId,
        chapter: activeWord.chapter,
        verse: activeWord.verseNumber,
        sourceWord: activeWord.word,
        sourceLang: 'en',
        targetLang: targetLanguage,
        translation,
      });
      setActiveWord(null);
    },
    [activeWord, bookId, targetLanguage],
  );

  if (!bookMeta) return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]}>{bookMeta.name}</Text>
      </View>

      {isReady ? (
        <FlatList
          ref={listRef}
        data={verses}
        keyExtractor={(item) => verseKey(item.chapter, item.verse.number)}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={30}
        contentContainerStyle={{
          paddingHorizontal: layout.screenMargin,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 32,
        }}
        onScrollBeginDrag={() => {
          isUserInteracting.current = true;
        }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0, animated: true });
          }, 60);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60, waitForInteraction: true }}
        onViewableItemsChanged={({ viewableItems }) => {
          if (!isUserInteracting.current) return;
          const first = viewableItems[0]?.item as FlatVerse | undefined;
          if (first) persistPosition(first.chapter, first.verse.number);
        }}
        renderItem={({ item, index }) => {
          const isChapterStart = index === 0 || verses[index - 1].chapter !== item.chapter;
          const currentKey = verseKey(item.chapter, item.verse.number);
          const highlighted = highlightByVerse.has(currentKey);
          const isLanding = landingVerseKey === currentKey;
          const interpretationOpen = expandedInterpretation.has(currentKey);
          return (
            <View>
              {isChapterStart ? (
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.progressLabel, marginTop: index === 0 ? 0 : spacing.lg, marginBottom: spacing.sm },
                  ]}
                >
                  Chapter {item.chapter}
                </Text>
              ) : null}
              <View
                style={[
                  styles.verseBlock,
                  {
                    backgroundColor: isLanding
                      ? `${colors.pairPillBackground}40`
                      : highlighted
                      ? `${colors.highlight.amber}30`
                      : 'transparent',
                    borderRadius: radius.card,
                    marginBottom: spacing.xs,
                    padding: spacing.sm,
                    borderWidth: 1.5,
                    borderColor: isLanding ? colors.flameAmber : 'transparent',
                  },
                ]}
              >
                <View style={styles.verseRow}>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, width: 22 }]}>
                    {item.verse.number}
                  </Text>
                  <TappableWords
                    text={item.verse.text}
                    cleanWord={cleanWordForLookup}
                    style={[typography.readingBody, { color: colors.ink, flex: 1 }]}
                    onWordLongPress={(word, anchor) =>
                      setHeldWord({ word, chapter: item.chapter, verseNumber: item.verse.number, anchor })
                    }
                  />
                </View>
                {item.verse.commentary ? (
                  <View style={{ marginLeft: 30 }}>
                    <Pressable
                      onPress={() => toggleInterpretation(item.chapter, item.verse.number)}
                      style={styles.interpretationToggle}
                      hitSlop={8}
                    >
                      <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, fontSize: 10 }]}>
                        Interpretation
                      </Text>
                      <View style={{ transform: [{ rotate: interpretationOpen ? '90deg' : '0deg' }] }}>
                        <ChevronRightIcon color={colors.progressLabel} size={12} />
                      </View>
                    </Pressable>
                    {interpretationOpen ? (
                      <>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.umber, marginTop: spacing.sm, lineHeight: 20 },
                          ]}
                        >
                          {item.verse.commentary}
                        </Text>
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: spacing.xs }]}>
                          — Jamieson-Fausset-Brown
                        </Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.verseActions}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/verse-share',
                        params: {
                          text: item.verse.text,
                          attribution: `${bookMeta.name} ${item.chapter}:${item.verse.number} · World English Bible`,
                        },
                      })
                    }
                    hitSlop={8}
                    style={{ marginRight: spacing.sm }}
                  >
                    <ShareIcon color={colors.straw} size={16} />
                  </Pressable>
                  <Pressable onPress={() => void handleToggleHighlight(item.chapter, item.verse.number)} hitSlop={8}>
                    <BookmarkIcon color={colors.flameAmber} size={16} filled={highlighted} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />
    ) : null}

      <WordActionMenu
        word={heldWord?.word ?? null}
        anchor={heldWord?.anchor ?? null}
        saveLabel={
          heldWord && highlightByVerse.has(verseKey(heldWord.chapter, heldWord.verseNumber))
            ? 'Remove highlight'
            : 'Highlight verse'
        }
        onTranslate={() => {
          setActiveWord(heldWord);
          setHeldWord(null);
        }}
        onSaveQuote={() => {
          if (heldWord) void handleToggleHighlight(heldWord.chapter, heldWord.verseNumber);
          setHeldWord(null);
        }}
        onClose={() => setHeldWord(null)}
      />

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        anchor={activeWord?.anchor ?? null}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveTranslation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verseBlock: {},
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  interpretationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
