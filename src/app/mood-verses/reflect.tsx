import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, CloseIcon } from '@/components/icons';
import { fetchContextVerses } from '@/features/scripture-verses/contextVersesApi';
import { drawEmpatheticDeck } from '@/features/scripture-verses/empatheticMatcher';
import type { ScriptureVerseCard } from '@/features/scripture-verses/moods';
import { VerseDeckView } from '@/features/scripture-verses/VerseDeckView';
import { useTheme } from '@/theme/ThemeProvider';

const COMFORT_PRESETS = [
  { label: 'Anxiety & Worry', query: 'anxious worries fear overwhelmed stress' },
  { label: 'Weary & Burnout', query: 'weary exhausted tired heavy burden burnout' },
  { label: 'Grief & Heartbreak', query: 'grief heartbreak sorrow loss sad mourn' },
  { label: 'Seeking Peace', query: 'peace calm stillness tranquility quiet relief' },
  { label: 'Guidance & Direction', query: 'lost confused guidance direction path crossroads' },
  { label: 'Gratitude & Joy', query: 'gratitude thankful blessed joy celebration praise' },
];

export default function ReflectScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const { text, feeling, query } = useLocalSearchParams<{
    text?: string;
    feeling?: string;
    query?: string;
  }>();

  const targetFeeling = (feeling ?? text ?? query ?? '').trim();
  const [customInput, setCustomInput] = useState('');

  const fetchVerses = useCallback(async (): Promise<ScriptureVerseCard[]> => {
    const q = targetFeeling || 'peace';
    try {
      const remote = await fetchContextVerses(q);
      if (remote && remote.length > 0) {
        return remote;
      }
    } catch {
      // Offline, network timeout, or edge function cold-start fallback
    }
    return drawEmpatheticDeck(q);
  }, [targetFeeling]);

  // If a feeling was provided, render the meditative swipeable card deck
  if (targetFeeling.length > 0) {
    const title = `Verses for “${targetFeeling}”`;
    return <VerseDeckView title={title} source="context" fetchVerses={fetchVerses} />;
  }

  const handleSelectPreset = (presetQuery: string, label: string) => {
    router.push({
      pathname: '/mood-verses/reflect',
      params: { text: label, query: presetQuery },
    });
  };

  const handleSubmitCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/mood-verses/reflect',
      params: { text: trimmed },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeftIcon color={colors.ink} size={22} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, letterSpacing: 1.5 }]}>
            SACRED WORDS FOR COMFORT
          </Text>
          <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 1 }]}>
            A Verse for This Moment
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: layout.screenMargin, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sanctuary Invitation Banner */}
        <View
          style={[
            styles.heroBanner,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
              marginTop: spacing.md,
              padding: layout.cardPadding,
            },
          ]}
        >
          <Text style={[typography.readingBody, { color: colors.ink, fontSize: 16, lineHeight: 26 }]}>
            Ancient scriptures offer quiet shelter. Whatever weight your heart is carrying, these verses are drawn to bring reassurance and peace.
          </Text>
        </View>

        {/* Preset Comfort Moments */}
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.md, letterSpacing: 1.2 }]}>
          WHERE DOES YOUR HEART REST TODAY?
        </Text>

        <View style={styles.presetsGrid}>
          {COMFORT_PRESETS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => handleSelectPreset(item.query, item.label)}
              style={({ pressed }) => [
                styles.presetChip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}>
                {item.label}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, marginTop: 4 }]}>
                Read verses ➔
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Free-text Expression Composer */}
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 1.2 }]}>
          OR DESCRIBE IN YOUR OWN WORDS
        </Text>

        <View
          style={[
            styles.customInputCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
            },
          ]}
        >
          <TextInput
            multiline
            numberOfLines={3}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="e.g. I have a hard decision tomorrow and feel overwhelmed..."
            placeholderTextColor={colors.fawn}
            style={[
              typography.readingBody,
              styles.textInput,
              { color: colors.ink, minHeight: 70 },
            ]}
          />

          <View style={[styles.composerBottomRow, { borderTopColor: colors.hairline }]}>
            {customInput.length > 0 ? (
              <Pressable onPress={() => setCustomInput('')} hitSlop={8} style={styles.clearBtn}>
                <CloseIcon color={colors.fawn} size={15} />
                <Text style={[typography.metadataCaption, { color: colors.fawn, marginLeft: 4 }]}>Clear</Text>
              </Pressable>
            ) : <View />}

            <Pressable
              disabled={customInput.trim().length === 0}
              onPress={handleSubmitCustom}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: customInput.trim().length > 0 ? colors.flameAmber : colors.segmentedTrack,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: customInput.trim().length > 0 ? colors.primaryDark : colors.fawn,
                    fontSize: 13,
                  },
                ]}
              >
                Reflect ➔
              </Text>
            </Pressable>
          </View>
        </View>

        {/* The Sacred Table Alternative */}
        <View style={{ marginTop: spacing.xxl }}>
          <Pressable
            onPress={() => router.push('/mood-verses/table')}
            style={({ pressed }) => [
              styles.tableCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.card,
                padding: layout.cardPadding,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.tableCardHeader}>
              <View style={[styles.tableBadge, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                  5 SACRED TRADITIONS
                </Text>
              </View>
              <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                Offline sanctuary
              </Text>
            </View>

            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginTop: spacing.xs }]}>
              The Sacred Table
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4, lineHeight: 18 }]}>
              Sit before five illuminated cards—Quran, Torah, Old Testament, New Testament, and Vedas—arranged together on a quiet table.
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13, marginTop: spacing.sm }]}>
              Open the Sacred Table ➔
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  heroBanner: {
    borderWidth: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetChip: {
    width: '48%',
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  customInputCard: {
    borderWidth: 1,
    padding: 14,
  },
  textInput: {
    fontSize: 15,
    textAlignVertical: 'top',
  },
  composerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  tableCard: {
    borderWidth: 1,
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
