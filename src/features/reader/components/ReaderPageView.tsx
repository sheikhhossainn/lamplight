import { Fragment, memo, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { cleanWordForLookup, splitIntoSentences, tokenizeParagraph } from '@/features/reader/engine/words';
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
  // Non-null only on the page where a "Save quote" selection is in progress:
  // the `${paragraphIndex}:${sentenceIndex}` keys currently selected. When set,
  // the page switches from word-tapping to sentence-selecting and shows the
  // two drag handles at the start/end of the range.
  selectionKeys: string[] | null;
  selectionColor: string;
  onWordPress: (word: string, paragraphIndex: number) => void;
  // Long-pressing a word anchors quote selection at the exact sentence
  // pressed (the caller enters selection mode immediately — no menu).
  onWordLongPress: (paragraphIndex: number, page: ReaderPage, sentenceIndex: number) => void;
  // Reports "the sentence currently under the finger" — fired continuously
  // while dragging (either straight after the long-press, before the finger
  // lifts, or from one of the two handles afterward). `edge` says which end
  // of the range this drag is moving; the caller re-derives the range from
  // the OTHER (currently fixed) end to this key.
  onRangeEdgeDrag: (edge: 'start' | 'end', key: string) => void;
};

type Token = { text: string; word: string | null };
type TextLine = { x: number; y: number; width: number; height: number; text: string };
type ParagraphLayout = { y: number; height: number };
type HandlePixel = { x: number; top: number; height: number };

// Tokenizing/sentence-splitting a paragraph is the most expensive part of
// rendering a page — cache both per paragraph string so they're computed once.
const tokenCache = new Map<string, Token[]>();
const sentenceCache = new Map<string, string[]>();
const tokenSentenceIndexCache = new Map<string, number[]>();
const sentenceEndOffsetCache = new Map<string, number[]>();

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

function getSentences(paragraph: string): string[] {
  const cached = sentenceCache.get(paragraph);
  if (cached) return cached;
  const sentences = splitIntoSentences(paragraph);
  sentenceCache.set(paragraph, sentences);
  return sentences;
}

// Cumulative end-offset (in characters, within the paragraph string) of each
// sentence — the shared basis for mapping any character offset (from a
// tapped word, a drag's hit-tested touch point, or a handle's position) to a
// sentence index, and back.
function getSentenceEndOffsets(paragraph: string): number[] {
  const cached = sentenceEndOffsetCache.get(paragraph);
  if (cached) return cached;
  const sentences = getSentences(paragraph);
  const offsets: number[] = [];
  let end = 0;
  for (const sentence of sentences) {
    end += sentence.length;
    offsets.push(end);
  }
  sentenceEndOffsetCache.set(paragraph, offsets);
  return offsets;
}

function sentenceIndexForOffset(paragraph: string, offset: number): number {
  const ends = getSentenceEndOffsets(paragraph);
  for (let i = 0; i < ends.length - 1; i += 1) {
    if (offset < ends[i]) return i;
  }
  return Math.max(0, ends.length - 1);
}

// Tokens and sentences both partition the paragraph string exactly (their
// pieces concatenate back to it), so a token's sentence is found by walking
// both lists in lockstep against a shared character offset — this is what
// lets a word long-press anchor quote selection at the sentence actually
// pressed, instead of always the paragraph's first sentence.
function getTokenSentenceIndices(paragraph: string): number[] {
  const cached = tokenSentenceIndexCache.get(paragraph);
  if (cached) return cached;
  const tokens = getTokens(paragraph);
  const sentenceEndOffsets = getSentenceEndOffsets(paragraph);
  const indices: number[] = [];
  let offset = 0;
  let sentenceIdx = 0;
  for (const token of tokens) {
    while (sentenceIdx < sentenceEndOffsets.length - 1 && offset >= sentenceEndOffsets[sentenceIdx]) {
      sentenceIdx += 1;
    }
    indices.push(sentenceIdx);
    offset += token.text.length;
  }
  tokenSentenceIndexCache.set(paragraph, indices);
  return indices;
}

