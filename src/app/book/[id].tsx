import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDarkSpineColor, spineColorForBook } from '@/components/BookSpine';
import { AddToShelfSheet } from '@/components/AddToShelfSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from '@/components/icons';
import { deleteBookCache, isBookCached } from '@/features/content-ingestion/bookDownloader';
import { deleteImportedBook, getBook, isImportedBook, type BookRow } from '@/db/repositories/books';
import { listHighlightsForBook } from '@/db/repositories/highlights';
import { getReadingPosition, type ReadingPosition } from '@/db/repositories/readingPosition';
import { listSavedWordsForBook, type SavedWord } from '@/db/repositories/savedWords';
import {
  addBookToShelf,
  createShelf,
  listShelfItems,
  listShelves,
  removeBookFromShelf,
  type Shelf,
  type ShelfItem,
} from '@/db/repositories/shelves';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BookRow | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const [quoteCount, setQuoteCount] = useState(0);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [shelfSheetVisible, setShelfSheetVisible] = useState(false);
  const targetLanguage = useTargetLanguage();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [bookRow, positionRow, highlights, words, shelfRows, shelfItemRows] = await Promise.all([
          getBook(id),
          getReadingPosition(id),
          listHighlightsForBook(id),
          listSavedWordsForBook(id),
          listShelves(),
          listShelfItems(),
        ]);
        if (!cancelled) {
          setBook(bookRow);
          setPosition(positionRow);
          setQuoteCount(highlights.length);
          setSavedWords(words);
          setDownloaded(bookRow ? isBookCached(bookRow.id) : false);
          setShelves(shelfRows);
          setShelfItems(shelfItemRows);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const memberShelfIds = new Set(shelfItems.filter((it) => it.bookId === id).map((it) => it.shelfId));

  const handleToggleShelf = async (shelf: Shelf) => {
    const isMember = memberShelfIds.has(shelf.id);
    setShelfItems((prev) =>
      isMember
        ? prev.filter((it) => !(it.shelfId === shelf.id && it.bookId === id))
        : [...prev, { shelfId: shelf.id, bookId: id }],
    );
    if (isMember) await removeBookFromShelf(shelf.id, id);
    else await addBookToShelf(shelf.id, id);
  };

  const handleCreateShelf = async (name: string) => {
    const shelf = await createShelf(name, [id]);
    setShelves((prev) => [...prev, shelf]);
    setShelfItems((prev) => [...prev, { shelfId: shelf.id, bookId: id }]);
  };

  const imported = book ? isImportedBook(book) : false;

  const handleMoreOptions = useCallback(() => {
    if (!book) return;
    setConfirmVisible(true);
  }, [book]);

  const handleConfirm = useCallback(async () => {
    if (!book) return;
    setConfirmVisible(false);
    if (imported) {
      // The user's own imported EPUB — remove it entirely (row is guaranteed
      // local by deleteImportedBook's WHERE clause; catalog rows can't be hit).
      await Promise.all([deleteImportedBook(book.id), deleteBookCache(book.id)]);
    } else {
      // Catalog title — only free the on-device download. Never deletes the
      // shared catalog row or the reading progress; it just re-downloads on
      // next open.
      await deleteBookCache(book.id);
    }
    router.back();
  }, [book, imported]);

  // Themed placeholder instead of bare null — null falls through to the root
  // navigator's charcoal contentStyle, which reads as a black-screen flash
  // during the (normally brief) moment before `book` loads.
  if (!book) return <View style={[styles.loadingPlaceholder, { backgroundColor: colors.parchment }]} />;

  // totalChapters === 0 means "not yet known" for a bulk-imported book (see
  // scripts/sync-bulk-catalog.mjs) — it's filled in locally the first time
  // the book is actually downloaded and parsed, not before. It does NOT mean
  // unavailable — a working textUrl is all that actually gates reading.
  const isAvailable = book.isAvailable && Boolean(book.textUrl);
  const percent = position ? position.percentComplete : 0;
  const chapterLabel = position
    ? book.totalChapters > 0
      ? `${Math.round(percent * 100)}% read · Chapter ${position.chapterIndex + 1} of ${book.totalChapters}`
      : `${Math.round(percent * 100)}% read`
    : isAvailable
      ? book.totalChapters > 0
        ? `${book.totalChapters} chapters`
        : 'Tap to start reading'
      : 'Coming soon';
  const coverColor = spineColorForBook(book.id, book.id.length);
  const coverIsDark = isDarkSpineColor(coverColor);
  const coverTextColor = coverIsDark ? colors.lampText : colors.ink;
  const coverCurlTint = coverIsDark ? 'rgba(245,237,225,0.22)' : 'rgba(43,38,33,0.2)';

  return (
    <ScrollView
      style={{ backgroundColor: colors.parchment }}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 },
      ]}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        {/* Only show the menu when there's actually an action: an imported book
            to delete, or a download to remove. A catalog book that's never been
            opened has nothing to manage, so no dots. */}
        {imported || downloaded ? (
          <Pressable onPress={handleMoreOptions} hitSlop={12}>
            <MoreHorizontalIcon color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.cover, { backgroundColor: coverColor }]}>
        {book.coverUrl && !coverFailed ? (
          // Real Gutenberg cover art; the painted title cover below is the
          // fallback when a book has none or the image fails to load.
          <Image
            source={{ uri: book.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <>
            <View style={[styles.coverAccent, { backgroundColor: colors.flameAmber, opacity: 0.6 }]} />
            <View>
              <Text style={[typography.bookCoverTitle, { color: coverTextColor }]}>{book.title}</Text>
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: coverTextColor, opacity: 0.6, fontSize: 10, marginTop: 8 },
                ]}
              >
                {book.author}
              </Text>
            </View>
          </>
        )}
        <View style={[styles.coverCurl, { borderBottomColor: coverCurlTint }]} />
      </View>

      <Text style={[typography.titleUiContext, { color: colors.ink, marginTop: spacing.lg }]}>
        {book.title}
      </Text>
      <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
        {book.author}
      </Text>

      <View style={[styles.badgeRow, { marginTop: spacing.md, gap: spacing.sm }]}>
        <View
          style={[
            styles.pairPill,
            { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill },
          ]}
        >
          <Text style={[typography.metadataCaption, { color: colors.pairPillText }]}>
            {book.sourceLanguage.toUpperCase()} → {targetLanguageLabel(targetLanguage)}
          </Text>
        </View>
        <View style={styles.quoteBadge}>
          <BookmarkIcon color={colors.fawn} size={14} filled />
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            {quoteCount} {quoteCount === 1 ? 'quote' : 'quotes'} saved
          </Text>
        </View>
      </View>

      <Pressable onPress={() => setShelfSheetVisible(true)} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
        <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
          {memberShelfIds.size > 0
            ? `On ${memberShelfIds.size} shelf${memberShelfIds.size === 1 ? '' : 'ves'} · Edit`
            : '+ Add to shelf'}
        </Text>
      </Pressable>

      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.hairline, borderRadius: radius.pill, marginTop: spacing.lg },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(4, Math.round(percent * 100))}%`,
              backgroundColor: colors.flameAmber,
              borderRadius: radius.pill,
            },
          ]}
        />
      </View>
      <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12, marginTop: 6 }]}>
        {chapterLabel}
      </Text>

      <Text style={[typography.readingBody, { color: colors.ink, marginTop: spacing.lg }]}>
        {book.synopsis}
      </Text>

      {savedWords.length > 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
            Saved from this book
          </Text>
          <View
            style={[
              styles.savedCard,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
          >
            {savedWords.map((word, index) => (
              <Pressable
                key={word.id}
                // Tap a saved word -> reopen the book on the exact page it was
                // saved from.
                onPress={() =>
                  router.push({
                    pathname: '/reader/[bookId]',
                    params: {
                      bookId: word.bookId,
                      jumpChapter: String(word.chapterIndex),
                      jumpPage: String(word.pageIndex),
                    },
                  })
                }
                style={[
                  styles.savedRow,
                  index < savedWords.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(43,38,33,0.08)',
                  },
                ]}
              >
                <Text
                  style={[typography.translatedWordInline, { color: colors.ink, fontSize: 14 }]}
                  numberOfLines={1}
                >
                  {word.sourceWord}{' '}
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                    → {word.translation}
                  </Text>
                </Text>
                <ChevronRightIcon color={colors.straw} size={14} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        disabled={!isAvailable}
        onPress={() => router.push({ pathname: '/reader/[bookId]', params: { bookId: book.id } })}
        style={[
          styles.cta,
          {
            backgroundColor: isAvailable ? colors.flameAmber : colors.hairline,
            borderRadius: radius.pill,
            height: layout.buttonHeight,
            marginTop: spacing.xl,
          },
        ]}
      >
        <Text style={[typography.buttonLabel, { color: isAvailable ? colors.primaryDark : colors.fawn }]}>
          {isAvailable ? (position ? 'Continue Reading' : 'Start Reading') : 'Coming soon'}
        </Text>
      </Pressable>

      <ConfirmDialog
        visible={confirmVisible}
        title={imported ? 'Delete this book?' : 'Remove download?'}
        message={
          imported
            ? 'This permanently deletes your imported book. Saved vocabulary and quotes from it are kept.'
            : 'Frees the on-device download. Your reading progress, vocabulary, and quotes are kept, and the book stays in the catalog — it re-downloads next time you open it.'
        }
        confirmLabel={imported ? 'Delete' : 'Remove'}
        destructive={imported}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmVisible(false)}
      />

      <AddToShelfSheet
        visible={shelfSheetVisible}
        shelves={shelves}
        memberShelfIds={memberShelfIds}
        onToggle={handleToggleShelf}
        onCreate={handleCreateShelf}
        onClose={() => setShelfSheetVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingPlaceholder: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cover: {
    width: 132,
    height: 190,
    alignSelf: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    padding: 16,
    paddingVertical: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  coverAccent: {
    width: 26,
    height: 3,
    borderRadius: 2,
  },
  coverCurl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderBottomWidth: 26,
    borderLeftWidth: 26,
    borderLeftColor: 'transparent',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedCard: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
