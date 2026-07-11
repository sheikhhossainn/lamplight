import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Empty-state illustrations for the Notebook tabs. Each one acts out its
// actual task instead of idly hovering: the book turns a page, the flashcard
// flips to its answer, the quote writes itself. All driven by one looping
// 0→1 timeline each, keyframed with interpolate() — calm ease, no bounce,
// per the motion spec. Hues come from the theme so Day and Lamp both read warm.

const AnimatedLine = Animated.createAnimatedComponent(Line);

// Soft amber pool behind each scene — the lamp. Breathes 0.10→0.18 (the
// spec's 0.7→1 glow pulse scaled onto a wash faint enough to read as light).
function LampGlowScene({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.1 + glow.value * 0.08 }));

  return (
    <View style={styles.scene}>
      <Animated.View style={[styles.glow, { backgroundColor: colors.flameAmber }, glowStyle]} />
      {children}
    </View>
  );
}

// One repeating 0→1 timeline; keyframes are carved out of it with interpolate.
function useLoop(durationMs: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false);
  }, [t, durationMs]);
  return t;
}

// Words: an open book whose right page lifts and sweeps across the spine —
// a real page turn (~500ms of a 3.4s cycle), then a fresh page fades in.
export function WordsIllustration() {
  const { colors } = useTheme();
  const t = useLoop(3400);

  // The turning page pivots on its left edge (the spine): translate the
  // pivot to the origin, scaleX 1→-1 (mirrors across the spine like a page
  // laying over), translate back.
  const PAGE_W = 46;
  const pageStyle = useAnimatedStyle(() => {
    const scaleX = interpolate(t.value, [0, 0.55, 0.7, 0.78, 0.84, 1], [1, 1, -1, -1, 1, 1]);
    const opacity = interpolate(t.value, [0, 0.68, 0.75, 0.82, 0.9, 1], [1, 1, 0, 0, 1, 1]);
    return {
      opacity,
      transform: [{ translateX: -PAGE_W / 2 }, { scaleX }, { translateX: PAGE_W / 2 }],
    };
  });

  return (
    <LampGlowScene>
      <View style={{ width: 128, height: 96 }}>
        <Svg width={128} height={96} viewBox="0 0 128 96" fill="none">
          {/* open book */}
          <Path
            d="M64 26 C 50 16, 30 16, 18 22 V74 C 30 68, 50 68, 64 76 C 78 68, 98 68, 110 74 V22 C 98 16, 78 16, 64 26 Z"
            fill={colors.card}
            stroke={colors.straw}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <Line x1="64" y1="26" x2="64" y2="76" stroke={colors.straw} strokeWidth={1.7} strokeLinecap="round" />
          {/* left page: lines + the saved word in amber */}
          <Line x1="27" y1="34" x2="55" y2="32" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          <Path d="M27 42 H43 V48 H27 Z" fill={colors.flameAmber} opacity={0.45} />
          <Line x1="27" y1="45" x2="43" y2="44.4" stroke={colors.ink} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1="27" y1="54" x2="55" y2="52" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          {/* right page (revealed under the turning page) */}
          <Line x1="73" y1="32" x2="101" y2="34" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1="73" y1="41" x2="101" y2="43" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1="73" y1="50" x2="94" y2="52" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
        {/* the turning page — sits over the right page, pivots at the spine */}
        <Animated.View style={[styles.turnPage, pageStyle]}>
          <Svg width={PAGE_W} height={60} viewBox="0 0 46 60" fill="none">
            <Path
              d="M0 4 C 14 -2, 34 -2, 46 4 V52 C 34 46, 14 46, 0 54 Z"
              fill={colors.parchment}
              stroke={colors.straw}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
            <Line x1="9" y1="14" x2="37" y2="15.5" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
            <Line x1="9" y1="23" x2="37" y2="24.5" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
            <Line x1="9" y1="32" x2="30" y2="33.5" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    </LampGlowScene>
  );
}

