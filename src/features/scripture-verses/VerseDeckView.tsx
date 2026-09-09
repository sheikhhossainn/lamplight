import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BookmarkIcon, ChevronLeftIcon, CloseIcon } from '@/components/icons';
import { createBibleHighlight } from '@/db/repositories/bible';
import { createQuranHighlight } from '@/db/repositories/quran';
import { logEvent } from '@/features/analytics/analytics';
import { useTheme } from '@/theme/ThemeProvider';

import { TRADITION_LABELS, type ScriptureVerseCard } from './moods';

type Reaction = 'like' | 'dislike';

type VerseDeckViewProps = {
  title: string;
  source: 'mood' | 'context';
  fetchVerses: () => Promise<ScriptureVerseCard[]>;
};

export function VerseDeckView({ title, source, fetchVerses }: VerseDeckViewProps) {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [verses, setVerses] = useState<ScriptureVerseCard[] | null>(null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});

  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    setVerses(null);
    setError(false);
    fetchVerses()
      .then((rows) => {
        if (!cancelled) setVerses(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
    setRevealed(false);
    cardOpacity.value = 1;
    cardTranslateY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const react = async (verse: ScriptureVerseCard, reaction: Reaction) => {
    setReactions((prev) => ({ ...prev, [verse.id]: reaction }));
    logEvent('verse_deck_reaction', { verseId: verse.id, tradition: verse.tradition, source, reaction });

    if (reaction === 'like') {
      try {
        if (verse.tradition === 'quran') {
          await createQuranHighlight({
            surahNumber: verse.chapter,
            verseNumber: verse.verseNumber,
            colorKey: 'amber',
          });
        } else if (verse.tradition === 'bible-ot' || verse.tradition === 'bible-nt' || verse.tradition === 'torah') {
          if (verse.bookId) {
            await createBibleHighlight({
              bookId: verse.bookId,
              chapter: verse.chapter,
              verse: verse.verseNumber,
              colorKey: 'amber',
            });
          }
        }
      } catch {
        // Silently tolerate if highlight already exists
      }
    }

    cardOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    cardTranslateY.value = withTiming(-16, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(advance)();
    });
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const header = (
    <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <ChevronLeftIcon color={colors.ink} />
      </Pressable>
      <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md, flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      {verses && index < verses.length ? (
        <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
          {index + 1} of {verses.length}
        </Text>
      ) : null}
    </View>
  );

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
        {header}
        <Text style={[typography.metadataCaption, { color: colors.fawn, padding: layout.screenMargin }]}>
          Couldn&apos;t load verses right now. Try again in a moment.
        </Text>
      </View>
    );
  }

  if (!verses) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
        {header}
        <View style={styles.centerFill}>
          <ActivityIndicator size="small" color={colors.flameAmber} />
        </View>
      </View>
    );
  }

  if (verses.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
        {header}
        <Text style={[typography.metadataCaption, { color: colors.fawn, padding: layout.screenMargin }]}>
          No verses found for that yet.
        </Text>
      </View>
    );
  }

  const done = index >= verses.length;

  if (done) {
    const savedCount = Object.values(reactions).filter((r) => r === 'like').length;
    return (
      <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
        {header}
        <ScrollView contentContainerStyle={{ paddingHorizontal: layout.screenMargin, paddingBottom: spacing.xxl }}>
          <View style={[styles.summaryBanner, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginTop: spacing.md, padding: layout.cardPadding }]}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 15 }]}>
              Words to carry with you
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs }]}>
              {savedCount > 0
                ? `${savedCount} verse${savedCount === 1 ? '' : 's'} saved to your Notebook under Saved Verses.`
                : 'May these words bring quiet comfort and peace to your day.'}
            </Text>
          </View>

          {verses.map((verse) => {
            const reaction = reactions[verse.id];
            return (
              <View
                key={verse.id}
                style={[
                  styles.summaryRow,
                  { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginTop: spacing.md, padding: layout.cardPadding },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, marginBottom: spacing.xs }]}>
                    {TRADITION_LABELS[verse.tradition] ?? verse.tradition} · {verse.book} {verse.chapter}:{verse.verseNumber}
                  </Text>
                  <Text style={[typography.readingBody, { color: colors.ink, fontSize: 16, lineHeight: 26 }]} numberOfLines={4}>
                    {verse.translation ?? verse.originalText}
                  </Text>
                  {verse.reflectionHint ? (
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontStyle: 'italic', marginTop: spacing.xs }]}>
                      {verse.reflectionHint}
                    </Text>
                  ) : null}
                </View>
                {reaction === 'like' ? (
                  <View style={{ marginLeft: spacing.sm }}>
                    <BookmarkIcon color={colors.flameAmber} filled size={20} />
                  </View>
                ) : reaction === 'dislike' ? (
                  <View style={{ marginLeft: spacing.sm }}>
                    <CloseIcon color={colors.straw} size={16} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const verse = verses[index];

  return (
    <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
      {header}
      <View style={styles.deckWrap}>
        <Animated.View
          style={[
            styles.card,
            cardAnimatedStyle,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
              marginHorizontal: layout.screenMargin,
            },
          ]}
        >
          <Pressable onPress={() => setRevealed(true)} disabled={revealed} style={styles.cardPressable}>
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 28, lineHeight: 32, marginBottom: spacing.xs }]}>
              “
            </Text>
            <Text
              style={[
                typography.readingBody,
                {
                  color: colors.ink,
                  fontSize: 18,
                  lineHeight: 32,
                  textAlign: 'center',
                },
              ]}
            >
              {verse.translation ?? verse.originalText}
            </Text>

            {revealed ? (
              <View style={styles.revealedWrap}>
                <View style={[styles.traditionPill, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill, marginTop: spacing.md }]}>
                  <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 11 }]}>
                    {TRADITION_LABELS[verse.tradition] ?? verse.tradition}
                  </Text>
                </View>
                <Text style={[typography.uiRowTitle, { color: colors.ink, marginTop: spacing.xs, fontSize: 14, textAlign: 'center' }]}>
                  {verse.book} {verse.chapter}:{verse.verseNumber}
                </Text>
                {verse.reflectionHint ? (
                  <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: spacing.sm }]}>
                    {verse.reflectionHint}
                  </Text>
                ) : null}

              </View>
            ) : (
              <Text style={[typography.eyebrowLabel, { color: colors.straw, marginTop: spacing.xl, textAlign: 'center' }]}>
                Tap card to reveal source
              </Text>
            )}
          </Pressable>

          {revealed ? (
            <View style={[styles.reactionRow, { marginTop: spacing.xl }]}>
              <Pressable
                onPress={() => react(verse, 'dislike')}
                style={[styles.reactionButton, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}
                accessibilityLabel="Pass"
              >
                <CloseIcon color={colors.ink} size={18} />
              </Pressable>
              <Pressable
                onPress={() => react(verse, 'like')}
                style={[styles.reactionButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
                accessibilityLabel="Keep in Notebook"
              >
                <BookmarkIcon color={colors.primaryDark} size={18} />
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    minHeight: 280,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 32,
  },
  cardPressable: {
    alignItems: 'center',
    width: '100%',
  },
  revealedWrap: {
    alignItems: 'center',
    width: '100%',
  },
  traditionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 20,
  },
  reactionButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBanner: {
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
});
