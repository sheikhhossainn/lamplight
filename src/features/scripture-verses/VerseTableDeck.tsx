import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ChevronLeftIcon } from '@/components/icons';
import { logEvent } from '@/features/analytics/analytics';
import { useTheme } from '@/theme/ThemeProvider';

import { buildVerseTable, type TableVerseCard } from './randomVerse';

const ENTER_DURATION = 380;
const FLIP_DURATION = 420;
const EXIT_DURATION = 320;
const REVEAL_HOLD_MS = 3500;
const SLIDE_DISTANCE = 60;

// One blind verse at a time, cycling through all five traditions — tap to
// flip, then it auto-dismisses so the next tradition's card takes its place.
// The card never surfaces which book/chapter it came from, on either face.
export function VerseTableDeck() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [cards] = useState<TableVerseCard[]>(() => buildVerseTable());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateX = useSharedValue(SLIDE_DISTANCE);
  const opacity = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  const done = index >= cards.length;

  useEffect(() => {
    if (done) return;
    translateX.value = SLIDE_DISTANCE;
    opacity.value = 0;
    flipProgress.value = 0;
    translateX.value = withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done]);

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const advance = () => {
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const dismissCard = () => {
    opacity.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) });
    translateX.value = withTiming(-SLIDE_DISTANCE, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(advance)();
    });
  };

  const handleFlip = (card: TableVerseCard) => {
    if (flipped) return;
    setFlipped(true);
    flipProgress.value = withTiming(1, { duration: FLIP_DURATION, easing: Easing.inOut(Easing.cubic) });
    logEvent('verse_table_reveal', { tradition: card.tradition });
    dismissTimer.current = setTimeout(dismissCard, REVEAL_HOLD_MS + FLIP_DURATION);
  };

  const cardWrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const backFaceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipProgress.value * 180}deg` }],
    opacity: flipProgress.value > 0.5 ? 0 : 1,
  }));

  const frontFaceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipProgress.value * 180 + 180}deg` }],
    opacity: flipProgress.value > 0.5 ? 1 : 0,
  }));

  return (
    <View style={{ flex: 1 }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="table" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8A6A3A" />
            <Stop offset="55%" stopColor="#6B4F28" />
            <Stop offset="100%" stopColor="#4A3620" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#table)" />
      </Svg>

      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.lampText} />
        </Pressable>
        {!done ? (
          <Text style={[typography.eyebrowLabel, { color: colors.lampText, marginLeft: spacing.md, opacity: 0.8 }]}>
            {index + 1} / {cards.length}
          </Text>
        ) : null}
      </View>

      {done ? (
        <View style={styles.centerFill}>
          <Text style={[typography.readingBody, { color: colors.lampText, fontSize: 18, textAlign: 'center' }]}>
            That&apos;s all for now.
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginTop: spacing.xl }}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14 }]}>Back to Library</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.centerFill}>
          <Animated.View style={[styles.cardWrap, cardWrapStyle, { marginHorizontal: layout.screenMargin }]}>
            <Pressable onPress={() => handleFlip(cards[index])} disabled={flipped} style={StyleSheet.absoluteFill}>
              <Animated.View
                style={[
                  styles.cardFace,
                  backFaceStyle,
                  { backgroundColor: colors.primaryDark, borderRadius: radius.card, borderColor: colors.flameAmber, borderWidth: 1 },
                ]}
              >
                <View style={[styles.backMark, { backgroundColor: colors.flameAmber }]} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.cardFace,
                  frontFaceStyle,
                  { backgroundColor: colors.card, borderRadius: radius.card, padding: 24 },
                ]}
              >
                <Text style={[typography.readingBody, { color: colors.ink, fontSize: 18, textAlign: 'center' }]}>
                  {cards[index].text}
                </Text>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: '100%',
    minHeight: 280,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  backMark: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
