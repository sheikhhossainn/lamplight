import { memo, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SpeakerIcon } from '@/components/icons';
import { speakWord, toggleSpeech, useCurrentSpeechId } from '@/features/audio/pronunciationEngine';
import { charAdvance } from '@/features/reader/engine/glyphWidths';
import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import { splitSentences } from '@/features/translation/interlinearParser';
import type { ReaderPage } from '@/features/reader/engine/paginate';
import { getPageStyleConfig } from '@/features/reader/pageStyles';
import { usePageStyle } from '@/features/settings/pageStylePrefs';
import type { HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { isBengaliText } from '@/theme/typography';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ReaderPageViewProps = {
  page: ReaderPage;
  mode?: 'day' | 'lamp';
  textColor: string;
  topInset: number;
  bottomInset: number;
  fontSize: number;
  lineHeight: number;
  // Per-paragraph saved-highlight marker. quoteText is non-null only for
  // single-paragraph highlights, where it's the exact selected substring —
  // lets the page mark just that run instead of the whole paragraph.
  highlightMap: Map<string, { colorKey: HighlightColorKey; quoteText: string | null }>;
  highlightColors: Record<HighlightColorKey, string>;
  // Lowercased set of words this book has saved to Vocabulary — matched words
  // get a marker. Styling differs by theme (see reader): amber background +
  // dark ink in Day, amber ink on the dark page in Lamp.
  savedWordSet: Set<string>;
  savedWordColor: string;
  savedWordTextColor: string;
  // The word currently being translated on THIS page (char range within its
  // paragraph), highlighted so the reader sees exactly which word their tap
  // resolved to. Null when no popup is open or it belongs to another page.
  activeWordRange: { paragraphIndex: number; start: number; end: number } | null;
  activeWordColor: string;
  activeWordTextColor: string;
  // Non-null only on the page where a "Save quote" selection is in progress: the
  // selected char range (word-aligned) across the page's paragraphs. When set,
  // the page renders the range highlighted and shows the two drag handles at its
  // start/end, adjustable at WORD granularity like native text selection.
  selectionRange: {
    startParagraph: number;
    startOffset: number;
    endParagraph: number;
    endOffset: number;
    showStartHandle?: boolean;
    showEndHandle?: boolean;
  } | null;
  selectionColor: string;
  // Holding (long-press) a word opens the action menu. The payload carries
  // everything the caller needs for either choice: the word + its char range
  // (Translate + highlight + the initial Save-as-quote selection) and the page
  // it's on, plus pageX/pageY to anchor the menu at the word.
  onWordLongPress: (payload: {
    word: string;
    paragraphIndex: number;
    page: ReaderPage;
    start: number;
    end: number;
    pageX: number;
    pageY: number;
  }) => void;
  // Fired continuously while a handle is dragged. `edge` says which end is
  // moving; `pos` is the word-boundary offset under the finger (word start for
  // the 'start' edge, word end for the 'end' edge); `direction` indicates if
  // the finger has reached a page boundary to trigger auto-paging.
  onRangeEdgeDragStart?: (edge: 'start' | 'end') => void;
  onRangeEdgeDrag: (
    edge: 'start' | 'end',
    pos: { paragraphIndex: number; offset: number },
    direction?: 'prev-page' | 'next-page' | null,
  ) => void;
  onRangeEdgeDragEnd?: (edge: 'start' | 'end') => void;
  // Whole-page translation, in place of a separate popup screen: when set, the
  // page's own body crossfades from the original paragraphs to this text
  // (plain, non-interactive — word-tap/highlight offsets don't survive
  // translation, so those gestures are only meaningful on the original).
  // Non-null only for the page currently showing a translation. One entry per
  // ORIGINAL paragraph (translated independently, not the whole page joined
  // into one blob) so the translated page keeps the same paragraph breaks —
  // same layout, just different words. Loading state lives on the caller's
  // toggle button (a spinner replacing the icon), not here — this component
  // only ever animates between "original" and "have text".
  translatedParagraphs: string[] | null;
  bilingualParagraphs?: Array<{
    paragraphIndex: number;
    sentences: Array<{
      id: string;
      original: string;
      translated: string;
    }>;
  }> | null;
  onPagePress?: () => void;
  onCloseTranslation?: () => void;
  onWordSelect?: (word: string, paragraphIndex: number) => void;
  onBilingualWordLongPress?: (payload: {
    word: string;
    contextSentence: string;
    paragraphIndex: number;
    anchor: { x: number; y: number };
  }) => void;
};

type Token = { text: string; word: string | null };
type TextLine = { x: number; y: number; width: number; height: number; text: string };
type ParagraphLayout = { y: number; height: number };
type HandlePixel = { x: number; top: number; height: number };

// Tokenizing a paragraph is the most expensive part of rendering a page —
// cache the result per paragraph string so it's computed once.
const tokenCache = new Map<string, Token[]>();

function getTokens(paragraph: string): Token[] {
  const cached = tokenCache.get(paragraph);
  if (cached) return cached;
  const tokens = tokenizeParagraph(paragraph).map((text) => ({
    text,
    word: /^\s+$/.test(text) ? null : cleanWordForLookup(text) || null,
  }));
  tokenCache.set(paragraph, tokens);
  return tokens;
}

const tokenOffsetCache = new Map<string, number[]>();

// Start character-offset of each token within the paragraph — the basis for
// finding a tapped word's real on-screen position via locateOffsetPixel,
// rather than trusting the touch event's raw coordinates (which nested,
// adjacent <Text> spans can report slightly off for on some devices).
function getTokenOffsets(paragraph: string): number[] {
  const cached = tokenOffsetCache.get(paragraph);
  if (cached) return cached;
  const tokens = getTokens(paragraph);
  const offsets: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    offsets.push(offset);
    offset += token.text.length;
  }
  tokenOffsetCache.set(paragraph, offsets);
  return offsets;
}

