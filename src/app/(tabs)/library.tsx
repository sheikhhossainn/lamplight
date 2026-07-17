import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BookSpine } from '@/components/BookSpine';
import { CloseIcon, FilterIcon, SearchIcon } from '@/components/icons';
import { logEvent } from '@/features/analytics/analytics';
import { BOOK_CATEGORIES, categoriesForBook } from '@/features/content-ingestion/bookCategories';
import { useLibrarySyncing } from '@/features/content-ingestion/librarySync';
import { ShelfEditorModal, type ShelfDraft } from '@/components/ShelfEditorModal';
import { VocabReviewPrompt } from '@/components/VocabReviewPrompt';
import { FeelingPromptModal } from '@/features/scripture-verses/FeelingPromptModal';
import { checkVocabReviewPrompt, markVocabReviewPrompted } from '@/features/vocabulary/reviewPrompt';
import { type BookRow, listBooks } from '@/db/repositories/books';
import {
  hideFromContinueReading,
  listActiveReadingPositions,
  type ReadingPosition,
} from '@/db/repositories/readingPosition';
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
import { importEpubFromFile } from '@/features/content-ingestion/epubImporter';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');
// Small deterministic per-slot tilt so the shelf reads as covers leaning
// against each other, not a flat grid — cycled, not randomized per render.
const ROW_ROTATIONS = [-2, 1.5, -1, 2.5, -2.5, 1, -1.5, 2];
// Fixed slot width (BookSpine default 96 + Spacing.md gap) so the shelf
// FlatList can compute scroll offsets without measuring every item.
const SPINE_SLOT_WIDTH = 96 + 16;


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

