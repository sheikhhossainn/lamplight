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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '@/components/icons';
import { HighlightColorPicker } from '@/features/reader/components/HighlightColorPicker';
import { ReaderPageView } from '@/features/reader/components/ReaderPageView';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import {
  findGlobalIndex,
  paginateBook,
  PAGINATION_MEASURE_SAMPLE,
  type ReaderPage,
} from '@/features/reader/engine/paginate';
import { splitIntoSentences } from '@/features/reader/engine/words';
import { getBookText } from '@/features/content-ingestion/bookDownloader';
import type { IngestedBook } from '@/features/content-ingestion/textParser';
import { getBook, type BookRow } from '@/db/repositories/books';
import { createHighlight, listHighlightsForBook, type Highlight } from '@/db/repositories/highlights';
import { getReadingPosition, upsertReadingPosition } from '@/db/repositories/readingPosition';
import { listSavedWordsForBook, saveWord, type SavedWord } from '@/db/repositories/savedWords';
import { useTargetLanguage } from '@/features/settings/languagePair';
import {
  fontSizePxFromPref,
  lineHeightMultiplierFromPref,
  useReadingPrefs,
} from '@/features/settings/readingPrefs';
import { getReadingTheme, useReadingTheme } from '@/features/settings/readingTheme';
import { requestThemeChange } from '@/features/settings/themeTransition';
import { LamplightColor, type HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Shows the reader gesture hint once per app session (not once ever — no
// persistence — and not on every single book you open, which would nag).
let hasShownReaderHint = false;

// The reading surface is a deliberate reading experience, pinned to fixed
// literals rather than the (theme-reactive) tokens — so the page stays legible
// regardless of the app-wide theme. Dark is a flat linear gradient (no amber
// glow wash, no brightness control — just the page going dark), identical to
// the Splash/Onboarding background.
const READING_BG_LIGHT = '#F5EDE1';
const READING_TEXT_LIGHT = '#2B2621';
const READING_TEXT_DARK = '#F0E6D6';
const READING_DARK_STOPS = ['#1C1B1E', '#201E22', '#26221F'] as const;

type ReaderMode = 'day' | 'lamp';

// The reading-mode toggle shows the mode you'll switch TO (a common toggle
// idiom): in Day it shows a moon ("tap for Lamp/dark"); in Lamp it shows a sun
// ("tap for Day/light"). Clean, high-contrast glyphs — the old flame-drop read
// as an unclear "circle-in-a-circle."
function ModeIcon({
  mode,
  color,
  carveColor,
}: {
  mode: ReaderMode;
  color: string;
  carveColor: string;
}) {
  if (mode === 'day') {
    // Currently Day -> crescent moon (tap to switch to Lamp). Drawn as a full
    // disc with a second disc, filled in the (solid) button color, offset over
    // it to carve out the crescent — two plain circles, so it renders
    // identically everywhere (no mask/path quirks that made it look broken).
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={8.6} fill={color} />
        <Circle cx={15.4} cy={9} r={7.8} fill={carveColor} />
      </Svg>
    );
  }
  // Currently Lamp -> sun (tap to switch to Day).
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} fill={color} />
      <Path
        d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.05 5.05l1.7 1.7M17.25 17.25l1.7 1.7M18.95 5.05l-1.7 1.7M6.75 17.25l-1.7 1.7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
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
// happening elsewhere). Deliberately subtle — a heavier scale/fade fights the
// eye's read of hundreds of word glyphs moving at once and reads as jank even
// at a perfect frame rate; a bare hint of recession sells "lifting off a stack."
function ReaderPageFrame({ index, scrollX, children }: ReaderPageFrameProps) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.985, 1, 0.985], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.pageFrame, style]}>{children}</Animated.View>;
}

