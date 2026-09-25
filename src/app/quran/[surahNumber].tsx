import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon } from '@/components/icons';
import { ScreenStateView } from '@/components/ScreenStateView';
import { startReadingSession, endReadingSession } from '@/features/analytics/readingTracker';
import {
  createQuranHighlight,
  deleteQuranHighlight,
  getQuranReadingPosition,
  listQuranHighlightsForSurah,
  saveQuranWord,
  upsertQuranReadingPosition,
  type QuranHighlight,
} from '@/db/repositories/quran';
import { TappableWords } from '@/features/reader/components/TappableWords';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { QuranRecitationButton } from '@/features/scripture-audio/QuranRecitationButton';
import { cleanArabicWordForLookup, cleanWordForLookup } from '@/features/quran-content/verseWords';
import { getSurahMeta, getSurahVerses, type QuranVerse } from '@/features/quran-content/quranData';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type WordLang = 'ar' | 'en';

type HeldWord = {
  word: string;
  lang: WordLang;
  verseNumber: number;
  anchor: { x: number; y: number };
};

export default function QuranVerseReaderScreen() {
  const { surahNumber: surahNumberParam, jumpVerse, resumeVerse: resumeVerseParam } = useLocalSearchParams<{
    surahNumber: string;
    jumpVerse?: string;
    resumeVerse?: string;
  }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const listRef = useRef<FlatList<QuranVerse>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const surahNumber = Number(surahNumberParam);
  const surahMeta = getSurahMeta(surahNumber);
  const verses = getSurahVerses(surahNumber);

  const [highlights, setHighlights] = useState<QuranHighlight[]>([]);
  const [heldWord, setHeldWord] = useState<HeldWord | null>(null);
  const [activeWord, setActiveWord] = useState<HeldWord | null>(null);
  const [expandedTafsir, setExpandedTafsir] = useState<Set<number>>(new Set());
  const [recitingVerse, setRecitingVerse] = useState<number | null>(null);

  const toggleTafsir = useCallback((verseNumber: number) => {
    setExpandedTafsir((prev) => {
      const next = new Set(prev);
      if (next.has(verseNumber)) next.delete(verseNumber);
      else next.add(verseNumber);
      return next;
    });
  }, []);

  useEffect(() => {
    void listQuranHighlightsForSurah(surahNumber).then(setHighlights);
  }, [surahNumber]);

  const [isReady, setIsReady] = useState(false);
  const [resumeVerse, setResumeVerse] = useState<number | null | undefined>(undefined);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [activeLandingVerse, setActiveLandingVerse] = useState<number | null>(() => {
    return jumpVerse ? Number(jumpVerse) : null;
  });
  const initialScrollDone = useRef(false);
  const isUserInteracting = useRef(false);

  useEffect(() => {
    if (jumpVerse) {
      setActiveLandingVerse(Number(jumpVerse));
    }
  }, [jumpVerse]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useFocusEffect(
    useCallback(() => {
      startReadingSession(`surah-${surahNumber}`, surahNumber);
      return () => {
        endReadingSession();
      };
    }, [surahNumber]),
  );

  useEffect(() => {
    let cancelled = false;
    setIsPositionReady(false);
    if (jumpVerse) {
      setResumeVerse(null);
      return () => {
        cancelled = true;
      };
    }
    if (resumeVerseParam) {
      setResumeVerse(Number(resumeVerseParam));
      return () => {
        cancelled = true;
      };
    }
    setResumeVerse(undefined);
    void getQuranReadingPosition(surahNumber).then((position) => {
      if (!cancelled) setResumeVerse(position?.verseNumber ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [surahNumber, jumpVerse, resumeVerseParam]);

  const visibleIndicesRef = useRef<Set<number>>(new Set());
  const isUserDraggingRef = useRef(false);
  const followResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetRef = useRef<{ index: number; verseNumber: number } | null>(null);
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

  useEffect(() => {
    if (recitingVerse === null || isUserDraggingRef.current) return;
    const verseIndex = recitingVerse - 1;
    if (verseIndex < 0) return;

    const frame = requestAnimationFrame(() => {
      // Viewability only estimates how much of variable-height content is on
      // screen. Always align the active ayah unless the user is dragging, so a
      // card can never remain cut off below the viewport.
      listRef.current?.scrollToIndex({ index: verseIndex, viewPosition: 0.1, animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [recitingVerse]);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      scrollRetries.current += 1;
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index - info.averageItemLength * 0.2),
        animated: false,
      });

      if (scrollRetryTimer.current) clearTimeout(scrollRetryTimer.current);
      if (scrollRetries.current <= 12) {
        const delay = Math.min(80 * scrollRetries.current, 320);
        scrollRetryTimer.current = setTimeout(() => {
          performScrollToTarget(info.index);
        }, delay);
      }
    },
    [performScrollToTarget],
  );

  const handleTarget = useCallback(
    (targetIndex: number, targetVerseNumber: number, shouldHighlight = true) => {
      if (shouldHighlight) setActiveLandingVerse(targetVerseNumber);

      if (targetIndex < 0) {
        setIsPositionReady(true);
        return;
      }

      // If the verse is already fully visible on screen, DO NOT scroll!
      if (visibleIndicesRef.current.has(targetIndex)) {
        pendingTargetRef.current = null;
        setIsPositionReady(true);
        if (shouldHighlight) {
          if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
          landingTimerRef.current = setTimeout(() => {
            setActiveLandingVerse(null);
          }, 3500);
        }
        return;
      }

      pendingTargetRef.current = { index: targetIndex, verseNumber: targetVerseNumber };
      scrollRetries.current = 0;
      performScrollToTarget(targetIndex);
    },
    [performScrollToTarget],
  );

  useEffect(() => {
    if (!isReady || (!jumpVerse && resumeVerse === undefined)) return;

    if (jumpVerse) {
      const vNum = Number(jumpVerse);
      handleTarget(vNum - 1, vNum);
    } else if (resumeVerse && resumeVerse > 1) {
      handleTarget(resumeVerse - 1, resumeVerse, false);
    } else {
      initialScrollDone.current = true;
      setIsPositionReady(true);
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
      if (followResumeTimerRef.current) clearTimeout(followResumeTimerRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [jumpVerse, resumeVerse, isReady, handleTarget, performScrollToTarget]);

  const highlightByVerse = useMemo(
    () => new Map(highlights.map((h) => [h.verseNumber, h])),
    [highlights],
  );

  const persistPosition = useCallback(
    (verseNumber: number) => {
      if (!isUserInteracting.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void upsertQuranReadingPosition({ surahNumber, verseNumber });
      }, 800);
    },
    [surahNumber],
  );

  const handleToggleHighlight = useCallback(
    async (verseNumber: number) => {
      const existing = highlightByVerse.get(verseNumber);
      if (existing) {
        setHighlights((prev) => prev.filter((h) => h.id !== existing.id));
        await deleteQuranHighlight(existing.id);
      } else {
        const created = await createQuranHighlight({ surahNumber, verseNumber, colorKey: 'amber' });
        setHighlights((prev) => [...prev, created]);
      }
    },
    [surahNumber, highlightByVerse],
  );

  const handleSaveTranslation = useCallback(
    async (translation: string) => {
      if (!activeWord) return;
      await saveQuranWord({
        surahNumber,
        verseNumber: activeWord.verseNumber,
        sourceWord: activeWord.word,
        sourceLang: activeWord.lang,
        targetLang: targetLanguage,
        translation,
      });
      setActiveWord(null);
    },
    [activeWord, surahNumber, targetLanguage],
  );

  const persistPositionRef = useRef<(verseNumber: number) => void>(persistPosition);
  persistPositionRef.current = persistPosition;

  const viewabilityConfig = useRef({
    // A card only counts as visible once it has real reading room; this also
    // makes recitation follow bring a bottom-edge card back into clear view.
    itemVisiblePercentThreshold: 70,
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
          setIsPositionReady(true);

          if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
          landingTimerRef.current = setTimeout(() => {
            setActiveLandingVerse(null);
          }, 3500);
        }
      }

      if (!isUserInteracting.current) return;
      const first = viewableItems[0]?.item as QuranVerse | undefined;
      if (first) persistPositionRef.current(first.number);
    },
  ).current;

  if (!surahMeta) {
    return (
      <ScreenStateView
        type="error"
        title="Surah Not Found"
        message="This Surah does not exist. The Holy Quran contains 114 Surahs."
        fullScreen
        canGoBack
        actionLabel="Return to Quran Index"
        onAction={() => router.replace('/quran')}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>{surahMeta.nameEnglish}</Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            {surahMeta.nameTranslation} · {surahMeta.revelationType}
          </Text>
        </View>
      </View>
      <View style={[styles.recitationRow, { paddingHorizontal: layout.screenMargin, marginTop: spacing.sm }]}>
        <QuranRecitationButton
          surahName={surahMeta.nameEnglish}
          surahNumber={surahNumber}
          verses={verses}
          onActiveVerseChange={setRecitingVerse}
        />
      </View>

      {isReady ? (
        <>
        <FlatList
          ref={listRef}
          data={verses}
          style={{ opacity: isPositionReady ? 1 : 0 }}
          pointerEvents={isPositionReady ? 'auto' : 'none'}
          keyExtractor={(item) => String(item.number)}
          extraData={`${activeLandingVerse}-${recitingVerse}-${highlightByVerse.size}-${expandedTafsir.size}`}
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
            isUserDraggingRef.current = true;
            if (followResumeTimerRef.current) clearTimeout(followResumeTimerRef.current);
          }}
          onScrollEndDrag={() => {
            followResumeTimerRef.current = setTimeout(() => {
              isUserDraggingRef.current = false;
            }, 180);
          }}
          onMomentumScrollBegin={() => {
            isUserDraggingRef.current = true;
            if (followResumeTimerRef.current) clearTimeout(followResumeTimerRef.current);
          }}
          onMomentumScrollEnd={() => {
            isUserDraggingRef.current = false;
          }}
          onScrollToIndexFailed={onScrollToIndexFailed}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => {
            const highlighted = highlightByVerse.has(item.number);
            const tafsirOpen = expandedTafsir.has(item.number);
            const isLanding = activeLandingVerse === item.number;
            const isReciting = recitingVerse === item.number;
            const isMarked = isLanding || highlighted || isReciting;
            return (
              <View
                style={[
                  styles.verseCard,
                  {
                    backgroundColor: isLanding
                      ? `${colors.flameAmber}35`
                      : isReciting
                      ? `${colors.flameAmber}22`
                      : highlighted
                      ? `${colors.flameAmber}25`
                      : colors.card,
                    borderRadius: radius.card,
                    marginBottom: spacing.md,
                    padding: spacing.lg,
                    borderWidth: 1.5,
                    borderColor: isLanding || isReciting
                      ? colors.flameAmber
                      : highlighted
                      ? `${colors.flameAmber}80`
                      : 'transparent',
                  },
                ]}
              >
              <View
                style={[
                  styles.verseBadge,
                  {
                    backgroundColor: isMarked ? colors.flameAmber : colors.hairline,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.metadataCaption,
                    {
                      color: isMarked ? colors.primaryDark : colors.umber,
                      fontSize: 11,
                      fontWeight: isMarked ? '700' : '500',
                    },
                  ]}
                >
                  {item.number}
                </Text>
              </View>
              <View style={styles.verseActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/verse-share',
                      params: {
                        text: item.textEnglish,
                        attribution: `${surahMeta.nameEnglish} ${item.number} · Sahih International`,
                      },
                    })
                  }
                  hitSlop={8}
                  style={{ marginRight: spacing.sm }}
                >
                  <ShareIcon color={colors.straw} size={17} />
                </Pressable>
                <Pressable onPress={() => void handleToggleHighlight(item.number)} hitSlop={8}>
                  <BookmarkIcon color={colors.flameAmber} size={17} filled={highlighted} />
                </Pressable>
              </View>
              <TappableWords
                text={item.textArabic}
                cleanWord={cleanArabicWordForLookup}
                style={[typography.scriptureArabicVerse, { color: colors.ink, textAlign: 'right', marginTop: spacing.sm }]}
                onWordLongPress={(word, anchor) => setHeldWord({ word, lang: 'ar', verseNumber: item.number, anchor })}
              />
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.fawn, fontStyle: 'italic', fontSize: 14, marginTop: spacing.sm },
                ]}
              >
                {item.textTransliteration}
              </Text>
              <TappableWords
                text={item.textEnglish}
                cleanWord={cleanWordForLookup}
                style={[typography.scriptureVerse, { color: colors.umber, marginTop: spacing.sm }]}
                onWordLongPress={(word, anchor) => setHeldWord({ word, lang: 'en', verseNumber: item.number, anchor })}
              />
              {item.textTafsir ? (
                <>
                  <Pressable
                    onPress={() => toggleTafsir(item.number)}
                    style={[styles.tafsirToggle, { marginTop: spacing.sm }]}
                    hitSlop={8}
                  >
                    <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, fontSize: 10 }]}>
                      Tafsir/Interpretation
                    </Text>
                    <View style={{ transform: [{ rotate: tafsirOpen ? '90deg' : '0deg' }] }}>
                      <ChevronRightIcon color={colors.progressLabel} size={12} />
                    </View>
                  </Pressable>
                  {tafsirOpen ? (
                    <>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, marginTop: spacing.sm, lineHeight: 20 },
                        ]}
                      >
                        {item.textTafsir}
                      </Text>
                      <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: spacing.xs }]}>
                        — Tafsir al-Jalalayn
                      </Text>
                    </>
                  ) : null}
                </>
              ) : null}
            </View>
          );
          }}
        />
        {!isPositionReady ? (
          <View pointerEvents="none" style={styles.restoreLoader}>
            <ActivityIndicator size="small" color={colors.flameAmber} />
          </View>
        ) : null}
        </>
      ) : null}

      <WordActionMenu
        word={heldWord?.word ?? null}
        anchor={heldWord?.anchor ?? null}
        sourceLanguage={heldWord?.lang ?? 'en'}
        showPronunciation={false}
        saveLabel={heldWord && highlightByVerse.has(heldWord.verseNumber) ? 'Remove highlight' : 'Highlight verse'}
        onTranslate={() => {
          setActiveWord(heldWord);
          setHeldWord(null);
        }}
        onSaveQuote={() => {
          if (heldWord) void handleToggleHighlight(heldWord.verseNumber);
          setHeldWord(null);
        }}
        onClose={() => setHeldWord(null)}
      />

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        anchor={activeWord?.anchor ?? null}
        sourceLang={activeWord?.lang ?? 'en'}
        sourceLangLabel={activeWord?.lang === 'ar' ? 'AR' : 'EN'}
        showPronunciation={false}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveTranslation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  restoreLoader: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recitationRow: {
    alignItems: 'flex-end',
  },
  verseCard: {
    position: 'relative',
  },
  verseBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  verseActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  tafsirToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
});
