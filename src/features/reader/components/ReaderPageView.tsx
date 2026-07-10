import { memo, useMemo, useRef, useState, type ReactElement } from 'react';
import { PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { charAdvance } from '@/features/reader/engine/glyphWidths';
import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import type { ReaderPage } from '@/features/reader/engine/paginate';
import type { HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderPageViewProps = {
  page: ReaderPage;
  textColor: string;
  topInset: number;
  bottomInset: number;
  fontSize: number;
  lineHeight: number;
  highlightMap: Map<string, HighlightColorKey>;
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
  selectionRange: { startParagraph: number; startOffset: number; endParagraph: number; endOffset: number } | null;
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
  // the 'start' edge, word end for the 'end' edge). The caller re-derives the
  // range, keeping the other edge fixed.
  onRangeEdgeDrag: (edge: 'start' | 'end', pos: { paragraphIndex: number; offset: number }) => void;
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
  if (text.length === 0) return 0;
  const widths: number[] = [];
  let total = 0;
  for (const ch of text) {
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
  return text.length;
}

// The inverse: a character index within a line's text -> its fraction across the
// line (so a handle's pixel position matches where charIndexAtFraction would map
// a touch back — forward and inverse must use the same width model).
function fractionAtCharIndex(text: string, index: number): number {
  if (text.length === 0) return 0;
  let total = 0;
  const widths: number[] = [];
  for (const ch of text) {
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
    const idx = line.text.length > 0 ? paragraph.indexOf(line.text, pos) : -1;
    if (idx >= 0) {
      starts.push(idx);
      pos = idx + line.text.length;
    } else {
      starts.push(pos);
      pos += line.text.length;
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
    const lineStart = starts[i];
    const lineEnd = lineStart + line.text.length;
    const isLast = i === lines.length - 1;
    if (charOffset <= lineEnd || isLast) {
      const within = Math.max(0, Math.min(line.text.length, charOffset - lineStart));
      const fraction = fractionAtCharIndex(line.text, within);
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
  onRangeEdgeDrag,
}: ReaderPageViewProps) {
  const { typography, spacing } = useTheme();

  const selecting = selectionRange != null;

  const paragraphTokens = useMemo(
    () => page.paragraphs.map((paragraph) => getTokens(paragraph)),
    [page.paragraphs],
  );

  const baseParagraphStyle = { fontSize, lineHeight, marginBottom: spacing.sm };

  // Drag-to-select plumbing (only exercised while `selecting` is true). Refs
  // (not state) because the geometry itself shouldn't trigger a re-render —
  // only `layoutVersion` does, once per layout/text-layout event, so the
  // handles' pixel positions (computed below) recompute against fresh data.
  const containerRef = useRef<View>(null);
  const containerOriginRef = useRef({ x: 0, y: 0 });
  const paragraphLayoutsRef = useRef<Map<number, ParagraphLayout>>(new Map());
  const paragraphLinesRef = useRef<Map<number, TextLine[]>>(new Map());
  const [layoutVersion, setLayoutVersion] = useState(0);
  const onRangeEdgeDragRef = useRef(onRangeEdgeDrag);
  onRangeEdgeDragRef.current = onRangeEdgeDrag;
  const paragraphsRef = useRef(page.paragraphs);
  paragraphsRef.current = page.paragraphs;
  // Children's onLayout is relative to the container's content box (i.e.
  // already past its own padding) — this mirrors that same padding so a
  // window-space touch point converts into the same coordinate space.
  const contentOffsetRef = useRef({ top: 0, left: 0 });
  contentOffsetRef.current = { top: topInset + spacing.xl, left: spacing.xl };

  const toLocalPoint = (evt: GestureResponderEvent) => {
    const { pageX, pageY } = evt.nativeEvent;
    return {
      x: pageX - containerOriginRef.current.x - contentOffsetRef.current.left,
      y: pageY - containerOriginRef.current.y - contentOffsetRef.current.top,
    };
  };

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
    if (paragraph == null || !layout || !lines) return null;
    const px = locateOffsetPixel(paragraph, layout, lines, off);
    return px ? { x: px.x, y: px.top + px.height / 2 } : null;
  };

  // Native handle behaviour: dragging maps a point OFFSET from the finger to the
  // character, not the fingertip itself — so the edge stays put on grab (no
  // jump) and then tracks the finger, sitting a little away from the fingertip
  // (above/beside it) so it stays visible. On touch-down we capture the offset
  // between the finger and the actual edge; every move re-applies it.
  const grabOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const beginHandleDrag = (edge: 'start' | 'end', evt: GestureResponderEvent) => {
    const finger = toLocalPoint(evt);
    const edgePx = edgePixelFor(edge);
    grabOffsetRef.current = edgePx ? { x: edgePx.x - finger.x, y: edgePx.y - finger.y } : { x: 0, y: 0 };
  };
  const moveHandleDrag = (edge: 'start' | 'end', evt: GestureResponderEvent) => {
    const finger = toLocalPoint(evt);
    const targetX = finger.x + grabOffsetRef.current.x;
    const targetY = finger.y + grabOffsetRef.current.y;
    const loc = locateParagraphOffset(
      paragraphsRef.current,
      paragraphLayoutsRef.current,
      paragraphLinesRef.current,
      targetX,
      targetY,
    );
    if (loc) onRangeEdgeDragRef.current(edge, { paragraphIndex: loc.paragraphIndex, offset: loc.charOffset });
  };
  // The once-created PanResponders read these refs so they always call the
  // current closures (fresh refs), never a stale first-render copy.
  const beginHandleDragRef = useRef(beginHandleDrag);
  beginHandleDragRef.current = beginHandleDrag;
  const moveHandleDragRef = useRef(moveHandleDrag);
  moveHandleDragRef.current = moveHandleDrag;

  // The two draggable handles adjust the range character by character. Each
  // claims the touch immediately (a small dedicated knob) and moves only its own
  // edge; dragging the page body does nothing (native-style — the handles are
  // the only way to extend, so it never fights a stray touch).
  const startHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => beginHandleDragRef.current('start', evt),
      onPanResponderMove: (evt) => moveHandleDragRef.current('start', evt),
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;
  const endHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => beginHandleDragRef.current('end', evt),
      onPanResponderMove: (evt) => moveHandleDragRef.current('end', evt),
      onPanResponderTerminationRequest: () => true,
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
      if (paragraph == null || !layout || !lines) return null;
      return locateOffsetPixel(paragraph, layout, lines, offset);
    };
    const start = pixelAt(selectionRange.startParagraph, selectionRange.startOffset);
    const end = pixelAt(selectionRange.endParagraph, selectionRange.endOffset);
    if (!start || !end) return null;
    return { start, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutVersion is a manual invalidation signal for the refs above, not a value read directly.
  }, [selectionRange, page.paragraphs, layoutVersion]);

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.xl,
          paddingTop: topInset + spacing.xl,
          // Must match ReaderScreen's contentHeightPx bottom term exactly
          // (insets.bottom + 20) — a mismatch here means pagination budgets
          // for a shorter/taller page than what's actually rendered, so every
          // page ends up with the wrong amount of bottom whitespace.
          paddingBottom: bottomInset + 20,
        },
      ]}
      onLayout={() => {
        containerRef.current?.measureInWindow((x, y) => {
          containerOriginRef.current = { x, y };
        });
      }}
    >
      {page.isChapterStart ? (
        <Text
          style={[
            typography.screenTitle,
            { color: textColor, marginTop: spacing.xl, marginBottom: spacing.lg },
          ]}
        >
          {page.chapterTitle}
        </Text>
      ) : (
        // Continuation page: an empty band the exact height of the chapter-title
        // footprint (marginTop + lineHeight + marginBottom), so the body's first
        // line lands at the same Y as on a chapter-start page — no jump when
        // paging. Must match the paginator's chapterTitleExtraPx.
        <View style={{ height: spacing.xl + typography.screenTitle.lineHeight + spacing.lg }} />
      )}

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
            <Text
              key={paragraphIndex}
              style={[typography.readingBody, { color: textColor }, baseParagraphStyle]}
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
            </Text>
          );
        }

        // Normal (reading) mode: the whole paragraph is ONE <Text> — cheap to
        // mount, so a page swipes in without the JS-thread hitch that ~1 <Text>
        // per word used to cause. Word taps and sentence long-presses are
        // resolved by hit-testing the tap against the wrapped-line geometry
        // captured below (handleWordTap / handleSentenceLongPress). Saved-vocab
        // words are the only per-word spans, and only when they exist.
        const highlightKey = highlightMap.get(
          `${page.chapterIndex}-${page.pageIndexInChapter}-${paragraphIndex}`,
        );
        const highlightColor = highlightKey ? highlightColors[highlightKey] : undefined;
        const paragraphTextColor = highlightColor ? '#2B2621' : textColor;
        return (
          <Text
            key={paragraphIndex}
            style={[
              typography.readingBody,
              { color: paragraphTextColor, backgroundColor: highlightColor, ...baseParagraphStyle },
            ]}
            onLongPress={(e) => handleWordLongPress(paragraphIndex, e)}
            onLayout={(e) => {
              paragraphLayoutsRef.current.set(paragraphIndex, {
                y: e.nativeEvent.layout.y,
                height: e.nativeEvent.layout.height,
              });
            }}
            onTextLayout={(e) => {
              paragraphLinesRef.current.set(
                paragraphIndex,
                e.nativeEvent.lines.map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height, text: l.text })),
              );
            }}
          >
            {highlightColor
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
          </Text>
        );
      })}

      {selecting && handlePositions ? (
        <>
          {/* Start handle: knob ABOVE the line. End handle: knob BELOW. The
              vertical offset (native-style) keeps the two handles grabbable even
              when the selection is a single word and their x's nearly coincide.
              `spacing.xl` re-adds the container's left padding: the offset pixels
              are content-relative (0 = text left) but the handle is positioned in
              the container's border box, so without it the handles sit a padding
              width too far left (the start handle fell off the screen edge). */}
          <View
            {...startHandlePanResponder.panHandlers}
            style={[
              styles.handleHitArea,
              { left: spacing.xl + handlePositions.start.x - 14, top: handlePositions.start.top - 11 },
            ]}
          >
            <View style={[styles.handleKnob, { backgroundColor: selectionColor }]} />
            <View style={[styles.handleBar, { height: handlePositions.start.height, backgroundColor: selectionColor }]} />
          </View>
          <View
            {...endHandlePanResponder.panHandlers}
            style={[
              styles.handleHitArea,
              { left: spacing.xl + handlePositions.end.x - 14, top: handlePositions.end.top },
            ]}
          >
            <View style={[styles.handleBar, { height: handlePositions.end.height, backgroundColor: selectionColor }]} />
            <View style={[styles.handleKnob, { backgroundColor: selectionColor }]} />
          </View>
        </>
      ) : null}
    </View>
  );
}

export const ReaderPageView = memo(ReaderPageViewImpl);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Belt-and-suspenders against the rare pagination overestimate — never let
    // a stray last line spill past the page's own bounds onto the next page.
    overflow: 'hidden',
  },
  // 28px wide hit target centered on the handle's true x — the visible bar +
  // knob are much thinner, but a knob you can actually grab with a fingertip
  // needs a wider invisible catch area (native handles do the same).
  handleHitArea: {
    position: 'absolute',
    width: 28,
    alignItems: 'center',
  },
  handleBar: {
    width: 2,
  },
  handleKnob: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
});
