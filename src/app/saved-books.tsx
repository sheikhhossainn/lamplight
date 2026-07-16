import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CheckIcon, ChevronLeftIcon, TrashIcon } from '@/components/icons';
import { SkeletonRows } from '@/components/SkeletonRows';
import { listBooks, type BookRow } from '@/db/repositories/books';
import { deleteReadingPosition } from '@/db/repositories/readingPosition';
import { deleteBookCache, listDownloadedBookIds } from '@/features/content-ingestion/bookDownloader';
import { useTheme } from '@/theme/ThemeProvider';

// Storage manager: every book whose text is cached on this device, with
// single/multi/all selection to free the downloads. Deleting a download never
// touches the catalog row, saved words, or quotes — the book just re-downloads
// next time it's opened (same rule as Book Detail's "Delete book").
export default function SavedBooksScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [downloaded, setDownloaded] = useState<BookRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    const ids = new Set(listDownloadedBookIds());
    const all = await listBooks();
    setDownloaded(all.filter((b) => ids.has(b.id)));
    setSelected(new Set());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggle = (bookId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const allSelected = downloaded.length > 0 && selected.size === downloaded.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(downloaded.map((b) => b.id)));
  };

  const confirmDelete = () => {
    if (selected.size === 0) return;
    setConfirmVisible(true);
  };

  const handleConfirm = async () => {
    setConfirmVisible(false);
    for (const bookId of selected) {
      await deleteBookCache(bookId);
      await deleteReadingPosition(bookId);
    }
    await load();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.parchment, paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon color={colors.ink} size={20} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, flex: 1 }]}>Saved books</Text>
        {downloaded.length > 0 ? (
          <Pressable onPress={toggleAll} hitSlop={10}>
            <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
              {allSelected ? 'Clear all' : 'Select all'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: spacing.lg }]}>
        {downloaded.length} {downloaded.length === 1 ? 'book' : 'books'} downloaded on this device
      </Text>

      {!loaded ? (
        <SkeletonRows />
      ) : downloaded.length === 0 ? (
        <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.lg }]}>
          No downloads yet — a book is saved here the first time you open it.
        </Text>
      ) : (
        <FlatList
          data={downloaded}
          keyExtractor={(b) => b.id}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: book, index }) => {
            const isSelected = selected.has(book.id);
            return (
              <Pressable
                onPress={() => toggle(book.id)}
                style={[
                  styles.row,
                  index < downloaded.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? colors.flameAmber : colors.straw,
                      backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <CheckIcon color={colors.primaryDark} size={12} /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
                  <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink }]}>
                    {book.title}
                  </Text>
                  <Text numberOfLines={1} style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                    {book.author}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {selected.size > 0 ? (
        <Pressable
          onPress={confirmDelete}
          style={[
            styles.deleteBar,
            {
              backgroundColor: colors.flameAmber,
              borderRadius: radius.pill,
              bottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <TrashIcon color={colors.primaryDark} size={16} />
          <Text style={[typography.buttonLabel, { color: colors.primaryDark, marginLeft: 8 }]}>
            Delete {selected.size} {selected.size === 1 ? 'book' : 'books'}
          </Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete downloads"
        message={`Remove ${selected.size} downloaded ${selected.size === 1 ? 'book' : 'books'} from this device? Saved words and quotes stay; a book re-downloads if you open it again.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
