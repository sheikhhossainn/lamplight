import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { getLatestBibleReadingPosition, type BibleReadingPosition } from '@/db/repositories/bible';
import { listBooks, type BibleNtBookMeta } from '@/features/bible-content/bibleNtData';
import { ContinueReadingSkeleton } from '@/features/reader/components/ContinueReadingSkeleton';
import { useGuardedPush } from '@/lib/navigationGuard';
import { useTheme } from '@/theme/ThemeProvider';

export default function BibleNtBookListScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const [latestPosition, setLatestPosition] = useState<BibleReadingPosition | null>(null);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const books = listBooks();
  const push = useGuardedPush();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getLatestBibleReadingPosition().then((position) => {
        if (!cancelled) {
          setLatestPosition(position);
          setPositionLoaded(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const latestBook = latestPosition ? books.find((b) => b.id === latestPosition.bookId) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]}>
          Bible · New Testament
        </Text>
      </View>

      {!positionLoaded ? (
        <ContinueReadingSkeleton />
      ) : latestBook && latestPosition ? (
        <Pressable
          onPress={() =>
            push({
              pathname: '/bible-nt/[bookId]',
              params: {
                bookId: latestPosition.bookId,
                jumpChapter: String(latestPosition.chapter),
                jumpVerse: String(latestPosition.verse),
              },
            })
          }
          style={[
            styles.continueCard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              marginHorizontal: layout.screenMargin,
              marginTop: spacing.lg,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 4 }]}>Continue reading</Text>
            <Text style={[typography.uiRowTitle, { color: colors.ink }]}>
              {latestBook.name} {latestPosition.chapter}:{latestPosition.verse}
            </Text>
          </View>
          <ChevronRightIcon color={colors.straw} />
        </Pressable>
      ) : null}

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: layout.screenMargin, paddingTop: spacing.lg, paddingBottom: insets.bottom + 32 },
        ]}
        renderItem={({ item, index }: { item: BibleNtBookMeta; index: number }) => (
          <Pressable
            onPress={() => push({ pathname: '/bible-nt/[bookId]', params: { bookId: item.id } })}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <View style={[styles.numberBadge, { backgroundColor: colors.card, borderRadius: radius.pill }]}>
              <Text style={[typography.metadataCaption, { color: colors.umber }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>{item.name}</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                {item.chapterCount} chapters · {item.meaning}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  list: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numberBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
