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
  spineCrease: 'rgba(0, 0, 0, 0.65)',
  spineBand1: 'rgba(0, 0, 0, 0.38)',
  spineBand2: 'rgba(0, 0, 0, 0.20)',
  spineBand3: 'rgba(0, 0, 0, 0.08)',
  coverRim: '#12100D',
  leaf4: '#1A1610',
  leaf3: '#221D16',
  leaf2: '#2A241B',
  leaf1: '#342D22',
  leafCutEdge: 'rgba(0, 0, 0, 0.50)',
  liftSheen: 'rgba(245, 166, 35, 0.06)',
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

      {/* Night (Lamp) Mode Layer: Same antique paper — read by candlelight */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          nightLayerStyle,
          { backgroundColor: '#120F0C' },
        ]}
        pointerEvents="none"
      >
        {/* Same paper texture as day but barely visible — grain comes through the dark wash */}
        <Image
          source={ANTIQUE_PAPER_DAY}
          style={[StyleSheet.absoluteFill, { opacity: 0.10 }]}
          contentFit="cover"
          priority="high"
          cachePolicy="memory-disk"
        />

        {/* Deep warm-charcoal dark wash — like the same page held in a dark room */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(16, 12, 9, 0.88)' },
          ]}
        />

        {/* Soft amber reading-lamp glow at center — warm, never cool */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="candleGlow" cx="50%" cy="42%" rx="60%" ry="55%">
              <Stop offset="0%"  stopColor="#C87820" stopOpacity="0.13" />
              <Stop offset="45%" stopColor="#8B5010" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#120F0C" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#candleGlow)" />
        </Svg>

        {/* Outer book cover rim in dark walnut */}
        <View style={[styles.coverRim, { backgroundColor: NIGHT_TONES.coverRim }]} />

        {/* Stacked paper deckle leaf layers — warm dark walnut tones */}
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

        {/* Turning Edge Lift Sheen in subtle warm amber */}
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
