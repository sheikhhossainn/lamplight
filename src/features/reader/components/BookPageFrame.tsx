import { type ReactNode } from 'react';
import { StyleSheet, View, Text } from 'react-native';
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

import { usePageStyle } from '@/features/settings/pageStylePrefs';
import { getPageStyleConfig } from '@/features/reader/pageStyles';

export function BookPageFrame({ children, themeProgress }: BookPageFrameProps) {
  const pageStyleId = usePageStyle();
  const pageStyle = getPageStyleConfig(pageStyleId);
  const bg = pageStyle.background;

  const dayLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - themeProgress.value,
  }));

  const nightLayerStyle = useAnimatedStyle(() => ({
    opacity: themeProgress.value,
  }));

  const isNewspaper = bg.template === 'newspaper';
  const isOxford = bg.template === 'oxford';
  const isKraft = bg.template === 'kraft';
  const isSage = bg.template === 'sage';
  const isVellum = bg.template === 'vellum';

  return (
    <View style={[styles.container, { backgroundColor: bg.lampBackground }]}>
      {/* Day Mode Layer: Page-specific background + template styling + authentic paper texture */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          dayLayerStyle,
          { backgroundColor: bg.dayBackground },
        ]}
        pointerEvents="none"
      >
        {bg.textureOpacityDay > 0 ? (
          <Image
            source={ANTIQUE_PAPER_DAY}
            style={[StyleSheet.absoluteFill, { opacity: bg.textureOpacityDay }]}
            contentFit="cover"
            priority="high"
            cachePolicy="memory-disk"
          />
        ) : null}

        {/* Ambient paper tint for this specific page atmosphere */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bg.paperTint },
          ]}
        />

        {/* Template CSS Decoration: Newspaper Top Masthead Bar & Double Rules */}
        {isNewspaper ? (
          <View style={styles.newspaperHeaderContainer}>
            <View style={[styles.newspaperDoubleRule, { borderColor: bg.dayTextColor }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 2.5 }}>
              <Text style={[styles.newspaperMastheadLabel, { color: bg.dayTextColor }]}>
                {bg.previewMasthead}
              </Text>
              <Text style={[styles.newspaperFolioLabel, { color: bg.dayAccent }]}>
                FOLIO EDITION
              </Text>
            </View>
            <View style={[styles.newspaperSingleRule, { borderColor: bg.dayTextColor }]} />
          </View>
        ) : null}

        {/* Template CSS Decoration: Oxford Royal Gold Inner Frame */}
        {isOxford ? (
          <View
            style={[
              styles.oxfordInnerFrame,
              {
                borderColor: `${bg.dayAccent}50`,
              },
            ]}
          >
            {/* Corner gold brackets */}
            <View style={[styles.cornerBracketTL, { borderColor: bg.dayAccent }]} />
            <View style={[styles.cornerBracketTR, { borderColor: bg.dayAccent }]} />
            <View style={[styles.cornerBracketBL, { borderColor: bg.dayAccent }]} />
            <View style={[styles.cornerBracketBR, { borderColor: bg.dayAccent }]} />
          </View>
        ) : null}

        {/* Template CSS Decoration: Kraft Leather-Stitched Binding Seam */}
        {isKraft ? (
          <View
            style={[
              styles.kraftStitchedSeam,
              {
                borderLeftColor: 'rgba(100, 60, 25, 0.40)',
              },
            ]}
          />
        ) : null}

        {/* Template CSS Decoration: Sage Botanical Margin Accent */}
        {isSage ? (
          <View
            style={[
              styles.sageMarginRule,
              {
                borderColor: 'rgba(90, 140, 95, 0.22)',
              },
            ]}
          />
        ) : null}

        {/* Template CSS Decoration: Gilded Vellum Gold Filigree Trim */}
        {isVellum ? (
          <View
            style={[
              styles.vellumInnerFrame,
              {
                borderColor: `${bg.dayAccent}45`,
              },
            ]}
          />
        ) : null}

        {/* Outer book cover rim peeking behind the stacked leaves along the right */}
        <View style={[styles.coverRim, { backgroundColor: DAY_TONES.coverRim }]} />

        {/* Stacked paper deckle leaf layers along right margin */}
        <View style={styles.rightDeckleStack}>
          <View style={[styles.leafLine, { backgroundColor: bg.dayAccent, opacity: 0.75, right: 0 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf3, right: 1.5 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf2, right: 3 }]} />
          <View style={[styles.leafLine, { backgroundColor: DAY_TONES.leaf1, right: 4.5 }]} />
          <View style={[styles.leafBorder, { borderColor: DAY_TONES.leafCutEdge, right: 5.5 }]} />
        </View>

        {/* Left Spine Gutter (Curved Open-Book Binding Roll-off) */}
        <View style={styles.leftSpineShadow}>
          <View style={[styles.spineBand4, { backgroundColor: bg.daySpineColor, opacity: 0.15 }]} />
          <View style={[styles.spineBand3, { backgroundColor: bg.daySpineColor, opacity: 0.3 }]} />
          <View style={[styles.spineBand2, { backgroundColor: bg.daySpineColor, opacity: 0.55 }]} />
          <View style={[styles.spineBand1, { backgroundColor: bg.daySpineColor, opacity: 0.8 }]} />
          <View style={[styles.spineCrease, { backgroundColor: bg.daySpineColor }]} />
        </View>

        {/* Turning Edge Lift Sheen */}
        <View style={[styles.turningEdgeCurl, { backgroundColor: DAY_TONES.liftSheen }]} />
      </Animated.View>

      {/* Night (Lamp) Mode Layer: Page-specific night background */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          nightLayerStyle,
          { backgroundColor: bg.lampBackground },
        ]}
        pointerEvents="none"
      >
        {bg.textureOpacityLamp > 0 ? (
          <Image
            source={ANTIQUE_PAPER_DAY}
            style={[StyleSheet.absoluteFill, { opacity: bg.textureOpacityLamp }]}
            contentFit="cover"
            priority="high"
            cachePolicy="memory-disk"
          />
        ) : null}

        {/* Themed night wash */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bg.lampPaperTint },
          ]}
        />

        {/* Themed atmosphere glow */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="moonGlow" cx="50%" cy="30%" rx="55%" ry="50%">
              <Stop offset="0%" stopColor={bg.lampAccent} stopOpacity="0.22" />
              <Stop offset="60%" stopColor={bg.lampBackground} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={bg.lampBackground} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#moonGlow)" />
        </Svg>

        {/* Lamp Template CSS Decorations */}
        {isNewspaper ? (
          <View style={styles.newspaperHeaderContainer}>
            <View style={[styles.newspaperDoubleRule, { borderColor: bg.lampTextColor }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 2.5 }}>
              <Text style={[styles.newspaperMastheadLabel, { color: bg.lampTextColor }]}>
                {bg.previewMasthead}
              </Text>
              <Text style={[styles.newspaperFolioLabel, { color: bg.lampAccent }]}>
                FOLIO EDITION
              </Text>
            </View>
            <View style={[styles.newspaperSingleRule, { borderColor: bg.lampTextColor }]} />
          </View>
        ) : null}

        {isOxford ? (
          <View
            style={[
              styles.oxfordInnerFrame,
              {
                borderColor: `${bg.lampAccent}50`,
              },
            ]}
          >
            <View style={[styles.cornerBracketTL, { borderColor: bg.lampAccent }]} />
            <View style={[styles.cornerBracketTR, { borderColor: bg.lampAccent }]} />
            <View style={[styles.cornerBracketBL, { borderColor: bg.lampAccent }]} />
            <View style={[styles.cornerBracketBR, { borderColor: bg.lampAccent }]} />
          </View>
        ) : null}

        {isKraft ? (
          <View
            style={[
              styles.kraftStitchedSeam,
              {
                borderLeftColor: 'rgba(238, 214, 191, 0.25)',
              },
            ]}
          />
        ) : null}

        {isSage ? (
          <View
            style={[
              styles.sageMarginRule,
              {
                borderColor: 'rgba(90, 140, 95, 0.18)',
              },
            ]}
          />
        ) : null}

        {isVellum ? (
          <View
            style={[
              styles.vellumInnerFrame,
              {
                borderColor: `${bg.lampAccent}45`,
              },
            ]}
          />
        ) : null}

        {/* Outer book cover rim in cool dark slate */}
        <View style={[styles.coverRim, { backgroundColor: NIGHT_TONES.coverRim }]} />

        {/* Stacked paper deckle leaf layers */}
        <View style={styles.rightDeckleStack}>
          <View style={[styles.leafLine, { backgroundColor: bg.lampAccent, opacity: 0.65, right: 0 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf3, right: 1.5 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf2, right: 3 }]} />
          <View style={[styles.leafLine, { backgroundColor: NIGHT_TONES.leaf1, right: 4.5 }]} />
          <View style={[styles.leafBorder, { borderColor: NIGHT_TONES.leafCutEdge, right: 5.5 }]} />
        </View>

        {/* Left Spine Gutter */}
        <View style={[styles.leftSpineShadow, styles.nightSpineShadow]}>
          <View style={[styles.spineBand3, { backgroundColor: bg.lampSpineColor, opacity: 0.25 }]} />
          <View style={[styles.spineBand2, { backgroundColor: bg.lampSpineColor, opacity: 0.45 }]} />
          <View style={[styles.spineBand1, { backgroundColor: bg.lampSpineColor, opacity: 0.7 }]} />
          <View style={[styles.spineCrease, { backgroundColor: bg.lampSpineColor }]} />
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
  // Template: Newspaper styles
  newspaperHeaderContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  newspaperDoubleRule: {
    borderTopWidth: 2,
    borderBottomWidth: 1,
    height: 4,
    marginBottom: 2,
  },
  newspaperSingleRule: {
    borderBottomWidth: 1,
    marginTop: 2,
  },
  newspaperMastheadLabel: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  newspaperFolioLabel: {
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Template: Oxford Royal Gold Frame
  oxfordInnerFrame: {
    position: 'absolute',
    top: 52,
    left: 14,
    right: 14,
    bottom: 24,
    borderWidth: 1,
    zIndex: 5,
  },
  cornerBracketTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBracketTR: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBracketBL: {
    position: 'absolute',
    bottom: -1,
    left: -1,
    width: 8,
    height: 8,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBracketBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  // Template: Kraft Stitched Seam
  kraftStitchedSeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    width: 2,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    zIndex: 5,
  },
  // Template: Sage Botanical Frame
  sageMarginRule: {
    position: 'absolute',
    top: 50,
    bottom: 24,
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 5,
  },
  // Template: Vellum Archive Frame
  vellumInnerFrame: {
    position: 'absolute',
    top: 52,
    bottom: 26,
    left: 15,
    right: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    zIndex: 5,
  },
});