// Hit-test a touch point (already converted to the paragraph column's own
// coordinate space) against the real wrapped-line geometry RN reported via
// onTextLayout, and resolve it to a `${paragraphIndex}:${sentenceIndex}` key.
// This is what lets dragging follow the finger through however the text
// actually wrapped, instead of guessing from font metrics.
function locateSentenceKey(
  paragraphs: string[],
  paragraphLayouts: Map<number, ParagraphLayout>,
  paragraphLines: Map<number, TextLine[]>,
  localX: number,
  localY: number,
): string | null {
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
    // Dragged above the first paragraph or below the last — clamp to whichever
    // paragraph is nearest rather than losing the selection entirely.
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
  if (!paragraph || !lines || lines.length === 0) return `${bestParagraph}:0`;

  const relY = localY - bestLayout.y;
  let lineIndex = lines.findIndex((line) => relY >= line.y && relY < line.y + line.height);
  if (lineIndex === -1) {
    lineIndex = relY < lines[0].y ? 0 : lines.length - 1;
  }

  let charOffset = 0;
  for (let i = 0; i < lineIndex; i += 1) {
    // RN's line-wrap trims the wrapping whitespace off both lines' `text` —
    // add one character back per break so the running offset stays aligned
    // with the original paragraph string (and its sentence boundaries).
    charOffset += lines[i].text.length + 1;
  }
  const line = lines[lineIndex];
  const fraction = line.width > 0 ? Math.min(1, Math.max(0, (localX - line.x) / line.width)) : 0;
  charOffset += Math.round(fraction * line.text.length);

  return `${bestParagraph}:${sentenceIndexForOffset(paragraph, charOffset)}`;
}