// Fraction across a line's text (0..1) -> the character-boundary index nearest
// that point, weighting each character by its real measured advance (see
// glyphWidths). NORMALIZED to the line's own width by charInLine, so the only
// residual error is kerning — sub-character.
function charIndexAtFraction(text: string, frac: number): number {
  const clean = text.replace(/[\r\n]+$/, '');
  if (clean.length === 0) return 0;
  const widths: number[] = [];
  let total = 0;
  for (const ch of clean) {
    const w = charAdvance(ch);
    widths.push(w);
    total += w;
  }
  if (total <= 0) return 0;
  const target = frac * total;
  let acc = 0;
  for (let i = 0; i < widths.length; i += 1) {
    const next = acc + widths[i];
    if (target < next) return target - acc < widths[i] / 2 ? i : i + 1;
    acc = next;
  }
  return clean.length;
}

// The inverse: a character index within a line's text -> its fraction across the
// line (so a handle's pixel position matches where charIndexAtFraction would map
// a touch back — forward and inverse must use the same width model).
function fractionAtCharIndex(text: string, index: number): number {
  const clean = text.replace(/[\r\n]+$/, '');
  if (clean.length === 0) return 0;
  let total = 0;
  const widths: number[] = [];
  for (const ch of clean) {
    const w = charAdvance(ch);
    widths.push(w);
    total += w;
  }
  if (total <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < Math.min(index, widths.length); i += 1) acc += widths[i];
  return acc / total;
}

