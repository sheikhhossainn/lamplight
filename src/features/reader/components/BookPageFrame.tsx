import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LamplightColor } from '@/theme/tokens';

const ANTIQUE_PAPER_DAY = require('../../../../assets/images/antique-paper-day.jpg');

type BookPageFrameProps = {
  children: ReactNode;
  mode?: 'day' | 'lamp';
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
  spineCrease: 'rgba(0, 0, 0, 0.35)',
  spineBand1: 'rgba(0, 0, 0, 0.20)',
  spineBand2: 'rgba(0, 0, 0, 0.10)',
  spineBand3: 'rgba(0, 0, 0, 0.04)',
  shadow1: 'rgba(0, 0, 0, 0.40)',
  shadow2: 'rgba(0, 0, 0, 0.22)',
  shadow3: 'rgba(0, 0, 0, 0.10)',
  shadow4: 'rgba(0, 0, 0, 0.03)',
};

export function BookPageFrame({ children, mode = 'day' }: BookPageFrameProps) {
  const isLamp = mode === 'lamp';
  const themeAnim = useSharedValue(isLamp ? 1 : 0);

  useEffect(() => {
    themeAnim.value = withTiming(isLamp ? 1 : 0, {
      duration: 380,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [isLamp, themeAnim]);

  const dayLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeAnim.value,
  }));

  const nightLayerStyle = useAnimatedStyle(() => ({
    opacity: themeAnim.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: LamplightColor.primaryDark }]}>
      {/* Night Mode Spine Gutter */}
      <Animated.View style={[styles.leftSpineShadow, nightLayerStyle]} pointerEvents="none">
        <View style={[styles.spineBand3, { backgroundColor: NIGHT_TONES.spineBand3 }]} />
        <View style={[styles.spineBand2, { backgroundColor: NIGHT_TONES.spineBand2 }]} />
        <View style={[styles.spineBand1, { backgroundColor: NIGHT_TONES.spineBand1 }]} />
        <View style={[styles.spineCrease, { backgroundColor: NIGHT_TONES.spineCrease }]} />
      </Animated.View>

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

      {/* Page Content Container (Typography, Selection Handles, Word Taps) */}
      <View style={styles.contentWrap}>{children}</View>

      {/* Turning Edge Drop Shadow (Casts onto adjacent page during turn) */}
      <View style={styles.turningEdgeShadow} pointerEvents="none">
        <View style={[styles.edgeHairline, { backgroundColor: isLamp ? NIGHT_TONES.spineCrease : DAY_TONES.spineCrease }]} />
        <View style={[styles.edgeShadow1, { backgroundColor: isLamp ? NIGHT_TONES.shadow1 : DAY_TONES.shadow1 }]} />
        <View style={[styles.edgeShadow2, { backgroundColor: isLamp ? NIGHT_TONES.shadow2 : DAY_TONES.shadow2 }]} />
        <View style={[styles.edgeShadow3, { backgroundColor: isLamp ? NIGHT_TONES.shadow3 : DAY_TONES.shadow3 }]} />
        <View style={[styles.edgeShadow4, { backgroundColor: isLamp ? NIGHT_TONES.shadow4 : DAY_TONES.shadow4 }]} />
      </View>
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
    zIndex: 1,
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
