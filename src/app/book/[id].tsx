import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDarkSpineColor, spineColorForBook } from '@/components/BookSpine';
import { BookmarkIcon, ChevronLeftIcon, MoreHorizontalIcon } from '@/components/icons';
import { type BookRow, getBook } from '@/db/repositories/books';
import { listHighlightsForBook } from '@/db/repositories/highlights';
import { getReadingPosition, type ReadingPosition } from '@/db/repositories/readingPosition';
import { useTheme } from '@/theme/ThemeProvider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BookRow | null>(null);
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const [quoteCount, setQuoteCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [bookRow, positionRow, highlights] = await Promise.all([
          getBook(id),
          getReadingPosition(id),
          listHighlightsForBook(id),
        ]);
        if (!cancelled) {
          setBook(bookRow);
          setPosition(positionRow);
          setQuoteCount(highlights.length);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  if (!book) return null;

  const isAvailable = book.isBundled && book.totalChapters > 0;
  const percent = position ? position.percentComplete : 0;
  const chapterLabel = position
    ? `${Math.round(percent * 100)}% read · Chapter ${position.chapterIndex + 1} of ${book.totalChapters}`
    : isAvailable
      ? `${book.totalChapters} chapters`
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
    >
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={() => Alert.alert(book.title, 'More options coming in a later milestone.')}
          hitSlop={12}
        >
          <MoreHorizontalIcon color={colors.ink} />
        </Pressable>
      </View>

      <View style={[styles.cover, { backgroundColor: coverColor }]}>
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
            {book.sourceLanguage.toUpperCase()} → ES
          </Text>
        </View>
        <View style={styles.quoteBadge}>
          <BookmarkIcon color={colors.fawn} size={14} filled />
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            {quoteCount} {quoteCount === 1 ? 'quote' : 'quotes'} saved
          </Text>
        </View>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
