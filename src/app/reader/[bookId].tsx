import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '@/components/icons';
import { HighlightColorPicker } from '@/features/reader/components/HighlightColorPicker';
import { LampGlowOverlay } from '@/features/reader/components/LampGlowOverlay';
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
import { useTargetLanguage } from '@/features/settings/languagePair';
import {
  fontSizePxFromPref,
  lineHeightMultiplierFromPref,
  useReadingPrefs,
} from '@/features/settings/readingPrefs';
import { getReadingTheme, setReadingTheme, useReadingTheme } from '@/features/settings/readingTheme';
import { LamplightColor, type HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// The reading surface is a deliberate reading experience, pinned to fixed
// literals rather than the (now theme-reactive) tokens — so the page stays
// perfectly legible and its Day<->Lamp crossfade keeps two distinct endpoints
// regardless of the app-wide light/dark theme.
const READING_BG_LIGHT = '#F5EDE1';
const READING_BG_DARK = '#1C1B1E';
const READING_TEXT_LIGHT = '#2B2621';
const READING_TEXT_DARK = '#F0E6D6';

type ReaderMode = 'day' | 'lampDefault' | 'lampAlt';

function nextMode(mode: ReaderMode): ReaderMode {
  if (mode === 'day') return 'lampDefault';
  if (mode === 'lampDefault') return 'lampAlt';
  return 'day';
}

function ModeIcon({ mode, color }: { mode: ReaderMode; color: string }) {
  if (mode === 'day') {
    return (
      <Svg width={13} height={13} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={4.5} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={12} height={14} viewBox="0 0 20 20">
      <Path
        d="M10 3c-3 3.5-4.5 6-3 8.5 1-1 2-1.8 3-2.2 1 0.4 2 1.2 3 2.2 1.5-2.5 0-5-3-8.5z"
        fill={color}
      />
    </Svg>
  );
}

type ReaderPageFrameProps = {
  index: number;
  scrollX: SharedValue<number>;
  children: React.ReactNode;
};

// The page-turn "feel": driven entirely by the live scroll offset on the UI
// thread (no JS-thread involvement, so it can never stutter from React work
// happening elsewhere), each page settles to full size/opacity when centered
// and eases back — like it's lifting slightly off a stack — as it slides
// toward either edge. Calm and print-like on purpose, not a literal page curl.
function ReaderPageFrame({ index, scrollX, children }: ReaderPageFrameProps) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.pageFrame, style]}>{children}</Animated.View>;
}