// The line whose vertical band contains y, or — when y falls in the leading gap
// between lines (line height < line spacing) — the NEAREST line by distance.
// The old code clamped a gap-tap to the last line, which is what made a hold
// occasionally select a word from a completely different line.
function nearestLineIndex(lines: TextLine[], y: number): number {
  const hit = lines.findIndex((line) => y >= line.y && y < line.y + line.height);
  if (hit !== -1) return hit;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    const d = y < l.y ? l.y - y : y - (l.y + l.height);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// Character index within a line for a horizontal position, via the proportional
// width model.
function charInLine(line: TextLine, localX: number): number {
  const frac = line.width > 0 ? Math.min(1, Math.max(0, (localX - line.x) / line.width)) : 0;
  return charIndexAtFraction(line.text, frac);
}

// The EXACT start offset of each wrapped line within the raw paragraph string,
// found by locating each line's text — not by assuming one trimmed space per
// wrap. That old assumption drifted (RN's onTextLayout doesn't trim uniformly
// across platforms), which is what pinned the drag handles to the left margin:
// a deep offset reconstructed with the wrong per-line accounting fell before the
// line it belonged to. indexOf makes every offset here agree with the raw
// string offsets that wordAtOffset / the highlight slice use.
function lineStartOffsets(paragraph: string, lines: TextLine[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (const line of lines) {
    const cleanText = line.text.replace(/[\r\n]+$/, '');
    let idx = cleanText.length > 0 ? paragraph.indexOf(cleanText, pos) : -1;
    if (idx === -1 && cleanText.trimEnd().length > 0) {
      idx = paragraph.indexOf(cleanText.trimEnd(), pos);
    }
    if (idx >= 0) {
      starts.push(idx);
      pos = idx + cleanText.length;
    } else {
      starts.push(pos);
      pos += cleanText.length;
    }
  }
  return starts;
}

// Core hit-test: a touch point (already converted to the paragraph column's own
// coordinate space) -> which paragraph, and the character offset within it,
// resolved against the real wrapped-line geometry RN reported via onTextLayout.
// This is what lets a tap/drag follow however the text actually wrapped instead
// of guessing from font metrics. Shared by sentence hit-testing (drag-select)
// and word hit-testing (tap-to-translate).
function locateParagraphOffset(
  paragraphs: string[],
  paragraphLayouts: Map<number, ParagraphLayout>,
  paragraphLines: Map<number, TextLine[]>,
  localX: number,
  localY: number,
): { paragraphIndex: number; charOffset: number } | null {
  let bestParagraph = -1;
  let bestLayout: ParagraphLayout | null = null;
  for (const [p, layout] of paragraphLayouts) {
    if (localY >= layout.y && localY < layout.y + layout.height) {
      bestParagraph = p;
      bestLayout = layout;
      break;
    }
  }
  if (bestParagraph === -1) {
    // Above the first paragraph or below the last — clamp to whichever
    // paragraph is nearest rather than losing the hit entirely.
    let nearestDist = Infinity;
    for (const [p, layout] of paragraphLayouts) {
      const dist = localY < layout.y ? layout.y - localY : localY - (layout.y + layout.height);
      if (dist < nearestDist) {
        nearestDist = dist;
        bestParagraph = p;
        bestLayout = layout;
      }
    }
  }
  if (bestParagraph === -1 || !bestLayout) return null;

  const paragraph = paragraphs[bestParagraph];
  const lines = paragraphLines.get(bestParagraph);
  if (!paragraph || !lines || lines.length === 0) return { paragraphIndex: bestParagraph, charOffset: 0 };

  const relY = localY - bestLayout.y;
  const lineIndex = nearestLineIndex(lines, relY);
  const starts = lineStartOffsets(paragraph, lines);
  const charOffset = starts[lineIndex] + charInLine(lines[lineIndex], localX);

  return { paragraphIndex: bestParagraph, charOffset };
}

// A tap's position WITHIN a paragraph <Text> (its own locationX/locationY, which
// share the exact coordinate space of that Text's onTextLayout lines) -> the
// character offset in the paragraph string. No container-origin math: because
// the tap and the line geometry are both relative to the same <Text>, this is
// precise enough to resolve the individual word tapped.
function lineCharOffset(paragraph: string, lines: TextLine[] | undefined, localX: number, localY: number): number {
  if (!lines || lines.length === 0) return 0;
  const lineIndex = nearestLineIndex(lines, localY);
  const starts = lineStartOffsets(paragraph, lines);
  return starts[lineIndex] + charInLine(lines[lineIndex], localX);
}

// A character offset -> the word at it (with its char range, for highlighting).
// When the offset lands inside a word token, that's the word. When it lands on
// whitespace/punctuation (the common case: rounding puts a right-of-centre tap
// on the word's TRAILING space), pick the nearest word token by character
// distance, breaking ties toward the EARLIER word — because a trailing space
// belongs to the word just tapped, not the one after it. This is what stops the
// tap from resolving to the next word.
function wordAtOffset(paragraph: string, offset: number): { word: string; start: number; end: number } | null {
  const tokens = getTokens(paragraph);
  const offsets = getTokenOffsets(paragraph);
  let ti = 0;
  for (let i = offsets.length - 1; i >= 0; i -= 1) {
    if (offset >= offsets[i]) {
      ti = i;
      break;
    }
  }
  if (tokens[ti]?.word) {
    return { word: tokens[ti].word!, start: offsets[ti], end: offsets[ti] + tokens[ti].text.length };
  }

  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < tokens.length; i += 1) {
    if (!tokens[i]?.word) continue;
    const start = offsets[i];
    const end = start + tokens[i].text.length;
    const dist = offset < start ? start - offset : offset >= end ? offset - (end - 1) : 0;
    // `<` (not `<=`) so an equal-distance later token never displaces an earlier
    // one — the backward tie-break.
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  if (best === -1) return null;
  return { word: tokens[best].word!, start: offsets[best], end: offsets[best] + tokens[best].text.length };
}

// Build a paragraph's children for the single-<Text> reading render: plain
// strings for runs of ordinary words (no element created), and a nested <Text>
// span only for the few words that need a background — saved-vocabulary markers
// and the word currently being translated (so the reader can see exactly which
// word their tap landed on).
function renderParagraphRuns(
  tokens: Token[],
  savedWordSet: Set<string>,
  savedWordColor: string,
  savedWordTextColor: string,
  activeRange: { start: number; end: number } | null,
  activeColor: string,
  activeTextColor: string,
): (string | ReactElement)[] {
  const children: (string | ReactElement)[] = [];
  let buffer = '';
  let spanKey = 0;
  let offset = 0;
  for (const token of tokens) {
    const start = offset;
    const end = offset + token.text.length;
    offset = end;
    const isActive = activeRange != null && start === activeRange.start && end === activeRange.end;
    const isSaved = !isActive && token.word != null && savedWordSet.has(token.word.toLowerCase());
    if (isActive || isSaved) {
      if (buffer) {
        children.push(buffer);
        buffer = '';
      }
      const spanStyle = isActive
        ? { backgroundColor: activeColor, color: activeTextColor }
        : { backgroundColor: savedWordColor, color: savedWordTextColor };
      children.push(
        <Text key={`s${spanKey}`} style={spanStyle}>
          {token.text}
        </Text>,
      );
      spanKey += 1;
    } else {
      buffer += token.text;
    }
  }
  if (buffer) children.push(buffer);
  return children;
}

// Render a paragraph during quote selection: the char range [selStart, selEnd)
// gets the selection background, the rest is plain. One span, not one per word,
// so a long selection stays cheap. selStart < 0 means this paragraph is outside
// the selected range entirely.
function renderSelectionRuns(
  paragraph: string,
  selStart: number,
  selEnd: number,
  color: string,
  textColor: string,
): (string | ReactElement)[] {
  if (selStart < 0 || selEnd <= selStart) return [paragraph];
  const children: (string | ReactElement)[] = [];
  const before = paragraph.slice(0, selStart);
  if (before) children.push(before);
  children.push(
    <Text key="sel" style={{ backgroundColor: color, color: textColor }}>
      {paragraph.slice(selStart, selEnd)}
    </Text>,
  );
  const after = paragraph.slice(selEnd);
  if (after) children.push(after);
  return children;
}

// The inverse of locateParagraphOffset: given a character offset within a
// paragraph, find where it sits on the real wrapped-line geometry — used to
// place the two drag handles at the exact start/end of the current range.
function locateOffsetPixel(
  paragraph: string,
  layout: ParagraphLayout,
  lines: TextLine[],
  charOffset: number,
): HandlePixel | null {
  if (lines.length === 0) return null;
  const starts = lineStartOffsets(paragraph, lines);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const cleanText = line.text.replace(/[\r\n]+$/, '');
    const lineStart = starts[i];
    const lineEnd = lineStart + cleanText.length;
    const isLast = i === lines.length - 1;
    if (charOffset <= lineEnd || isLast) {
      const within = Math.max(0, Math.min(cleanText.length, charOffset - lineStart));
      const fraction = fractionAtCharIndex(cleanText, within);
      return {
        x: line.x + fraction * line.width,
        top: layout.y + line.y,
        height: line.height,
      };
    }
  }
  return null;
}

function ReaderPageViewImpl({
  page,
  mode = 'day',
  textColor,
  topInset,
  bottomInset,
  fontSize,
  lineHeight,
  highlightMap,
  highlightColors,
  savedWordSet,
  savedWordColor,
  savedWordTextColor,
  activeWordRange,
  activeWordColor,
  activeWordTextColor,
  selectionRange,
  selectionColor,
  onWordLongPress,
  onRangeEdgeDragStart,
  onRangeEdgeDrag,
  onRangeEdgeDragEnd,
  translatedParagraphs,
  bilingualParagraphs,
  onPagePress,
  onCloseTranslation,
  onWordSelect,
  onBilingualWordLongPress,
}: ReaderPageViewProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const pageStyleId = usePageStyle();
  const pageStyleConfig = getPageStyleConfig(pageStyleId);
  const activeSpeechId = useCurrentSpeechId();

  const isLamp = mode === 'lamp';
  const textThemeAnim = useSharedValue(isLamp ? 1 : 0);
  useEffect(() => {
    textThemeAnim.value = withTiming(isLamp ? 1 : 0, {
      duration: 380,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [isLamp, textThemeAnim]);

  const animatedBodyColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      textThemeAnim.value,
      [0, 1],
      [textColor, '#F5EDE1'],
    ),
  }));

  const selecting = selectionRange != null;

  // Whole-page translation crossfade: cached locally while active so the old
  // text is still there to animate away, instead of vanishing the instant the
  // caller clears it (translatedParagraphs goes null immediately on toggle-off).
  const [renderedTranslation, setRenderedTranslation] = useState(translatedParagraphs);
  const translateProgress = useSharedValue(translatedParagraphs != null ? 1 : 0);
  useEffect(() => {
    if (translatedParagraphs != null) {
      setRenderedTranslation(translatedParagraphs);
      translateProgress.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
    } else {
      translateProgress.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setRenderedTranslation)(null);
      });
    }
  }, [translatedParagraphs, translateProgress]);
  const showingTranslation = renderedTranslation != null;
  const [interlinearMode, setInterlinearMode] = useState(true);
  const tabProgress = useSharedValue(0);
  const [tabWidth, setTabWidth] = useState(106);

  const handleSwitchMode = (isParallel: boolean) => {
    if (interlinearMode === isParallel) return;
    void Haptics.selectionAsync().catch(() => {});
    setInterlinearMode(isParallel);
    tabProgress.value = withSpring(isParallel ? 0 : 1, {
      damping: 24,
      stiffness: 260,
      mass: 0.7,
    });
  };

  const sliderIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * tabWidth }],
  }));

  const bilingualItems = useMemo(() => {
    if (bilingualParagraphs && bilingualParagraphs.length > 0) {
      return bilingualParagraphs;
    }
    if (!renderedTranslation) return [];
    return renderedTranslation.map((paraTrans, pIdx) => {
      const origPara = page.paragraphs[pIdx] ?? '';
      const origSentences = splitSentences(origPara);
      const transSentences = splitSentences(paraTrans);
      const sentences = origSentences.map((orig, sIdx) => ({
        id: `p${pIdx}_s${sIdx}`,
        original: orig,
        translated: transSentences[sIdx] || (sIdx === 0 ? paraTrans : ''),
      }));
      return { paragraphIndex: pIdx, sentences };
    });
  }, [bilingualParagraphs, renderedTranslation, page.paragraphs]);

  const originalFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - translateProgress.value,
    transform: [{ translateY: -6 * translateProgress.value }],
  }));
  const translatedFadeStyle = useAnimatedStyle(() => ({
    opacity: translateProgress.value,
    transform: [{ translateY: 6 * (1 - translateProgress.value) }],
  }));

  const paragraphTokens = useMemo(
    () => page.paragraphs.map((paragraph) => getTokens(paragraph)),
    [page.paragraphs],
  );

  const baseParagraphStyle = { fontSize, lineHeight };

  // Drag-to-select plumbing (only exercised while `selecting` is true). Refs
  // (not state) because the geometry itself shouldn't trigger a re-render —
  // only `layoutVersion` does, once per layout/text-layout event, so the
  // handles' pixel positions (computed below) recompute against fresh data.
  const paragraphLayoutsRef = useRef<Map<number, ParagraphLayout>>(new Map());
  const paragraphLinesRef = useRef<Map<number, TextLine[]>>(new Map());
  const [layoutVersion, setLayoutVersion] = useState(0);
  const onRangeEdgeDragStartRef = useRef(onRangeEdgeDragStart);
  onRangeEdgeDragStartRef.current = onRangeEdgeDragStart;
  const onRangeEdgeDragRef = useRef(onRangeEdgeDrag);
  onRangeEdgeDragRef.current = onRangeEdgeDrag;
  const onRangeEdgeDragEndRef = useRef(onRangeEdgeDragEnd);
  onRangeEdgeDragEndRef.current = onRangeEdgeDragEnd;
  const paragraphsRef = useRef(page.paragraphs);
  paragraphsRef.current = page.paragraphs;

  // Hold on a paragraph -> the exact word under the finger (a stationary hold is
  // precise). Uses the press's OWN locationX/locationY (relative to the pressed
  // <Text>), which share the same coordinate space as that paragraph's
  // onTextLayout lines — no container-origin conversion. Reports the word AND
  // its sentence so the caller can open the action menu and act on either
  // choice. A short tap does nothing here — it bubbles to the chrome toggle.
  const handleWordLongPress = (paragraphIndex: number, evt: GestureResponderEvent) => {
    const paragraph = paragraphsRef.current[paragraphIndex];
    if (!paragraph) return;
    const offset = lineCharOffset(
      paragraph,
      paragraphLinesRef.current.get(paragraphIndex),
      evt.nativeEvent.locationX,
      evt.nativeEvent.locationY,
    );
    const hit = wordAtOffset(paragraph, offset);
    if (!hit) return;
    onWordLongPress({
      word: hit.word,
      paragraphIndex,
      page,
      start: hit.start,
      end: hit.end,
      pageX: evt.nativeEvent.pageX,
      pageY: evt.nativeEvent.pageY,
    });
  };

  const selectionRangeRef = useRef(selectionRange);
  selectionRangeRef.current = selectionRange;

  // The current on-screen pixel of a selection edge (its line's vertical centre).
  const edgePixelFor = (edge: 'start' | 'end') => {
    const sr = selectionRangeRef.current;
    if (!sr) return null;
    const pi = edge === 'start' ? sr.startParagraph : sr.endParagraph;
    const off = edge === 'start' ? sr.startOffset : sr.endOffset;
    const paragraph = paragraphsRef.current[pi];
    const layout = paragraphLayoutsRef.current.get(pi);
    const lines = paragraphLinesRef.current.get(pi);
    if (paragraph == null || !layout || !lines || lines.length === 0) return null;
    const px = locateOffsetPixel(paragraph, layout, lines, off);
    return px ? { x: px.x, y: px.top + px.height / 2 } : null;
  };

  // Delta-based handle dragging: captures the edge pixel at drag-start, then applies
  // gestureState.dx / gestureState.dy directly. Pure, 1:1, immune to layout coordinate bugs.
  const dragStartEdgePxRef = useRef<{ x: number; y: number } | null>(null);

  const beginHandleDrag = (edge: 'start' | 'end') => {
    dragStartEdgePxRef.current = edgePixelFor(edge);
    onRangeEdgeDragStartRef.current?.(edge);
  };

  const moveHandleDrag = (
    edge: 'start' | 'end',
    evt: GestureResponderEvent,
    gestureState: PanResponderGestureState,
  ) => {
    const startPx = dragStartEdgePxRef.current ?? edgePixelFor(edge);
    if (!startPx) return;
    const targetX = startPx.x + gestureState.dx;
    const targetY = startPx.y + gestureState.dy;

    const loc = locateParagraphOffset(
      paragraphsRef.current,
      paragraphLayoutsRef.current,
      paragraphLinesRef.current,
      targetX,
      targetY,
    );

    let direction: 'prev-page' | 'next-page' | null = null;
    const lastParaIdx = paragraphsRef.current.length - 1;
    const lastLayout = paragraphLayoutsRef.current.get(lastParaIdx);
    const firstLayout = paragraphLayoutsRef.current.get(0);
    const { pageX, pageY } = evt.nativeEvent;

    if (edge === 'end') {
      const isPastBottomY = lastLayout ? targetY >= lastLayout.y + lastLayout.height - 8 : false;
      const isNearScreenBottom = pageY >= screenHeight - bottomInset - 70;
      const isNearScreenRight = pageX >= screenWidth - 36;
      const isAtLastParagraphEnd =
        loc &&
        loc.paragraphIndex === lastParaIdx &&
        loc.charOffset >= (paragraphsRef.current[lastParaIdx]?.length ?? 0) - 2;

      if (isPastBottomY || isNearScreenBottom || isNearScreenRight || isAtLastParagraphEnd) {
        direction = 'next-page';
      } else if (
        targetY <= (firstLayout ? firstLayout.y + 8 : 8) ||
        pageY <= topInset + 80 ||
        pageX <= 36 ||
        (loc && loc.paragraphIndex === 0 && loc.charOffset <= 2 && (gestureState.dx < -5 || gestureState.dy < 0))
      ) {
        direction = 'prev-page';
      }
    } else if (edge === 'start') {
      const isPastTopY = firstLayout ? targetY <= firstLayout.y + 8 : targetY <= 8;
      const isNearScreenTop = pageY <= topInset + 80;
      const isNearScreenLeft = pageX <= 36;
      const isAtFirstParagraphStart = loc && loc.paragraphIndex === 0 && loc.charOffset <= 2;

      if (isPastTopY || isNearScreenTop || isNearScreenLeft || isAtFirstParagraphStart) {
        direction = 'prev-page';
      } else if (targetY >= (lastLayout ? lastLayout.y + lastLayout.height : screenHeight) || pageY >= screenHeight - bottomInset - 60) {
        direction = 'next-page';
      }
    }

    if (loc) {
      onRangeEdgeDragRef.current(edge, { paragraphIndex: loc.paragraphIndex, offset: loc.charOffset }, direction);
    } else if (direction) {
      const fallbackPos =
        edge === 'end'
          ? { paragraphIndex: lastParaIdx, offset: paragraphsRef.current[lastParaIdx]?.length ?? 0 }
          : { paragraphIndex: 0, offset: 0 };
      onRangeEdgeDragRef.current(edge, fallbackPos, direction);
    }
  };

  const endHandleDrag = (edge: 'start' | 'end') => {
    dragStartEdgePxRef.current = null;
    onRangeEdgeDragEndRef.current?.(edge);
  };

  const beginHandleDragRef = useRef(beginHandleDrag);
  beginHandleDragRef.current = beginHandleDrag;
  const moveHandleDragRef = useRef(moveHandleDrag);
  moveHandleDragRef.current = moveHandleDrag;
  const endHandleDragRef = useRef(endHandleDrag);
  endHandleDragRef.current = endHandleDrag;

  const startHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => beginHandleDragRef.current('start'),
      onPanResponderMove: (evt, gs) => moveHandleDragRef.current('start', evt, gs),
      onPanResponderRelease: () => endHandleDragRef.current('start'),
      onPanResponderTerminate: () => endHandleDragRef.current('start'),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const endHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => beginHandleDragRef.current('end'),
      onPanResponderMove: (evt, gs) => moveHandleDragRef.current('end', evt, gs),
      onPanResponderRelease: () => endHandleDragRef.current('end'),
      onPanResponderTerminate: () => endHandleDragRef.current('end'),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Pixel position of the selection's start and end offsets — recomputed
  // whenever the selection or the underlying layout changes (layoutVersion
  // bumps on every onLayout/onTextLayout).
  const handlePositions = useMemo(() => {
    if (!selectionRange) return null;
    const pixelAt = (paragraphIndex: number, offset: number) => {
      const paragraph = paragraphsRef.current[paragraphIndex];
      const layout = paragraphLayoutsRef.current.get(paragraphIndex);
      const lines = paragraphLinesRef.current.get(paragraphIndex);
      if (paragraph == null || !layout || !lines || lines.length === 0) return null;
      return locateOffsetPixel(paragraph, layout, lines, offset);
    };
    const start = pixelAt(selectionRange.startParagraph, selectionRange.startOffset);
    const end = pixelAt(selectionRange.endParagraph, selectionRange.endOffset);

    // Guaranteed visible handle fallback: if layout hasn't arrived yet on an offscreen/newly-mounted page,
    // synthesize a valid position so the handle is immediately visible and interactive.
    const fallbackTop = selectionRange.endParagraph * lineHeight;
    const fallbackEnd = end ?? {
      x: Math.max(20, Math.min(screenWidth - 40, (selectionRange.endOffset || 5) * (fontSize * 0.55))),
      top: fallbackTop,
      height: lineHeight,
    };
    const fallbackStart = start ?? {
      x: 0,
      top: 0,
      height: lineHeight,
    };
    return {
      start: fallbackStart,
      end: fallbackEnd,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutVersion is a manual invalidation signal for the refs above, not a value read directly.
  }, [selectionRange, page.paragraphs, layoutVersion, lineHeight, fontSize]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.xl,
          paddingTop: topInset + spacing.md,
          // Must match ReaderScreen's contentHeightPx bottom term exactly
          // (insets.bottom + 18) — a mismatch here means pagination budgets
          // for a shorter/taller page than what's actually rendered, so every
          // page ends up with the wrong amount of bottom whitespace.
          paddingBottom: bottomInset + 18,
        },
      ]}
    >
      {page.isChapterStart ? (
        <Animated.Text
          onPress={onPagePress}
          style={[
            typography.screenTitle,
            animatedBodyColorStyle,
            {
              fontFamily: isBengaliText(page.chapterTitle)
                ? pageStyleConfig.banglaBoldFont
                : pageStyleConfig.id === 'manuscript'
                ? pageStyleConfig.englishBoldFont
                : typography.screenTitle.fontFamily,
              marginTop: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
        >
          {page.chapterTitle}
        </Animated.Text>
      ) : null}

      {/* Body stack: the original and its translation occupy the SAME box, so
          the translated text inherits the original's exact left/right margins
          and first-line Y instead of re-deriving them from hardcoded offsets.
          Must have flex: 1 so translatedOverlay can fill the entire page height
          regardless of how short or sparse the original paragraphs are. */}
      <View style={styles.bodyStack}>
      <Animated.View
        style={originalFadeStyle}
        pointerEvents={showingTranslation ? 'none' : 'auto'}
      >
      {page.paragraphs.map((paragraph, paragraphIndex) => {
        // Selection mode: highlight the selected char range in this paragraph,
        // plus the layout/text-layout capture that lets the handles hit-test
        // this paragraph's real geometry.
        if (selecting && selectionRange) {
          const inRange =
            paragraphIndex >= selectionRange.startParagraph && paragraphIndex <= selectionRange.endParagraph;
          const selStart = !inRange
            ? -1
            : paragraphIndex === selectionRange.startParagraph
              ? selectionRange.startOffset
              : 0;
          const selEnd = !inRange
            ? -1
            : paragraphIndex === selectionRange.endParagraph
              ? selectionRange.endOffset
              : paragraph.length;
          return (
            <Animated.Text
              key={paragraphIndex}
              style={[
                typography.readingBody,
                animatedBodyColorStyle,
                baseParagraphStyle,
                {
                  fontFamily: isBengaliText(paragraph) ? pageStyleConfig.banglaFont : pageStyleConfig.englishFont,
                  fontSize: isBengaliText(paragraph) ? pageStyleConfig.banglaFontSize : pageStyleConfig.fontSize,
                  lineHeight: isBengaliText(paragraph) ? pageStyleConfig.banglaLineHeight : pageStyleConfig.lineHeight,
                  letterSpacing: isBengaliText(paragraph) ? pageStyleConfig.banglaLetterSpacing : pageStyleConfig.letterSpacing,
                  marginBottom: paragraphIndex === page.paragraphs.length - 1 ? 0 : spacing.sm,
                },
              ]}
              onLayout={(e) => {
                paragraphLayoutsRef.current.set(paragraphIndex, {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                });
                setLayoutVersion((v) => v + 1);
              }}
              onTextLayout={(e) => {
                paragraphLinesRef.current.set(
                  paragraphIndex,
                  e.nativeEvent.lines.map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height, text: l.text })),
                );
                setLayoutVersion((v) => v + 1);
              }}
            >
              {renderSelectionRuns(paragraph, selStart, selEnd, selectionColor, '#2B2621')}
            </Animated.Text>
          );
        }

        // Normal (reading) mode: the whole paragraph is ONE <Text> — cheap to
        // mount, so a page swipes in without the JS-thread hitch that ~1 <Text>
        // per word used to cause. Word taps and sentence long-presses are
        // resolved by hit-testing the tap against the wrapped-line geometry
        // captured below (handleWordTap / handleSentenceLongPress). Saved-vocab
        // words are the only per-word spans, and only when they exist.
        const highlightEntry = highlightMap.get(
          `${page.chapterIndex}-${page.pageIndexInChapter}-${paragraphIndex}`,
        );
        // Translucent wash (~35%) of the picker hue instead of the old solid
        // block + forced dark text: the page background shows through, so the
        // same marker reads correctly on both the parchment and charcoal pages
        // and the body text keeps its normal theme color.
        const highlightWash = highlightEntry ? `${highlightColors[highlightEntry.colorKey]}59` : undefined;
        // Single-paragraph highlight: mark only the exact saved substring, not
        // the whole paragraph.
        let highlightRun: { start: number; end: number } | null = null;
        if (highlightEntry?.quoteText) {
          const runStart = paragraph.indexOf(highlightEntry.quoteText);
          if (runStart !== -1) highlightRun = { start: runStart, end: runStart + highlightEntry.quoteText.length };
        }
        return (
          <Animated.Text
            key={paragraphIndex}
            style={[
              typography.readingBody,
              animatedBodyColorStyle,
              baseParagraphStyle,
              {
                fontFamily: isBengaliText(paragraph) ? pageStyleConfig.banglaFont : pageStyleConfig.englishFont,
                fontSize: isBengaliText(paragraph) ? pageStyleConfig.banglaFontSize : pageStyleConfig.fontSize,
                lineHeight: isBengaliText(paragraph) ? pageStyleConfig.banglaLineHeight : pageStyleConfig.lineHeight,
                letterSpacing: isBengaliText(paragraph) ? pageStyleConfig.banglaLetterSpacing : pageStyleConfig.letterSpacing,
                marginBottom: paragraphIndex === page.paragraphs.length - 1 ? 0 : spacing.sm,
                backgroundColor: highlightWash && !highlightRun ? highlightWash : undefined,
              },
            ]}
            onPress={onPagePress}
            onLongPress={(e) => handleWordLongPress(paragraphIndex, e)}
            onLayout={(e) => {
              paragraphLayoutsRef.current.set(paragraphIndex, {
                y: e.nativeEvent.layout.y,
                height: e.nativeEvent.layout.height,
              });
              setLayoutVersion((v) => v + 1);
            }}
            onTextLayout={(e) => {
              paragraphLinesRef.current.set(
                paragraphIndex,
                e.nativeEvent.lines.map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height, text: l.text })),
              );
              setLayoutVersion((v) => v + 1);
            }}
          >
            {highlightWash && highlightRun
              ? renderSelectionRuns(paragraph, highlightRun.start, highlightRun.end, highlightWash, textColor)
              : highlightWash
                ? paragraph
                : renderParagraphRuns(
                    paragraphTokens[paragraphIndex],
                    savedWordSet,
                    savedWordColor,
                    savedWordTextColor,
                    activeWordRange && activeWordRange.paragraphIndex === paragraphIndex
                      ? { start: activeWordRange.start, end: activeWordRange.end }
                      : null,
                    activeWordColor,
                    activeWordTextColor,
                  )}
          </Animated.Text>
        );
      })}

      {selecting && handlePositions ? (
        <>
          {/* Start handle: knob ABOVE the line. End handle: knob BELOW. The
              vertical offset (native-style) keeps the two handles grabbable even
              when the selection is a single word and their x's nearly coincide.
              Positioned inside Animated.View so top/left match the paragraph
              geometry directly (no missing container paddingTop or title spacer). */}
          {selectionRange.showStartHandle !== false ? (
            <View
              {...startHandlePanResponder.panHandlers}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={[
                styles.handleHitArea,
                { left: handlePositions.start.x - 22, top: handlePositions.start.top - 12 },
              ]}
            >
              <View style={[styles.handleKnob, { backgroundColor: selectionColor }]} />
              <View style={[styles.handleBar, { height: handlePositions.start.height, backgroundColor: selectionColor }]} />
            </View>
          ) : null}
          {selectionRange.showEndHandle !== false ? (
            <View
              {...endHandlePanResponder.panHandlers}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={[
                styles.handleHitArea,
                { left: handlePositions.end.x - 22, top: handlePositions.end.top },
              ]}
            >
              <View style={[styles.handleBar, { height: handlePositions.end.height, backgroundColor: selectionColor }]} />
              <View style={[styles.handleKnob, { backgroundColor: selectionColor }]} />
            </View>
          ) : null}
        </>
      ) : null}
      </Animated.View>

      {/* Whole-page translation — crossfades in over the original body in
          place (no separate screen). One <Text> per ORIGINAL paragraph, with
          the identical typography/margins, so paragraph breaks and rhythm
          survive the swap. Height is left to the content (no `bottom`): a
          translation that runs longer than its source must not be squeezed. */}
      {showingTranslation ? (
        <Animated.View
          style={[styles.translatedOverlay, translatedFadeStyle]}
          pointerEvents="auto"
        >
          {/* High-Contrast Segmented Header */}
          <View
            style={[
              styles.bilingualHeader,
              {
                backgroundColor: isLamp ? '#23201D' : '#EFE7DA',
                borderColor: isLamp ? '#36312B' : '#DFD4C2',
              },
            ]}
          >
            <View style={[styles.headerPillTrack, { backgroundColor: isLamp ? '#191816' : '#DFD4C1' }]}>
              {/* Sliding spring pill indicator */}
              <Animated.View
                style={[
                  styles.slidingPill,
                  {
                    width: tabWidth,
                    backgroundColor: isLamp ? '#3A342D' : '#FFFFFF',
                  },
                  sliderIndicatorStyle,
                ]}
              />
              <Pressable
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setTabWidth(w);
                }}
                onPress={() => handleSwitchMode(true)}
                style={styles.headerPillBtn}
              >
                <Text
                  style={[
                    styles.headerPillText,
                    {
                      color: interlinearMode
                        ? (isLamp ? '#F5EDE1' : '#1C1B1E')
                        : (isLamp ? '#8F8578' : '#736B60'),
                      fontWeight: interlinearMode ? '700' : '500',
                    },
                  ]}
                >
                  Parallel Study
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSwitchMode(false)}
                style={styles.headerPillBtn}
              >
                <Text
                  style={[
                    styles.headerPillText,
                    {
                      color: !interlinearMode
                        ? (isLamp ? '#F5EDE1' : '#1C1B1E')
                        : (isLamp ? '#8F8578' : '#736B60'),
                      fontWeight: !interlinearMode ? '700' : '500',
                    },
                  ]}
                >
                  Full Translation
                </Text>
              </Pressable>
            </View>

            {onCloseTranslation ? (
              <Pressable
                hitSlop={10}
                onPress={onCloseTranslation}
                style={[
                  styles.headerCloseBtn,
                  { backgroundColor: isLamp ? '#2E2924' : '#E2D7C5' },
                ]}
              >
                <Text
                  style={[
                    styles.headerCloseText,
                    { color: isLamp ? '#DDD1BF' : '#2D2721' },
                  ]}
                >
                  ✕ Close
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={true}
            overScrollMode="never"
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 64 }}
          >
            <Animated.View
              key={interlinearMode ? 'parallel' : 'full'}
              entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
              style={{ flexGrow: 1 }}
            >
              {interlinearMode ? (
                bilingualItems.map((bp) => (
                <View key={bp.paragraphIndex} style={styles.bilingualParagraphBlock}>
                  {bp.sentences.map((sent) => {
                    const isSpeakingOriginal = activeSpeechId === sent.id;
                    const isSpeakingTranslated = activeSpeechId === `${sent.id}_tr`;
                    const origTokens = tokenizeParagraph(sent.original);

                    return (
                      <View
                        key={sent.id}
                        style={[
                          styles.sentenceCard,
                          {
                            backgroundColor: isLamp ? '#23201D' : '#F7F1E6',
                            borderColor:
                              isSpeakingOriginal || isSpeakingTranslated
                                ? colors.flameAmber
                                : isLamp
                                  ? '#36312B'
                                  : '#E6DCCF',
                          },
                        ]}
                      >
                        {/* Source English Sentence with word-by-word tap */}
                        <View style={styles.sentenceSourceContainer}>
                          <View style={styles.sentenceWordsFlow}>
                            {origTokens.map((token, tIdx) => {
                              const clean = cleanWordForLookup(token);
                              const isWhitespace = /^\s+$/.test(token);
                              if (isWhitespace || !clean) {
                                return (
                                  <Text
                                    key={tIdx}
                                    style={[
                                      styles.sentenceWordText,
                                      {
                                        color: textColor,
                                        fontFamily: isBengaliText(sent.original)
                                          ? pageStyleConfig.banglaFont
                                          : pageStyleConfig.englishFont,
                                        fontSize: Math.max(16, fontSize - 1),
                                        lineHeight: Math.max(24, lineHeight - 2),
                                      },
                                    ]}
                                  >
                                    {token}
                                  </Text>
                                );
                              }

                              const isSaved = savedWordSet.has(clean.toLowerCase());
                              const isWordSpeaking = activeSpeechId === `word_${clean.toLowerCase()}`;
                              return (
                                <Pressable
                                  key={tIdx}
                                  unstable_pressDelay={75}
                                  hitSlop={3}
                                  onPress={() => {
                                    void speakWord(clean, isBengaliText(clean) ? 'bn' : 'en');
                                    onWordSelect?.(clean, bp.paragraphIndex);
                                  }}
                                  onLongPress={(e) => {
                                    const { pageX, pageY } = e.nativeEvent;
                                    onBilingualWordLongPress?.({
                                      word: clean,
                                      contextSentence: sent.original,
                                      paragraphIndex: bp.paragraphIndex,
                                      anchor: { x: pageX, y: pageY },
                                    });
                                  }}
                                  style={({ pressed }) => [
                                    styles.wordChip,
                                    isSaved && {
                                      backgroundColor: isLamp ? 'rgba(245, 166, 35, 0.22)' : 'rgba(245, 166, 35, 0.18)',
                                      borderRadius: 4,
                                      paddingHorizontal: 2,
                                    },
                                    pressed && { opacity: 0.6 },
                                    isWordSpeaking && styles.wordChipSpeaking,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.sentenceWordText,
                                      {
                                        color: isWordSpeaking
                                          ? colors.flameAmber
                                          : isSaved
                                          ? (isLamp ? colors.flameAmber : '#8A4F00')
                                          : textColor,
                                        fontWeight: isWordSpeaking || isSaved ? '700' : '400',
                                        fontFamily: isBengaliText(sent.original)
                                          ? pageStyleConfig.banglaFont
                                          : pageStyleConfig.englishFont,
                                        fontSize: Math.max(16, fontSize - 1),
                                        lineHeight: Math.max(24, lineHeight - 2),
                                        textDecorationLine: isSaved ? 'underline' : 'none',
                                        textDecorationColor: colors.flameAmber,
                                      },
                                    ]}
                                  >
                                    {token}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          {/* Sentence Speaker button */}
                          <Pressable
                            hitSlop={8}
                            onPress={() =>
                              void toggleSpeech(
                                sent.id,
                                sent.original,
                                isBengaliText(sent.original) ? 'bn' : 'en',
                              )
                            }
                            style={[
                              styles.sentencePlayBtn,
                              isSpeakingOriginal && styles.sentencePlayBtnActive,
                            ]}
                          >
                            <SpeakerIcon
                              color={isSpeakingOriginal ? '#1C1B1E' : colors.flameAmber}
                              size={15}
                            />
                          </Pressable>
                        </View>

                        {/* Translated Bengali Sentence */}
                        {sent.translated ? (
                          <View
                            style={[
                              styles.sentenceTranslationBox,
                              {
                                borderLeftColor: colors.flameAmber,
                                backgroundColor: isLamp
                                  ? 'rgba(245, 166, 35, 0.06)'
                                  : 'rgba(245, 166, 35, 0.08)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sentenceTranslationText,
                                {
                                  color: isLamp ? '#FAF6EF' : '#231F1A',
                                  fontFamily: pageStyleConfig.banglaFont,
                                  fontSize: pageStyleConfig.banglaFontSize,
                                  lineHeight: pageStyleConfig.banglaLineHeight,
                                },
                              ]}
                            >
                              {sent.translated}
                            </Text>
                            <Pressable
                              hitSlop={8}
                              onPress={() =>
                                void toggleSpeech(
                                  `${sent.id}_tr`,
                                  sent.translated,
                                  isBengaliText(sent.translated) ? 'bn' : 'en',
                                )
                              }
                              style={styles.sentenceSmallPlayBtn}
                            >
                              <SpeakerIcon
                                color={isSpeakingTranslated ? colors.flameAmber : colors.fawn}
                                size={13}
                              />
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))
            ) : (
              renderedTranslation!.map((paragraph, i) => (
                <Text
                  key={i}
                  onPress={onPagePress}
                  style={[
                    typography.readingBody,
                    {
                      color: textColor,
                      fontFamily: isBengaliText(paragraph)
                        ? pageStyleConfig.banglaFont
                        : pageStyleConfig.englishFont,
                      fontSize: isBengaliText(paragraph)
                        ? pageStyleConfig.banglaFontSize
                        : pageStyleConfig.fontSize,
                      lineHeight: isBengaliText(paragraph)
                        ? pageStyleConfig.banglaLineHeight
                        : pageStyleConfig.lineHeight,
                      letterSpacing: isBengaliText(paragraph)
                        ? pageStyleConfig.banglaLetterSpacing
                        : pageStyleConfig.letterSpacing,
                      marginBottom: i === renderedTranslation!.length - 1 ? 0 : spacing.md,
                    },
                    baseParagraphStyle,
                  ]}
                >
                  {paragraph}
                </Text>
              ))
            )}
            </Animated.View>
          </ScrollView>
        </Animated.View>
      ) : null}
      </View>
    </View>
  );
}

export const ReaderPageView = memo(ReaderPageViewImpl);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  bodyStack: {
    flex: 1,
  },
  handleHitArea: {
    position: 'absolute',
    width: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 20,
  },
  handleBar: {
    width: 2.5,
  },
  handleKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  translatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bilingualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerPillTrack: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 3,
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    elevation: 2,
  },
  headerPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    zIndex: 2,
  },
  headerPillText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  headerCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerCloseText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bilingualParagraphBlock: {
    marginBottom: 14,
  },
  sentenceCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 12,
  },
  sentenceSourceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sentenceWordsFlow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  wordChip: {
    borderRadius: 4,
    paddingHorizontal: 1,
  },
  wordChipSpeaking: {
    backgroundColor: 'rgba(245, 166, 35, 0.24)',
    borderRadius: 4,
  },
  sentenceWordText: {
    // dynamically sized via inline styles
  },
  sentencePlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sentencePlayBtnActive: {
    backgroundColor: '#F5A623',
  },
  sentenceTranslationBox: {
    marginTop: 8,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderLeftWidth: 2.5,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sentenceTranslationText: {
    flex: 1,
  },
  sentenceSmallPlayBtn: {
    padding: 4,
    marginTop: 2,
  },
});