export default function ReaderScreen() {
  // jumpChapter/jumpPage are optional — set when arriving from Vocabulary
  // (tapping a saved word) to open directly on that word's page.
  const { bookId, jumpChapter, jumpPage } = useLocalSearchParams<{
    bookId: string;
    jumpChapter?: string;
    jumpPage?: string;
  }>();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ReaderPage>>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  // Distinguishes "still downloading over the network" from "genuinely
  // unavailable" — the old bundled-JSON version conflated both into a single
  // null, which was fine when getBundledBookText was instant and synchronous,
  // but a real download can take several seconds and needs its own UI state.
  const [bookTextState, setBookTextState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; book: IngestedBook }
    | { status: 'unavailable' }
    | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [startPosition, setStartPosition] = useState<{ chapterIndex: number; pageIndex: number } | null>(
    null,
  );
  const [pages, setPages] = useState<ReaderPage[]>([]);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeOpacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tap a word -> translate (activeWord). Long-press a word -> anchor quote
  // selection at that exact sentence immediately (no intermediate menu) and
  // drag, still holding, to extend it — see ReaderPageView's PanResponder.
  const [activeWord, setActiveWord] = useState<{ word: string; paragraphIndex: number } | null>(null);
  // Selection holds `${paragraphIndex}:${sentenceIndex}` keys — always a
  // contiguous range (keys[0]..keys[last]), starting as the single sentence
  // long-pressed and adjustable from either end via drag handles.
  const [selection, setSelection] = useState<{ page: ReaderPage; keys: string[] } | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  // First-run gesture hint — fades/slides in a couple seconds after the book
  // opens, holds long enough to actually read, then eases back out on its own
  // (or immediately on tap). Shows once per app session, never again after.
  const [hintVisible, setHintVisible] = useState(false);
  const hintOpacity = useSharedValue(0);
  const hintTranslateY = useSharedValue(10);
  const dismissHint = useCallback(() => {
    hintOpacity.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) });
    hintTranslateY.value = withTiming(8, { duration: 260, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setHintVisible(false), 260);
  }, [hintOpacity, hintTranslateY]);
  useEffect(() => {
    if (hasShownReaderHint || !book) return;
    hasShownReaderHint = true;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const showTimer = setTimeout(() => {
      setHintVisible(true);
      hintOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
      hintTranslateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
      hideTimer = setTimeout(dismissHint, 5600);
    }, 2200);
    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [book, hintOpacity, hintTranslateY, dismissHint]);
  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateY: hintTranslateY.value }],
  }));

  const { fontSize, lineSpacing } = useReadingPrefs();
  const readingFontSizePx = fontSizePxFromPref(fontSize);
  const readingLineHeight = Math.round(readingFontSizePx * lineHeightMultiplierFromPref(lineSpacing));
  const targetLanguage = useTargetLanguage();

  const sharedTheme = useReadingTheme();
  const [mode, setMode] = useState<ReaderMode>(() => (getReadingTheme() === 'lamp' ? 'lamp' : 'day'));

  // Keep in sync if the theme is changed from Settings while this screen is
  // already mounted.
  useEffect(() => {
    setMode(sharedTheme === 'lamp' ? 'lamp' : 'day');
  }, [sharedTheme]);

  const isLamp = mode === 'lamp';
  const textColor = isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT;

  // Saved-word marker, themed oppositely per mode (matches the Figma amber
  // highlight): Day = dark ink on an amber wash (a highlighter); Lamp = amber
  // ink on the dark page (inverted figure/ground for contrast).
  const savedWordColor = isLamp ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.35)';
  const savedWordTextColor = isLamp ? '#F5A623' : '#2B2621';

  // Background lives in its own animated absolute-fill layer, driven purely by
  // the top-level render — so switching Day<->Lamp crossfades the whole screen
  // the instant `mode` changes, independent of the FlatList's cell recycling.
  // The dark state is the exact linear gradient used on Splash/Onboarding,
  // crossfaded in via opacity — never an amber glow or an approximation.
  const bgProgress = useSharedValue(isLamp ? 1 : 0);
  useEffect(() => {
    // Swap instantly — the app-wide ThemeTransitionOverlay already plays the
    // smooth day<->night crossfade over the whole screen, so animating the
    // reader's own background too would double the effect (read as two flashes).
    bgProgress.value = isLamp ? 1 : 0;
  }, [isLamp, bgProgress]);
  const darkBgStyle = useAnimatedStyle(() => ({ opacity: bgProgress.value }));

  // Drives the per-page transform in ReaderPageFrame — updated directly on the
  // UI thread from the native scroll event, never touching the JS thread.
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [bookRow, position, bookHighlights, words] = await Promise.all([
        getBook(bookId),
        getReadingPosition(bookId),
        listHighlightsForBook(bookId),
        listSavedWordsForBook(bookId),
      ]);
      if (cancelled) return;
      setBook(bookRow);
      setHighlights(bookHighlights);
      setSavedWords(words);
      // A jump target (from Vocabulary/Book Detail) wins over the saved position.
      const jumpC = jumpChapter != null ? Number(jumpChapter) : null;
      const jumpP = jumpPage != null ? Number(jumpPage) : null;
      if (jumpC != null && jumpP != null) {
        setStartPosition({ chapterIndex: jumpC, pageIndex: jumpP });
      } else if (position) {
        setStartPosition({ chapterIndex: position.chapterIndex, pageIndex: position.pageIndex });
      } else {
        setStartPosition({ chapterIndex: 0, pageIndex: 0 });
      }

      if (!bookRow || !bookRow.textUrl) {
        setBookTextState({ status: 'unavailable' });
        return;
      }
      try {
        const ingested = await getBookText(
          bookRow.id,
          bookRow.title,
          bookRow.textUrl,
          bookRow.chapter1Anchor ?? undefined,
        );
        if (cancelled) return;
        setBookTextState({ status: 'ready', book: ingested });
      } catch (err) {
        if (cancelled) return;
        setBookTextState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Download failed',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, jumpChapter, jumpPage]);

  // Text column metrics — how much room a page's body copy actually has, from
  // the real screen size + safe areas + current font settings. Pagination is
  // recomputed against these so pages fit the screen and reflow when the font
  // changes.
  const contentWidthPx = screenWidth - spacing.xl * 2;
  const contentHeightPx = screenHeight - (insets.top + spacing.xl) - (insets.bottom + 20);
  const chapterTitleExtraPx = spacing.xl + typography.screenTitle.lineHeight + spacing.lg;

  // Real characters-per-line, measured from a hidden sample (below) at the exact
  // reading style + column width, so pagination packs pages tightly instead of
  // leaving a blank bottom strip. Re-measured whenever the font size changes.
  const [measuredCharsPerLine, setMeasuredCharsPerLine] = useState<number | null>(null);
  useEffect(() => {
    // Invalidate the measurement when the font metrics change; the hidden Text's
    // onTextLayout will produce a fresh value for the new size.
    setMeasuredCharsPerLine(null);
  }, [readingFontSizePx, readingLineHeight, contentWidthPx]);

  // (Re)paginate whenever the book, the text metrics, or the measurement change.
  // Deferred off the interaction frame so opening a book (or nudging the font
  // slider) never drops frames while a whole novel is re-flowed.
  useEffect(() => {
    if (bookTextState.status !== 'ready' || measuredCharsPerLine == null) return;
    const bookText = bookTextState.book;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const paginated = paginateBook(bookText, {
        contentWidthPx,
        contentHeightPx,
        fontSizePx: readingFontSizePx,
        lineHeightPx: readingLineHeight,
        paragraphGapPx: spacing.sm,
        chapterTitleExtraPx,
        measuredCharsPerLine,
      });
      setPages(paginated);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [
    bookTextState,
    readingFontSizePx,
    readingLineHeight,
    contentWidthPx,
    contentHeightPx,
    chapterTitleExtraPx,
    spacing.sm,
    measuredCharsPerLine,
  ]);

  // Resolve the initial scroll index once, after the first pagination lands.
  useEffect(() => {
    if (initialIndex != null || pages.length === 0 || !startPosition) return;
    const idx = findGlobalIndex(pages, startPosition.chapterIndex, startPosition.pageIndex);
    setInitialIndex(idx);
    setCurrentIndex(idx);
    scrollX.value = idx * screenWidth;
  }, [pages, startPosition, initialIndex, scrollX]);

  // Lowercased set of saved words for this book — matched in the reader text so
  // already-looked-up words get an amber marker. Reference-stable via useMemo
  // so memoized pages don't re-render unless the set actually changes.
  const savedWordSet = useMemo(
    () => new Set(savedWords.map((w) => w.sourceWord.toLowerCase())),
    [savedWords],
  );

  const scheduleAutoHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      chromeOpacity.value = withTiming(0, { duration: 220 });
      setChromeVisible(false);
    }, 2500);
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
    // Highlighting operates at paragraph granularity: start_offset/end_offset
    // hold the first/last selected paragraph index (a quote can span several).
    const map = new Map<string, HighlightColorKey>();
    for (const h of highlights) {
      for (let p = h.startOffset; p <= h.endOffset; p += 1) {
        map.set(`${h.chapterIndex}-${h.pageIndex}-${p}`, h.colorKey);
      }
    }
    return map;
  }, [highlights]);

  const goToNextPage = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, pages.length]);

  const retryDownload = useCallback(async () => {
    if (!book || !book.textUrl) return;
    setBookTextState({ status: 'loading' });
    try {
      const ingested = await getBookText(book.id, book.title, book.textUrl, book.chapter1Anchor ?? undefined);
      setBookTextState({ status: 'ready', book: ingested });
    } catch (err) {
      setBookTextState({ status: 'error', message: err instanceof Error ? err.message : 'Download failed' });
    }
  }, [book]);

  const handleWordPress = useCallback((word: string, paragraphIndex: number) => {
    setActiveWord({ word, paragraphIndex });
  }, []);

  const handleWordLongPress = useCallback((paragraphIndex: number, page: ReaderPage, sentenceIndex: number) => {
    setSelection({ page, keys: [`${paragraphIndex}:${sentenceIndex}`] });
  }, []);

  // Drives both the initial drag (right after the long-press, before the
  // finger lifts — always moves 'end') and the two adjustment handles
  // afterward (each moves its own edge). Whichever edge isn't being dragged
  // stays fixed as the pivot, so the range is always the contiguous span
  // between the two, in reading order — never a scatter of tapped sentences.
  const handleRangeEdgeDrag = useCallback((edge: 'start' | 'end', key: string) => {
    setSelection((prev) => {
      if (!prev) return prev;
      const flat = prev.page.paragraphs.flatMap((paragraph, p) =>
        splitIntoSentences(paragraph).map((_, s) => `${p}:${s}`),
      );
      const pivotKey = edge === 'start' ? prev.keys[prev.keys.length - 1] : prev.keys[0];
      const pivotPos = flat.indexOf(pivotKey);
      const dragPos = flat.indexOf(key);
      if (pivotPos === -1 || dragPos === -1) return prev;
      const [lo, hi] = pivotPos <= dragPos ? [pivotPos, dragPos] : [dragPos, pivotPos];
      return { ...prev, keys: flat.slice(lo, hi + 1) };
    });
  }, []);

  const handleSaveWord = useCallback(
    async (translation: string) => {
      if (!book || !activeWord) return;
      const page = pages[currentIndex];
      const created = await saveWord({
        bookId: book.id,
        sourceWord: activeWord.word,
        sourceLang: 'en',
        targetLang: targetLanguage,
        translation,
        contextSentence: page.paragraphs[activeWord.paragraphIndex] ?? '',
        chapterIndex: page.chapterIndex,
        pageIndex: page.pageIndexInChapter,
        paragraphIndex: activeWord.paragraphIndex,
      });
      setSavedWords((prev) => [created, ...prev]); // reflect the amber marker immediately
      setActiveWord(null);
    },
    [book, activeWord, pages, currentIndex, targetLanguage],
  );

  const handleSelectHighlightColor = useCallback(
    async (colorKey: HighlightColorKey) => {
      if (!book || !selection || selection.keys.length === 0) return;
      const { page, keys } = selection;
      // Rebuild the quote text from the selected sentence keys, in reading
      // order, and store the paragraph span for re-rendering the highlight.
      const parsed = keys
        .map((k) => {
          const [p, s] = k.split(':').map(Number);
          return { p, s };
        })
        .sort((a, b) => (a.p !== b.p ? a.p - b.p : a.s - b.s));
      const quoteText = parsed
        .map(({ p, s }) => splitIntoSentences(page.paragraphs[p] ?? '')[s]?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      const paragraphIndices = parsed.map((x) => x.p);
      const created = await createHighlight({
        bookId: book.id,
        chapterIndex: page.chapterIndex,
        pageIndex: page.pageIndexInChapter,
        startOffset: Math.min(...paragraphIndices),
        endOffset: Math.max(...paragraphIndices),
        colorKey,
        quoteText,
      });
      setHighlights((prev) => [created, ...prev]);
      setColorPickerVisible(false);
      setSelection(null);
      router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: created.id } });
    },
    [book, selection],
  );

  const renderPage = useCallback(
    ({ item, index }: { item: ReaderPage; index: number }) => {
      const selectedForItem =
        selection && selection.page.globalIndex === item.globalIndex ? selection.keys : null;
      return (
        <ReaderPageFrame index={index} scrollX={scrollX}>
          <Pressable style={styles.pageTouchable} onPress={selection ? undefined : toggleChrome}>
            <ReaderPageView
              page={item}
              textColor={textColor}
              topInset={insets.top}
              bottomInset={insets.bottom}
              fontSize={readingFontSizePx}
              lineHeight={readingLineHeight}
              highlightMap={highlightMap}
              highlightColors={colors.highlight}
              savedWordSet={savedWordSet}
              savedWordColor={savedWordColor}
              savedWordTextColor={savedWordTextColor}
              selectionKeys={selectedForItem}
              selectionColor={colors.highlight.amber}
              onWordPress={handleWordPress}
              onWordLongPress={handleWordLongPress}
              onRangeEdgeDrag={handleRangeEdgeDrag}
            />
          </Pressable>
        </ReaderPageFrame>
      );
    },
    [
      colors,
      highlightMap,
      savedWordSet,
      savedWordColor,
      savedWordTextColor,
      handleWordPress,
      handleWordLongPress,
      handleRangeEdgeDrag,
      toggleChrome,
      textColor,
      scrollX,
      readingFontSizePx,
      readingLineHeight,
      insets.top,
      insets.bottom,
      selection,
    ],
  );

  // Hidden one-shot measurement of the real characters-per-line for the current
  // font/column, rendered in every state so pagination can proceed even before
  // pages exist. onTextLayout gives the exact wrapped-line count for the sample.
  const measurement = (
    <View style={[styles.measureHost, { width: contentWidthPx }]} pointerEvents="none">
      <Text
        style={[
          typography.readingBody,
          { fontSize: readingFontSizePx, lineHeight: readingLineHeight },
        ]}
        onTextLayout={(e) => {
          const lines = e.nativeEvent.lines.length;
          if (lines > 0) {
            setMeasuredCharsPerLine((prev) => prev ?? PAGINATION_MEASURE_SAMPLE.length / lines);
          }
        }}
      >
        {PAGINATION_MEASURE_SAMPLE}
      </Text>
    </View>
  );

  if (!book) return <View style={styles.container}>{measurement}</View>;

  if (bookTextState.status === 'unavailable') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>
          {book.title} isn't available to read yet.
        </Text>
      </View>
    );
  }

  if (bookTextState.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>Downloading…</Text>
      </View>
    );
  }

  if (bookTextState.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center', marginBottom: 16 }]}>
          Couldn't download {book.title}.
        </Text>
        <Pressable
          onPress={retryDownload}
          style={[styles.selectionSave, { backgroundColor: colors.flameAmber }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13 }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // Still measuring / paginating / resolving the start page — keep measuring.
  if (pages.length === 0 || initialIndex == null) {
    return <View style={styles.container}>{measurement}</View>;
  }

  const percent = Math.round(((Math.min(currentIndex, pages.length - 1) + 1) / pages.length) * 100);

  // Chrome (top bar) colors, pinned to the reading surface rather than the
  // app-wide theme tokens, so the bar reads correctly in both reader modes.
  const chromeFade = isLamp ? READING_DARK_STOPS[0] : READING_BG_LIGHT;
  const chromeChevron = isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT;
  const chromePercent = LamplightColor.flameAmber;
  // Solid (opaque) button fill — the moon crescent is carved with this exact
  // color, so it must not be translucent or the carve would show through.
  const modeButtonBg = isLamp ? '#2A2723' : '#E7DBC7';

  return (
    <View style={styles.container}>
      {measurement}
      {/* Animated Day<->Lamp background — the single source of the page tint,
          crossfading whenever `mode` flips. Light is a flat fill; dark fades in
          as the exact Splash/Onboarding linear gradient. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: READING_BG_LIGHT }]} pointerEvents="none" />
      {/* Solid dark fill *under* the gradient SVG so the container's right/bottom
          edges are covered even where the Dimensions-sized SVG stops a pixel
          short — that gap used to reveal the cream base as a thin edge line. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: READING_DARK_STOPS[0] }, darkBgStyle]}
        pointerEvents="none"
      >
        <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="readerDarkBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={READING_DARK_STOPS[0]} />
              <Stop offset="55%" stopColor={READING_DARK_STOPS[1]} />
              <Stop offset="100%" stopColor={READING_DARK_STOPS[2]} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#readerDarkBg)" />
        </Svg>
      </Animated.View>

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
        extraData={`${mode}-${readingFontSizePx}-${readingLineHeight}-${savedWordSet.size}-${selection ? selection.keys.join(',') : ''}`}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 90 }}
        // Kill Android's overscroll edge glow (defaults to the accent color and
        // shows as a stray tinted line at the scroll boundaries in dark mode).
        overScrollMode="never"
        // Lock paging while selecting lines for a quote — swiping away from the
        // page you're selecting on would lose the selection context.
        scrollEnabled={!selection}
        decelerationRate="fast"
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
      />

      {/* Corner hot-zone advances the page (fold motif tap-to-turn); tapping elsewhere on
          the page toggles chrome, wired per-page in renderPage so word/paragraph presses
          underneath still win. Disabled while selecting lines for a quote. */}
      {selection ? null : <Pressable style={styles.cornerHotZone} onPress={goToNextPage} />}

      {/* One theme-aware top bar for both modes — back, chapter, progress. */}
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        style={[styles.topBar, chromeStyle, { height: insets.top + 64 }]}
      >
        <Svg width={screenWidth} height={insets.top + 64} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="chromeFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={chromeFade} stopOpacity={0.96} />
              <Stop offset="70%" stopColor={chromeFade} stopOpacity={0.78} />
              <Stop offset="100%" stopColor={chromeFade} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={screenWidth} height={insets.top + 64} fill="url(#chromeFade)" />
        </Svg>
        <View style={[styles.topBarRow, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.topBarBack, { left: spacing.lg, top: insets.top + 6 }]}
          >
            <ChevronLeftIcon color={chromeChevron} size={18} />
          </Pressable>
          {/* Reading progress, centered at the top. */}
          <Text style={[typography.uiRowTitle, { color: chromePercent, fontSize: 13 }]}>{percent}%</Text>
        </View>
      </Animated.View>

      {/* Day/Lamp toggle — the single reading-mode control (no brightness).
          Solid button fill so the crescent-moon glyph (carved with this exact
          color) reads cleanly. Routed through the app-wide theme transition so
          the whole screen crossfades day<->night. */}
      <Pressable
        hitSlop={12}
        style={[
          styles.modeCycleButton,
          {
            top: insets.top + 10,
            backgroundColor: modeButtonBg,
            borderColor: isLamp ? 'rgba(240,230,214,0.30)' : 'rgba(43,38,33,0.22)',
          },
        ]}
        onPress={() => requestThemeChange(isLamp ? 'day' : 'lamp')}
      >
        <ModeIcon
          mode={mode}
          color={isLamp ? colors.flameAmber : colors.ink}
          carveColor={modeButtonBg}
        />
      </Pressable>

      {/* First-run gesture hint — tap a word to translate, hold + drag to
          quote. Fades in a few seconds after opening the book, auto-dismisses,
          never reappears this session. Hidden while actively selecting. */}
      {hintVisible && !selection ? (
        <Animated.View
          style={[
            styles.hintCard,
            { bottom: insets.bottom + 96, backgroundColor: colors.card, borderColor: colors.hairline },
            hintAnimatedStyle,
          ]}
        >
          <Pressable onPress={dismissHint} hitSlop={8}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Tap a word to translate
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 12, marginTop: 3 }]}>
              Hold and drag over the text to save a quote
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Quote-selection bottom bar — only while picking lines. */}
      {selection ? (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={() => setSelection(null)} hitSlop={8}>
            <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, fontSize: 13 }]}>Cancel</Text>
          </Pressable>
          <Text style={[typography.metadataCaption, { color: colors.lampText, fontSize: 12 }]}>
            {`${selection.keys.length} sentence${selection.keys.length > 1 ? 's' : ''} selected`}
          </Text>
          <Pressable
            onPress={() => setColorPickerVisible(true)}
            style={[styles.selectionSave, { backgroundColor: colors.flameAmber }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>
              Save quote
            </Text>
          </Pressable>
        </View>
      ) : null}

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveWord}
      />
      <HighlightColorPicker
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
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
  // Off-screen host for the hidden characters-per-line measurement Text.
  measureHost: {
    position: 'absolute',
    left: 0,
    top: -10000,
    opacity: 0,
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
    justifyContent: 'center',
  },
  topBarBack: {
    position: 'absolute',
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(28,27,30,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,230,214,0.12)',
    zIndex: 30,
  },
  hintCard: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 280,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 25,
  },
  selectionSave: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
});