// A sun-with-rays glyph — reads unambiguously as "adjust brightness/warmth"
// at a glance, unlike the flame-drop shape it replaces (which users read as
// a mystery icon, not a control). Distinct from the plain filled-circle Day
// icon used for the Day/Lamp theme toggle, so the two controls never look
// like the same button.
function WarmthIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={4} fill={color} />
      <Line x1={10} y1={1.5} x2={10} y2={3.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={10} y1={16.5} x2={10} y2={18.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={1.5} y1={10} x2={3.5} y2={10} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={16.5} y1={10} x2={18.5} y2={10} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={4.2} y1={4.2} x2={5.6} y2={5.6} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={14.4} y1={14.4} x2={15.8} y2={15.8} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={4.2} y1={15.8} x2={5.6} y2={14.4} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={14.4} y1={5.6} x2={15.8} y2={4.2} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
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
      <WarmthIcon color={LamplightColor.flameAmber} size={16} />
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

  const { fontSize, lineSpacing } = useReadingPrefs();
  const readingFontSizePx = fontSizePxFromPref(fontSize);
  const readingLineHeight = Math.round(readingFontSizePx * lineHeightMultiplierFromPref(lineSpacing));
  const targetLanguage = useTargetLanguage();

  const sharedTheme = useReadingTheme();
  const [mode, setMode] = useState<ReaderMode>(() =>
    getReadingTheme() === 'lamp' ? 'lampDefault' : 'day'
  );

  // Keep in sync if the theme is changed from Settings while this screen is
  // already mounted — only steps in when the day/lamp bucket actually
  // mismatches, so it never fights the in-reader lampDefault<->lampAlt cycle.
  useEffect(() => {
    setMode((current) => {
      const currentBucket = current === 'day' ? 'day' : 'lamp';
      if (currentBucket === sharedTheme) return current;
      return sharedTheme === 'lamp' ? 'lampDefault' : 'day';
    });
  }, [sharedTheme]);

  const [warmth, setWarmth] = useState(0.6);
  const [warmthPickerVisible, setWarmthPickerVisible] = useState(false);
  const altSliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLamp = mode !== 'day';
  const textColor = isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT;

  // Background lives in its own animated absolute-fill layer, driven purely by
  // the top-level render — so switching Day<->Lamp crossfades the whole screen
  // the instant `mode` changes, independent of the FlatList's cell recycling
  // (which was the reason a per-page background never reliably repainted).
  const bgProgress = useSharedValue(isLamp ? 1 : 0);
  useEffect(() => {
    bgProgress.value = withTiming(isLamp ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.ease) });
  }, [isLamp, bgProgress]);
  const bgAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bgProgress.value, [0, 1], [READING_BG_LIGHT, READING_BG_DARK]),
  }));

  // Drives the per-page transform in ReaderPageFrame — updated directly on the
  // UI thread from the native scroll event, never touching the JS thread.
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const showAltWarmthPicker = useCallback(() => {
    setWarmthPickerVisible(true);
    if (altSliderTimer.current) clearTimeout(altSliderTimer.current);
    altSliderTimer.current = setTimeout(() => setWarmthPickerVisible(false), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [bookRow, position, bookHighlights] = await Promise.all([
        getBook(bookId),
        getReadingPosition(bookId),
        listHighlightsForBook(bookId),
      ]);
      if (cancelled) return;
      setBook(bookRow);
      setHighlights(bookHighlights);

      const fullText = getBundledBookText(bookId);
      if (!fullText) return;

      // Flattening a whole novel into its page array allocates one object per
      // page — real CPU work for a book like Anna Karenina. Deferred until
      // after the push-transition into this screen finishes, so opening a
      // book never drops that transition's frames.
      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        const flattened = flattenBookToPages(fullText);
        const startIndex = position
          ? findGlobalIndex(flattened, position.chapterIndex, position.pageIndex)
          : 0;
        setPages(flattened);
        setInitialIndex(startIndex);
        setCurrentIndex(startIndex);
        scrollX.value = startIndex * screenWidth;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, scrollX]);

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
        targetLang: targetLanguage,
        translation,
        contextSentence: page.paragraphs[activeWord.paragraphIndex] ?? '',
        chapterIndex: page.chapterIndex,
      });
      setActiveWord(null);
    },
    [book, activeWord, pages, currentIndex, targetLanguage],
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
    ({ item, index }: { item: ReaderPage; index: number }) => (
      <ReaderPageFrame index={index} scrollX={scrollX}>
        <Pressable style={styles.pageTouchable} onPress={toggleChrome}>
          {isLamp ? <LampGlowOverlay width={screenWidth} height={screenHeight} warmth={warmth} /> : null}
          <ReaderPageView
            page={item}
            textColor={textColor}
            topInset={insets.top}
            fontSize={readingFontSizePx}
            lineHeight={readingLineHeight}
            highlightMap={highlightMap}
            highlightColors={colors.highlight}
            onWordPress={handleWordPress}
            onParagraphLongPress={setPickerParagraphIndex}
          />
        </Pressable>
      </ReaderPageFrame>
    ),
    [
      colors,
      highlightMap,
      handleWordPress,
      toggleChrome,
      isLamp,
      warmth,
      textColor,
      scrollX,
      readingFontSizePx,
      readingLineHeight,
      insets.top,
    ],
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
    <View style={styles.container}>
      {/* Animated Day<->Lamp background — the single source of the page tint,
          crossfading whenever `mode` flips. Sits behind the (transparent) pages. */}
      <Animated.View style={[StyleSheet.absoluteFill, bgAnimatedStyle]} pointerEvents="none" />

      <Animated.FlatList<ReaderPage>
        ref={listRef}
        style={styles.transparentList}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.globalIndex}`}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        renderItem={renderPage}
        extraData={`${mode}-${warmth}-${readingFontSizePx}-${readingLineHeight}`}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 90 }}
        // Word-level text tokenization makes each page real render cost, so
        // virtualization is tuned tight — pages turn sequentially, there's no
        // benefit to keeping many screens' worth mounted in either direction.
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />

      {/* Corner hot-zone advances the page (fold motif tap-to-turn); tapping elsewhere on
          the page toggles chrome, wired per-page in renderPage so word/paragraph presses
          underneath still win. */}
      <Pressable style={styles.cornerHotZone} onPress={goToNextPage} />

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

      {/* Visible mode-cycle affordance, consistent across all 3 modes (the
          static mock has no persistent mode switch — reading theme is a
          Settings concern — but a live app needs some discoverable way to
          preview the other modes without leaving the Reader). Rendered last
          so it always sits on top of the Day top bar and the Lamp Alt edge
          zones, which otherwise swallow the tap. */}
      <Pressable
        hitSlop={12}
        style={[
          styles.modeCycleButton,
          {
            top: insets.top + 10,
            backgroundColor: isLamp ? 'rgba(240,230,214,0.16)' : 'rgba(43,38,33,0.10)',
            borderColor: isLamp ? 'rgba(240,230,214,0.28)' : 'rgba(43,38,33,0.20)',
          },
        ]}
        onPress={() => {
          const next = nextMode(mode);
          setMode(next);
          setReadingTheme(next === 'day' ? 'day' : 'lamp');
        }}
      >
        <ModeIcon mode={mode} color={isLamp ? colors.flameAmber : colors.ink} />
      </Pressable>

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
  transparentList: {
    backgroundColor: 'transparent',
  },
  pageFrame: {
    width: screenWidth,
    height: screenHeight,
  },
  pageTouchable: {
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
  modeCycleButton: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
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
