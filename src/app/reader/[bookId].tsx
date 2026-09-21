import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  type ViewToken,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { ChevronLeftIcon, CloseIcon, MenuIcon, MoonIcon, QuestionIcon, SoundWaveIcon, SpeakerIcon, SunIcon, TranslateIcon } from '@/components/icons';
import { AmbiencePicker } from '@/features/ambience/AmbiencePicker';
import { useAmbienceTrackId } from '@/features/ambience/ambiencePreference';
import { ambienceTrackById } from '@/features/ambience/tracks';
import { useAmbiencePlayer } from '@/features/ambience/useAmbiencePlayer';
import { usePageTurnSound } from '@/features/reader/usePageTurnSound';
import { getPageTurnSoundEnabled, setPageTurnSoundEnabled, usePageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import { BookLoadingScreen } from '@/features/reader/components/BookLoadingScreen';
import { BookPageFrame } from '@/features/reader/components/BookPageFrame';
import { ReaderPageView } from '@/features/reader/components/ReaderPageView';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { hapticPageTurn, hapticSaveWord } from '@/lib/haptics';
import {
  findGlobalIndex,
  paginateBook,
  PAGINATION_MEASURE_SAMPLE,
  BANGLA_PAGINATION_SAMPLE,
  type ReaderPage,
} from '@/features/reader/engine/paginate';
import {
  buildGlyphWidths,
  GLYPH_MEASURE_TEXT,
  glyphWidthsReady,
  setMeasuredGlyphWidths,
} from '@/features/reader/engine/glyphWidths';
import { sentenceAtOffset } from '@/features/reader/engine/words';
import { getBookText, isBookCached } from '@/features/content-ingestion/bookDownloader';
import { logEvent } from '@/features/analytics/analytics';
import { startReadingSession, recordPageTurn, endReadingSession } from '@/features/analytics/readingTracker';
import { BookFormatError, type IngestedBook } from '@/features/content-ingestion/textParser';
import { triggerSync } from '@/features/sync/syncWorker';
import { getBook, updateBookTotalChapters, type BookRow } from '@/db/repositories/books';
import { createHighlight, listHighlightsForBook, type Highlight } from '@/db/repositories/highlights';
import { getReadingPosition, upsertReadingPosition, type ReadingPosition } from '@/db/repositories/readingPosition';
import { listSavedWordsForBook, saveWord, type SavedWord } from '@/db/repositories/savedWords';
import { createPendingLookup } from '@/db/repositories/pendingLookups';
import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { LanguagePicker } from '@/components/LanguagePicker';
import { PageStyleSelectorModal } from '@/features/reader/components/PageStyleSelectorModal';
import { ReaderGuideModal } from '@/features/reader/components/ReaderGuideModal';
import { getPageStyleConfig } from '@/features/reader/pageStyles';
import { usePageStyle } from '@/features/settings/pageStylePrefs';
import { setTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { getReadingFontSize, getReadingLineHeight, READING_FONT_SIZE_PX, READING_LINE_HEIGHT_PX } from '@/features/settings/readingPrefs';
import { getReadingTheme, setReadingTheme, useReadingTheme } from '@/features/settings/readingTheme';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { checkTranslationCap, recordTranslationUsage, translationProvider } from '@/features/translation';
import { batchTranslateSentences, splitSentences } from '@/features/translation/interlinearParser';
import { LamplightColor, Spacing, type HighlightColorKey } from '@/theme/tokens';
import { LamplightTypography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const ANTIQUE_PAPER_DAY = require('../../../assets/images/antique-paper-day.jpg');

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const READER_GUIDE_SEEN_KEY = 'reader_guide_shown_once';
const READER_HINT_SETTING_KEY = 'reader_gesture_hint_v4';
const READER_BACK_HINT_SETTING_KEY = 'reader_back_gesture_hint_v1';
// Set to true to always show Reader Guide and gesture hints in development / testing.
const ALWAYS_SHOW_READER_GUIDE_IN_DEV = true;
const NOOP_RANGE_DRAG = () => {};

// The reading surface is a deliberate reading experience, pinned to fixed
// literals rather than the (theme-reactive) tokens — so the page stays legible
// regardless of the app-wide theme. Dark is a flat linear gradient (no amber
// glow wash, no brightness control — just the page going dark), identical to
// the Splash/Onboarding background.
const READING_BG_LIGHT = '#F4EBD9';
const READING_TEXT_LIGHT = '#241D17';
const READING_TEXT_DARK = '#F0E6D6';
const READING_DARK_STOPS = ['#1C1B1E', '#201E22', '#26221F'] as const;
const READER_THEME_DURATION_MS = 360;
const READER_THEME_EASING = Easing.inOut(Easing.cubic);
const CHROME_REVEAL_DURATION_MS = 180;
const CHROME_HIDE_DURATION_MS = 180;
const CHROME_EASING = Easing.bezier(0.23, 1, 0.32, 1);

type ReaderMode = 'day' | 'lamp';

// The reading-mode toggle shows the CURRENT mode: sun while reading in Day,
// moon while reading by lamplight. Micro-interaction: rotating & scaling crossfade
// between sun and moon glyphs.
function ModeIcon({ progress }: { progress: SharedValue<number> }) {
  const sunStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${progress.value * 90}deg` },
      { scale: 1 - progress.value * 0.25 },
    ],
  }));
  const moonStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { rotate: `${(1 - progress.value) * -90}deg` },
      { scale: 0.75 + progress.value * 0.25 },
    ],
  }));

  return (
    <View style={styles.modeIconContainer}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.centered, sunStyle]}>
        <SunIcon color={READING_TEXT_LIGHT} size={19} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.centered, moonStyle]}>
        <MoonIcon color={READING_TEXT_DARK} size={19} />
      </Animated.View>
    </View>
  );
}

type ReaderChromeTouchTargetProps = {
  enabled: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  accessibilityLabel?: string;
  testID?: string;
};

// Android can retain an Animated Pressable's native touch region after its
// opacity reaches zero. Keep the visual chrome separate and unmount the touch
// target whenever the toolbar is hidden.
function ReaderChromeTouchTarget({
  enabled,
  onPress,
  onLongPress,
  delayLongPress,
  accessibilityLabel,
  testID,
}: ReaderChromeTouchTargetProps) {
  if (!enabled) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
      style={StyleSheet.absoluteFill}
      pressRetentionOffset={20}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
    />
  );
}

type TurnPageSoundMenuRowProps = {
  isLamp: boolean;
  playPageTurn: () => void;
  stopPageTurn: () => void;
};

function TurnPageSoundMenuRow({ isLamp, playPageTurn, stopPageTurn }: TurnPageSoundMenuRowProps) {
  const { typography, colors } = useTheme();
  const enabled = usePageTurnSoundEnabled();
  const progress = useSharedValue(enabled ? 1 : 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    progress.value = withTiming(enabled ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [enabled, progress]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const next = !getPageTurnSoundEnabled();

    cancelAnimation(progress);
    progress.value = withTiming(next ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });

    if (next) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        playPageTurn();
      }, 160);
    } else {
      stopPageTurn();
    }

    setPageTurnSoundEnabled(next);
  }, [progress, playPageTurn, stopPageTurn]);

  const trackStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      backgroundColor: interpolateColor(
        p,
        [0, 1],
        [isLamp ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)', colors.flameAmber],
      ),
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{ translateX: interpolate(p, [0, 1], [0, 16]) }],
    };
  });

  const iconColor = enabled
    ? colors.flameAmber
    : isLamp
      ? 'rgba(236,227,212,0.45)'
      : 'rgba(42,36,30,0.45)';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Turn page sound"
      testID="reader-turn-sound-button"
      onPress={handleToggle}
      style={styles.chromeMenuRow}
    >
      <SoundWaveIcon color={iconColor} size={18} />
      <Text
        style={[
          typography.uiRowTitle,
          styles.chromeMenuLabel,
          { flex: 1, color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT },
        ]}
      >
        Turn Page Sound
      </Text>
      <Animated.View style={[styles.menuToggleTrack, trackStyle]} pointerEvents="none">
        <Animated.View style={[styles.menuToggleThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

type ReaderPageFrameProps = {
  children: React.ReactNode;
  pageIndex: number;
  scrollX: SharedValue<number>;
  themeProgress: SharedValue<number>;
  mode?: ReaderMode;
  pageWidth: number;
  pageHeight: number;
};

// 1890s antique open-book page frame with realistic 3D paper curl & folding dynamics:
// As the reader swipes, the turning page lifts in 3D perspective around the left spine binding,
// casting a physical soft gradient drop-shadow onto the incoming page beneath it.
// At rest (progress <= 0.002 or progress >= 0.998), every page is 100% full-bleed and neutral,
// with zero translation, zero rotation, zero shadow, and zero visual artifacts.
const ReaderPageFrame = memo(function ReaderPageFrame({
  children,
  pageIndex,
  scrollX,
  themeProgress,
  mode = 'day',
  pageWidth,
  pageHeight,
}: ReaderPageFrameProps) {
  const isLamp = mode === 'lamp';
  const halfW = pageWidth / 2;

  // 1. 3D page curl & elevation transform:
  // Strictly active ONLY during an in-flight page turn (0.002 < progress < 0.998).
  const pageTransformStyle = useAnimatedStyle(() => {
    'worklet';
    const x = scrollX.value;
    const pageStart = pageIndex * pageWidth;
    const offset = x - pageStart;
    const progress = offset / pageWidth;

    if (progress > 0.002 && progress < 0.998) {
      // Outgoing page lifting off the right page stack:
      // Realistic parabolic paper arch: peaks at mid-turn (progress = 0.5) and lands flat at 0 and 1.
      const arch = Math.sin(progress * Math.PI);
      const curlAngle = -arch * 10; // Gentle 10° lift towards the reader

      return {
        zIndex: 10,
        elevation: 8,
        transform: [
          { perspective: 1200 },
          { translateX: halfW },
          { rotateY: `${curlAngle}deg` },
          { translateX: -halfW },
        ],
      };
    }

    return {
      zIndex: 1,
      elevation: 0,
      transform: [{ translateX: 0 }],
    };
  });

  // 2. Dynamic paper lighting:
  // Simulates the concave curvature shading of bending antique paper.
  const paperShadingStyle = useAnimatedStyle(() => {
    'worklet';
    const x = scrollX.value;
    const pageStart = pageIndex * pageWidth;
    const offset = x - pageStart;
    const progress = offset / pageWidth;

    if (progress > 0.002 && progress < 0.998) {
      const archIntensity = Math.sin(progress * Math.PI);
      return {
        opacity: archIntensity * (isLamp ? 0.18 : 0.12),
      };
    }

    return {
      opacity: 0,
    };
  });

  // 3. Trailing edge physical cast shadow (casts onto revealed page during turn)
  const edgeShadowStyle = useAnimatedStyle(() => {
    'worklet';
    const x = scrollX.value;
    const pageStart = pageIndex * pageWidth;
    const offset = x - pageStart;
    const progress = offset / pageWidth;

    if (progress > 0.002 && progress < 0.998) {
      const arch = Math.sin(progress * Math.PI);
      return {
        opacity: arch * (isLamp ? 0.45 : 0.32),
      };
    }

    return {
      opacity: 0,
    };
  });

  return (
    <Animated.View
      style={[
        styles.pageFrame,
        { width: pageWidth, height: pageHeight },
        pageTransformStyle,
      ]}
    >
      <BookPageFrame themeProgress={themeProgress}>
        {children}
      </BookPageFrame>

      {/* Dynamic paper shading layer (arch flex lighting) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isLamp ? '#000000' : '#2A1D12' },
          paperShadingStyle,
        ]}
        pointerEvents="none"
      />

      {/* Trailing edge physical drop shadow casting onto revealed page */}
      <Animated.View
        style={[
          styles.trailingEdgeDropShadow,
          edgeShadowStyle,
        ]}
        pointerEvents="none"
      >
        <View style={[styles.edgeShadowBand1, { backgroundColor: isLamp ? 'rgba(0,0,0,0.38)' : 'rgba(38,25,14,0.32)' }]} />
        <View style={[styles.edgeShadowBand2, { backgroundColor: isLamp ? 'rgba(0,0,0,0.24)' : 'rgba(38,25,14,0.20)' }]} />
        <View style={[styles.edgeShadowBand3, { backgroundColor: isLamp ? 'rgba(0,0,0,0.14)' : 'rgba(38,25,14,0.10)' }]} />
        <View style={[styles.edgeShadowBand4, { backgroundColor: isLamp ? 'rgba(0,0,0,0.06)' : 'rgba(38,25,14,0.04)' }]} />
      </Animated.View>
    </Animated.View>
  );
});

type ReaderPageCellProps = {
  item: ReaderPage;
  index: number;
  scrollX: SharedValue<number>;
  themeProgress: SharedValue<number>;
  mode: ReaderMode;
  pageWidth: number;
  pageHeight: number;
  topInset: number;
  bottomInset: number;
  fontSize: number;
  lineHeight: number;
  sourceLanguage: string;
  targetLanguage: string;
  highlightMap: Map<string, { colorKey: HighlightColorKey; quoteText: string | null }>;
  highlightColors: Record<HighlightColorKey, string>;
  savedWordSet: Set<string>;
  savedWordColor: string;
  savedWordTextColor: string;
  activeWordRange: { paragraphIndex: number; start: number; end: number } | null;
  selectionRange: {
    startParagraph: number;
    startOffset: number;
    endParagraph: number;
    endOffset: number;
    showStartHandle?: boolean;
    showEndHandle?: boolean;
  } | null;
  translatedParagraphs: string[] | null;
  bilingualParagraphs: Array<{
    paragraphIndex: number;
    sentences: Array<{ id: string; original: string; translated: string }>;
  }> | null;
  onWordLongPress: (payload: {
    word: string;
    paragraphIndex: number;
    page: ReaderPage;
    start: number;
    end: number;
    pageX: number;
    pageY: number;
  }) => void;
  onBilingualWordLongPress?: (payload: {
    word: string;
    contextSentence: string;
    paragraphIndex: number;
    anchor: { x: number; y: number };
  }) => void;
  onRangeEdgeDragStart?: (edge: 'start' | 'end') => void;
  onRangeEdgeDrag: (
    edge: 'start' | 'end',
    pos: { paragraphIndex: number; offset: number },
    direction?: 'prev-page' | 'next-page' | null,
  ) => void;
  onRangeEdgeDragEnd?: (edge: 'start' | 'end') => void;
  onCloseTranslation: () => void;
};

function areReaderPageCellPropsEqual(prev: ReaderPageCellProps, next: ReaderPageCellProps): boolean {
  if (prev.item.globalIndex !== next.item.globalIndex) return false;
  if (prev.pageWidth !== next.pageWidth || prev.pageHeight !== next.pageHeight) return false;
  if (prev.mode !== next.mode) return false;
  if (prev.fontSize !== next.fontSize || prev.lineHeight !== next.lineHeight) return false;
  if (prev.topInset !== next.topInset || prev.bottomInset !== next.bottomInset) return false;
  if (prev.sourceLanguage !== next.sourceLanguage || prev.targetLanguage !== next.targetLanguage) return false;

  if (prev.activeWordRange !== next.activeWordRange) {
    if (!prev.activeWordRange || !next.activeWordRange) return false;
    if (
      prev.activeWordRange.paragraphIndex !== next.activeWordRange.paragraphIndex ||
      prev.activeWordRange.start !== next.activeWordRange.start ||
      prev.activeWordRange.end !== next.activeWordRange.end
    ) {
      return false;
    }
  }

  if (prev.selectionRange !== next.selectionRange) {
    if (!prev.selectionRange || !next.selectionRange) return false;
    if (
      prev.selectionRange.startParagraph !== next.selectionRange.startParagraph ||
      prev.selectionRange.startOffset !== next.selectionRange.startOffset ||
      prev.selectionRange.endParagraph !== next.selectionRange.endParagraph ||
      prev.selectionRange.endOffset !== next.selectionRange.endOffset
    ) {
      return false;
    }
  }

  if (prev.translatedParagraphs !== next.translatedParagraphs) return false;
  if (prev.bilingualParagraphs !== next.bilingualParagraphs) return false;
  if (prev.savedWordSet !== next.savedWordSet) return false;
  if (prev.highlightMap !== next.highlightMap) return false;

  return true;
}

const ReaderPageCell = memo(function ReaderPageCell({
  item,
  index,
  scrollX,
  themeProgress,
  mode,
  pageWidth,
  pageHeight,
  topInset,
  bottomInset,
  fontSize,
  lineHeight,
  sourceLanguage,
  targetLanguage,
  highlightMap,
  highlightColors,
  savedWordSet,
  savedWordColor,
  savedWordTextColor,
  activeWordRange,
  selectionRange,
  translatedParagraphs,
  bilingualParagraphs,
  onWordLongPress,
  onBilingualWordLongPress,
  onRangeEdgeDragStart,
  onRangeEdgeDrag,
  onRangeEdgeDragEnd,
  onCloseTranslation,
}: ReaderPageCellProps) {
  return (
    <ReaderPageFrame
      pageIndex={index}
      scrollX={scrollX}
      themeProgress={themeProgress}
      mode={mode}
      pageWidth={pageWidth}
      pageHeight={pageHeight}
    >
      <View style={styles.pageTouchable}>
        <ReaderPageView
          page={item}
          mode={mode}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          dayTextColor={READING_TEXT_LIGHT}
          lampTextColor={READING_TEXT_DARK}
          themeProgress={themeProgress}
          topInset={topInset}
          bottomInset={bottomInset}
          fontSize={fontSize}
          lineHeight={lineHeight}
          highlightMap={highlightMap}
          highlightColors={highlightColors}
          savedWordSet={savedWordSet}
          savedWordColor={savedWordColor}
          savedWordTextColor={savedWordTextColor}
          activeWordRange={activeWordRange}
          activeWordColor={highlightColors.amber}
          activeWordTextColor="#2B2621"
          selectionRange={selectionRange}
          selectionColor={highlightColors.amber}
          onWordLongPress={onWordLongPress}
          onBilingualWordLongPress={onBilingualWordLongPress}
          onRangeEdgeDragStart={onRangeEdgeDragStart}
          onRangeEdgeDrag={onRangeEdgeDrag}
          onRangeEdgeDragEnd={onRangeEdgeDragEnd}
          translatedParagraphs={translatedParagraphs}
          bilingualParagraphs={bilingualParagraphs}
          onCloseTranslation={onCloseTranslation}
          onPagePress={undefined}
        />
      </View>
    </ReaderPageFrame>
  );
}, areReaderPageCellPropsEqual);

// The exact selected substring across a word-aligned range spanning one or more
// pages, joining paragraphs in reading order — used both for the saved quote
// text and the live word count.
function selectedText(
  pages: ReaderPage[],
  selection: {
    startPageGlobalIndex: number;
    startParagraph: number;
    startOffset: number;
    endPageGlobalIndex: number;
    endParagraph: number;
    endOffset: number;
  },
): string {
  const parts: string[] = [];
  const startPage = Math.min(selection.startPageGlobalIndex, selection.endPageGlobalIndex);
  const endPage = Math.max(selection.startPageGlobalIndex, selection.endPageGlobalIndex);
  for (let pageIdx = startPage; pageIdx <= endPage; pageIdx += 1) {
    const page = pages[pageIdx];
    if (!page) continue;
    const isStartPage = pageIdx === startPage;
    const isEndPage = pageIdx === endPage;
    const startPara = isStartPage ? selection.startParagraph : 0;
    const endPara = isEndPage ? selection.endParagraph : Math.max(0, page.paragraphs.length - 1);

    for (let p = startPara; p <= endPara; p += 1) {
      const paragraph = page.paragraphs[p] ?? '';
      const s = isStartPage && p === startPara ? selection.startOffset : 0;
      const e = isEndPage && p === endPara ? selection.endOffset : paragraph.length;
      const text = paragraph.slice(s, e).trim();
      if (text) parts.push(text);
    }
  }
  return parts.filter(Boolean).join(' ');
}

export default function ReaderScreen() {
  // jumpChapter/jumpPage are optional — set when arriving from Vocabulary
  // (tapping a saved word) to open directly on that word's page.
  const { bookId: rawBookId, jumpChapter, jumpPage, bookTitle, bookCoverUrl } = useLocalSearchParams<{
    bookId: string;
    jumpChapter?: string;
    jumpPage?: string;
    bookTitle?: string;
    bookCoverUrl?: string;
  }>();
  const bookId = useMemo(() => {
    if (!rawBookId) return '';
    try {
      return decodeURIComponent(rawBookId);
    } catch {
      return rawBookId;
    }
  }, [rawBookId]);
  const { colors, typography, spacing, radius } = useTheme();
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
    | { status: 'unavailable'; message?: string }
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

  const chromeMenuOpenRef = useRef(false);
  const chromeMenuProgress = useSharedValue(0);
  const closeChromeMenuRef = useRef<(action?: () => void) => void>(() => {});

  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeVisibleRef = useRef(true);
  const chromeOpacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const windowDims = useWindowDimensions();
  const [containerDimensions, setContainerDimensions] = useState(() => {
    const screenDims = Dimensions.get('screen');
    const window = Dimensions.get('window');
    return {
      width: window.width || screenDims.width,
      height: Math.max(screenDims.height, window.height),
    };
  });

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerDimensions((prev) => {
        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
          return prev;
        }
        return { width, height };
      });
    }
  }, []);

  useEffect(() => {
    const screenDims = Dimensions.get('screen');
    const bestHeight = Math.max(screenDims.height, windowDims.height);
    setContainerDimensions((prev) => {
      if (Math.abs(prev.width - windowDims.width) < 1 && prev.height >= bestHeight) {
        return prev;
      }
      return {
        width: windowDims.width,
        height: Math.max(prev.height, bestHeight),
      };
    });
  }, [windowDims.width, windowDims.height]);

  const pageWidth = containerDimensions.width;
  const pageHeight = containerDimensions.height;
  const pageWidthRef = useRef(pageWidth);
  pageWidthRef.current = pageWidth;

  // Real-time horizontal scroll tracking for velocity-sensitive page turn physics.
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });
  const [ambienceOpen, setAmbienceOpen] = useState(false);
  // Whole-page translation, keyed to the page it belongs to (so swiping away
  // from a translated page doesn't carry its translated text onto the next
  // one). 'capped' surfaces the same daily-limit message the word-tap popup
  // shows, just as a small inline card instead of another screen.
  const [translation, setTranslation] = useState<{
    pageGlobalIndex: number;
    status: 'loading' | 'ready' | 'capped' | 'error';
    paragraphs?: string[];
    bilingualParagraphs?: Array<{
      paragraphIndex: number;
      sentences: Array<{
        id: string;
        original: string;
        translated: string;
      }>;
    }>;
  } | null>(null);

  // Reading ambience: plays the chosen loop while this screen is mounted and
  // stops automatically when leaving the book (expo-audio releases on unmount).
  useAmbiencePlayer();
  const ambienceTrackId = useAmbienceTrackId();

  // Soft page-turn sound. Stored in a ref so the stable onViewableItemsChanged
  // callback (built once via useRef) can reach the latest play fn — same reason
  // book/pages are mirrored into refs below.
  const { play: playPageTurn, stop: stopPageTurn } = usePageTurnSound();
  const playPageTurnRef = useRef(playPageTurn);
  playPageTurnRef.current = playPageTurn;
  // Null until the first page settles, so opening a book (or jumping to a saved
  // page) never fires the sound — only an actual turn does.
  const lastPageIndexRef = useRef<number | null>(null);
  const lastSettledPageIndexRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const pendingTurnSoundRef = useRef(false);
  const swipeSettledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressViewableSoundIndexRef = useRef<number | null>(null);

  // Hold a word -> action menu (Translate / Save as quote). `wordMenu` is the
  // held word while the menu is open; picking Translate promotes it to
  // `activeWord` (the translation popup), picking Save-as-quote opens `selection`
  // (the two-handle sentence picker). The held/active word is highlighted in the
  // text throughout so the reader sees exactly which word they're acting on.
  const [wordMenu, setWordMenu] = useState<{
    word: string;
    paragraphIndex: number;
    page: ReaderPage;
    start: number;
    end: number;
    anchor: { x: number; y: number };
  } | null>(null);
  const [activeWord, setActiveWord] = useState<{
    word: string;
    paragraphIndex: number;
    pageGlobalIndex: number;
    start: number;
    end: number;
    anchor: { x: number; y: number };
    contextSentence?: string;
  } | null>(null);
  // Selection is a word-aligned char range across one or more pages' paragraphs,
  // always normalized so start <= end. It begins as the single held word and is
  // adjusted at word granularity from either end via the two drag handles.
  const [selection, setSelection] = useState<{
    startPageGlobalIndex: number;
    startParagraph: number;
    startOffset: number;
    endPageGlobalIndex: number;
    endParagraph: number;
    endOffset: number;
  } | null>(null);

  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const guideOpenRef = useRef(false);
  const [pageStyleVisible, setPageStyleVisible] = useState(false);
  const guideDismissedRef = useRef(false);
  const readerHintDismissedRef = useRef(false);

  // Smart first-run reader gesture hints (forward and turn-back cues)
  const [hintVisible, setHintVisible] = useState(false);
  const [hintType, setHintType] = useState<'forward' | 'backward'>('forward');
  const hintOpacity = useSharedValue(0);
  const hintTranslateY = useSharedValue(16);
  const swipeArrowX = useSharedValue(0);
  const readerBackHintDismissedRef = useRef(false);
  const hasShownForwardHintRef = useRef(false);
  const hasShownBackHintRef = useRef(false);
  const backHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backHintScheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissHint = useCallback(() => {
    readerHintDismissedRef.current = true;
    hasShownForwardHintRef.current = true;
    void setSetting(READER_HINT_SETTING_KEY, '1');
    if (backHintScheduledTimerRef.current) {
      clearTimeout(backHintScheduledTimerRef.current);
      backHintScheduledTimerRef.current = null;
    }
    if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
    hintOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    hintTranslateY.value = withTiming(16, { duration: 220, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setHintVisible(false), 220);
  }, [hintOpacity, hintTranslateY]);

  const dismissBackHint = useCallback(() => {
    readerBackHintDismissedRef.current = true;
    hasShownBackHintRef.current = true;
    void setSetting(READER_BACK_HINT_SETTING_KEY, '1');
    if (backHintScheduledTimerRef.current) {
      clearTimeout(backHintScheduledTimerRef.current);
      backHintScheduledTimerRef.current = null;
    }
    if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
    hintOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    hintTranslateY.value = withTiming(16, { duration: 220, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setHintVisible(false), 220);
  }, [hintOpacity, hintTranslateY]);

  const triggerForwardHint = useCallback(() => {
    if (hasShownForwardHintRef.current || readerHintDismissedRef.current || guideOpenRef.current) return;
    hasShownForwardHintRef.current = true;
    setHintType('forward');
    setHintVisible(true);
    hintOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    hintTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    cancelAnimation(swipeArrowX);
    swipeArrowX.value = 0;
    swipeArrowX.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 550, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 550, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
    setTimeout(dismissHint, 6500);
  }, [hintOpacity, hintTranslateY, swipeArrowX, dismissHint]);

  const triggerBackHint = useCallback(() => {
    if (hasShownBackHintRef.current || readerBackHintDismissedRef.current || guideOpenRef.current) return;
    hasShownBackHintRef.current = true;
    readerBackHintDismissedRef.current = true;
    void setSetting(READER_BACK_HINT_SETTING_KEY, '1');
    setHintType('backward');
    setHintVisible(true);
    cancelAnimation(swipeArrowX);
    swipeArrowX.value = 0;
    swipeArrowX.value = withRepeat(
      withSequence(
        withTiming(7, { duration: 550, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 550, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
    hintOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    hintTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
    backHintTimerRef.current = setTimeout(dismissBackHint, 5500);
  }, [hintOpacity, hintTranslateY, swipeArrowX, dismissBackHint]);

  const openGuide = useCallback(() => {
    closeChromeMenuRef.current();
    guideOpenRef.current = true;
    setGuideModalVisible(true);
  }, []);

  const handleCloseGuide = useCallback(() => {
    guideDismissedRef.current = true;
    guideOpenRef.current = false;
    setGuideModalVisible(false);
    void setSetting(READER_GUIDE_SEEN_KEY, '1');
    setTimeout(() => {
      triggerForwardHint();
    }, 400);
  }, [triggerForwardHint]);

  // Automatically show the Reader Guide modal once on first open of any book
  useEffect(() => {
    if (guideDismissedRef.current || initialIndex == null) return;
    void (async () => {
      const seen = await getSetting(READER_GUIDE_SEEN_KEY);
      if (guideDismissedRef.current) return;
      const shouldShow = (__DEV__ && ALWAYS_SHOW_READER_GUIDE_IN_DEV) || seen !== '1';
      if (!shouldShow) {
        guideDismissedRef.current = true;
      } else {
        openGuide();
      }
    })();
  }, [initialIndex, openGuide]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getSetting(READER_HINT_SETTING_KEY),
      getSetting(READER_BACK_HINT_SETTING_KEY),
    ]).then(([seenForward, seenBack]) => {
      if (cancelled) return;
      if (!(__DEV__ && ALWAYS_SHOW_READER_GUIDE_IN_DEV)) {
        if (seenForward === '1') {
          readerHintDismissedRef.current = true;
        }
        if (seenBack === '1') {
          readerBackHintDismissedRef.current = true;
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (readerHintDismissedRef.current || !book || pages.length === 0 || initialIndex == null) {
      return;
    }

    const showTimer = setTimeout(() => {
      triggerForwardHint();
    }, 1000);

    return () => {
      clearTimeout(showTimer);
    };
  }, [book, pages.length, initialIndex, triggerForwardHint]);

  // Trigger sync on reader exit for immediate position update
  useEffect(() => {
    return () => {
      void triggerSync();
    };
  }, []);

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateY: hintTranslateY.value }],
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeArrowX.value }],
  }));

  const isBangla =
    book?.source === 'bangla_api' ||
    book?.sourceLanguage === 'bn' ||
    (typeof bookId === 'string' && bookId.startsWith('bn-')) ||
    (typeof rawBookId === 'string' && rawBookId.startsWith('bn-'));
  const isJapanese =
    book?.source === 'aozora_bunko' ||
    book?.sourceLanguage === 'ja' ||
    (typeof bookId === 'string' && bookId.startsWith('ja-')) ||
    (typeof rawBookId === 'string' && rawBookId.startsWith('ja-'));
  const isKorean =
    book?.source === 'gongu_korea' ||
    book?.sourceLanguage === 'ko' ||
    (typeof bookId === 'string' && bookId.startsWith('ko-')) ||
    (typeof rawBookId === 'string' && rawBookId.startsWith('ko-'));
  const sourceLanguage = isBangla
    ? 'bn'
    : isJapanese
      ? 'ja'
      : isKorean
        ? 'ko'
        : (book?.sourceLanguage ?? 'en');
  const pageStyleId = usePageStyle();
  const pageStyleConfig = getPageStyleConfig(pageStyleId);
  const readingFontSizePx = isBangla
    ? pageStyleConfig.banglaFontSize
    : isJapanese || isKorean
    ? getReadingFontSize(sourceLanguage)
    : pageStyleConfig.fontSize;
  const readingLineHeight = isBangla
    ? pageStyleConfig.banglaLineHeight
    : isJapanese || isKorean
    ? getReadingLineHeight(sourceLanguage)
    : pageStyleConfig.lineHeight;
  const targetLanguage = useTargetLanguage();

  const sharedTheme = useReadingTheme();
  const [mode, setMode] = useState<ReaderMode>(() => (sharedTheme === 'lamp' ? 'lamp' : 'day'));

  const isLamp = mode === 'lamp';
  const textColor = isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT;

  // Saved-word marker, themed oppositely per mode (matches the Figma amber
  // highlight): Day = dark ink on an amber wash (a highlighter); Lamp = amber
  // ink on the dark page (inverted figure/ground for contrast).
  const savedWordColor = isLamp ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.35)';
  const savedWordTextColor = isLamp ? '#F5A623' : '#2B2621';

  // One UI-thread clock drives the root, every visible paper layer, chrome,
  // and text. Keeping the material transition independent from React renders
  // prevents the staged blank-page -> text -> paper repaint on Android.
  const bgProgress = useSharedValue(isLamp ? 1 : 0);
  const animatedThemeRef = useRef<ReaderMode>(mode);

  // Keep in sync if the theme is changed externally (e.g. from Settings).
  useEffect(() => {
    const next = sharedTheme === 'lamp' ? 'lamp' : 'day';
    if (animatedThemeRef.current === next) return;
    animatedThemeRef.current = next;
    setMode(next);
    cancelAnimation(bgProgress);
    bgProgress.set(withTiming(next === 'lamp' ? 1 : 0, {
      duration: READER_THEME_DURATION_MS,
      easing: READER_THEME_EASING,
      reduceMotion: ReduceMotion.System,
    }));
  }, [sharedTheme, bgProgress]);
  const darkBgStyle = useAnimatedStyle(() => ({ opacity: bgProgress.value }));

  const dayChromeFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - bgProgress.value,
  }));
  const nightChromeFadeStyle = useAnimatedStyle(() => ({
    opacity: bgProgress.value,
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ['#E7DBC7', '#2A2723'],
    ),
    borderColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      ['rgba(43,38,33,0.22)', 'rgba(240,230,214,0.30)'],
    ),
  }));

  const animatedTopBarTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      bgProgress.value,
      [0, 1],
      [READING_TEXT_LIGHT, READING_TEXT_DARK],
    ),
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let [bookRow, position, bookHighlights, words] = await Promise.all([
        getBook(bookId),
        getReadingPosition(bookId),
        listHighlightsForBook(bookId),
        listSavedWordsForBook(bookId),
      ]);
      if (cancelled) return;

      if (!bookRow && rawBookId && rawBookId !== bookId) {
        bookRow = await getBook(rawBookId);
      }
      if (!position && rawBookId && rawBookId !== bookId) {
        position = await getReadingPosition(rawBookId);
      }

      const isBangla =
        bookRow?.source === 'bangla_api' ||
        bookRow?.id.startsWith('bn-') ||
        (typeof bookId === 'string' && bookId.startsWith('bn-')) ||
        (typeof rawBookId === 'string' && rawBookId.startsWith('bn-'));

      const isJapanese =
        bookRow?.source === 'aozora_bunko' ||
        bookRow?.id.startsWith('ja-') ||
        (typeof bookId === 'string' && bookId.startsWith('ja-')) ||
        (typeof rawBookId === 'string' && rawBookId.startsWith('ja-'));

      const isKorean =
        bookRow?.source === 'gongu_korea' ||
        bookRow?.id.startsWith('ko-') ||
        (typeof bookId === 'string' && bookId.startsWith('ko-')) ||
        (typeof rawBookId === 'string' && rawBookId.startsWith('ko-'));

      const isRegional = isBangla || isJapanese || isKorean;

      if (!bookRow && isBangla) {
        const titleFromSlug = bookId.replace(/^bn-/, '').replace(/-/g, ' ');
        bookRow = {
          id: bookId,
          title: titleFromSlug || 'বাংলা গ্রন্থ',
          author: '',
          sourceLanguage: 'bn',
          synopsis: '',
          coverUrl: null,
          textUrl: '',
          gutenbergId: null,
          chapter1Anchor: null,
          categories: [],
          totalChapters: 0,
          source: 'bangla_api',
          isAvailable: true,
        };
      } else if (!bookRow && isJapanese) {
        const { fetchJapaneseBookDetail } = await import('@/features/content-ingestion/japaneseApi');
        const jaDetail = await fetchJapaneseBookDetail(bookId);
        bookRow = {
          id: bookId,
          title: jaDetail.title,
          author: jaDetail.author,
          sourceLanguage: 'ja',
          synopsis: jaDetail.synopsis,
          coverUrl: jaDetail.coverUrl,
          textUrl: '',
          gutenbergId: null,
          chapter1Anchor: null,
          categories: [jaDetail.genre],
          totalChapters: jaDetail.totalChapters,
          source: 'aozora_bunko',
          isAvailable: true,
        };
      } else if (!bookRow && isKorean) {
        const { fetchKoreanBookDetail } = await import('@/features/content-ingestion/koreanApi');
        const koDetail = await fetchKoreanBookDetail(bookId);
        bookRow = {
          id: bookId,
          title: koDetail.title,
          author: koDetail.author,
          sourceLanguage: 'ko',
          synopsis: koDetail.synopsis,
          coverUrl: koDetail.coverUrl,
          textUrl: '',
          gutenbergId: null,
          chapter1Anchor: null,
          categories: [koDetail.genre],
          totalChapters: koDetail.totalChapters,
          source: 'gongu_korea',
          isAvailable: true,
        };
      }

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

      if (!bookRow && !isRegional) {
        setBookTextState({ status: 'unavailable' });
        return;
      }

      if (bookRow && !bookRow.textUrl && !isBookCached(bookRow.id) && !isRegional) {
        setBookTextState({ status: 'unavailable' });
        return;
      }

      try {
        const ingested = await getBookText(
          bookRow?.id ?? bookId,
          bookRow?.title ?? 'বাংলা গ্রন্থ',
          bookRow?.textUrl,
          bookRow?.chapter1Anchor ?? undefined,
        );
        if (cancelled) return;
        if (!ingested.chapters || ingested.chapters.length === 0) {
          setBookTextState({
            status: 'unavailable',
            message: isBangla ? 'বইটিতে পড়ার মতো কোনো বিষয়বস্তু নেই।' : `${bookRow?.title ?? 'This book'} has no readable content.`,
          });
          return;
        }
        setBookTextState({ status: 'ready', book: ingested });
        const freshRow = (await getBook(bookId)) ?? (rawBookId ? await getBook(rawBookId) : null);
        if (freshRow && !cancelled) {
          setBook(freshRow);
        }
        // Bulk-imported books sync with an unknown (0) chapter count — now
        // that it's actually been parsed, fill in the real number locally.
        if (bookRow && bookRow.totalChapters === 0 && ingested.chapters.length > 0) {
          updateBookTotalChapters(bookRow.id, ingested.chapters.length);
        }
      } catch (err) {
        if (cancelled) return;
        // A format error (README stub / not a Gutenberg text) is permanent —
        // show "unavailable", not a retryable "download failed".
        if (err instanceof BookFormatError) {
          setBookTextState({ status: 'unavailable', message: err.message });
        } else {
          setBookTextState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Download failed',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, rawBookId, jumpChapter, jumpPage]);

  // Text column metrics — how much room a page's body copy actually has, from
  // the real screen size + safe areas + current font settings. Pagination is
  // recomputed against these so pages fit the screen and reflow when the font
  // changes.
  const contentWidthPx = pageWidth - Spacing.xl * 2;
  const contentHeightPx = pageHeight - (insets.top + 64) - (insets.bottom + 18);
  const chapterTitleExtraPx = Spacing.sm + LamplightTypography.screenTitle.lineHeight + Spacing.md;

  // Baseline characters-per-line, computed synchronously from geometry and font size
  // so pagination begins immediately without blocking on asynchronous onTextLayout.
  const baselineCharsPerLine = useMemo(
    () => Math.max(8, Math.floor(contentWidthPx / (readingFontSizePx * (isBangla ? 0.6 : 0.54)))),
    [contentWidthPx, readingFontSizePx, isBangla],
  );
  const [measuredCharsPerLine, setMeasuredCharsPerLine] = useState<number>(baselineCharsPerLine);
  useEffect(() => {
    // Reset to baseline when font metrics change, ensuring pagination never blocks.
    setMeasuredCharsPerLine(baselineCharsPerLine);
  }, [baselineCharsPerLine, readingLineHeight, pageStyleId]);

  // (Re)paginate whenever the book, the text metrics, or the measurement change.
  // Deferred off the interaction frame so opening a book (or nudging the font
  // slider) never drops frames while a whole novel is re-flowed.
  useEffect(() => {
    if (bookTextState.status !== 'ready') return;
    const bookText = bookTextState.book;
    let cancelled = false;
    if (pages.length === 0) {
      const paginated = paginateBook(bookText, {
        contentWidthPx,
        contentHeightPx,
        fontSizePx: readingFontSizePx,
        lineHeightPx: readingLineHeight,
        paragraphGapPx: Spacing.sm,
        chapterTitleExtraPx,
        measuredCharsPerLine,
      });
      setPages(paginated);
      return;
    }

    const schedule = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 50);
    const cancel = typeof cancelIdleCallback === 'function'
      ? cancelIdleCallback
      : clearTimeout;

    const taskId = schedule(() => {
      if (cancelled) return;
      const paginated = paginateBook(bookText, {
        contentWidthPx,
        contentHeightPx,
        fontSizePx: readingFontSizePx,
        lineHeightPx: readingLineHeight,
        paragraphGapPx: Spacing.sm,
        chapterTitleExtraPx,
        measuredCharsPerLine,
      });
      setPages(paginated);
    });
    return () => {
      cancelled = true;
      cancel(taskId as any);
    };
  }, [
    bookTextState,
    readingFontSizePx,
    readingLineHeight,
    contentWidthPx,
    contentHeightPx,
    chapterTitleExtraPx,
    measuredCharsPerLine,
  ]);

  // Resolve the initial scroll index once, after the first pagination lands.
  useEffect(() => {
    if (initialIndex != null || pages.length === 0 || !startPosition) return;
    const idx = findGlobalIndex(pages, startPosition.chapterIndex, startPosition.pageIndex);
    setInitialIndex(idx);
    setCurrentIndex(idx);
    scrollX.value = idx * pageWidth;
  }, [pages, startPosition, initialIndex, scrollX, pageWidth]);

  // Track active reading session for streaks, reading time, and habits
  useEffect(() => {
    if (!book?.id) return;
    startReadingSession(book.id, startPosition?.chapterIndex ?? 0);
    return () => {
      endReadingSession();
    };
  }, [book?.id]);

  // Lowercased set of saved words for this book — matched in the reader text so
  // already-looked-up words get an amber marker. Reference-stable via useMemo
  // so memoized pages don't re-render unless the set actually changes.
  const savedWordSet = useMemo(
    () => new Set(savedWords.map((w) => w.sourceWord.toLowerCase())),
    [savedWords],
  );

  const CHROME_MENU_DURATION_MS = 180;

  const hideChrome = useCallback(() => {}, []);

  const scheduleAutoHide = useCallback(() => {}, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const toggleChrome = useCallback(() => {}, []);

  const closeChromeMenu = useCallback((action?: () => void) => {
    chromeMenuOpenRef.current = false;
    cancelAnimation(chromeMenuProgress);
    chromeMenuProgress.value = withTiming(
      0,
      {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished && action) {
          runOnJS(action)();
        }
      },
    );
  }, [chromeMenuProgress]);
  closeChromeMenuRef.current = closeChromeMenu;

  const openChromeMenu = useCallback(() => {
    chromeMenuOpenRef.current = true;
    cancelAnimation(chromeMenuProgress);
    chromeMenuProgress.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [chromeMenuProgress]);

  const toggleChromeMenu = useCallback(() => {
    if (chromeMenuOpenRef.current) {
      closeChromeMenu();
    } else {
      openChromeMenu();
    }
  }, [closeChromeMenu, openChromeMenu]);

  const triggerSettledSound = useCallback(() => {
    if (swipeSettledTimerRef.current) {
      clearTimeout(swipeSettledTimerRef.current);
      swipeSettledTimerRef.current = null;
    }
    isSwipingRef.current = false;
    if (pendingTurnSoundRef.current) {
      pendingTurnSoundRef.current = false;
      if (lastPageIndexRef.current !== lastSettledPageIndexRef.current) {
        playPageTurnRef.current();
        lastSettledPageIndexRef.current = lastPageIndexRef.current;
      }
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    isSwipingRef.current = true;
    pendingTurnSoundRef.current = false;
    if (swipeSettledTimerRef.current) {
      clearTimeout(swipeSettledTimerRef.current);
      swipeSettledTimerRef.current = null;
    }
    if (backHintScheduledTimerRef.current) {
      clearTimeout(backHintScheduledTimerRef.current);
      backHintScheduledTimerRef.current = null;
    }
    dismissHint();
    dismissBackHint();
    if (chromeMenuOpenRef.current) {
      closeChromeMenuRef.current();
    }
  }, [dismissHint, dismissBackHint]);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vx = event.nativeEvent.velocity?.x ?? 0;
      if (Math.abs(vx) < 0.1) {
        if (swipeSettledTimerRef.current) {
          clearTimeout(swipeSettledTimerRef.current);
        }
        swipeSettledTimerRef.current = setTimeout(() => {
          triggerSettledSound();
        }, 50);
      }
    },
    [triggerSettledSound],
  );

  const handleMomentumScrollEnd = useCallback(() => {
    triggerSettledSound();
  }, [triggerSettledSound]);

  const commitReaderTheme = useCallback((nextTheme: ReaderMode) => {
    setMode(nextTheme);
    setReadingTheme(nextTheme);
  }, []);

  const toggleReadingTheme = useCallback(() => {
    scheduleAutoHide();
    const nextTheme: ReaderMode = animatedThemeRef.current === 'lamp' ? 'day' : 'lamp';
    animatedThemeRef.current = nextTheme;

    cancelAnimation(bgProgress);
    bgProgress.set(withTiming(
      nextTheme === 'lamp' ? 1 : 0,
      {
        duration: READER_THEME_DURATION_MS,
        easing: READER_THEME_EASING,
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) {
          runOnJS(commitReaderTheme)(nextTheme);
        }
      },
    ));
  }, [bgProgress, commitReaderTheme, scheduleAutoHide]);

  const chromeStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  const chromeMenuLayerAnimStyle = useAnimatedStyle(() => {
    const progress = chromeMenuProgress.value;
    return {
      opacity: progress,
      display: progress <= 0.001 ? 'none' : 'flex',
    };
  });

  const chromeMenuPanelStyle = useAnimatedStyle(() => {
    const progress = chromeMenuProgress.value;
    return {
      opacity: progress,
      elevation: interpolate(progress, [0, 0.05, 1], [0, 0, 8]),
      transform: [
        { translateY: interpolate(progress, [0, 1], [-12, 0]) },
        { scale: interpolate(progress, [0, 1], [0.94, 1]) },
      ],
    };
  });

  const hamburgerIconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chromeMenuProgress.value * 90}deg` }],
  }));

  // FlatList requires onViewableItemsChanged to keep the same identity across
  // renders (it warns/throws if it changes), so the callback itself must be
  // built once via useRef — but that means it can never close over `book`/
  // `pages` directly: only the very first render's values would ever be
  // seen (both null/[] at mount), so upsertReadingPosition below would
  // silently never fire. These two refs are updated every render instead, so
  // the stable callback always reads the current values.
  const bookRef = useRef(book);
  bookRef.current = book;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const dismissHintRef = useRef(dismissHint);
  dismissHintRef.current = dismissHint;
  const dismissBackHintRef = useRef(dismissBackHint);
  dismissBackHintRef.current = dismissBackHint;
  const triggerBackHintRef = useRef(triggerBackHint);
  triggerBackHintRef.current = triggerBackHint;

  const triggerSettledSoundRef = useRef(triggerSettledSound);
  triggerSettledSoundRef.current = triggerSettledSound;

  const savePositionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositionRef = useRef<Omit<ReadingPosition, 'updatedAt'> | null>(null);

  const flushReadingPosition = useCallback(() => {
    if (savePositionTimerRef.current) {
      clearTimeout(savePositionTimerRef.current);
      savePositionTimerRef.current = null;
    }
    if (pendingPositionRef.current) {
      const pos = pendingPositionRef.current;
      pendingPositionRef.current = null;
      void upsertReadingPosition(pos);
    }
  }, []);

  const flushReadingPositionRef = useRef(flushReadingPosition);
  flushReadingPositionRef.current = flushReadingPosition;

  useEffect(() => {
    return () => {
      if (swipeSettledTimerRef.current) {
        clearTimeout(swipeSettledTimerRef.current);
        swipeSettledTimerRef.current = null;
      }
      if (savePositionTimerRef.current) {
        clearTimeout(savePositionTimerRef.current);
        savePositionTimerRef.current = null;
      }
      if (pendingPositionRef.current) {
        const pos = pendingPositionRef.current;
        pendingPositionRef.current = null;
        void upsertReadingPosition(pos);
      }
    };
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      const page = first.item as ReaderPage;

      if (lastPageIndexRef.current == null) {
        lastPageIndexRef.current = first.index;
        lastSettledPageIndexRef.current = first.index;
        setCurrentIndex(first.index);
        return;
      }

      if (first.index !== lastPageIndexRef.current) {
        if (suppressViewableSoundIndexRef.current === first.index) {
          suppressViewableSoundIndexRef.current = null;
        } else if (isSwipingRef.current) {
          void hapticPageTurn();
          pendingTurnSoundRef.current = true;
          if (swipeSettledTimerRef.current) {
            clearTimeout(swipeSettledTimerRef.current);
          }
          swipeSettledTimerRef.current = setTimeout(() => {
            triggerSettledSoundRef.current();
          }, 140);
        } else {
          playPageTurnRef.current();
          lastSettledPageIndexRef.current = first.index;
        }

        dismissHintRef.current();
        if (backHintScheduledTimerRef.current) {
          clearTimeout(backHintScheduledTimerRef.current);
          backHintScheduledTimerRef.current = null;
        }
        if (first.index > 0 && !hasShownBackHintRef.current && !readerBackHintDismissedRef.current) {
          backHintScheduledTimerRef.current = setTimeout(() => {
            triggerBackHintRef.current();
          }, 600);
        } else if (first.index === 0) {
          dismissBackHintRef.current();
        }
      }
      lastPageIndexRef.current = first.index;
      setCurrentIndex(first.index);
      const currentBook = bookRef.current;
      const currentPages = pagesRef.current;
      if (currentBook) {
        recordPageTurn(currentBook.id, first.index);
        pendingPositionRef.current = {
          bookId: currentBook.id,
          chapterIndex: page.chapterIndex,
          pageIndex: page.pageIndexInChapter,
          percentComplete: currentPages.length > 1 ? first.index / (currentPages.length - 1) : 1,
        };
        if (savePositionTimerRef.current) {
          clearTimeout(savePositionTimerRef.current);
        }
        savePositionTimerRef.current = setTimeout(() => {
          flushReadingPositionRef.current();
        }, 400);
      }
    },
  ).current;

  const highlightMap = useMemo(() => {
    // Highlighting operates at paragraph granularity: start_offset/end_offset
    // hold the first/last selected paragraph index (a quote can span several).
    // For a single-paragraph highlight the saved quote_text is the exact
    // selected substring, so the page can mark just that run instead of
    // washing the whole paragraph; multi-paragraph spans keep the whole-
    // paragraph wash (the char offsets within outer paragraphs aren't stored).
    const map = new Map<string, { colorKey: HighlightColorKey; quoteText: string | null }>();
    for (const h of highlights) {
      const single = h.startOffset === h.endOffset;
      for (let p = h.startOffset; p <= h.endOffset; p += 1) {
        map.set(`${h.chapterIndex}-${h.pageIndex}-${p}`, {
          colorKey: h.colorKey,
          quoteText: single ? h.quoteText : null,
        });
      }
    }
    return map;
  }, [highlights]);

  const goToNextPage = useCallback(() => {
    dismissHint();
    dismissBackHint();
    if (currentIndex < pages.length - 1) {
      const nextIdx = currentIndex + 1;
      suppressViewableSoundIndexRef.current = nextIdx;
      lastSettledPageIndexRef.current = nextIdx;
      playPageTurnRef.current();
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    }
  }, [currentIndex, pages.length, dismissHint, dismissBackHint]);

  const goToPrevPage = useCallback(() => {
    dismissHint();
    dismissBackHint();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      suppressViewableSoundIndexRef.current = prevIdx;
      lastSettledPageIndexRef.current = prevIdx;
      playPageTurnRef.current();
      listRef.current?.scrollToIndex({ index: prevIdx, animated: true });
    }
  }, [currentIndex, dismissHint, dismissBackHint]);

  // Each ORIGINAL paragraph is translated independently (parallel requests) —
  // never the whole page joined into one blob — so the translated page keeps
  // the same paragraph breaks as the original: same layout, just different
  // words. Still counted as a single cap unit per page toggle-on regardless of
  // how many paragraphs that took. Toggling the same page off just clears it;
  // toggling on a different page always re-fetches (translation is per-page,
  // not cached across the session the way word lookups are).
  const currentPage = pages[currentIndex] ?? null;
  const toggleTranslation = useCallback(async () => {
    if (!currentPage) return;
    if (translation && translation.pageGlobalIndex === currentPage.globalIndex) {
      setTranslation(null);
      return;
    }
    const pageGlobalIndex = currentPage.globalIndex;
    setTranslation({ pageGlobalIndex, status: 'loading' });
    // Instantly fade away chrome icons so only the on-page spinner is active
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    chromeOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(hideChrome)();
    });

    const premium = isPremiumUser();
    const cap = await checkTranslationCap(premium);
    if (!cap.allowed) {
      setTranslation({ pageGlobalIndex, status: 'capped' });
      scheduleAutoHide();
      return;
    }
    try {
      const sentencesPerPara = currentPage.paragraphs.map((p, pIdx) => {
        const sList = splitSentences(p);
        return sList.map((s, sIdx) => ({
          pIdx,
          sIdx,
          id: `p${pIdx}_s${sIdx}`,
          sentence: s,
        }));
      });
      const allSentences = sentencesPerPara.flat();

      const translatedList = await batchTranslateSentences(
        allSentences.map((s) => s.sentence),
        sourceLanguage,
        targetLanguage,
      );

      let cursor = 0;
      const bilingualParagraphs = sentencesPerPara.map((paraSentences, pIdx) => {
        const sentences = paraSentences.map((item) => {
          const trans = translatedList[cursor] ?? '';
          cursor++;
          return {
            id: item.id,
            original: item.sentence,
            translated: trans,
          };
        });
        return {
          paragraphIndex: pIdx,
          sentences,
        };
      });

      const paragraphs = bilingualParagraphs.map((bp) =>
        bp.sentences.map((s) => s.translated).join(' ')
      );

      await recordTranslationUsage(premium);
      logEvent('translate_page', { target_lang: targetLanguage });
      setTranslation({
        pageGlobalIndex,
        status: 'ready',
        paragraphs,
        bilingualParagraphs,
      });
      scheduleAutoHide();
    } catch {
      setTranslation({ pageGlobalIndex, status: 'error' });
      scheduleAutoHide();
    }
  }, [currentPage, translation, targetLanguage, book, bookId, scheduleAutoHide, chromeOpacity, hideChrome]);

  const retryDownload = useCallback(async () => {
    const isBangla =
      book?.source === 'bangla_api' ||
      book?.id.startsWith('bn-') ||
      (typeof bookId === 'string' && bookId.startsWith('bn-'));
    if (!book && !isBangla) return;
    if (!isBangla && !book?.textUrl) return;
    setBookTextState({ status: 'loading' });
    try {
      const targetId = book?.id ?? bookId;
      const targetTitle = book?.title ?? 'বাংলা গ্রন্থ';
      const ingested = await getBookText(targetId, targetTitle, book?.textUrl, book?.chapter1Anchor ?? undefined);
      setBookTextState({ status: 'ready', book: ingested });
      if (book && book.totalChapters === 0 && ingested.chapters.length > 0) {
        updateBookTotalChapters(book.id, ingested.chapters.length);
      }
    } catch (err) {
      if (err instanceof BookFormatError) {
        setBookTextState({ status: 'unavailable', message: err.message });
      } else {
        setBookTextState({ status: 'error', message: err instanceof Error ? err.message : 'Download failed' });
      }
    }
  }, [book, bookId]);

  const handleWordLongPress = useCallback(
    (payload: {
      word: string;
      paragraphIndex: number;
      page: ReaderPage;
      start: number;
      end: number;
      pageX: number;
      pageY: number;
    }) => {
      setWordMenu({
        word: payload.word,
        paragraphIndex: payload.paragraphIndex,
        page: payload.page,
        start: payload.start,
        end: payload.end,
        anchor: { x: payload.pageX, y: payload.pageY },
      });
    },
    [],
  );

  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const turningPageRef = useRef(false);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const edgeTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDirectionRef = useRef<'prev-page' | 'next-page' | null>(null);
  const lastTurnTimeRef = useRef<number>(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const clearEdgeTurnTimer = useCallback(() => {
    if (edgeTurnTimerRef.current) {
      clearTimeout(edgeTurnTimerRef.current);
      edgeTurnTimerRef.current = null;
    }
    pendingDirectionRef.current = null;
  }, []);

  const handleRangeEdgeDragStart = useCallback(() => {
    setIsDraggingHandle(true);
  }, []);

  const handleRangeEdgeDragEnd = useCallback(() => {
    clearEdgeTurnTimer();
    setIsDraggingHandle(false);
  }, [clearEdgeTurnTimer]);

  useEffect(() => {
    return () => {
      clearEdgeTurnTimer();
    };
  }, [clearEdgeTurnTimer]);

  // Moves one edge of the selection to the word-boundary the handle reports,
  // keeping the OTHER edge fixed. Clamps so the dragged edge can't cross past
  // the fixed one across pages (the range never inverts) — native-style.
  const handleRangeEdgeDrag = useCallback(
    (
      pageGlobalIndex: number,
      edge: 'start' | 'end',
      pos: { paragraphIndex: number; offset: number },
      direction?: 'prev-page' | 'next-page' | null,
    ) => {
      if (turningPageRef.current) return;
      const currentSel = selectionRef.current;
      if (!currentSel) return;
      // Strict page ownership check: only the page currently holding that edge can move it!
      if (edge === 'start' && pageGlobalIndex !== currentSel.startPageGlobalIndex) return;
      if (edge === 'end' && pageGlobalIndex !== currentSel.endPageGlobalIndex) return;

      const atOrBefore = (
        pg1: number,
        p1: number,
        o1: number,
        pg2: number,
        p2: number,
        o2: number,
      ) => {
        if (pg1 < pg2) return true;
        if (pg1 > pg2) return false;
        if (p1 < p2) return true;
        if (p1 > p2) return false;
        return o1 <= o2;
      };

      setSelection((prev) => {
        if (!prev) return prev;
        if (edge === 'start') {
          return atOrBefore(pageGlobalIndex, pos.paragraphIndex, pos.offset, prev.endPageGlobalIndex, prev.endParagraph, prev.endOffset)
            ? { ...prev, startPageGlobalIndex: pageGlobalIndex, startParagraph: pos.paragraphIndex, startOffset: pos.offset }
            : { ...prev, startPageGlobalIndex: prev.endPageGlobalIndex, startParagraph: prev.endParagraph, startOffset: prev.endOffset };
        }
        return atOrBefore(prev.startPageGlobalIndex, prev.startParagraph, prev.startOffset, pageGlobalIndex, pos.paragraphIndex, pos.offset)
          ? { ...prev, endPageGlobalIndex: pageGlobalIndex, endParagraph: pos.paragraphIndex, endOffset: pos.offset }
          : { ...prev, endPageGlobalIndex: prev.startPageGlobalIndex, endParagraph: prev.startParagraph, endOffset: prev.startOffset };
      });

      if (!direction) {
        clearEdgeTurnTimer();
        return;
      }

      // If we are already timing a turn in this direction, keep the timer running
      if (edgeTurnTimerRef.current && pendingDirectionRef.current === direction) {
        return;
      }

      const now = Date.now();
      if (now - lastTurnTimeRef.current < 500) return;

      clearEdgeTurnTimer();
      pendingDirectionRef.current = direction;

      edgeTurnTimerRef.current = setTimeout(() => {
        edgeTurnTimerRef.current = null;
        pendingDirectionRef.current = null;
        lastTurnTimeRef.current = Date.now();
        turningPageRef.current = true;
        setTimeout(() => {
          turningPageRef.current = false;
        }, 500);

        const curIdx = currentIndexRef.current;
        const currentPages = pagesRef.current;
        const activeSel = selectionRef.current;
        if (!activeSel) return;

        if (direction === 'next-page' && edge === 'end') {
          if (curIdx < currentPages.length - 1) {
            const nextIdx = curIdx + 1;
            lastPageIndexRef.current = nextIdx;
            listRef.current?.scrollToOffset({ offset: nextIdx * pageWidthRef.current, animated: true });
            setCurrentIndex(nextIdx);
            playPageTurnRef.current();
            const nextPg = currentPages[nextIdx];
            const firstPara = nextPg?.paragraphs[0] ?? '';
            const match = firstPara.match(/^\s*\S+/);
            const initialEndOffset = match ? match[0].length : 0;
            setSelection((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                endPageGlobalIndex: nextIdx,
                endParagraph: 0,
                endOffset: initialEndOffset,
              };
            });
          }
        } else if (direction === 'prev-page' && edge === 'start') {
          if (curIdx > 0) {
            const prevIdx = curIdx - 1;
            lastPageIndexRef.current = prevIdx;
            listRef.current?.scrollToOffset({ offset: prevIdx * pageWidthRef.current, animated: true });
            setCurrentIndex(prevIdx);
            playPageTurnRef.current();
            const prevPg = currentPages[prevIdx];
            const lastParaIdx = Math.max(0, (prevPg?.paragraphs.length ?? 1) - 1);
            const lastPara = prevPg?.paragraphs[lastParaIdx] ?? '';
            const match = lastPara.match(/\S+\s*$/);
            const initialStartOffset = match ? lastPara.length - match[0].length : 0;
            setSelection((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                startPageGlobalIndex: prevIdx,
                startParagraph: lastParaIdx,
                startOffset: initialStartOffset,
              };
            });
          }
        } else if (direction === 'prev-page' && edge === 'end') {
          if (curIdx > activeSel.startPageGlobalIndex && curIdx > 0) {
            const prevIdx = curIdx - 1;
            lastPageIndexRef.current = prevIdx;
            listRef.current?.scrollToOffset({ offset: prevIdx * pageWidthRef.current, animated: true });
            setCurrentIndex(prevIdx);
            playPageTurnRef.current();
            const prevPg = currentPages[prevIdx];
            const lastParaIdx = Math.max(0, (prevPg?.paragraphs.length ?? 1) - 1);
            const lastPara = prevPg?.paragraphs[lastParaIdx] ?? '';
            setSelection((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                endPageGlobalIndex: prevIdx,
                endParagraph: lastParaIdx,
                endOffset: lastPara.length,
              };
            });
          }
        } else if (direction === 'next-page' && edge === 'start') {
          if (curIdx < activeSel.endPageGlobalIndex && curIdx < currentPages.length - 1) {
            const nextIdx = curIdx + 1;
            lastPageIndexRef.current = nextIdx;
            listRef.current?.scrollToOffset({ offset: nextIdx * pageWidthRef.current, animated: true });
            setCurrentIndex(nextIdx);
            playPageTurnRef.current();
            setSelection((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                startPageGlobalIndex: nextIdx,
                startParagraph: 0,
                startOffset: 0,
              };
            });
          }
        }
      }, 240);
    },
    [clearEdgeTurnTimer],
  );

  const handleSaveWord = useCallback(
    async (translation: string) => {
      if (!book || !activeWord) return;
      void hapticSaveWord();
      const page = pages[currentIndex];
      const paragraph = page.paragraphs[activeWord.paragraphIndex] ?? '';
      const created = await saveWord({
        bookId: book.id,
        sourceWord: activeWord.word,
        sourceLang: sourceLanguage,
        targetLang: targetLanguage,
        translation,
        // The sentence the word is in, not the whole paragraph — the card only
        // shows a few lines of this.
        contextSentence: activeWord.contextSentence || sentenceAtOffset(paragraph, activeWord.start),
        chapterIndex: page.chapterIndex,
        pageIndex: page.pageIndexInChapter,
        paragraphIndex: activeWord.paragraphIndex,
      });
      setSavedWords((prev) => [created, ...prev]); // reflect the amber marker immediately
      setActiveWord(null);
      logEvent('word_saved', { book_id: book.id, target_lang: targetLanguage });
    },
    [book, activeWord, pages, currentIndex, sourceLanguage, targetLanguage],
  );

  const handleSaveForLater = useCallback(async () => {
    if (!book || !activeWord) return;
    void hapticSaveWord();
    const page = pages[currentIndex];
    const paragraph = page ? (page.paragraphs[activeWord.paragraphIndex] ?? '') : '';
    await createPendingLookup({
      bookId: book.id,
      sourceWord: activeWord.word,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      contextSentence: activeWord.contextSentence || sentenceAtOffset(paragraph, activeWord.start),
      chapterIndex: page?.chapterIndex ?? 0,
      pageIndex: page?.pageIndexInChapter ?? 0,
      paragraphIndex: activeWord.paragraphIndex,
    });
    setActiveWord(null);
    logEvent('pending_lookup_created', { book_id: book.id, target_lang: targetLanguage });
  }, [book, activeWord, pages, currentIndex, sourceLanguage, targetLanguage]);

  // Save the current selection as a quote across all spanned pages.
  // Highlights are always the app's single amber accent — no color picker.
  const handleSaveQuote = useCallback(async () => {
    if (!book || !selection) return;
    void hapticSaveWord();
    setIsDraggingHandle(false);
    clearEdgeTurnTimer();
    const fullQuoteText = selectedText(pages, selection);
    const startPageIdx = Math.min(selection.startPageGlobalIndex, selection.endPageGlobalIndex);
    const endPageIdx = Math.max(selection.startPageGlobalIndex, selection.endPageGlobalIndex);
    const newHighlights: Highlight[] = [];
    let primaryHighlight: Highlight | null = null;

    for (let pageIdx = startPageIdx; pageIdx <= endPageIdx; pageIdx += 1) {
      const page = pages[pageIdx];
      if (!page) continue;
      const isStart = pageIdx === startPageIdx;
      const isEnd = pageIdx === endPageIdx;
      const startPara = isStart ? selection.startParagraph : 0;
      const endPara = isEnd ? selection.endParagraph : Math.max(0, page.paragraphs.length - 1);
      const pageQuoteText = isStart && isEnd ? fullQuoteText : (pageIdx === startPageIdx ? fullQuoteText : '');

      const created = await createHighlight({
        bookId: book.id,
        chapterIndex: page.chapterIndex,
        pageIndex: page.pageIndexInChapter,
        startOffset: startPara,
        endOffset: endPara,
        colorKey: 'amber',
        quoteText: pageQuoteText,
      });

      if (!primaryHighlight) {
        primaryHighlight = created;
      }
      newHighlights.push(created);
    }

    if (newHighlights.length > 0) {
      setHighlights((prev) => [...newHighlights, ...prev]);
    }
    setSelection(null);
    if (primaryHighlight) {
      router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: primaryHighlight.id } });
    }
  }, [book, selection, pages, clearEdgeTurnTimer]);

  const renderPage = useCallback(
    ({ item, index }: { item: ReaderPage; index: number }) => {
      let selectionForItem: {
        startParagraph: number;
        startOffset: number;
        endParagraph: number;
        endOffset: number;
        showStartHandle?: boolean;
        showEndHandle?: boolean;
      } | null = null;

      if (selection) {
        const itemIdx = item.globalIndex;
        const startPg = selection.startPageGlobalIndex;
        const endPg = selection.endPageGlobalIndex;
        if (itemIdx >= startPg && itemIdx <= endPg) {
          const isStartPage = itemIdx === startPg;
          const isEndPage = itemIdx === endPg;
          const lastPara = Math.max(0, item.paragraphs.length - 1);
          selectionForItem = {
            startParagraph: isStartPage ? selection.startParagraph : 0,
            startOffset: isStartPage ? selection.startOffset : 0,
            endParagraph: isEndPage ? selection.endParagraph : lastPara,
            endOffset: isEndPage ? selection.endOffset : (item.paragraphs[lastPara]?.length ?? 0),
            showStartHandle: isStartPage,
            showEndHandle: isEndPage,
          };
        }
      }
      // The word to highlight on this page: the held word (menu open) or the one
      // currently being translated.
      const hl = wordMenu
        ? { pageGlobalIndex: wordMenu.page.globalIndex, paragraphIndex: wordMenu.paragraphIndex, start: wordMenu.start, end: wordMenu.end }
        : activeWord
          ? { pageGlobalIndex: activeWord.pageGlobalIndex, paragraphIndex: activeWord.paragraphIndex, start: activeWord.start, end: activeWord.end }
          : null;
      const activeWordForItem =
        hl && hl.pageGlobalIndex === item.globalIndex
          ? { paragraphIndex: hl.paragraphIndex, start: hl.start, end: hl.end }
          : null;
      const translationForItem =
        translation && translation.status === 'ready' && translation.pageGlobalIndex === item.globalIndex
          ? translation
          : null;
      const translatedParagraphsForItem = translationForItem?.paragraphs ?? null;
      const bilingualParagraphsForItem = translationForItem?.bilingualParagraphs ?? null;
      return (
        <ReaderPageCell
          item={item}
          index={index}
          scrollX={scrollX}
          themeProgress={bgProgress}
          mode={mode}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          topInset={insets.top}
          bottomInset={insets.bottom}
          fontSize={readingFontSizePx}
          lineHeight={readingLineHeight}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          highlightMap={highlightMap}
          highlightColors={colors.highlight}
          savedWordSet={savedWordSet}
          savedWordColor={savedWordColor}
          savedWordTextColor={savedWordTextColor}
          activeWordRange={activeWordForItem}
          selectionRange={selectionForItem}
          translatedParagraphs={translatedParagraphsForItem}
          bilingualParagraphs={bilingualParagraphsForItem}
          onWordLongPress={handleWordLongPress}
          onBilingualWordLongPress={
            bilingualParagraphsForItem
              ? (payload) => {
                  setActiveWord({
                    word: payload.word,
                    paragraphIndex: payload.paragraphIndex,
                    pageGlobalIndex: item.globalIndex,
                    start: 0,
                    end: payload.word.length,
                    anchor: payload.anchor,
                    contextSentence: payload.contextSentence,
                  });
                }
              : undefined
          }
          onRangeEdgeDragStart={selectionForItem ? handleRangeEdgeDragStart : undefined}
          onRangeEdgeDrag={
            selectionForItem
              ? (edge, pos, direction) =>
                  handleRangeEdgeDrag(item.globalIndex, edge, pos, direction)
              : NOOP_RANGE_DRAG
          }
          onRangeEdgeDragEnd={selectionForItem ? handleRangeEdgeDragEnd : undefined}
          onCloseTranslation={toggleTranslation}
        />
      );
    },
    [
      colors,
      highlightMap,
      savedWordSet,
      savedWordColor,
      savedWordTextColor,
      translation,
      toggleTranslation,
      handleWordLongPress,
      handleRangeEdgeDragStart,
      handleRangeEdgeDrag,
      handleRangeEdgeDragEnd,
      bgProgress,
      sourceLanguage,
      targetLanguage,
      readingFontSizePx,
      readingLineHeight,
      insets.top,
      insets.bottom,
      selection,
      activeWord,
      wordMenu,
      mode,
      pageWidth,
      pageHeight,
    ],
  );

  // Hidden one-shot measurement of the real characters-per-line for the current
  // font/column, rendered in every state so pagination can proceed even before
  // pages exist. onTextLayout gives the exact wrapped-line count for the sample.
  const sampleText = isBangla ? BANGLA_PAGINATION_SAMPLE : PAGINATION_MEASURE_SAMPLE;
  const measurement = (
    <View style={[styles.measureHost, { width: contentWidthPx }]} pointerEvents="none">
      <Text
        key={`${pageStyleId}-${readingFontSizePx}-${isBangla}`}
        style={[
          typography.readingBody,
          {
            fontSize: readingFontSizePx,
            lineHeight: readingLineHeight,
            fontFamily: isBangla ? pageStyleConfig.banglaFont : pageStyleConfig.englishFont,
            letterSpacing: isBangla ? pageStyleConfig.banglaLetterSpacing : pageStyleConfig.letterSpacing,
          },
        ]}
        onTextLayout={(e) => {
          const lines = e.nativeEvent.lines.length;
          if (lines > 0) {
            const measured = Math.round(sampleText.length / lines);
            if (measured > 0) {
              setMeasuredCharsPerLine((prev) => (Math.abs(prev - measured) > 2 ? measured : prev));
            }
          }
        }}
      >
        {sampleText}
      </Text>
      {/* One-time hidden pass measuring each character's real advance in the
          reading font — each glyph is on its own line, so its reported line
          width IS its advance. Feeds precise touch->character selection. */}
      {!glyphWidthsReady() ? (
        <Text
          style={[typography.readingBody, { fontSize: readingFontSizePx }]}
          onTextLayout={(e) => {
            if (glyphWidthsReady()) return;
            const map = buildGlyphWidths(e.nativeEvent.lines.map((l) => l.width));
            if (map) setMeasuredGlyphWidths(map);
          }}
        >
          {GLYPH_MEASURE_TEXT}
        </Text>
      ) : null}
    </View>
  );

  if (bookTextState.status === 'loading') {
    return <BookLoadingScreen title={book?.title ?? bookTitle ?? 'বইটি লোড হচ্ছে…'} coverUrl={book?.coverUrl ?? bookCoverUrl} />;
  }

  if (bookTextState.status === 'unavailable') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>
          {bookTextState.message ?? `${book?.title ?? 'This book'} isn't available to read yet.`}
        </Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: 10 }]}>
          {isBangla
            ? 'এই বইটির কোনো পাঠযোগ্য বিষয়বস্তু পাওয়া যায়নি।'
            : 'This title has no readable text edition on Project Gutenberg.'}
        </Text>
      </View>
    );
  }

  if (bookTextState.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center', marginBottom: 4 }]}>
          Couldn't download {book?.title ?? 'this book'}.
        </Text>
        {/* Temporary diagnostic — surfaces the raw error while debugging the
            Gutenberg redirect issue; not meant to stay user-facing long-term. */}
        {bookTextState.message ? (
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.fawn, textAlign: 'center', marginBottom: 16 },
            ]}
          >
            {bookTextState.message}
          </Text>
        ) : null}
        <Pressable
          onPress={retryDownload}
          style={[styles.selectionSave, { backgroundColor: colors.flameAmber }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13 }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.container}>
        {measurement}
        <BookLoadingScreen title={bookTitle ?? 'বইটি প্রস্তুত হচ্ছে…'} coverUrl={bookCoverUrl} />
      </View>
    );
  }

  // Still measuring / paginating / resolving the start page — keep measuring.
  if (pages.length === 0 || initialIndex == null) {
    return (
      <View style={styles.container}>
        {measurement}
        <BookLoadingScreen title={book.title ?? bookTitle ?? 'বইটি প্রস্তুত হচ্ছে…'} coverUrl={book.coverUrl ?? bookCoverUrl} />
      </View>
    );
  }

  const currentTranslation =
    translation && currentPage && translation.pageGlobalIndex === currentPage.globalIndex ? translation : null;

  const pageNumber = Math.min(currentIndex, pages.length - 1) + 1;
  const totalPages = pages.length;
  const percent = Math.round((pageNumber / totalPages) * 100);

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {measurement}
      {/* Animated Day<->Lamp background — the single source of the page tint,
          crossfading whenever `mode` flips. Light uses the authentic antique paper
          texture so any rapid paging cell boundary never flashes white; dark fades in
          with matching midnight antique paper. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={ANTIQUE_PAPER_DAY}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
        />
      </View>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 14, 26, 0.62)' }, darkBgStyle]}
        pointerEvents="none"
      />

      <Animated.FlatList<ReaderPage>
        ref={listRef}
        style={styles.transparentList}
        contentContainerStyle={styles.flatListContent}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.globalIndex}`}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        renderItem={renderPage}
        extraData={`${readingFontSizePx}-${readingLineHeight}-${pageWidth}-${pageHeight}-${savedWordSet.size}-${selection ? `${selection.startPageGlobalIndex}:${selection.startParagraph}:${selection.startOffset}:${selection.endPageGlobalIndex}:${selection.endParagraph}:${selection.endOffset}` : ''}-${isDraggingHandle ? 'drag' : 'idle'}-${activeWord ? `${activeWord.pageGlobalIndex}:${activeWord.start}` : ''}-${wordMenu ? `${wordMenu.page.globalIndex}:${wordMenu.start}` : ''}-${translation ? `${translation.pageGlobalIndex}:${translation.status}` : ''}`}
        // Keep views attached across both platforms so rapid paging doesn't flash blank screens
        removeClippedSubviews={false}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 50);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 90 }}
        // Kill Android's overscroll edge glow (defaults to the accent color and
        // shows as a stray tinted line at the scroll boundaries in dark mode).
        overScrollMode="never"
        // Lock paging while actively dragging a handle or reading whole-page translation
        scrollEnabled={!isDraggingHandle && currentTranslation == null}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        snapToAlignment="start"
        disableIntervalMomentum={true}
        // Lightweight virtualized window prevents JS thread freezing during rapid paging
        windowSize={5}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={40}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />

      {/* Corner hot-zones: right advances page, left turns back when index > 0 */}
      {selection ? null : (
        <>
          <Pressable style={styles.cornerHotZone} onPress={goToNextPage} />
          {currentIndex > 0 ? (
            <Pressable style={styles.leftCornerHotZone} onPress={goToPrevPage} />
          ) : null}
        </>
      )}

      {/* One theme-aware top bar for both modes — back, chapter, progress. */}
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        style={[styles.topBar, chromeStyle, { height: insets.top + 64 }]}
      >
        {/* Percent readout and top-bar centerline */}
        <View style={[styles.topBarRow, { paddingTop: insets.top + 19 }]}>
          {/* Reading progress, centered at the top: which page of how many,
              plus how much reading is left, so a long book has a visible end. */}
          <View style={styles.topBarProgress}>
            <Animated.Text
              style={[
                typography.uiRowTitle,
                { fontSize: 13 },
                animatedTopBarTextStyle,
              ]}
            >
              Page {pageNumber} of {totalPages}
            </Animated.Text>
          </View>
        </View>
      </Animated.View>

      {/* Always-visible hairline progress at the very bottom edge — a constant,
          non-intrusive sense of position even while the chrome is hidden. */}
      <View style={[styles.readerProgressTrack, { bottom: insets.bottom }]} pointerEvents="none">
        <View
          style={[
            styles.readerProgressFill,
            { width: `${percent}%`, backgroundColor: LamplightColor.flameAmber },
          ]}
        />
      </View>

      {/* The animated layer owns all taps while the vertical tools menu is open. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.chromeMenuLayer,
          chromeMenuLayerAnimStyle,
        ]}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
          onPress={() => closeChromeMenu()}
        />
        <Animated.View
          style={[
            styles.chromeMenuPanel,
            animatedButtonStyle,
            chromeMenuPanelStyle,
            { top: insets.top + 58, borderRadius: radius.card },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Page and font style"
            testID="reader-page-style-button"
            onPress={() => closeChromeMenu(() => setPageStyleVisible(true))}
            style={styles.chromeMenuRow}
          >
            <Text style={[styles.chromeMenuAa, { color: colors.flameAmber }]}>Aa</Text>
            <Text style={[typography.uiRowTitle, styles.chromeMenuLabel, { color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT }]}>Page & Font Style</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Translate page"
            testID="reader-translate-button"
            onPress={() => closeChromeMenu(toggleTranslation)}
            style={styles.chromeMenuRow}
          >
            <TranslateIcon color={currentTranslation?.status === 'ready' ? colors.flameAmber : isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT} size={18} />
            <Text style={[typography.uiRowTitle, styles.chromeMenuLabel, { color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT }]}>Translate Page</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Translation language"
            testID="reader-language-button"
            onPress={() => closeChromeMenu(() => setLanguagePickerVisible(true))}
            style={styles.chromeMenuRow}
          >
            <TranslateIcon color={colors.flameAmber} size={18} />
            <Text style={[typography.uiRowTitle, styles.chromeMenuLabel, { color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT }]}>Change Translation Language</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listen to nature sounds"
            testID="reader-ambience-button"
            onPress={() => closeChromeMenu(() => setAmbienceOpen(true))}
            style={styles.chromeMenuRow}
          >
            <SpeakerIcon color={ambienceTrackId ? colors.flameAmber : isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT} size={18} />
            <Text style={[typography.uiRowTitle, styles.chromeMenuLabel, { color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT }]}>Listen to Nature Sounds</Text>
          </Pressable>
          <TurnPageSoundMenuRow
            isLamp={Boolean(isLamp)}
            playPageTurn={playPageTurn}
            stopPageTurn={stopPageTurn}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLamp ? 'Switch to day mode' : 'Switch to lamp mode'}
            testID="reader-mode-toggle-button"
            onPress={() => {
              toggleReadingTheme();
              closeChromeMenu();
            }}
            style={styles.chromeMenuRow}
          >
            <ModeIcon progress={bgProgress} />
            <Animated.Text style={[typography.uiRowTitle, styles.chromeMenuLabel, animatedTopBarTextStyle]}>
              {isLamp ? 'Day Mode' : 'Lamp Mode'}
            </Animated.Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reader guide"
            testID="reader-guide-button"
            onPress={() => closeChromeMenu(openGuide)}
            style={styles.chromeMenuRow}
          >
            <QuestionIcon color={isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT} size={18} />
            <Text style={[typography.uiRowTitle, styles.chromeMenuLabel, { color: isLamp ? READING_TEXT_DARK : READING_TEXT_LIGHT }]}>Reader Guide</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Top Left: Hamburger menu button */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.chromeMenuButton,
          { top: insets.top + 10 },
        ]}
      >
        <Animated.View style={[styles.chromeButtonSurface, animatedButtonStyle]} pointerEvents="none">
          <Animated.View style={[styles.buttonIconContainer, hamburgerIconAnimStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.centered, dayChromeFadeStyle]}>
              <MenuIcon color={READING_TEXT_LIGHT} size={19} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.centered, nightChromeFadeStyle]}>
              <MenuIcon color={READING_TEXT_DARK} size={19} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
        <ReaderChromeTouchTarget
          enabled
          onPress={toggleChromeMenu}
          accessibilityLabel="Reader tools"
          testID="reader-tools-button"
        />
      </Animated.View>

      {/* On-page translating toast with spinner so the reader has immediate feedback */}
      {currentTranslation?.status === 'loading' ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.translatingToast,
            {
              top: insets.top + 24,
              backgroundColor: isLamp ? '#2B2621' : '#F7F1E6',
              borderColor: isLamp ? '#423A32' : '#E2D6C3',
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.flameAmber} />
          <Text
            style={[
              typography.uiRowTitle,
              {
                color: isLamp ? '#F5EDE1' : '#1C1B1E',
                fontSize: 12.5,
                marginLeft: 9,
                fontWeight: '600',
              },
            ]}
          >
            {isBangla ? 'পৃষ্ঠা অনুবাদ হচ্ছে…' : 'Translating page…'}
          </Text>
        </Animated.View>
      ) : null}

      {/* Daily free-limit notice — the same message the word-tap popup shows,
          just as a small inline card (matching the gesture-hint card below)
          instead of another screen. Tapping the translate button again (or
          this card) dismisses it. */}
      {currentTranslation?.status === 'capped' ? (
        <View
          style={[
            styles.hintCard,
            { top: insets.top + 72, backgroundColor: colors.card, borderColor: colors.hairline },
          ]}
        >
          <View style={styles.hintRow}>
            <View style={[styles.hintAccent, { backgroundColor: colors.flameAmber }]} />
            <View style={styles.hintTextCol}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Today's free translations are used up
              </Text>
              <Pressable onPress={() => router.push('/paywall')} hitSlop={4}>
                <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11.5, marginTop: 2 }]}>
                  Keep the lamp lit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <AmbiencePicker visible={ambienceOpen} onClose={() => setAmbienceOpen(false)} />

      {/* Smart first-run reader guide — teaches page turns (forward & back) and translation language */}
      {hintVisible && !selection ? (
        <Animated.View
          style={[
            styles.gestureHintCard,
            {
              bottom: insets.bottom + 26,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
            },
            hintAnimatedStyle,
          ]}
        >
          {/* Row 1: Page turn directional cue */}
          <View style={styles.hintRow}>
            <Animated.View style={[styles.hintIconWrap, arrowAnimatedStyle]}>
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                {hintType === 'forward' ? (
                  <Path
                    d="M19 12H5M5 12L11 6M5 12L11 18"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <Path
                    d="M5 12H19M19 12L13 6M19 12L13 18"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </Animated.View>
            <View style={styles.hintTextCol}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                {hintType === 'forward' ? 'Swipe left to turn page' : 'Swipe right to turn back'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 1 }]}>
                {hintType === 'forward' ? 'or tap bottom-right corner' : 'or tap bottom-left corner'}
              </Text>
            </View>
            <Pressable
              onPress={hintType === 'backward' ? dismissBackHint : dismissHint}
              hitSlop={12}
              style={styles.hintCloseBtn}
            >
              <CloseIcon color={colors.fawn} size={14} />
            </Pressable>
          </View>

          {/* Hairline divider */}
          <View style={[styles.hintDivider, { backgroundColor: colors.hairline }]} />

          {/* Row 2: Translation info */}
          <View style={styles.hintRow}>
            <View style={styles.hintIconWrap}>
              <TranslateIcon color={colors.flameAmber} size={17} />
            </View>
            <View style={styles.hintTextCol}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12.5 }]}>
                Hold word to translate
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 1 }]}>
                Instant word definitions
              </Text>
            </View>
            <View
              style={[
                styles.hintPairPill,
                { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10.5, fontWeight: '600' }]}>
                EN → {targetLanguageLabel(targetLanguage)}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Quote-selection bottom bar — only while picking lines. */}
      {selection ? (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={() => {
              setSelection(null);
              setIsDraggingHandle(false);
              clearEdgeTurnTimer();
            }}
            hitSlop={8}
          >
            <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, fontSize: 13 }]}>Cancel</Text>
          </Pressable>
          <Text style={[typography.metadataCaption, { color: colors.lampText, fontSize: 12 }]}>
            {(() => {
              const n = selectedText(pages, selection)
                .split(/\s+/)
                .filter(Boolean).length;
              return `${n} word${n === 1 ? '' : 's'} selected`;
            })()}
          </Text>
          <Pressable
            onPress={handleSaveQuote}
            style={[styles.selectionSave, { backgroundColor: colors.flameAmber }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>
              Save quote
            </Text>
          </Pressable>
        </View>
      ) : null}

      <WordActionMenu
        word={wordMenu?.word ?? null}
        anchor={wordMenu?.anchor ?? null}
        sourceLanguage={sourceLanguage}
        onTranslate={() => {
          if (!wordMenu) return;
          setActiveWord({
            word: wordMenu.word,
            paragraphIndex: wordMenu.paragraphIndex,
            pageGlobalIndex: wordMenu.page.globalIndex,
            start: wordMenu.start,
            end: wordMenu.end,
            anchor: wordMenu.anchor,
          });
          setWordMenu(null);
        }}
        onSaveQuote={() => {
          if (!wordMenu) return;
          setSelection({
            startPageGlobalIndex: wordMenu.page.globalIndex,
            startParagraph: wordMenu.paragraphIndex,
            startOffset: wordMenu.start,
            endPageGlobalIndex: wordMenu.page.globalIndex,
            endParagraph: wordMenu.paragraphIndex,
            endOffset: wordMenu.end,
          });
          setWordMenu(null);
        }}
        onClose={() => setWordMenu(null)}
      />

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        anchor={activeWord?.anchor ?? null}
        sourceLang={sourceLanguage}
        sourceLangLabel={sourceLanguage.toUpperCase()}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveWord}
        onSaveForLater={handleSaveForLater}
        onChangeLanguage={() => {
          setActiveWord(null);
          setLanguagePickerVisible(true);
        }}
      />

      <LanguagePicker
        visible={languagePickerVisible}
        selected={targetLanguage}
        onSelect={(code) => {
          setTargetLanguage(code);
          setLanguagePickerVisible(false);
        }}
        onClose={() => setLanguagePickerVisible(false)}
      />


      <PageStyleSelectorModal
        visible={pageStyleVisible}
        onClose={() => setPageStyleVisible(false)}
        isBangla={Boolean(isBangla)}
      />

      <ReaderGuideModal
        visible={guideModalVisible}
        onClose={handleCloseGuide}
        onOpenLanguagePicker={() => {
          handleCloseGuide();
          setLanguagePickerVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transparentList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flatListContent: {
    flexGrow: 1,
  },
  pageFrame: {
    flex: 1,
    height: '100%',
    overflow: 'visible',
  },
  trailingEdgeDropShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -28,
    width: 28,
    flexDirection: 'row',
    zIndex: 20,
  },
  edgeShadowBand1: {
    width: 3,
    height: '100%',
  },
  edgeShadowBand2: {
    width: 6,
    height: '100%',
  },
  edgeShadowBand3: {
    width: 9,
    height: '100%',
  },
  edgeShadowBand4: {
    width: 10,
    height: '100%',
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
  leftCornerHotZone: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 72,
    height: 72,
  },
  chromeMenuButton: {
    position: 'absolute',
    left: 11,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 20,
  },
  chromeMenuLayer: {
    zIndex: 30,
  },
  chromeMenuPanel: {
    position: 'absolute',
    left: 11,
    width: 236,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  chromeMenuRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  chromeMenuAa: {
    width: 20,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  chromeMenuLabel: {
    marginLeft: 12,
    fontSize: 14,
  },
  menuToggleTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  menuToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FAF5EE',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
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
  topBarProgress: {
    alignItems: 'center',
    gap: 1,
  },
  modeIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeButtonSurface: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(140,130,115,0.18)',
  },
  readerProgressFill: {
    height: 2.5,
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
    right: 16,
    maxWidth: 250,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 25,
  },
  gestureHintCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 35,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  hintIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hintCloseBtn: {
    padding: 6,
    marginLeft: 8,
  },
  hintDivider: {
    height: 1,
    marginVertical: 8,
  },
  hintPairPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  hintAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 11,
  },
  hintTextCol: {
    flex: 1,
  },
  selectionSave: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  translatingToast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 40,
  },
});

