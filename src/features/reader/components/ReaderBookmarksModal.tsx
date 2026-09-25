import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CloseIcon, TrashIcon } from '@/components/icons';
import type { Bookmark } from '@/db/repositories/bookmarks';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import { useTheme } from '@/theme/ThemeProvider';

export type ReaderBookmarksModalProps = {
  visible: boolean;
  bookmarks: Bookmark[];
  chapterTitles: Map<number, string>;
  onClose: () => void;
  onJump: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
};

export function ReaderBookmarksModal({
  visible,
  bookmarks,
  chapterTitles,
  onClose,
  onJump,
  onDelete,
}: ReaderBookmarksModalProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20 }]}>Bookmarks</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 3 }]}>Return to a page without creating a quote.</Text>
            </View>
            <Pressable onPress={requestClose} accessibilityLabel="Close bookmarks" hitSlop={10}>
              <CloseIcon color={colors.ink} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.sm }} showsVerticalScrollIndicator={false}>
            {bookmarks.length === 0 ? (
              <Text style={[typography.metadataCaption, { color: colors.umber, paddingVertical: spacing.lg }]}>Bookmark the current page from the reader menu.</Text>
            ) : bookmarks.map((bookmark) => (
              <View key={bookmark.id} style={[styles.row, { borderBottomColor: colors.hairline }]}>
                <Pressable onPress={() => onJump(bookmark)} style={{ flex: 1 }}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink }]} numberOfLines={1}>
                    {bookmark.label || chapterTitles.get(bookmark.chapterIndex) || `Chapter ${bookmark.chapterIndex + 1}`}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>Page {bookmark.pageIndex + 1}</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(bookmark)} accessibilityLabel="Delete bookmark" hitSlop={10} style={styles.deleteButton}>
                  <TrashIcon color={colors.fawn} size={16} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  card: { width: '88%', maxHeight: '72%', borderWidth: 1, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  deleteButton: { padding: 8, marginLeft: 8 },
});
