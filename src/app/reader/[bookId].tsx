import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '@/components/icons';
import { FlameDrop } from '@/components/FlameDrop';
import { HighlightColorPicker } from '@/features/reader/components/HighlightColorPicker';
import { LampGlowOverlay } from '@/features/reader/components/LampGlowOverlay';
import { PageTurnFlash } from '@/features/reader/components/PageTurnFlash';
import { ReaderPageView } from '@/features/reader/components/ReaderPageView';
import { WarmthPicker } from '@/features/reader/components/WarmthPicker';
import { WarmthSliderPill } from '@/features/reader/components/WarmthSliderPill';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { findGlobalIndex, flattenBookToPages, type ReaderPage } from '@/features/reader/engine/paginate';
import { getBundledBookText } from '@/features/content-ingestion/catalog';
import { getBook, type BookRow } from '@/db/repositories/books';
import { createHighlight, listHighlightsForBook, type Highlight } from '@/db/repositories/highlights';
import { getReadingPosition, upsertReadingPosition } from '@/db/repositories/readingPosition';
import { saveWord } from '@/db/repositories/savedWords';
import type { HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ReaderMode = 'day' | 'lampDefault' | 'lampAlt';

function nextMode(mode: ReaderMode): ReaderMode {
  if (mode === 'day') return 'lampDefault';
  if (mode === 'lampDefault') return 'lampAlt';
  return 'day';
}

function LampPulseButton({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0.7);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.lampFab, style]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
      <FlameDrop size={16} />
    </Animated.View>
  );
}

