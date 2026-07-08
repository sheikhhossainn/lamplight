import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BookSpine } from '@/components/BookSpine';
import { type BookRow, listBooks } from '@/db/repositories/books';
import { type ReadingPosition, listAllReadingPositions } from '@/db/repositories/readingPosition';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');
const ROW_SIZE = 4;
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

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function LibraryScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [positions, setPositions] = useState<ReadingPosition[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [bookRows, positionRows] = await Promise.all([listBooks(), listAllReadingPositions()]);
        if (!cancelled) {
          setBooks(bookRows);
          setPositions(positionRows);
          setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const continuePosition = positions[0];
  const continueBook = continuePosition ? books.find((b) => b.id === continuePosition.bookId) : undefined;
  const shelfBooks = continueBook ? books.filter((b) => b.id !== continueBook.id) : books;
  const shelfRows = chunk(shelfBooks, ROW_SIZE);

  return (
    <ScrollView
      style={{ backgroundColor: colors.libraryBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 }]}
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
                {continueBook.author} · {continueBook.sourceLanguage.toUpperCase()} → ES
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
        <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>Your shelf</Text>
        <Pressable onPress={() => Alert.alert('Import EPUB', 'Coming in a later milestone.')}>
          <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>
            + Import EPUB
          </Text>
        </Pressable>
      </View>

      {loaded
        ? shelfRows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ marginBottom: spacing.xl }}>
              <View style={styles.shelfRow}>
                {row.map((book, columnIndex) => {
                  const overallIndex = rowIndex * ROW_SIZE + columnIndex;
                  return (
                    <View key={book.id} style={{ marginRight: spacing.md }}>
                      <BookSpine
                        bookId={book.id}
                        title={book.title}
                        toneIndex={books.indexOf(book)}
                        rotateDeg={ROW_ROTATIONS[overallIndex % ROW_ROTATIONS.length]}
                        onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={{ marginTop: spacing.sm }}>
                <WoodenPlank width={screenWidth - spacing.xl * 2} />
              </View>
            </View>
          ))
        : null}
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
