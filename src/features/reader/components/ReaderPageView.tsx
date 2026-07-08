import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cleanWordForLookup, tokenizeParagraph } from '@/features/reader/engine/words';
import type { ReaderPage } from '@/features/reader/engine/paginate';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderPageViewProps = {
  page: ReaderPage;
  textColor: string;
  highlightColorForParagraph?: (paragraphIndex: number) => string | undefined;
  onWordPress: (word: string, paragraphIndex: number) => void;
  onParagraphLongPress: (paragraphIndex: number) => void;
};

export function ReaderPageView({
  page,
  textColor,
  highlightColorForParagraph,
  onWordPress,
  onParagraphLongPress,
}: ReaderPageViewProps) {
  const { typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl, paddingTop: spacing.xl }]}>
      {page.isChapterStart ? (
        <Text style={[typography.screenTitle, { color: textColor, marginBottom: spacing.md }]}>
          {page.chapterTitle}
        </Text>
      ) : null}

      {page.paragraphs.map((paragraph, paragraphIndex) => {
        const highlightColor = highlightColorForParagraph?.(paragraphIndex);
        return (
          <Text
            key={paragraphIndex}
            onLongPress={() => onParagraphLongPress(paragraphIndex)}
            style={[
              typography.readingBody,
              {
                color: textColor,
                backgroundColor: highlightColor,
                marginBottom: spacing.md,
              },
            ]}
          >
            {tokenizeParagraph(paragraph).map((token, tokenIndex) => {
              if (/^\s+$/.test(token)) {
                return <Fragment key={tokenIndex}>{token}</Fragment>;
              }
              const word = cleanWordForLookup(token);
              if (!word) {
                return <Fragment key={tokenIndex}>{token}</Fragment>;
              }
              return (
                <Text key={tokenIndex} onPress={() => onWordPress(word, paragraphIndex)}>
                  {token}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
