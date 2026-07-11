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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, MoonIcon, SoundWaveIcon, SunIcon } from '@/components/icons';
import { AmbiencePicker } from '@/features/ambience/AmbiencePicker';
import { useAmbienceTrackId } from '@/features/ambience/ambiencePreference';
import { useAmbiencePlayer } from '@/features/ambience/useAmbiencePlayer';
import { usePageTurnSound } from '@/features/reader/usePageTurnSound';
import { BookLoadingScreen } from '@/features/reader/components/BookLoadingScreen';
import { ReaderPageView } from '@/features/reader/components/ReaderPageView';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import {
  findGlobalIndex,
  paginateBook,
  PAGINATION_MEASURE_SAMPLE,
  type ReaderPage,
} from '@/features/reader/engine/paginate';
import {
  buildGlyphWidths,
  GLYPH_MEASURE_TEXT,
  glyphWidthsReady,
  setMeasuredGlyphWidths,
} from '@/features/reader/engine/glyphWidths';
import { getBookText } from '@/features/content-ingestion/bookDownloader';
import { logEvent } from '@/features/analytics/analytics';
import { BookFormatError, type IngestedBook } from '@/features/content-ingestion/textParser';
import { getBook, updateBookTotalChapters, type BookRow } from '@/db/repositories/books';
import { createHighlight, listHighlightsForBook, type Highlight } from '@/db/repositories/highlights';
import { getReadingPosition, upsertReadingPosition } from '@/db/repositories/readingPosition';
import { listSavedWordsForBook, saveWord, type SavedWord } from '@/db/repositories/savedWords';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { READING_FONT_SIZE_PX, READING_LINE_HEIGHT_PX } from '@/features/settings/readingPrefs';
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

// The reading-mode toggle shows the CURRENT mode: sun while reading in Day,
// moon while reading by lamplight. Thin-line glyphs per the icon spec — the
// old mini flame-glow rendered muddy at 20px inside the chrome circle.
function ModeIcon({ mode }: { mode: ReaderMode }) {
  return mode === 'lamp' ? (
    <MoonIcon color={READING_TEXT_DARK} size={19} />
  ) : (
    <SunIcon color={READING_TEXT_LIGHT} size={19} />
  );
}

type ReaderPageFrameProps = {
  children: React.ReactNode;
};

// A page is hundreds of per-word <Text> nodes. Applying a per-frame scale/
// opacity to that subtree forced the GPU to rasterize the whole page into an
// offscreen layer every frame of a swipe — the actual cause of the page-turn
// lag. Dropping it lets pages ride the native horizontal paging directly,
// which is the smoothest path there is (and the old recession effect was
// nearly invisible anyway).
function ReaderPageFrame({ children }: ReaderPageFrameProps) {
  return <View style={styles.pageFrame}>{children}</View>;
}

