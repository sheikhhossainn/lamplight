import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CheckIcon, ChevronLeftIcon, TrashIcon } from '@/components/icons';
import { SkeletonRows } from '@/components/SkeletonRows';
import { listBooks, type BookRow } from '@/db/repositories/books';
import { deleteReadingPosition } from '@/db/repositories/readingPosition';
import { clearDownloadState, listDownloadStates, setDownloadState, type DownloadState } from '@/db/repositories/downloadStates';
import {
  cancelBookDownload,
  deleteBookCache,
  getBookText,
  listDownloadedBookIds,
  reconcileDownloadStates,
} from '@/features/content-ingestion/bookDownloader';
import { useTheme } from '@/theme/ThemeProvider';

// Storage manager: every book whose text is cached on this device, with
// single/multi/all selection to free the downloads. Deleting a download never
// touches the catalog row, saved words, or quotes — the book just re-downloads
// next time it's opened (same rule as Book Detail's "Delete book").
export default function SavedBooksScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [downloaded, setDownloaded] = useState<BookRow[]>([]);
  const [downloadIssues, setDownloadIssues] = useState<Array<{ book: BookRow; state: DownloadState }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [activeActionBookId, setActiveActionBookId] = useState<string | null>(null);

  const load = useCallback(async () => {
    await reconcileDownloadStates().catch(() => {});
    const ids = new Set(listDownloadedBookIds());
    const all = await listBooks();
    const states = await listDownloadStates();
    const stateByBook = new Map(states.map((state) => [state.bookId, state]));
    setDownloaded(all.filter((b) => ids.has(b.id)));
    setDownloadIssues(
      all
        .filter((book) => {
          const state = stateByBook.get(book.id);
          return Boolean(state && (state.status === 'failed' || state.status === 'downloading' || state.status === 'paused')) && !ids.has(book.id);
        })
        .map((book) => ({ book, state: stateByBook.get(book.id)! })),
    );
    setSelected(new Set());
    setLoaded(true);
  }, []);

  const handleDismissIssue = useCallback(async (bookId: string) => {
    await clearDownloadState(bookId).catch(() => {});
    setDownloadIssues((prev) => prev.filter((item) => item.book.id !== bookId));
  }, []);

  const handleCancelDownload = useCallback(async (bookId: string) => {
    setActiveActionBookId(bookId);
    try {
      cancelBookDownload(bookId);
      await setDownloadState({ bookId, status: 'failed', errorCode: 'cancelled' }).catch(() => {});
      await load();
    } finally {
      setActiveActionBookId(null);
    }
  }, [load]);

  const handleRetryDownload = useCallback(async (book: BookRow) => {
    setActiveActionBookId(book.id);
    try {
      await setDownloadState({ bookId: book.id, status: 'downloading', progress: 0 });
      await getBookText(book.id, book.title, book.textUrl, book.chapter1Anchor ?? undefined);
      await setDownloadState({ bookId: book.id, status: 'ready', progress: 100, errorCode: null });
      await load();
    } catch {
      await load();
    } finally {
      setActiveActionBookId(null);
    }
  }, [load]);

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

      {loaded && downloadIssues.length > 0 ? (
        <View style={[styles.issueCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 6 }]}>DOWNLOADS NEEDING ATTENTION</Text>
          {downloadIssues.map(({ book, state }) => {
            const isProcessing = activeActionBookId === book.id;
            return (
              <View key={book.id} style={styles.issueRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                    {book.title}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                    {state.status === 'downloading'
                      ? 'Downloading…'
                      : state.errorCode === 'cancelled'
                        ? 'Download cancelled'
                        : state.status === 'failed'
                          ? 'Download failed — try again'
                          : 'Download paused'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                  {state.status === 'downloading' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel download for ${book.title}`}
                      disabled={isProcessing}
                      onPress={() => void handleCancelDownload(book.id)}
                      hitSlop={8}
                      style={[styles.dismissButton, { borderColor: colors.hairline, borderRadius: radius.pill }]}
                    >
                      <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 12 }]}>Cancel</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dismiss download issue for ${book.title}`}
                      disabled={isProcessing}
                      onPress={() => void handleDismissIssue(book.id)}
                      hitSlop={8}
                      style={[styles.dismissButton, { borderColor: colors.hairline, borderRadius: radius.pill }]}
                    >
                      <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 12 }]}>Dismiss</Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retry download for ${book.title}`}
                    disabled={isProcessing}
                    onPress={() => void handleRetryDownload(book)}
                    hitSlop={8}
                    style={[styles.retryButton, { borderColor: colors.flameAmber, borderRadius: radius.pill }]}
                  >
                    <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12 }]}>
                      {isProcessing ? '…' : 'Retry'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

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
  issueCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissButton: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  retryButton: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
});
