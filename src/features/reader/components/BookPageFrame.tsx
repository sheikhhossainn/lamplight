import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LamplightColor } from '@/theme/tokens';

import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const ANTIQUE_PAPER_DAY = require('../../../../assets/images/antique-paper-day.jpg');

type BookPageFrameProps = {
  children: ReactNode;
  themeProgress: SharedValue<number>;
};

const DAY_TONES = {
  spineCrease: 'rgba(38, 25, 14, 0.35)',
  spineBand1: 'rgba(38, 25, 14, 0.14)',
  spineBand2: 'rgba(38, 25, 14, 0.08)',
  spineBand3: 'rgba(38, 25, 14, 0.04)',
  spineBand4: 'rgba(38, 25, 14, 0.015)',
  coverRim: '#23170E',
  leaf4: '#B8A287',
  leaf3: '#C8B39B',
  leaf2: '#D8C5B0',
  leaf1: '#E8D8C5',
  leafCutEdge: 'rgba(50, 35, 20, 0.14)',
  liftSheen: 'rgba(255, 255, 255, 0.18)',
  shadow1: 'rgba(30, 20, 10, 0.20)',
  shadow2: 'rgba(30, 20, 10, 0.11)',
  shadow3: 'rgba(30, 20, 10, 0.05)',
  shadow4: 'rgba(30, 20, 10, 0.02)',
};

const NIGHT_TONES = {
  // Spine shadow — deep indigo-black, cooler than day
  spineCrease: 'rgba(10, 14, 28, 0.70)',
  spineBand1: 'rgba(10, 14, 28, 0.40)',
  spineBand2: 'rgba(10, 14, 28, 0.20)',
  spineBand3: 'rgba(10, 14, 28, 0.08)',
  // Fore-edge deckle — moonlit paper edge is cool grey-silver
  coverRim: '#0E1018',
  leaf4: '#181C26',
  leaf3: '#202532',
  leaf2: '#282E3E',
  leaf1: '#32394A',
  leafCutEdge: 'rgba(10, 14, 28, 0.45)',
  // Lift sheen: cool silver glint on the turning right edge
  liftSheen: 'rgba(200, 215, 240, 0.08)',
};