// Placeholder shelf shown before the first DB read resolves — dim spine
// rectangles on the plank so the shelf reads as "loading", not empty/broken.
function SkeletonShelf() {
  const { colors, spacing } = useTheme();
  return (
    <>
      <View style={styles.shelfRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 96,
              height: 140,
              marginRight: spacing.md,
              backgroundColor: colors.card,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
              opacity: 0.6,
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        <WoodenPlank width={screenWidth - spacing.xl * 2} />
      </View>
    </>
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
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<{ wordCount: number } | null>(null);
  const [feelingModalVisible, setFeelingModalVisible] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // When the keyboard is dismissed (e.g. swipe-back gesture) the search input
  // keeps focus, so its cursor keeps blinking in an empty box. Blur it on hide
  // so the caret disappears once the user is done typing.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => searchRef.current?.blur());
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    const [bookRows, positionRows, shelfRows, shelfItemRows] = await Promise.all([
      listBooks(),
      listActiveReadingPositions(),
      listShelves(),
      listShelfItems(),
    ]);
    setBooks(bookRows);
    setPositions(positionRows);
    setShelves(shelfRows);
    setShelfItems(shelfItemRows);
    setLoaded(true);
  }, []);

  const handleClearContinue = useCallback(
    async (bookId: string) => {
      // Optimistic: drop it from the list immediately, then persist the hide.
      setPositions((prev) => prev.filter((p) => p.bookId !== bookId));
      await hideFromContinueReading(bookId);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await load();
        if (cancelled) return;
        // Library is the landing screen, so this is where the once-a-day review
        // invitation surfaces. Never in the reader — nothing interrupts reading.
        const { shouldPrompt, wordCount } = await checkVocabReviewPrompt();
        if (!cancelled && shouldPrompt) setReviewPrompt({ wordCount });
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  // When the background catalog refresh finishes, re-read the DB so a user
  // sitting on the Library sees the new books/categories appear without having
  // to leave and come back.
  const syncing = useLibrarySyncing();
  useEffect(() => {
    if (!syncing) void load();
  }, [syncing, load]);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = isSearching
    ? books.filter(
        (b) => b.title.toLowerCase().includes(trimmedQuery) || b.author.toLowerCase().includes(trimmedQuery),
      )
    : [];

  // Stable per-book tone slot without an O(n) indexOf per rendered spine —
  // matters once the remote catalog puts hundreds of rows on the shelf.
  const toneIndexById = new Map(books.map((b, i) => [b.id, i]));

  // Canonical categories per book, computed once per book-list change (not per
  // render/filter tap) so the "All books" filter stays instant on a large
  // catalog. Only categories that at least one book actually has are offered.
  const bookCategoryMap = useMemo(
    () => new Map(books.map((b) => [b.id, categoriesForBook(b.categories)])),
    [books],
  );
  const availableCategories = useMemo(() => {
    const present = new Set<string>();
    for (const ids of bookCategoryMap.values()) ids.forEach((id) => present.add(id));
    return BOOK_CATEGORIES.filter((c) => present.has(c.id));
  }, [bookCategoryMap]);

  // Every in-progress book (most-recent first), paired with its book row.
  // "All books" still shows the full library — the continue list is a shortcut,
  // not a filter, so a book you're mid-way through stays on its shelf too.
  const continueEntries = positions
    .map((position) => ({ position, book: books.find((b) => b.id === position.bookId) }))
    .filter((entry): entry is { position: ReadingPosition; book: BookRow } => entry.book !== undefined);

  // The "All books" shelf, narrowed to the active category filter (if any).
  const shelfBooks = activeCategory
    ? books.filter((b) => bookCategoryMap.get(b.id)?.includes(activeCategory))
    : books;

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

  const handleImportEpub = async () => {
    if (importing) return;
    try {
      const picked = await File.pickFileAsync(undefined, 'application/epub+zip');
      const file = Array.isArray(picked) ? picked[0] : picked;
      if (!file) return;
      setImporting(true);
      const book = await importEpubFromFile(file);
      logEvent('book_imported', { book_id: book.id });
      await load();
      router.push({ pathname: '/book/[id]', params: { id: book.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.toLowerCase().includes('cancel')) {
        Alert.alert('Import failed', message || 'Could not import this EPUB.');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteShelf = async () => {
    if (!editor.draft) return;
    await deleteShelf(editor.draft.id);
    setEditor({ visible: false, draft: null });
    await load();
  };

  // One horizontal, slidable shelf of book spines sitting on a wooden plank.
  // Windowed FlatList, not a mapped ScrollView — the remote catalog can put
  // hundreds of books on "All books", and mounting them all at once makes the
  // first render and every swipe stutter. Fixed slot width keeps scrolling
  // cheap (no per-item measurement).
  const renderShelf = (shelfBookList: BookRow[], keyPrefix: string) => (
    <>
      <FlatList
        horizontal
        data={shelfBookList}
        keyExtractor={(book) => `${keyPrefix}-${book.id}`}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.shelfRow}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        // NB: no removeClippedSubviews — on Android a horizontal FlatList
        // nested in this vertical ScrollView clips its own on-screen items when
        // the data array swaps (e.g. applying a category filter), leaving a
        // blank shelf. Windowing above already keeps mounting cheap.
        getItemLayout={(_, index) => ({ length: SPINE_SLOT_WIDTH, offset: SPINE_SLOT_WIDTH * index, index })}
        renderItem={({ item: book, index: i }) => (
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId={book.id}
              title={book.title}
              coverUrl={book.coverUrl}
              toneIndex={toneIndexById.get(book.id) ?? 0}
              rotateDeg={ROW_ROTATIONS[i % ROW_ROTATIONS.length]}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
            />
          </View>
        )}
      />
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

      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderRadius: radius.pill, marginTop: spacing.lg },
        ]}
      >
        <SearchIcon color={colors.fawn} size={16} />
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search books or authors"
          placeholderTextColor={colors.fawn}
          style={[typography.uiRowTitle, { color: colors.ink, flex: 1, marginLeft: spacing.sm, paddingVertical: 0 }]}
          returnKeyType="search"
        />
        {isSearching ? (
          <Pressable onPress={() => setQuery('')} hitSlop={12} style={styles.searchClear}>
            <CloseIcon color={colors.fawn} size={14} />
          </Pressable>
        ) : null}
      </View>

      {isSearching ? (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.md }]}>
            {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
          </Text>
          {searchResults.length > 0 ? (
            renderShelf(searchResults, 'search')
          ) : (
            <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
              No books match &ldquo;{query.trim()}&rdquo;.
            </Text>
          )}
        </View>
      ) : (
        <>
          {!loaded ? (
            <View style={{ marginTop: spacing.xl }}>
              <View
                style={[
                  styles.continueCard,
                  { backgroundColor: colors.card, borderRadius: radius.card, opacity: 0.6 },
                ]}
              >
                <View style={{ width: 56, height: 80, borderRadius: radius.bookCoverOuter, backgroundColor: colors.hairline }} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={{ width: '60%', height: 13, borderRadius: 4, backgroundColor: colors.hairline, marginBottom: spacing.sm }} />
                  <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.hairline }} />
                </View>
              </View>
            </View>
          ) : continueEntries.length > 0 ? (
        <>
          <Text
            style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm }]}
          >
            Continue reading
          </Text>
          {continueEntries.map(({ position, book }) => (
            <Pressable
              key={book.id}
              onPress={() => router.push({ pathname: '/reader/[bookId]', params: { bookId: book.id } })}
              style={[styles.continueCard, { backgroundColor: colors.card, borderRadius: radius.card, marginBottom: spacing.sm }]}
            >
              <BookSpine
                bookId={book.id}
                title={book.title}
                coverUrl={book.coverUrl}
                toneIndex={toneIndexById.get(book.id) ?? 0}
                onPress={() => router.push({ pathname: '/reader/[bookId]', params: { bookId: book.id } })}
                width={56}
                height={80}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink }]} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]} numberOfLines={1}>
                  {book.author} · {book.sourceLanguage.toUpperCase()} → {targetLanguageLabel(targetLanguage)}
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
                        width: `${Math.max(4, Math.round(position.percentComplete * 100))}%`,
                        backgroundColor: colors.flameAmber,
                        borderRadius: radius.pill,
                      },
                    ]}
                  />
                </View>
                <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 11, marginTop: 4 }]}>
                  {Math.round(position.percentComplete * 100)}% · Chapter {position.chapterIndex + 1}
                </Text>
              </View>
              {/* Clear from the list (keeps the bookmark — see repo). Own hit
                  target so it never triggers the card's open-book press. */}
              <Pressable
                onPress={() => handleClearContinue(book.id)}
                hitSlop={10}
                style={styles.continueClear}
              >
                <CloseIcon color={colors.straw} size={15} />
              </Pressable>
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={[styles.shelfHeader, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
        {/* "All books" doubles as the category filter — funnel icon beside it,
            amber while a category is active. */}
        <Pressable
          onPress={() => setFilterOpen((v) => !v)}
          hitSlop={8}
          style={styles.filterHeader}
        >
          <Text style={[typography.eyebrowLabel, { color: activeCategory ? colors.progressLabel : colors.fawn }]}>
            Browse
          </Text>
          <FilterIcon color={activeCategory ? colors.flameAmber : colors.fawn} size={14} />
        </Pressable>
        <Pressable onPress={handleImportEpub} disabled={importing}>
          <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
            {importing ? 'Importing…' : '+ Import EPUB'}
          </Text>
        </Pressable>
      </View>

      {/* Category chips — a horizontal filter row that opens under the header. */}
      {filterOpen && availableCategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.chipRow}
          style={{ marginBottom: spacing.md }}
        >
          {[{ id: null as string | null, label: 'All' }, ...availableCategories].map((cat) => {
            const on = cat.id === activeCategory;
            return (
              <Pressable
                key={cat.id ?? 'all'}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? colors.flameAmber : colors.card,
                    borderColor: on ? colors.flameAmber : colors.hairline,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.uiRowTitle,
                    { fontSize: 12, color: on ? colors.primaryDark : colors.umber },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {!loaded ? (
        <SkeletonShelf />
      ) : shelfBooks.length > 0 ? (
        renderShelf(shelfBooks, 'all')
      ) : syncing ? (
        // Books exist but this category is empty *so far* while the catalog is
        // still syncing — say so instead of showing a bare "none" message.
        <View style={[styles.shelfLoadingRow, { marginBottom: spacing.xl }]}>
          <ActivityIndicator size="small" color={colors.flameAmber} />
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>Loading more books…</Text>
        </View>
      ) : (
        <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: spacing.xl }]}>
          {activeCategory ? 'No books in this category yet.' : 'No books yet.'}
        </Text>
      )}

      {/* Scripture shelf — same shelf/spine visual language as "All books",
          just fixed entries that aren't part of the books catalog. Not gated
          on `loaded`: unlike the shelves above, this doesn't depend on any DB
          read, so it belongs in the static frame from first paint — gating it
          on `loaded` only made it pop in a beat late, growing the page height
          right when the real "All books" shelf also popped in. */}
      <View>
        <View style={[styles.shelfHeader, { marginBottom: spacing.md }]}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>Scriptures</Text>
          <Pressable
            onPress={() => setFeelingModalVisible(true)}
            hitSlop={8}
            style={styles.filterHeader}
          >
            <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>Feeling?</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={[styles.shelfRow, { marginBottom: spacing.sm }]}
        >
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId="quran"
              title="Quran"
              toneIndex={0}
              onPress={() => router.push({ pathname: '/quran' })}
            />
          </View>
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId="bible-ot"
              title="Bible — Old Testament"
              toneIndex={0}
              onPress={() => router.push({ pathname: '/bible' })}
            />
          </View>
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId="bible-nt"
              title="Bible — New Testament"
              toneIndex={0}
              onPress={() => router.push({ pathname: '/bible-nt' })}
            />
          </View>
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId="torah"
              title="Torah"
              toneIndex={0}
              onPress={() => router.push({ pathname: '/torah' })}
            />
          </View>
          <View style={{ marginRight: spacing.md }}>
            <BookSpine
              bookId="vedas"
              title="Vedas"
              toneIndex={0}
              onPress={() => router.push({ pathname: '/vedas' })}
            />
          </View>
        </ScrollView>
        <View style={{ marginBottom: spacing.xl }}>
          <WoodenPlank width={screenWidth - spacing.xl * 2} />
        </View>
      </View>

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
        </>
      )}

      <FeelingPromptModal
        visible={feelingModalVisible}
        onClose={() => setFeelingModalVisible(false)}
        onSubmit={(text) => {
          setFeelingModalVisible(false);
          router.push({ pathname: '/mood-verses/reflect', params: { text } });
        }}
      />

      <ShelfEditorModal
        visible={editor.visible}
        draft={editor.draft}
        books={books}
        onSave={handleSaveShelf}
        onDelete={editor.draft ? handleDeleteShelf : undefined}
        onClose={() => setEditor({ visible: false, draft: null })}
      />

      <VocabReviewPrompt
        visible={reviewPrompt != null}
        wordCount={reviewPrompt?.wordCount ?? 0}
        onReview={() => {
          void markVocabReviewPrompted();
          setReviewPrompt(null);
          router.push({ pathname: '/vocabulary', params: { tab: 'flashcards' } });
        }}
        onDismiss={() => {
          // Dismissing still answers the question for today — no second ask.
          void markVocabReviewPrompted();
          setReviewPrompt(null);
        }}
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
  continueClear: {
    alignSelf: 'flex-start',
    padding: 4,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingLeft: 16,
    paddingRight: 4,
  },
  // Real padded touch area — hitSlop alone loses the tap race to the
  // TextInput sitting flush against it.
  searchClear: {
    height: 44,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  shelfLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
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
