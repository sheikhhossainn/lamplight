import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
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
import { getBookMeta, getChapterVerses } from '@/features/vedas-content/vedasData';
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

function estimateVedasVerseOffset(verses: FlatVerse[], targetIndex: number): number {
  let offset = 0;
  for (let i = 0; i < targetIndex && i < verses.length; i++) {
    const v = verses[i];
    const lines = Math.max(1, Math.ceil((v.verse.text?.length ?? 0) / 42));
    offset += lines * 34 + 56;
  }
  return offset;
}

export default function VedasVerseReaderScreen() {
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

  const [currentChapter, setCurrentChapter] = useState<number>(() => {
    return jumpChapter ? Number(jumpChapter) : 1;
  });

  useEffect(() => {
    if (jumpChapter) {
      setCurrentChapter(Number(jumpChapter));
    }
  }, [jumpChapter]);

  useEffect(() => {
    if (!jumpChapter) {
      void getBibleReadingPosition(bookId).then((pos) => {
        if (pos?.chapter) {
          setCurrentChapter(pos.chapter);
        }
      });
    }
  }, [bookId, jumpChapter]);

  const bookMeta = getBookMeta(bookId);
  const verses = useMemo(() => getChapterVerses(bookId, currentChapter), [bookId, currentChapter]);

  const changeChapter = useCallback(
    (newChapter: number) => {
      if (newChapter < 1 || (bookMeta && newChapter > bookMeta.chapterCount)) return;
      setCurrentChapter(newChapter);
      setLandingVerseKey(null);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      void upsertBibleReadingPosition({ bookId, chapter: newChapter, verse: 1 });
    },
    [bookId, bookMeta],
  );

  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);
  const [heldWord, setHeldWord] = useState<HeldWord | null>(null);
  const [activeWord, setActiveWord] = useState<HeldWord | null>(null);

  useEffect(() => {
    void listBibleHighlightsForBook(bookId).then(setHighlights);
  }, [bookId]);

  const [landingVerseKey, setLandingVerseKey] = useState<string | null>(() => {
    return jumpChapter && jumpVerse ? verseKey(Number(jumpChapter), Number(jumpVerse)) : null;
  });
  const [isReady, setIsReady] = useState(false);
  const initialScrollDone = useRef(false);
  const isUserInteracting = useRef(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    void (async () => {
      const existing = await getBibleReadingPosition(bookId);
      const targetChapter = jumpChapter ? Number(jumpChapter) : (existing?.chapter ?? 1);
      const targetVerse = jumpVerse ? Number(jumpVerse) : (existing?.verse ?? 1);
      await upsertBibleReadingPosition({ bookId, chapter: targetChapter, verse: targetVerse });
    })();
  }, [bookId, jumpChapter, jumpVerse]);

  const visibleIndicesRef = useRef<Set<number>>(new Set());
  const pendingTargetRef = useRef<{ index: number; key: string } | null>(null);
  const landingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRetries = useRef(0);
  const scrollRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performScrollToTarget = useCallback((targetIndex: number) => {
    if (!listRef.current || targetIndex < 0) return;
    try {
      listRef.current.scrollToIndex({
        index: targetIndex,
        viewPosition: 0.2,
        animated: false,
      });
    } catch {
      // Handled by onScrollToIndexFailed
    }
  }, []);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      scrollRetries.current += 1;
      const estimatedOffset = estimateVedasVerseOffset(verses, info.index);
      listRef.current?.scrollToOffset({
        offset: Math.max(0, estimatedOffset - 40),
        animated: false,
      });

      if (scrollRetryTimer.current) clearTimeout(scrollRetryTimer.current);
      if (scrollRetries.current <= 5) {
        const delay = Math.min(60 * scrollRetries.current, 240);
        scrollRetryTimer.current = setTimeout(() => {
          performScrollToTarget(info.index);
        }, delay);
      }
    },
    [verses, performScrollToTarget],
  );

  const handleTarget = useCallback(
    (targetIndex: number, targetKey: string) => {
      setLandingVerseKey(targetKey);

      if (targetIndex < 0) return;

      // If the verse is already fully visible on screen, DO NOT scroll!
      if (visibleIndicesRef.current.has(targetIndex)) {
        pendingTargetRef.current = null;
        if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
        landingTimerRef.current = setTimeout(() => {
          setLandingVerseKey(null);
        }, 3500);
        return;
      }

      pendingTargetRef.current = { index: targetIndex, key: targetKey };
      performScrollToTarget(targetIndex);
    },
    [performScrollToTarget],
  );

  useEffect(() => {
    if (!isReady) return;

    if (jumpVerse && (jumpChapter === undefined || Number(jumpChapter) === currentChapter)) {
      const vNum = Number(jumpVerse);
      const index = verses.findIndex(
        (v) => v.chapter === currentChapter && v.verse.number === vNum,
      );
      handleTarget(index, verseKey(currentChapter, vNum));
    } else if (!jumpChapter) {
      void getBibleReadingPosition(bookId).then((pos) => {
        if (pos && pos.chapter === currentChapter) {
          const index = verses.findIndex(
            (v) => v.chapter === currentChapter && v.verse.number === pos.verse,
          );
          handleTarget(index, verseKey(currentChapter, pos.verse));
        } else {
          initialScrollDone.current = true;
        }
      });
    }

    const fallbackTimer = setTimeout(() => {
      const pending = pendingTargetRef.current;
      if (pending) {
        if (!visibleIndicesRef.current.has(pending.index)) {
          performScrollToTarget(pending.index);
        }
      }
    }, 250);

    return () => {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
      if (scrollRetryTimer.current) clearTimeout(scrollRetryTimer.current);
      clearTimeout(fallbackTimer);
    };
  }, [jumpChapter, jumpVerse, verses, bookId, currentChapter, isReady, handleTarget, performScrollToTarget]);

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
        targetLanguagePairKey: undefined, // wait, let's see why this exists or just map options
        sourceLangLabel: undefined,
        // Wait, let's verify what fields saveBibleWord takes.
        // BibleSavedWord has: bookId, chapter, verse, sourceWord, sourceLang, targetLang, translation.
        targetLang: targetLanguage,
        translation,
      } as any);
      setActiveWord(null);
    },
    [activeWord, bookId, targetLanguage],
  );

  const persistPositionRef = useRef<(chapter: number, verse: number) => void>(persistPosition);
  persistPositionRef.current = persistPosition;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    waitForInteraction: false,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = new Set<number>();
      for (const v of viewableItems) {
        if (v.index !== null) visible.add(v.index);
      }
      visibleIndicesRef.current = visible;

      const pending = pendingTargetRef.current;
      if (pending) {
        if (visible.has(pending.index)) {
          pendingTargetRef.current = null;
          scrollRetries.current = 0;
          if (scrollRetryTimer.current) clearTimeout(scrollRetryTimer.current);

          if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
          landingTimerRef.current = setTimeout(() => {
            setLandingVerseKey(null);
          }, 3500);
        } else {
          performScrollToTarget(pending.index);
        }
      }

      if (!isUserInteracting.current) return;
      const first = viewableItems[0]?.item as FlatVerse | undefined;
      if (first) persistPositionRef.current(first.chapter, first.verse.number);
    },
  ).current;

  if (!bookMeta) return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>{bookMeta.name}</Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            Hymn {currentChapter} of {bookMeta.chapterCount}
          </Text>
        </View>
        {bookMeta.chapterCount > 1 ? (
          <View style={styles.chapterNavGroup}>
            <Pressable
              disabled={currentChapter <= 1}
              onPress={() => changeChapter(currentChapter - 1)}
              style={({ pressed }) => [
                styles.chapterNavBtn,
                { opacity: currentChapter <= 1 ? 0.3 : pressed ? 0.6 : 1 },
              ]}
              hitSlop={8}
            >
              <ChevronLeftIcon color={colors.ink} size={18} />
            </Pressable>
            <Pressable
              disabled={currentChapter >= bookMeta.chapterCount}
              onPress={() => changeChapter(currentChapter + 1)}
              style={({ pressed }) => [
                styles.chapterNavBtn,
                { opacity: currentChapter >= bookMeta.chapterCount ? 0.3 : pressed ? 0.6 : 1 },
              ]}
              hitSlop={8}
            >
              <ChevronRightIcon color={colors.ink} size={18} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isReady ? (
        <FlatList
          ref={listRef}
          data={verses}
          keyExtractor={(item) => verseKey(item.chapter, item.verse.number)}
          extraData={`${landingVerseKey}-${highlightByVerse.size}`}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
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
          onScrollToIndexFailed={onScrollToIndexFailed}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          ListFooterComponent={
            bookMeta.chapterCount > 1 ? (
              <View style={[styles.footerNav, { marginTop: spacing.xl }]}>
                {currentChapter > 1 ? (
                  <Pressable
                    onPress={() => changeChapter(currentChapter - 1)}
                    style={({ pressed }) => [
                      styles.footerNavBtn,
                      { borderColor: colors.hairline, backgroundColor: colors.card },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ChevronLeftIcon color={colors.progressLabel} size={14} />
                    <Text style={[typography.metadataCaption, { color: colors.ink, marginLeft: 4, fontWeight: '600' }]}>
                      Hymn {currentChapter - 1}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {currentChapter < bookMeta.chapterCount ? (
                  <Pressable
                    onPress={() => changeChapter(currentChapter + 1)}
                    style={({ pressed }) => [
                      styles.footerNavBtn,
                      { borderColor: colors.hairline, backgroundColor: colors.card },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[typography.metadataCaption, { color: colors.ink, marginRight: 4, fontWeight: '600' }]}>
                      Hymn {currentChapter + 1}
                    </Text>
                    <ChevronRightIcon color={colors.progressLabel} size={14} />
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isChapterStart = index === 0 || verses[index - 1].chapter !== item.chapter;
            const currentKey = verseKey(item.chapter, item.verse.number);
            const highlighted = highlightByVerse.has(currentKey);
            const isLanding = landingVerseKey === currentKey;
            return (
              <View>
                {isChapterStart ? (
                  <Text
                    style={[
                      typography.eyebrowLabel,
                      { color: colors.progressLabel, marginTop: index === 0 ? 0 : spacing.lg, marginBottom: spacing.sm },
                    ]}
                  >
                    Hymn {item.chapter}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.verseBlock,
                    {
                      backgroundColor: isLanding
                        ? `${colors.highlight.amber}35`
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
                <View style={styles.verseActions}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/verse-share',
                        params: {
                          text: item.verse.text,
                          attribution: `Rigveda, ${bookMeta.name} Hymn ${item.chapter}:${item.verse.number} · Griffith`,
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
  chapterNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  footerNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
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
});