export function BookPageFrame({ children, themeProgress }: BookPageFrameProps) {
  const dayLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeProgress.value,
  }));

  const nightLayerStyle = useAnimatedStyle(() => ({
    opacity: themeProgress.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: LamplightColor.primaryDark }]}>
      {/* Day Mode Layer: Full-bleed authentic 1890s cotton-rag paper texture + Deckle stack + Leather rim */}
      <Animated.View style={[StyleSheet.absoluteFill, dayLayerStyle]} pointerEvents="none">
        <Image
          source={ANTIQUE_PAPER_DAY}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
        />

        {/* Outer book cover rim peeking behind the stacked leaves along the right */}
        <View style={[styles.coverRim, { backgroundColor: DAY_TONES.coverRim }]} />

        {/* Stacked paper deckle leaf layers along right margin (fore-edge paper depth) */}
        <View style={styles.rightDeckleStack}>
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf4, right: 0 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf3, right: 1.5 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf2, right: 3 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf1, right: 4.5 }]} />
          <View style={[styles.leafBorder, { borderColor: DAY_TONES.leafCutEdge, right: 5.5 }]} />
        </View>

        {/* Left Spine Gutter (Curved Open-Book Binding Roll-off) */}
        <View style={styles.leftSpineShadow}>
          <View style={[styles.spineBand4, { backgroundColor: DAY_TONES.spineBand4 }]} />
          <View style={[styles.spineBand3, { backgroundColor: DAY_TONES.spineBand3 }]} />
          <View style={[styles.spineBand2, { backgroundColor: DAY_TONES.spineBand2 }]} />
          <View style={[styles.spineBand1, { backgroundColor: DAY_TONES.spineBand1 }]} />
          <View style={[styles.spineCrease, { backgroundColor: DAY_TONES.spineCrease }]} />
        </View>

        {/* Turning Edge Lift Sheen */}
        <View style={[styles.turningEdgeCurl, { backgroundColor: DAY_TONES.liftSheen }]} />
      </Animated.View>

      {/* Night (Lamp) Mode Layer: Same antique paper under moonlight */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          nightLayerStyle,
          { backgroundColor: '#080A12' },
        ]}
        pointerEvents="none"
      >
        {/* The same antique paper — high opacity so the grain, fibers and texture are all visible */}
        <Image
          source={ANTIQUE_PAPER_DAY}
          style={[StyleSheet.absoluteFill, { opacity: 0.82 }]}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
        />

        {/* Cool indigo-midnight wash — dims the warm amber of the paper to a moonlit silver-grey.
            Moonlight doesn't kill texture, it shifts color temperature and reduces brightness. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(10, 14, 26, 0.70)' },
          ]}
        />

        {/* Soft silver moonlight glow from slightly above center — like a window above the reading chair */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="moonGlow" cx="50%" cy="30%" rx="55%" ry="50%">
              <Stop offset="0%"  stopColor="#C8D8F0" stopOpacity="0.12" />
              <Stop offset="50%" stopColor="#A0B4D8" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#0C0E18" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#moonGlow)" />
        </Svg>

        {/* Outer book cover rim in cool dark slate */}
        <View style={[styles.coverRim, { backgroundColor: NIGHT_TONES.coverRim }]} />

        {/* Stacked paper deckle leaf layers — cool slate tones */}
        <View style={styles.rightDeckleStack}>
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf4, right: 0 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf3, right: 1.5 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf2, right: 3 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf1, right: 4.5 }]} />
          <View style={[styles.leafBorder, { borderColor: NIGHT_TONES.leafCutEdge, right: 5.5 }]} />
        </View>

        {/* Left Spine Gutter */}
        <View style={[styles.leftSpineShadow, styles.nightSpineShadow]}>
          <View style={[styles.spineBand3, { backgroundColor: NIGHT_TONES.spineBand3 }]} />
          <View style={[styles.spineBand2, { backgroundColor: NIGHT_TONES.spineBand2 }]} />
          <View style={[styles.spineBand1, { backgroundColor: NIGHT_TONES.spineBand1 }]} />
          <View style={[styles.spineCrease, { backgroundColor: NIGHT_TONES.spineCrease }]} />
        </View>

        {/* Cool silver glint on right turning edge */}
        <View style={[styles.turningEdgeCurl, { backgroundColor: NIGHT_TONES.liftSheen }]} />
      </Animated.View>

      {/* Page Content Container (Typography, Selection Handles, Word Taps) */}
      <View style={styles.contentWrap}>{children}</View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
  },
  contentWrap: {
    flex: 1,
    zIndex: 8,
  },
  // Dark leather hardcover rim along right edge
  coverRim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    zIndex: 2,
  },
  // Stacked deckle paper leaf lines along right margin
  rightDeckleStack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 3,
    width: 6,
    zIndex: 3,
  },
  leafLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  leafBorder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    borderLeftWidth: 1,
  },
  // Left spine binding curvature drop-shadow — maximum width 20px (well clear of 24px text margin)
  leftSpineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 20,
    zIndex: 4,
  },
  nightSpineShadow: {
    zIndex: 6,
  },
  spineBand4: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 20,
  },
  spineBand3: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 14,
  },
  spineBand2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 8,
  },
  spineBand1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3.5,
  },
  spineCrease: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
  },
  // Drop shadow attached to the right edge of this page, casting onto revealed page during a turn
  turningEdgeShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -24,
    width: 24,
    zIndex: 10,
  },
  edgeHairline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
  },
  edgeShadow1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 1,
    width: 3,
  },
  edgeShadow2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 4,
    width: 6,
  },
  edgeShadow3: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    width: 7,
  },
  edgeShadow4: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 17,
    width: 7,
  },
  // Subtle lift sheen inside the right margin of the turning leaf
  turningEdgeCurl: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 6,
    zIndex: 3,
  },
});
