import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronRightIcon, CloseIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import { useTheme } from '@/theme/ThemeProvider';

export type ReaderContentsChapter = {
  index: number;
  title: string;
  pageCount: number;
};

type ReaderContentsModalProps = {
  visible: boolean;
  chapters: ReaderContentsChapter[];
  currentChapterIndex: number;
  onSelectChapter: (chapterIndex: number) => void;
  onClose: () => void;
};

export function ReaderContentsModal({
  visible,
  chapters,
  currentChapterIndex,
  onSelectChapter,
  onClose,
}: ReaderContentsModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: colors.hairline }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[typography.uiRowTitle, styles.title, { color: colors.ink }]}>Table of Contents</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close table of contents"
              hitSlop={12}
              onPress={requestClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.55 }]}
            >
              <CloseIcon color={colors.fawn} size={17} />
            </Pressable>
          </View>

          <FlatList
            data={chapters}
            keyExtractor={(chapter) => String(chapter.index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.sm }}
            renderItem={({ item }) => {
              const isCurrent = item.index === currentChapterIndex;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  onPress={() => {
                    onSelectChapter(item.index);
                    requestClose();
                  }}
                  style={({ pressed }) => [
                    styles.chapterRow,
                    {
                      backgroundColor: isCurrent ? `${colors.flameAmber}12` : colors.parchment,
                      borderColor: isCurrent ? `${colors.flameAmber}66` : colors.hairline,
                      borderRadius: radius.card,
                    },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <View style={[styles.chapterNumber, { backgroundColor: isCurrent ? colors.flameAmber : colors.card }]}>
                    <Text style={[typography.eyebrowLabel, { color: isCurrent ? colors.primaryDark : colors.fawn }]}>
                      {item.index + 1}
                    </Text>
                  </View>
                  <View style={styles.chapterCopy}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                      {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                    </Text>
                  </View>
                  <ChevronRightIcon color={isCurrent ? colors.flameAmber : colors.fawn} size={17} />
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '86%',
  },
  grabber: {
    alignItems: 'center',
    marginBottom: 14,
  },
  grabberBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 6,
    marginTop: 1,
  },
  chapterRow: {
    minHeight: 66,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chapterCopy: {
    flex: 1,
    paddingRight: 8,
  },
});