// The exact selected substring across a word-aligned range, joining paragraphs
// in reading order — used both for the saved quote text and the live word count.
function selectedText(
  page: ReaderPage,
  startParagraph: number,
  startOffset: number,
  endParagraph: number,
  endOffset: number,
): string {
  const parts: string[] = [];
  for (let p = startParagraph; p <= endParagraph; p += 1) {
    const paragraph = page.paragraphs[p] ?? '';
    const s = p === startParagraph ? startOffset : 0;
    const e = p === endParagraph ? endOffset : paragraph.length;
    parts.push(paragraph.slice(s, e).trim());
  }
  return parts.filter(Boolean).join(' ');
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

  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeOpacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ambienceOpen, setAmbienceOpen] = useState(false);

  // Reading ambience: plays the chosen loop while this screen is mounted and
  // stops automatically when leaving the book (expo-audio releases on unmount).
  useAmbiencePlayer();
  const ambienceTrackId = useAmbienceTrackId();

  // Soft page-turn sound. Stored in a ref so the stable onViewableItemsChanged
  // callback (built once via useRef) can reach the latest play fn — same reason
  // book/pages are mirrored into refs below.
  const playPageTurn = usePageTurnSound();
  const playPageTurnRef = useRef(playPageTurn);
  playPageTurnRef.current = playPageTurn;
  // Null until the first page settles, so opening a book (or jumping to a saved
  // page) never fires the sound — only an actual turn does.
  const lastPageIndexRef = useRef<number | null>(null);

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
  } | null>(null);
  // Selection is a word-aligned char range across the page's paragraphs, always
  // normalized so start <= end. It begins as the single held word and is
  // adjusted at word granularity from either end via the two drag handles.
  const [selection, setSelection] = useState<{
    page: ReaderPage;
    startParagraph: number;
    startOffset: number;
    endParagraph: number;
    endOffset: number;
  } | null>(null);

  // First-run gesture hint — fades/slides in a couple seconds after the book
  // opens, holds long enough to actually read, then eases back out on its own
  // (or immediately on tap). Shows once per app session, never again after.
  const [hintVisible, setHintVisible] = useState(false);
  const hintOpacity = useSharedValue(0);
  // Slides in horizontally from the top-right corner (translateX 28 -> 0), so
  // it reads as a quiet toast tucked under the lamp icon, not a modal.
  const hintTranslateX = useSharedValue(28);
  const dismissHint = useCallback(() => {
    hintOpacity.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
    hintTranslateX.value = withTiming(28, { duration: 240, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setHintVisible(false), 240);
  }, [hintOpacity, hintTranslateX]);
  useEffect(() => {
    if (hasShownReaderHint || !book) return;
    hasShownReaderHint = true;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const showTimer = setTimeout(() => {
      setHintVisible(true);
      hintOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      hintTranslateX.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
      hideTimer = setTimeout(dismissHint, 5600);
    }, 2200);
    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [book, hintOpacity, hintTranslateX, dismissHint]);
  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateX: hintTranslateX.value }],
  }));

  const readingFontSizePx = READING_FONT_SIZE_PX;
  const readingLineHeight = READING_LINE_HEIGHT_PX;
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
        // Bulk-imported books sync with an unknown (0) chapter count — now
        // that it's actually been parsed, fill in the real number locally.
        if (bookRow.totalChapters === 0 && ingested.chapters.length > 0) {
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
  }, [pages, startPosition, initialIndex]);

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

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      const page = first.item as ReaderPage;
      // Play the turn sound only on a genuine page change — not the initial
      // page settling on open, and not a re-emit of the same index.
      if (lastPageIndexRef.current != null && first.index !== lastPageIndexRef.current) {
        playPageTurnRef.current();
      }
      lastPageIndexRef.current = first.index;
      setCurrentIndex(first.index);
      const currentBook = bookRef.current;
      const currentPages = pagesRef.current;
      if (currentBook) {
        upsertReadingPosition({
          bookId: currentBook.id,
          chapterIndex: page.chapterIndex,
          pageIndex: page.pageIndexInChapter,
          percentComplete: currentPages.length > 1 ? first.index / (currentPages.length - 1) : 1,
        });
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
      if (book.totalChapters === 0 && ingested.chapters.length > 0) {
        updateBookTotalChapters(book.id, ingested.chapters.length);
      }
    } catch (err) {
      if (err instanceof BookFormatError) {
        setBookTextState({ status: 'unavailable', message: err.message });
      } else {
        setBookTextState({ status: 'error', message: err instanceof Error ? err.message : 'Download failed' });
      }
    }
  }, [book]);

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

  // Moves one edge of the selection to the word-boundary the handle reports,
  // keeping the OTHER edge fixed. Clamps so the dragged edge can't cross past
  // the fixed one (the range never inverts) — native-style.
  const handleRangeEdgeDrag = useCallback((edge: 'start' | 'end', pos: { paragraphIndex: number; offset: number }) => {
    // true when (p1,o1) is at or before (p2,o2) in reading order.
    const atOrBefore = (p1: number, o1: number, p2: number, o2: number) => p1 < p2 || (p1 === p2 && o1 <= o2);
    setSelection((prev) => {
      if (!prev) return prev;
      if (edge === 'start') {
        // Clamp new start to not pass the fixed end.
        return atOrBefore(pos.paragraphIndex, pos.offset, prev.endParagraph, prev.endOffset)
          ? { ...prev, startParagraph: pos.paragraphIndex, startOffset: pos.offset }
          : { ...prev, startParagraph: prev.endParagraph, startOffset: prev.endOffset };
      }
      // Clamp new end to not pass the fixed start.
      return atOrBefore(prev.startParagraph, prev.startOffset, pos.paragraphIndex, pos.offset)
        ? { ...prev, endParagraph: pos.paragraphIndex, endOffset: pos.offset }
        : { ...prev, endParagraph: prev.startParagraph, endOffset: prev.startOffset };
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
      logEvent('word_saved', { book_id: book.id, target_lang: targetLanguage });
    },
    [book, activeWord, pages, currentIndex, targetLanguage],
  );

  // Save the current selection as a quote. Highlights are always the app's
  // single amber accent — no color picker (its swatches read as confusing
  // +/- controls and duplicated this Save action), keeping the flow one tap:
  // adjust the handles, then Save quote.
  const handleSaveQuote = useCallback(async () => {
    if (!book || !selection) return;
    const { page, startParagraph, startOffset, endParagraph, endOffset } = selection;
    // Rebuild the quote text as the exact selected substring across the range's
    // paragraphs, in reading order; store the paragraph span for re-rendering
    // the in-book highlight (which marks whole paragraphs).
    const quoteText = selectedText(page, startParagraph, startOffset, endParagraph, endOffset);
    const created = await createHighlight({
      bookId: book.id,
      chapterIndex: page.chapterIndex,
      pageIndex: page.pageIndexInChapter,
      startOffset: startParagraph,
      endOffset: endParagraph,
      colorKey: 'amber',
      quoteText,
    });
    setHighlights((prev) => [created, ...prev]);
    setSelection(null);
    router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: created.id } });
  }, [book, selection]);

  const renderPage = useCallback(
    ({ item }: { item: ReaderPage; index: number }) => {
      const selectionForItem =
        selection && selection.page.globalIndex === item.globalIndex
          ? {
              startParagraph: selection.startParagraph,
              startOffset: selection.startOffset,
              endParagraph: selection.endParagraph,
              endOffset: selection.endOffset,
            }
          : null;
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
      return (
        <ReaderPageFrame>
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
              activeWordRange={activeWordForItem}
              activeWordColor={colors.highlight.amber}
              activeWordTextColor="#2B2621"
              selectionRange={selectionForItem}
              selectionColor={colors.highlight.amber}
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
      handleWordLongPress,
      handleRangeEdgeDrag,
      toggleChrome,
      textColor,
      readingFontSizePx,
      readingLineHeight,
      insets.top,
      insets.bottom,
      selection,
      activeWord,
      wordMenu,
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

  if (!book) return <View style={styles.container}>{measurement}</View>;

  if (bookTextState.status === 'unavailable') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.parchment, padding: 24 }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, textAlign: 'center' }]}>
          {bookTextState.message ?? `${book.title} isn't available to read yet.`}
        </Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: 10 }]}>
          This title has no readable text edition on Project Gutenberg.
        </Text>
      </View>
    );
  }

  if (bookTextState.status === 'loading') {
    return <BookLoadingScreen title={book.title} />;
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

  const pageNumber = Math.min(currentIndex, pages.length - 1) + 1;
  const totalPages = pages.length;
  const percent = Math.round((pageNumber / totalPages) * 100);
  // Rough "time left" so a long book doesn't feel bottomless — ~40s a page is
  // a calm reading pace for this 18px/1.85 body; floored to whole minutes.
  const pagesLeft = totalPages - pageNumber;
  const minutesLeft = Math.round((pagesLeft * 40) / 60);
  const timeLeftLabel =
    pagesLeft <= 0 ? 'Last page' : minutesLeft < 1 ? 'Almost done' : `${minutesLeft} min left`;

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
        extraData={`${mode}-${readingFontSizePx}-${readingLineHeight}-${savedWordSet.size}-${selection ? `${selection.page.globalIndex}:${selection.startParagraph}:${selection.startOffset}:${selection.endParagraph}:${selection.endOffset}` : ''}-${activeWord ? `${activeWord.pageGlobalIndex}:${activeWord.start}` : ''}-${wordMenu ? `${wordMenu.page.globalIndex}:${wordMenu.start}` : ''}`}
        // Detach off-screen pages' (heavy, per-word) native view trees so only
        // the visible page and its immediate neighbors composite during a swipe.
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 90 }}
        // Kill Android's overscroll edge glow (defaults to the accent color and
        // shows as a stray tinted line at the scroll boundaries in dark mode).
        overScrollMode="never"
        // Lock paging while selecting lines for a quote — swiping away from the
        // page you're selecting on would lose the selection context.
        scrollEnabled={!selection}
        decelerationRate="fast"
        // Keep the very first open of a book fast (1 page rendered up front),
        // but render a couple pages ahead in each direction during idle time
        // between swipes — otherwise the neighboring page's first mount (word
        // tokenization + its ~hundreds of per-word Text nodes) happens right
        // at the moment you swipe to it instead of before, which is what
        // "page change lags" actually was.
        windowSize={5}
        initialNumToRender={1}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={30}
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
        {/* Back, percent, and the mode toggle (rendered outside this bar) all
            center on the same line: the mode button's 38px circle sits at
            insets.top + 10, so its centerline is insets.top + 29. */}
        <View style={[styles.topBarRow, { paddingTop: insets.top + 19 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.topBarBack, { left: spacing.lg, top: insets.top + 10 }]}
          >
            <ChevronLeftIcon color={chromeChevron} size={18} />
          </Pressable>
          {/* Reading progress, centered at the top: which page of how many,
              plus how much reading is left, so a long book has a visible end. */}
          <View style={styles.topBarProgress}>
            <Text style={[typography.uiRowTitle, { color: chromePercent, fontSize: 13 }]}>
              Page {pageNumber} of {totalPages}
            </Text>
            <Text style={[typography.metadataCaption, { color: chromeChevron, fontSize: 11, opacity: 0.6 }]}>
              {percent}% · {timeLeftLabel}
            </Text>
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

      {/* Day/Lamp toggle — the single reading-mode control (no brightness).
          Routed through the app-wide theme transition so the whole screen
          crossfades day<->night. */}
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
        <ModeIcon mode={mode} />
      </Pressable>

      {/* Reading ambience — same circular chrome button, left of the mode
          toggle. Amber icon while a track is playing, quiet otherwise. */}
      <Pressable
        hitSlop={12}
        style={[
          styles.ambienceButton,
          {
            top: insets.top + 10,
            backgroundColor: modeButtonBg,
            borderColor: isLamp ? 'rgba(240,230,214,0.30)' : 'rgba(43,38,33,0.22)',
          },
        ]}
        onPress={() => setAmbienceOpen(true)}
      >
        <SoundWaveIcon color={ambienceTrackId ? colors.flameAmber : chromeChevron} size={18} />
      </Pressable>

      <AmbiencePicker visible={ambienceOpen} onClose={() => setAmbienceOpen(false)} />

      {/* First-run gesture hint — tap a word to translate, hold + drag to
          quote. Fades in a few seconds after opening the book, auto-dismisses,
          never reappears this session. Hidden while actively selecting. */}
      {hintVisible && !selection ? (
        <Animated.View
          style={[
            styles.hintCard,
            { top: insets.top + 72, backgroundColor: colors.card, borderColor: colors.hairline },
            hintAnimatedStyle,
          ]}
        >
          <Pressable onPress={dismissHint} hitSlop={8} style={styles.hintRow}>
            {/* The one amber accent — reads as the lamp glow tucked into the card. */}
            <View style={[styles.hintAccent, { backgroundColor: colors.flameAmber }]} />
            <View style={styles.hintTextCol}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Hold a word
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2 }]}>
                Then Translate or Save a quote
              </Text>
            </View>
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
            {(() => {
              const n = selectedText(
                selection.page,
                selection.startParagraph,
                selection.startOffset,
                selection.endParagraph,
                selection.endOffset,
              )
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
            page: wordMenu.page,
            startParagraph: wordMenu.paragraphIndex,
            startOffset: wordMenu.start,
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
        onClose={() => setActiveWord(null)}
        onSave={handleSaveWord}
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
  // Sits one 38px button + a 10px gap to the left of the mode toggle.
  ambienceButton: {
    position: 'absolute',
    right: 64,
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
  topBarProgress: {
    alignItems: 'center',
    gap: 1,
  },
  // Same 38px box as modeCycleButton so the chevron centers on the same line.
  topBarBack: {
    position: 'absolute',
    width: 38,
    height: 38,
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
  hintRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 15,
  },
  hintAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 11,
  },
  hintTextCol: {
    flexShrink: 1,
  },
  selectionSave: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
});

