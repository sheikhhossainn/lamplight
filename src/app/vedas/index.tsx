import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { getLatestBibleReadingPosition, type BibleReadingPosition } from '@/db/repositories/bible';
import { listBooks, type VedasBookMeta } from '@/features/vedas-content/vedasData';
import { ContinueReadingSkeleton } from '@/features/reader/components/ContinueReadingSkeleton';
import { useGuardedPush } from '@/lib/navigationGuard';
import { useTheme } from '@/theme/ThemeProvider';

export default function VedasBookListScreen() {
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
          // Verify it's a Vedas book (starts with RV)
          if (position && position.bookId.startsWith('RV')) {
            setLatestPosition(position);
          } else {
            setLatestPosition(null);
          }
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
          Rigveda
        </Text>
      </View>

      {!positionLoaded ? (
        <ContinueReadingSkeleton />
      ) : latestBook && latestPosition ? (
        <Pressable
          onPress={() =>
            push({
              pathname: '/vedas/[bookId]',
              params: {
                bookId: latestPosition.bookId,
                jumpChapter: String(latestPosition.chapter),
                jumpVerse: String(latestPosition.verse),
              },
            })
          }
          style={({ pressed }) => [
            styles.continueCard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              marginHorizontal: layout.screenMargin,
              marginTop: spacing.lg,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 4 }]}>Continue reading</Text>
            <Text style={[typography.uiRowTitle, { color: colors.ink }]}>
              {latestBook.name} Hymn {latestPosition.chapter}:{latestPosition.verse}
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
        renderItem={({ item, index }: { item: VedasBookMeta; index: number }) => {
          const isLastRead = latestPosition?.bookId === item.id;
          return (
            <Pressable
              onPress={() =>
                push({
                  pathname: '/vedas/[bookId]',
                  params: {
                    bookId: item.id,
                    ...(isLastRead && latestPosition
                      ? { jumpChapter: String(latestPosition.chapter), jumpVerse: String(latestPosition.verse) }
                      : {}),
                  },
                })
              }
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.hairline },
                isLastRead && { backgroundColor: `${colors.pairPillBackground}25` },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={[
                  styles.numberBadge,
                  {
                    backgroundColor: isLastRead ? colors.pairPillBackground : colors.card,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.metadataCaption,
                    {
                      color: isLastRead ? colors.pairPillText : colors.umber,
                      fontWeight: isLastRead ? '600' : 'normal',
                    },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink }]}>{item.name}</Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                  {item.chapterCount} hymns · {item.meaning}
                  {isLastRead && latestPosition ? (
                    <Text style={{ color: colors.progressLabel, fontWeight: '600' }}>
                      {' · '}
                      Hymn {latestPosition.chapter}:{latestPosition.verse}
                    </Text>
                  ) : null}
                </Text>
              </View>
            </Pressable>
          );
        }}
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