// Flashcards: the front card flips on its vertical axis to reveal the answer
// face (amber), holds while you'd read it, flips back.
export function FlashcardsIllustration() {
  const { colors } = useTheme();
  const t = useLoop(5000);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.value, [0, 0.35, 0.45, 0.87, 0.94, 1], [1, 1, 0, 0, 1, 1]) }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.value, [0, 0.45, 0.55, 0.8, 0.87, 1], [0, 0, 1, 1, 0, 0]) }],
  }));

  return (
    <LampGlowScene>
      <View style={{ width: 128, height: 96, alignItems: 'center', justifyContent: 'center' }}>
        {/* back-of-stack card, static */}
        <View
          style={[
            styles.deckCard,
            styles.deckCardBehind,
            { backgroundColor: colors.hairline, borderColor: colors.straw },
          ]}
        />
        {/* question face */}
        <Animated.View style={[styles.deckCard, { backgroundColor: colors.card, borderColor: colors.straw }, frontStyle]}>
          <Svg width={62} height={46} viewBox="0 0 62 46" fill="none">
            <Line x1="12" y1="18" x2="50" y2="18" stroke={colors.ink} strokeWidth={1.7} strokeLinecap="round" />
            <Line x1="18" y1="28" x2="44" y2="28" stroke={colors.fawn} strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
        </Animated.View>
        {/* answer face */}
        <Animated.View style={[styles.deckCard, { backgroundColor: colors.card, borderColor: colors.flameAmber }, backStyle]}>
          <Svg width={62} height={46} viewBox="0 0 62 46" fill="none">
            <Line x1="16" y1="23" x2="46" y2="23" stroke={colors.flameAmber} strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    </LampGlowScene>
  );
}

// Quotes: the quoted lines write themselves onto the note (stroke-dash draw),
// then the amber attribution rule signs off — like ink settling on the page.
export function QuotesIllustration() {
  const { colors } = useTheme();
  const t = useLoop(4200);

  const LINE1_LEN = 44;
  const LINE2_LEN = 32;

  const line1Props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(t.value, [0.08, 0.38], [LINE1_LEN, 0], 'clamp'),
  }));
  const line2Props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(t.value, [0.42, 0.66], [LINE2_LEN, 0], 'clamp'),
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.7, 0.8, 0.93, 1], [0, 1, 1, 0], 'clamp'),
  }));
  // Written lines fade out with the rule at the cycle's end, then rewrite.
  const inkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.05, 0.93, 1], [1, 1, 1, 0], 'clamp'),
  }));

  return (
    <LampGlowScene>
      <View style={{ width: 128, height: 96 }}>
        <Svg width={128} height={96} viewBox="0 0 128 96" fill="none">
          {/* note card with page-curl corner (fold motif) */}
          <Path
            d="M30 16 H98 V62 L84 76 H30 A4 4 0 0126 72 V20 A4 4 0 0130 16 Z"
            fill={colors.card}
            stroke={colors.straw}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <Path d="M98 62 H88 A4 4 0 0084 66 V76 Z" fill={colors.hairline} stroke={colors.straw} strokeWidth={1.7} strokeLinejoin="round" />
          {/* double quote marks */}
          <Path
            d="M44 28 C 41 31, 40 34, 40.5 38 M52 28 C 49 31, 48 34, 48.5 38"
            stroke={colors.ink}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, inkStyle]} pointerEvents="none">
          <Svg width={128} height={96} viewBox="0 0 128 96" fill="none">
            <AnimatedLine
              x1="42"
              y1="50"
              x2="86"
              y2="50"
              stroke={colors.fawn}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeDasharray={`${LINE1_LEN}`}
              animatedProps={line1Props}
            />
            <AnimatedLine
              x1="42"
              y1="59"
              x2="74"
              y2="59"
              stroke={colors.fawn}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeDasharray={`${LINE2_LEN}`}
              animatedProps={line2Props}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, ruleStyle]} pointerEvents="none">
          <Svg width={128} height={96} viewBox="0 0 128 96" fill="none">
            <Line x1="58" y1="68" x2="70" y2="68" stroke={colors.flameAmber} strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    </LampGlowScene>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  glow: {
    position: 'absolute',
    width: 130,
    height: 90,
    borderRadius: 65,
    transform: [{ scaleY: 0.62 }],
  },
  // Overlay aligned so its left edge sits exactly on the book's spine
  // (x=64 in the 128-wide, 1:1 viewBox scene).
  turnPage: {
    position: 'absolute',
    left: 64,
    top: 20,
    width: 46,
    height: 60,
  },
  deckCard: {
    position: 'absolute',
    width: 62,
    height: 46,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCardBehind: {
    transform: [{ rotate: '7deg' }, { translateX: 10 }, { translateY: 4 }],
    opacity: 0.55,
  },
});
