import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { getLatestQuranReadingPosition, type QuranReadingPosition } from '@/db/repositories/quran';
import { listSurahs, type QuranSurahMeta } from '@/features/quran-content/quranData';
import { ContinueReadingSkeleton } from '@/features/reader/components/ContinueReadingSkeleton';
import { useGuardedPush } from '@/lib/navigationGuard';
import { useTheme } from '@/theme/ThemeProvider';

export default function QuranSurahListScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const [latestPosition, setLatestPosition] = useState<QuranReadingPosition | null>(null);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const surahs = listSurahs();
  const push = useGuardedPush();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getLatestQuranReadingPosition().then((position) => {
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

  const latestSurah = latestPosition ? surahs.find((s) => s.number === latestPosition.surahNumber) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]}>Quran</Text>
      </View>

      {!positionLoaded ? (
        <ContinueReadingSkeleton />
      ) : latestSurah && latestPosition ? (
        <Pressable
          onPress={() =>
            push({
              pathname: '/quran/[surahNumber]',
              params: { surahNumber: String(latestPosition.surahNumber), jumpVerse: String(latestPosition.verseNumber) },
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
              {latestSurah.nameEnglish} · Verse {latestPosition.verseNumber}
            </Text>
          </View>
          <ChevronRightIcon color={colors.straw} />
        </Pressable>
      ) : null}

      <FlatList
        data={surahs}
        keyExtractor={(item) => String(item.number)}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: layout.screenMargin, paddingTop: spacing.lg, paddingBottom: insets.bottom + 32 },
        ]}
        renderItem={({ item }: { item: QuranSurahMeta }) => (
          <Pressable
            onPress={() =>
              push({ pathname: '/quran/[surahNumber]', params: { surahNumber: String(item.number) } })
            }
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <View style={[styles.numberBadge, { backgroundColor: colors.card, borderRadius: radius.pill }]}>
              <Text style={[typography.metadataCaption, { color: colors.umber }]}>{item.number}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>
                {item.nameEnglish} · {item.nameTranslation}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                {item.revelationType} · {item.verseCount} verses
              </Text>
            </View>
            <Text style={[typography.arabicVerse, { color: colors.umber, fontSize: 18, lineHeight: 24 }]}>
              {item.nameArabic}
            </Text>
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
