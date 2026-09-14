import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

type ScriptureInquirySpinnerProps = {
  stepIndex?: number;
};

const PHASES = [
  {
    title: 'Consulting scholarly records...',
    detail: 'Retrieving global theological exegesis & external context',
  },
  {
    title: 'Cross-referencing 4 traditions...',
    detail: 'Correlating Quran, New Testament, Torah & Rigveda',
  },
  {
    title: 'Verifying primary scripture verses...',
    detail: 'Validating original Arabic, Hebrew & Greek passages',
  },
  {
    title: 'Illuminating exegesis & Tafsir...',
    detail: 'Extracting classical commentaries without theological bias',
  },
];

export function ScriptureInquirySpinner({ stepIndex = 0 }: ScriptureInquirySpinnerProps) {
  const { colors, typography, scheme } = useTheme();
  const isDark = scheme === 'lamp';

  // Rotation for outer sacred compass ring
  const rotateOuter = useSharedValue(0);
  // Counter-rotation for inner geometric ring
  const rotateInner = useSharedValue(0);
  // Breathing pulse for sacred lantern glow
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    rotateOuter.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
    rotateInner.value = withRepeat(
      withTiming(-360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [glowOpacity, glowScale, rotateInner, rotateOuter]);

  const animatedOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateOuter.value}deg` }],
  }));

  const animatedInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateInner.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const currentPhase = PHASES[Math.min(Math.max(stepIndex, 0), PHASES.length - 1)];

  return (
    <View style={styles.container}>
      {/* Sacred Rotating Emblem & Ambient Aura */}
      <View style={styles.spinnerWrapper}>
        {/* Ambient Glow Aura */}
        <Animated.View
          style={[
            styles.glowAura,
            {
              backgroundColor: isDark ? '#5C3C00' : '#FFE2A4',
            },
            animatedGlowStyle,
          ]}
        />

        {/* Counter-rotating Inner Sacred Geometry */}
        <Animated.View style={[styles.innerCircleLayer, animatedInnerStyle]}>
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Circle
              cx="40"
              cy="40"
              r="30"
              stroke={colors.flameAmber}
              strokeWidth="1.2"
              strokeDasharray="4 6"
              fill="none"
              opacity={0.8}
            />
            {/* 4 Quadrant Dots (representing the 4 sacred traditions) */}
            <Circle cx="40" cy="10" r="2.2" fill={colors.flameAmber} />
            <Circle cx="70" cy="40" r="2.2" fill={colors.flameAmber} />
            <Circle cx="40" cy="70" r="2.2" fill={colors.flameAmber} />
            <Circle cx="10" cy="40" r="2.2" fill={colors.flameAmber} />
          </Svg>
        </Animated.View>

        {/* Outer Rotating Compass Frame */}
        <Animated.View style={[styles.svgLayer, animatedOuterStyle]}>
          <Svg width={116} height={116} viewBox="0 0 116 116">
            <Circle
              cx="58"
              cy="58"
              r="54"
              stroke={isDark ? '#4D3E24' : '#DFC699'}
              strokeWidth="1"
              strokeDasharray="1 7"
              fill="none"
            />
            <Circle
              cx="58"
              cy="58"
              r="46"
              stroke={colors.flameAmber}
              strokeWidth="1.6"
              strokeDasharray="22 14"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Center Sacred Lantern Flame */}
        <View style={styles.centerIconWrap}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            {/* Stylized Sanctuary Lantern Flame */}
            <Path
              d="M12 2C10.5 5.5 8 7.5 8 11.5C8 14.5 9.8 17 12 17C14.2 17 16 14.5 16 11.5C16 7.5 13.5 5.5 12 2Z"
              fill={colors.flameAmber}
            />
            <Path
              d="M12 8C11.2 9.8 10 11 10 13C10 14.3 10.9 15.2 12 15.2C13.1 15.2 14 14.3 14 13C14 11 12.8 9.8 12 8Z"
              fill={isDark ? '#FFF0D4' : '#FFFFFF'}
              opacity={0.9}
            />
            <Path
              d="M7 19.5H17"
              stroke={colors.flameAmber}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <Path
              d="M9 22H15"
              stroke={isDark ? '#8A7352' : '#BCA888'}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </View>

      {/* Dynamic Status Progress Text */}
      <View style={styles.textContainer}>
        <Text
          style={[
            typography.uiRowTitle,
            styles.titleText,
            { color: colors.ink },
          ]}
        >
          {currentPhase.title}
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            styles.detailText,
            { color: colors.fawn },
          ]}
        >
          {currentPhase.detail}
        </Text>
      </View>

      {/* 4 Traditions Indicator Bar */}
      <View
        style={[
          styles.traditionTagPill,
          {
            backgroundColor: isDark ? colors.card : '#F3ECE0',
            borderColor: colors.hairline,
          },
        ]}
      >
        <Text style={[typography.eyebrowLabel, styles.traditionTagText, { color: colors.flameAmber }]}>
          QURAN • BIBLE • TORAH • RIGVEDA
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  spinnerWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  glowAura: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  svgLayer: {
    position: 'absolute',
    width: 116,
    height: 116,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircleLayer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 320,
  },
  titleText: {
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  traditionTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  traditionTagText: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
});