export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ReaderPage>>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  const [pages, setPages] = useState<ReaderPage[]>([]);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeOpacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeWord, setActiveWord] = useState<{ word: string; paragraphIndex: number } | null>(null);
  const [pickerParagraphIndex, setPickerParagraphIndex] = useState<number | null>(null);

  const [mode, setMode] = useState<ReaderMode>('day');
  const [warmth, setWarmth] = useState(0.6);
  const [warmthPickerVisible, setWarmthPickerVisible] = useState(false);
  const altSliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLamp = mode !== 'day';
  const backgroundColor = isLamp ? colors.primaryDark : colors.parchment;
  const textColor = isLamp ? colors.lampText : colors.ink;

  const showAltWarmthPicker = useCallback(() => {
    setWarmthPickerVisible(true);
    if (altSliderTimer.current) clearTimeout(altSliderTimer.current);
    altSliderTimer.current = setTimeout(() => setWarmthPickerVisible(false), 2500);
  }, []);

  useEffect(() => {
    (async () => {
      const [bookRow, position, bookHighlights] = await Promise.all([
        getBook(bookId),
        getReadingPosition(bookId),
        listHighlightsForBook(bookId),
      ]);
      setBook(bookRow);
      setHighlights(bookHighlights);

      const fullText = getBundledBookText(bookId);
      if (!fullText) return;

      const flattened = flattenBookToPages(fullText);
      setPages(flattened);
      const startIndex = position
        ? findGlobalIndex(flattened, position.chapterIndex, position.pageIndex)
        : 0;
      setInitialIndex(startIndex);
      setCurrentIndex(startIndex);
    })();
  }, [bookId]);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      chromeOpacity.value = withTiming(0, { duration: 220 });
      setChromeVisible(false);
    }, 2000);
  }, [chromeOpacity]);

  useEffect(() => {
    scheduleAutoHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleAutoHide]);

  const toggleChrome = useCallback(() => {
    const next = !chromeVisible;
    setChromeVisible(next);
    chromeOpacity.value = withTiming(next ? 1 : 0, { duration: 220 });
    if (next) scheduleAutoHide();
  }, [chromeVisible, chromeOpacity, scheduleAutoHide]);

  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      const page = first.item as ReaderPage;
      setCurrentIndex(first.index);
      if (book) {
        upsertReadingPosition({
          bookId: book.id,
          chapterIndex: page.chapterIndex,
          pageIndex: page.pageIndexInChapter,
          percentComplete: pages.length > 1 ? first.index / (pages.length - 1) : 1,
        });
      }
    },
  ).current;

  const highlightMap = useMemo(() => {
    // Simplification: highlighting operates at paragraph granularity, so we
    // repurpose start_offset to hold the paragraph index rather than a
    // character offset (see createHighlight below).
    const map = new Map<string, HighlightColorKey>();
    for (const h of highlights) {
      map.set(`${h.chapterIndex}-${h.pageIndex}-${h.startOffset}`, h.colorKey);
    }
    return map;
  }, [highlights]);

  const goToNextPage = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, pages.length]);

  const handleWordPress = useCallback((word: string, paragraphIndex: number) => {
    setActiveWord({ word, paragraphIndex });
  }, []);

  const handleSaveWord = useCallback(
    async (translation: string) => {
      if (!book || !activeWord) return;
      const page = pages[currentIndex];
      await saveWord({
        bookId: book.id,
        sourceWord: activeWord.word,
        sourceLang: 'en',
        targetLang: 'es',
        translation,
        contextSentence: page.paragraphs[activeWord.paragraphIndex] ?? '',
        chapterIndex: page.chapterIndex,
      });
      setActiveWord(null);
    },
    [book, activeWord, pages, currentIndex],
  );

  const handleSelectHighlightColor = useCallback(
    async (colorKey: HighlightColorKey) => {
      if (!book || pickerParagraphIndex == null) return;
      const page = pages[currentIndex];
      const quoteText = page.paragraphs[pickerParagraphIndex] ?? '';
      const created = await createHighlight({
        bookId: book.id,
        chapterIndex: page.chapterIndex,
        pageIndex: page.pageIndexInChapter,
        startOffset: pickerParagraphIndex,
        endOffset: pickerParagraphIndex,
        colorKey,
        quoteText,
      });
      setHighlights((prev) => [created, ...prev]);
      setPickerParagraphIndex(null);
      router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: created.id } });
    },
    [book, pages, currentIndex, pickerParagraphIndex],
  );

  const renderPage = useCallback(
    ({ item }: { item: ReaderPage }) => (
      <Pressable style={{ width: screenWidth, height: screenHeight }} onPress={toggleChrome}>
        {isLamp ? <LampGlowOverlay width={screenWidth} height={screenHeight} warmth={warmth} /> : null}
        <ReaderPageView
          page={item}
          textColor={textColor}
          highlightColorForParagraph={(paragraphIndex) => {
            const key = highlightMap.get(`${item.chapterIndex}-${item.pageIndexInChapter}-${paragraphIndex}`);
            return key ? colors.highlight[key] : undefined;
          }}
          onWordPress={handleWordPress}
          onParagraphLongPress={setPickerParagraphIndex}
        />
      </Pressable>
    ),
    [colors, highlightMap, handleWordPress, toggleChrome, isLamp, warmth, textColor],
  );

  if (!book) return null;

  if (pages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>
          {book.title} isn't available to read yet.
        </Text>
      </View>
    );
  }

  if (initialIndex == null) return null;

  const page = pages[currentIndex];
  const percent = Math.round(((currentIndex + 1) / pages.length) * 100);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.globalIndex}`}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        renderItem={renderPage}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 90 }}
      />

      <PageTurnFlash pageKey={currentIndex} />

      {/* Corner hot-zone advances the page (fold motif tap-to-turn); tapping elsewhere on
          the page toggles chrome, wired per-page in renderPage so word/paragraph presses
          underneath still win. */}
      <Pressable style={styles.cornerHotZone} onPress={goToNextPage} />

      {/* Invisible mode-cycle affordance, consistent across all 3 modes (the
          static mock has no visible mode switch — reading theme is a Settings
          concern — but a live app needs some way to preview the other modes). */}
      <Pressable style={styles.modeCycleHotZone} onPress={() => setMode(nextMode(mode))} />

      {mode === 'day' ? (
        <Animated.View
          pointerEvents={chromeVisible ? 'auto' : 'none'}
          style={[styles.topBar, chromeStyle, { height: insets.top + 64 }]}
        >
          <Svg width={screenWidth} height={insets.top + 64} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="chromeFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#F5EDE1" stopOpacity={0.95} />
                <Stop offset="70%" stopColor="#F5EDE1" stopOpacity={0.75} />
                <Stop offset="100%" stopColor="#F5EDE1" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={screenWidth} height={insets.top + 64} fill="url(#chromeFade)" />
          </Svg>
          <View style={[styles.topBarRow, { paddingTop: insets.top + 8, paddingHorizontal: spacing.lg }]}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeftIcon color={colors.ink} size={18} />
            </Pressable>
            <Text style={[typography.uiRowTitle, { color: colors.quietOnLight, fontSize: 12 }]} numberOfLines={1}>
              {page.chapterTitle}
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
              {percent}%
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {mode === 'lampDefault' ? (
        <>
          <Text style={[styles.lampPercent, { color: 'rgba(240,230,214,0.35)' }]}>{percent}%</Text>
          <LampPulseButton onPress={() => setWarmthPickerVisible((v) => !v)} />
          {warmthPickerVisible ? (
            <View style={[styles.warmthDock, { backgroundColor: colors.ember, borderRadius: 24 }]}>
              <WarmthPicker value={warmth} onChange={setWarmth} />
            </View>
          ) : null}
        </>
      ) : null}

      {mode === 'lampAlt' ? (
        <>
          <Pressable style={styles.altEdgeLeft} onLongPress={showAltWarmthPicker} />
          <Pressable style={styles.altEdgeRight} onLongPress={showAltWarmthPicker} />
          {warmthPickerVisible ? (
            <View style={styles.warmthSliderDock}>
              <WarmthSliderPill value={warmth} onChange={setWarmth} />
            </View>
          ) : null}
        </>
      ) : null}

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveWord}
      />
      <HighlightColorPicker
        visible={pickerParagraphIndex != null}
        onClose={() => setPickerParagraphIndex(null)}
        onSelect={handleSelectHighlightColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerHotZone: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 72,
    height: 72,
  },
  modeCycleHotZone: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  altEdgeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: screenWidth * 0.15,
  },
  altEdgeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: screenWidth * 0.15,
  },
  lampFab: {
    position: 'absolute',
    right: 20,
    bottom: 26,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(37,34,40,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lampPercent: {
    position: 'absolute',
    left: 22,
    bottom: 30,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  warmthDock: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warmthSliderDock: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -95,
  },
});
