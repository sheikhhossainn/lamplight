import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BookSpine } from '@/components/BookSpine';
import { ShelfEditorModal, type ShelfDraft } from '@/components/ShelfEditorModal';
import { type BookRow, listBooks } from '@/db/repositories/books';
import { type ReadingPosition, listAllReadingPositions } from '@/db/repositories/readingPosition';
import {
  createShelf,
  deleteShelf,
  listShelfItems,
  listShelves,
  renameShelf,
  setShelfBooks,
  type Shelf,
  type ShelfItem,
} from '@/db/repositories/shelves';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');
// Small deterministic per-slot tilt so the shelf reads as covers leaning
// against each other, not a flat grid — cycled, not randomized per render.
const ROW_ROTATIONS = [-2, 1.5, -1, 2.5, -2.5, 1, -1.5, 2];

function getShelfSubtitle(): string {
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const hour = now.getHours();
  const isEvening = hour >= 17 || hour < 6;
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  return `${day} ${timeOfDay} · ${isEvening ? 'lamp low' : 'lamp bright'}`;
}

function WoodenPlank({ width }: { width: number }) {
  return (
    <Svg width={width} height={14} style={{ borderRadius: 2 }}>
      <Defs>
        <LinearGradient id="plank" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C9A25E" />
          <Stop offset="55%" stopColor="#8A6A3A" />
          <Stop offset="100%" stopColor="#6B4F28" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={14} rx={2} fill="url(#plank)" />
    </Svg>
  );
}

export default function LibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [positions, setPositions] = useState<ReadingPosition[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<{ visible: boolean; draft: ShelfDraft }>({ visible: false, draft: null });

  const load = useCallback(async () => {
    const [bookRows, positionRows, shelfRows, shelfItemRows] = await Promise.all([
      listBooks(),
      listAllReadingPositions(),
      listShelves(),
      listShelfItems(),
    ]);
    setBooks(bookRows);
    setPositions(positionRows);
    setShelves(shelfRows);
    setShelfItems(shelfItemRows);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await load();
        if (cancelled) return;
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const continuePosition = positions[0];
  const continueBook = continuePosition ? books.find((b) => b.id === continuePosition.bookId) : undefined;
  const shelfBooks = continueBook ? books.filter((b) => b.id !== continueBook.id) : books;

  const booksOnShelf = (shelfId: string): BookRow[] => {
    const ids = new Set(shelfItems.filter((it) => it.shelfId === shelfId).map((it) => it.bookId));
    return books.filter((b) => ids.has(b.id));
  };

  const handleSaveShelf = async (name: string, bookIds: string[]) => {
    const draft = editor.draft;
    if (draft) {
      await renameShelf(draft.id, name);
      await setShelfBooks(draft.id, bookIds);
    } else {
      await createShelf(name, bookIds);
    }
    setEditor({ visible: false, draft: null });
    await load();
  };

  const handleDeleteShelf = async () => {
    if (!editor.draft) return;
    await deleteShelf(editor.draft.id);
    setEditor({ visible: false, draft: null });
    await load();
  };

  // One horizontal, slidable shelf of book spines sitting on a wooden plank.
  const renderShelf = (shelfBookList: BookRow[], keyPrefix: string) => (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.shelfRow}
      >
        {shelfBookList.map((book, i) => (
          <View key={`${keyPrefix}-${book.id}`} style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId={book.id}
              title={book.title}
              toneIndex={books.indexOf(book)}
              rotateDeg={ROW_ROTATIONS[i % ROW_ROTATIONS.length]}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
            />
          </View>
        ))}
      </ScrollView>
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        <WoodenPlank width={screenWidth - spacing.xl * 2} />
      </View>
    </>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.libraryBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <Text style={[typography.screenTitle, { color: colors.ink }]}>Your shelf</Text>
      <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
        {getShelfSubtitle()}
      </Text>

      {continueBook && continuePosition ? (
        <>
          <Text
            style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}
          >
            Continue reading
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: '/reader/[bookId]', params: { bookId: continueBook.id } })}
            style={[styles.continueCard, { backgroundColor: colors.card, borderRadius: radius.card }]}
          >
            <BookSpine
              bookId={continueBook.id}
              title={continueBook.title}
              toneIndex={books.indexOf(continueBook)}
              onPress={() => router.push({ pathname: '/reader/[bookId]', params: { bookId: continueBook.id } })}
              width={56}
              height={80}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>{continueBook.title}</Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                {continueBook.author} · {continueBook.sourceLanguage.toUpperCase()} →{' '}
                {targetLanguageLabel(targetLanguage)}
              </Text>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.hairline, borderRadius: radius.pill, marginTop: spacing.sm },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(4, Math.round(continuePosition.percentComplete * 100))}%`,
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                    },
                  ]}
                />
              </View>
              <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 11, marginTop: 4 }]}>
                {Math.round(continuePosition.percentComplete * 100)}% · Chapter{' '}
                {continuePosition.chapterIndex + 1}
              </Text>
            </View>
          </Pressable>
        </>
      ) : null}

      <View style={[styles.shelfHeader, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
        <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>All books</Text>
        <Pressable onPress={() => Alert.alert('Import EPUB', 'Coming in a later milestone.')}>
          <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
            + Import EPUB
          </Text>
        </Pressable>
      </View>

      {loaded ? renderShelf(shelfBooks, 'all') : null}

      {/* User-created category shelves. */}
      {loaded
        ? shelves.map((shelf) => {
            const shelfBookList = booksOnShelf(shelf.id);
            return (
              <View key={shelf.id}>
                <View style={[styles.shelfHeader, { marginBottom: spacing.md }]}>
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>{shelf.name}</Text>
                  <Pressable
                    onPress={() =>
                      setEditor({
                        visible: true,
                        draft: { id: shelf.id, name: shelf.name, bookIds: shelfBookList.map((b) => b.id) },
                      })
                    }
                    hitSlop={8}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>Edit</Text>
                  </Pressable>
                </View>
                {shelfBookList.length > 0 ? (
                  renderShelf(shelfBookList, shelf.id)
                ) : (
                  <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: spacing.xl }]}>
                    No books yet — tap Edit to add some.
                  </Text>
                )}
              </View>
            );
          })
        : null}

      {loaded ? (
        <Pressable
          onPress={() => setEditor({ visible: true, draft: null })}
          style={[styles.newShelf, { borderColor: colors.straw, borderRadius: radius.card }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>+ New shelf</Text>
        </Pressable>
      ) : null}

      <ShelfEditorModal
        visible={editor.visible}
        draft={editor.draft}
        books={books}
        onSave={handleSaveShelf}
        onDelete={editor.draft ? handleDeleteShelf : undefined}
        onClose={() => setEditor({ visible: false, draft: null })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  newShelf: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 4,
  },
  progressTrack: {
    height: 5,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
  },
});
