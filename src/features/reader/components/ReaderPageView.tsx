import { Fragment, memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import type { ReaderPage } from '@/features/reader/engine/paginate';
import type { HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderPageViewProps = {
  page: ReaderPage;
  textColor: string;
  // Status-bar/notch clearance — Lamp modes have no persistent chrome to push
  // content down, so without this the chapter title sits flush against the
  // top of the screen.
  topInset: number;
  // Reader-body font size (px) and line height (px), derived from the
  // Settings screen's Font size / Line spacing sliders — see readingPrefs.ts.
  fontSize: number;
  lineHeight: number;
  // A stable Map + the swatch color lookup, rather than a per-render closure —
  // React.memo below can only skip re-rendering pages whose props are
  // reference-stable, and an inline `(i) => ...` closure recreated on every
  // parent render would defeat that regardless of whether anything relevant
  // actually changed for this specific page.
  highlightMap: Map<string, HighlightColorKey>;
  highlightColors: Record<HighlightColorKey, string>;
  onWordPress: (word: string, paragraphIndex: number) => void;
  onParagraphLongPress: (paragraphIndex: number) => void;
};

type Token = { text: string; word: string | null };

// Tokenizing a paragraph into per-word spans is the most expensive part of
// rendering a page (many words, each becoming its own Text node) — cache it
// per paragraph string so paragraphs never need to be re-split once computed,
// even across re-mounts (FlatList can recycle/recreate cells for the same
// underlying page while paging back and forth).
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

function ReaderPageViewImpl({
  page,
  textColor,
  topInset,
  fontSize,
  lineHeight,
  highlightMap,
  highlightColors,
  onWordPress,
  onParagraphLongPress,
}: ReaderPageViewProps) {
  const { typography, spacing } = useTheme();

  const paragraphTokens = useMemo(
    () => page.paragraphs.map((paragraph) => getTokens(paragraph)),
    [page.paragraphs],
  );

  return (
    <View
      style={[styles.container, { paddingHorizontal: spacing.xl, paddingTop: topInset + spacing.xl }]}
    >
      {page.isChapterStart ? (
        <Text style={[typography.screenTitle, { color: textColor, marginBottom: spacing.md }]}>
          {page.chapterTitle}
        </Text>
      ) : null}

      {page.paragraphs.map((paragraph, paragraphIndex) => {
        const highlightKey = highlightMap.get(
          `${page.chapterIndex}-${page.pageIndexInChapter}-${paragraphIndex}`,
        );
        const highlightColor = highlightKey ? highlightColors[highlightKey] : undefined;
        // Highlight colors are bright markers, so highlighted text always uses
        // dark ink (like a real highlighter) — otherwise cream Lamp-mode text
        // would be unreadable on top of the highlight.
        const paragraphTextColor = highlightColor ? '#2B2621' : textColor;
        return (
          <Text
            key={paragraphIndex}
            onLongPress={() => onParagraphLongPress(paragraphIndex)}
            style={[
              typography.readingBody,
              {
                color: paragraphTextColor,
                backgroundColor: highlightColor,
                fontSize,
                lineHeight,
                // Tighter than the previous spacing.md (16) — with the reading
                // body's generous line-height, that read as oversized gaps
                // between short (especially dialogue) paragraphs.
                marginBottom: spacing.sm,
              },
            ]}
          >
            {paragraphTokens[paragraphIndex].map((token, tokenIndex) =>
              token.word == null ? (
                <Fragment key={tokenIndex}>{token.text}</Fragment>
              ) : (
                <Text key={tokenIndex} onPress={() => onWordPress(token.word!, paragraphIndex)}>
                  {token.text}
                </Text>
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
}

export const ReaderPageView = memo(ReaderPageViewImpl);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
