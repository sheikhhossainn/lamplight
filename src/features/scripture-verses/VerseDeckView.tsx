import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BookmarkIcon, ChevronLeftIcon, CloseIcon } from '@/components/icons';
import { logEvent } from '@/features/analytics/analytics';
import { useTheme } from '@/theme/ThemeProvider';

import { TRADITION_LABELS, type ScriptureVerseCard } from './moods';

type Reaction = 'like' | 'dislike';

type VerseDeckViewProps = {
  title: string;
  // Distinguishes the mood-tag deck from the free-text context deck in the
  // logged analytics event — not shown in the UI.
  source: 'mood' | 'context';
  fetchVerses: () => Promise<ScriptureVerseCard[]>;
};

// Tap-reveal, one card at a time: blind verse text first, tap reveals the
// source citation + like/dislike, reacting fades the card out and advances;
// after the last card, a summary lists every verse with its reaction.
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

  const react = (verse: ScriptureVerseCard, reaction: Reaction) => {
    setReactions((prev) => ({ ...prev, [verse.id]: reaction }));
    logEvent('verse_deck_reaction', { verseId: verse.id, tradition: verse.tradition, source, reaction });
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
      <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]} numberOfLines={1}>
        {title}
      </Text>
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
    return (
      <View style={{ flex: 1, backgroundColor: colors.libraryBackground }}>
        {header}
        <ScrollView contentContainerStyle={{ paddingHorizontal: layout.screenMargin, paddingBottom: spacing.xxl }}>
          {verses.map((verse) => {
            const reaction = reactions[verse.id];
            return (
              <View
                key={verse.id}
                style={[
                  styles.summaryRow,
                  { backgroundColor: colors.card, borderRadius: radius.card, marginTop: spacing.md, padding: layout.cardPadding },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, marginBottom: spacing.xs }]}>
                    {TRADITION_LABELS[verse.tradition] ?? verse.tradition} · {verse.book} {verse.chapter}:{verse.verseNumber}
                  </Text>
                  <Text style={[typography.readingBody, { color: colors.ink, fontSize: 17 }]} numberOfLines={4}>
                    {verse.translation ?? verse.originalText}
                  </Text>
                </View>
                {reaction === 'like' ? (
                  <BookmarkIcon color={colors.flameAmber} filled size={20} />
                ) : reaction === 'dislike' ? (
                  <CloseIcon color={colors.straw} size={16} />
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
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.md }]}>
          {index + 1} / {verses.length}
        </Text>
        <Animated.View
          style={[
            styles.card,
            cardAnimatedStyle,
            { backgroundColor: colors.card, borderRadius: radius.card, marginHorizontal: layout.screenMargin },
          ]}
        >
          <Pressable onPress={() => setRevealed(true)} disabled={revealed} style={styles.cardPressable}>
            <Text style={[typography.readingBody, { color: colors.ink, fontSize: 18, textAlign: 'center' }]}>
              {verse.translation ?? verse.originalText}
            </Text>
            {revealed ? (
              <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, marginTop: spacing.lg, textAlign: 'center' }]}>
                {TRADITION_LABELS[verse.tradition] ?? verse.tradition} · {verse.book} {verse.chapter}:{verse.verseNumber}
              </Text>
            ) : (
              <Text style={[typography.eyebrowLabel, { color: colors.straw, marginTop: spacing.lg, textAlign: 'center' }]}>
                Tap to reveal
              </Text>
            )}
          </Pressable>
          {revealed ? (
            <View style={[styles.reactionRow, { marginTop: spacing.xl }]}>
              <Pressable
                onPress={() => react(verse, 'dislike')}
                style={[styles.reactionButton, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}
              >
                <CloseIcon color={colors.ink} size={18} />
              </Pressable>
              <Pressable
                onPress={() => react(verse, 'like')}
                style={[styles.reactionButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
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
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  cardPressable: {
    alignItems: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  reactionButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
