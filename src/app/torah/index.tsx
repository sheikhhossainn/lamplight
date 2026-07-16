import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { listBooks } from '@/features/bible-content/bibleData';
import { useGuardedPush } from '@/lib/navigationGuard';
import { useTheme } from '@/theme/ThemeProvider';

// The Torah is Genesis-Deuteronomy — already fetched in full (text + JFB
// commentary) as part of the Bible OT dataset, so this screen is just a
// filtered entry point into the existing /bible/[bookId] reader rather than
// a separate data source or reader component.
const TORAH_BOOK_IDS = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];

export default function TorahIndexScreen() {
  const { colors, typography, spacing, layout, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const push = useGuardedPush();

  const books = listBooks().filter((b) => TORAH_BOOK_IDS.includes(b.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]}>Torah</Text>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenMargin,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 32,
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => push({ pathname: '/bible/[bookId]', params: { bookId: item.id } })}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <View style={[styles.numberBadge, { backgroundColor: colors.card, borderRadius: radius.pill }]}>
              <Text style={[typography.metadataCaption, { color: colors.umber }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>{item.name}</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>{item.meaning}</Text>
            </View>
            <ChevronRightIcon color={colors.progressLabel} />
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