// The inverse of locateSentenceKey: given a character offset within a
// paragraph, find where it sits on the real wrapped-line geometry — used to
// place the two drag handles at the exact start/end of the current range.
function locateOffsetPixel(
  paragraphLayouts: Map<number, ParagraphLayout>,
  paragraphLines: Map<number, TextLine[]>,
  paragraphIndex: number,
  charOffset: number,
): HandlePixel | null {
  const layout = paragraphLayouts.get(paragraphIndex);
  const lines = paragraphLines.get(paragraphIndex);
  if (!layout || !lines || lines.length === 0) return null;

  let cumulative = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineEnd = cumulative + line.text.length;
    const isLast = i === lines.length - 1;
    if (charOffset <= lineEnd || isLast) {
      const within = Math.max(0, Math.min(line.text.length, charOffset - cumulative));
      const fraction = line.text.length > 0 ? within / line.text.length : 0;
      return {
        x: line.x + fraction * line.width,
        top: layout.y + line.y,
        height: line.height,
      };
    }
    cumulative = lineEnd + 1; // matches locateSentenceKey's wrap-space accounting
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
  selectionKeys,
  selectionColor,
  onWordPress,
  onWordLongPress,
  onRangeEdgeDrag,
}: ReaderPageViewProps) {
  const { typography, spacing } = useTheme();

  const selecting = selectionKeys != null;
  const selectedSet = useMemo(() => new Set(selectionKeys ?? []), [selectionKeys]);

  const paragraphTokens = useMemo(
    () => page.paragraphs.map((paragraph) => getTokens(paragraph)),
    [page.paragraphs],
  );
  const paragraphSentences = useMemo(
    () => (selecting ? page.paragraphs.map((paragraph) => getSentences(paragraph)) : null),
    [page.paragraphs, selecting],
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
  const selectingRef = useRef(selecting);
  selectingRef.current = selecting;
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

  // Continues extending the range from right after the long-press, while the
  // same finger that triggered it is still down and moving (no lift needed
  // for a first rough pick) — always moves the "end" since the anchor sentence
  // starts out as both ends of a single-sentence range.
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => selectingRef.current,
      onMoveShouldSetPanResponder: () => selectingRef.current,
      onPanResponderMove: (evt) => {
        const { x, y } = toLocalPoint(evt);
        const key = locateSentenceKey(paragraphsRef.current, paragraphLayoutsRef.current, paragraphLinesRef.current, x, y);
        if (key) onRangeEdgeDragRef.current('end', key);
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  // The two draggable handles, for adjusting the range after the finger has
  // lifted — each claims the touch immediately (it's a small dedicated knob,
  // not shared with anything else) and reports its own edge.
  const startHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { x, y } = toLocalPoint(evt);
        const key = locateSentenceKey(paragraphsRef.current, paragraphLayoutsRef.current, paragraphLinesRef.current, x, y);
        if (key) onRangeEdgeDragRef.current('start', key);
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;
  const endHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { x, y } = toLocalPoint(evt);
        const key = locateSentenceKey(paragraphsRef.current, paragraphLayoutsRef.current, paragraphLinesRef.current, x, y);
        if (key) onRangeEdgeDragRef.current('end', key);
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  // Pixel position of the start of the first selected sentence and the end
  // of the last one — recomputed whenever the selection or the underlying
  // layout changes (layoutVersion bumps on every onLayout/onTextLayout).
  const handlePositions = useMemo(() => {
    if (!selectionKeys || selectionKeys.length === 0) return null;
    const startKey = selectionKeys[0];
    const endKey = selectionKeys[selectionKeys.length - 1];
    const [sp, ss] = startKey.split(':').map(Number);
    const [ep, es] = endKey.split(':').map(Number);
    const startParagraph = page.paragraphs[sp];
    const endParagraph = page.paragraphs[ep];
    if (startParagraph == null || endParagraph == null) return null;

    const startEnds = getSentenceEndOffsets(startParagraph);
    const startOffset = ss === 0 ? 0 : startEnds[ss - 1];

    const endEnds = getSentenceEndOffsets(endParagraph);
    const endSentenceText = getSentences(endParagraph)[es] ?? '';
    const endOffset = (es === 0 ? 0 : endEnds[es - 1]) + endSentenceText.trimEnd().length;

    const start = locateOffsetPixel(paragraphLayoutsRef.current, paragraphLinesRef.current, sp, startOffset);
    const end = locateOffsetPixel(paragraphLayoutsRef.current, paragraphLinesRef.current, ep, endOffset);
    if (!start || !end) return null;
    return { start, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutVersion is a manual invalidation signal for the refs above, not a value read directly.
  }, [selectionKeys, page.paragraphs, layoutVersion]);

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.xl,
          paddingTop: topInset + spacing.xl,
          paddingBottom: bottomInset + 16,
        },
      ]}
      onLayout={() => {
        containerRef.current?.measureInWindow((x, y) => {
          containerOriginRef.current = { x, y };
        });
      }}
      {...dragPanResponder.panHandlers}
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
      ) : null}

      {page.paragraphs.map((paragraph, paragraphIndex) => {
        // Selection mode: sentence spans, plus the layout/text-layout capture
        // that lets the drag gesture and the handles hit-test this
        // paragraph's real geometry.
        if (selecting && paragraphSentences) {
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
              {paragraphSentences[paragraphIndex].map((sentence, sentenceIndex) => {
                const key = `${paragraphIndex}:${sentenceIndex}`;
                const isSelected = selectedSet.has(key);
                return (
                  <Text
                    key={sentenceIndex}
                    style={
                      isSelected
                        ? { backgroundColor: selectionColor, color: '#2B2621' }
                        : undefined
                    }
                  >
                    {sentence}
                  </Text>
                );
              })}
            </Text>
          );
        }

        // Normal mode: word-level tap/long-press, with saved-word markers and
        // whole-paragraph quote highlights.
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
          >
            {paragraphTokens[paragraphIndex].map((token, tokenIndex) => {
              if (token.word == null) {
                return <Fragment key={tokenIndex}>{token.text}</Fragment>;
              }
              const isSaved = !highlightColor && savedWordSet.has(token.word.toLowerCase());
              return (
                <Text
                  key={tokenIndex}
                  onPress={() => onWordPress(token.word!, paragraphIndex)}
                  onLongPress={() =>
                    onWordLongPress(paragraphIndex, page, getTokenSentenceIndices(paragraph)[tokenIndex])
                  }
                  style={
                    isSaved
                      ? { backgroundColor: savedWordColor, color: savedWordTextColor }
                      : undefined
                  }
                >
                  {token.text}
                </Text>
              );
            })}
          </Text>
        );
      })}

      {selecting && handlePositions ? (
        <>
          <View
            {...startHandlePanResponder.panHandlers}
            style={[
              styles.handleHitArea,
              { left: handlePositions.start.x - 16, top: handlePositions.start.top - 4 },
            ]}
          >
            <View style={[styles.handleBar, { height: handlePositions.start.height, backgroundColor: selectionColor }]} />
            <View style={[styles.handleKnob, { backgroundColor: selectionColor }]} />
          </View>
          <View
            {...endHandlePanResponder.panHandlers}
            style={[
              styles.handleHitArea,
              { left: handlePositions.end.x - 16, top: handlePositions.end.top - 4 },
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
  // 32px wide hit target centered on the handle's true x — the visible bar +
  // knob are much thinner, but a knob you can actually grab with a fingertip
  // needs a wider invisible catch area (native handles do the same).
  handleHitArea: {
    position: 'absolute',
    width: 32,
    alignItems: 'center',
  },
  handleBar: {
    width: 2,
  },
  handleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -2,
  },
});
