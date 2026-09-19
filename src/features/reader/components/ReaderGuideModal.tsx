import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BookmarkIcon, CloseIcon, MenuIcon, SoundWaveIcon, TranslateIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const { height: screenHeight } = Dimensions.get('screen');

type ReaderGuideModalProps = {
  visible: boolean;
  onClose: () => void;
  onOpenLanguagePicker?: () => void;
};

export function ReaderGuideModal({ visible, onClose }: ReaderGuideModalProps) {
  const { colors, typography, radius } = useTheme();

  // Modal entrance/exit animation values
  const isClosingRef = useRef(false);
  const backdropOpacity = useSharedValue(0);
  const dialogOpacity = useSharedValue(0);
  const dialogScale = useSharedValue(0.94);
  const dialogTranslateY = useSharedValue(12);

  // Subtle directional pulse for gesture visual cues
  const leftSwipeX = useSharedValue(0);
  const rightSwipeX = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    isClosingRef.current = false;
    backdropOpacity.value = 0;
    dialogOpacity.value = 0;
    dialogScale.value = 0.94;
    dialogTranslateY.value = 12;

    backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    dialogOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    dialogScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(1.05)) });
    dialogTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });

    leftSwipeX.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 650, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
    rightSwipeX.value = withRepeat(
      withSequence(
        withTiming(7, { duration: 650, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [visible, backdropOpacity, dialogOpacity, dialogScale, dialogTranslateY, leftSwipeX, rightSwipeX]);

  const handleDismiss = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    backdropOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    dialogOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
    dialogScale.value = withTiming(0.93, { duration: 180, easing: Easing.in(Easing.cubic) });
    dialogTranslateY.value = withTiming(
      14,
      { duration: 180, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [onClose, backdropOpacity, dialogOpacity, dialogScale, dialogTranslateY]);

  // Handle hardware back button on Android
  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleDismiss]);

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const dialogAnimStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [
      { scale: dialogScale.value },
      { translateY: dialogTranslateY.value },
    ],
  }));

  const leftArrowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftSwipeX.value }],
  }));

  const rightArrowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightSwipeX.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      {/* Backdrop: full-screen touch-blocking overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
      </Animated.View>

      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderRadius: 22,
            maxHeight: Math.min(680, screenHeight * 0.88),
          },
          dialogAnimStyle,
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <View style={[styles.badge, { backgroundColor: `${colors.flameAmber}22`, borderRadius: radius.pill }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, fontWeight: '700' }]}>
                READER GUIDE
              </Text>
            </View>
            <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 5 }]}>
              Reading Gestures & Tools
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 2 }]}>
              Natural touch & swipe interactions for your books
            </Text>
          </View>
          <Pressable
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.5 },
            ]}
          >
            <View pointerEvents="none">
              <CloseIcon color={colors.fawn} size={18} />
            </View>
          </Pressable>
        </View>

        {/* Scrollable guide content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.itemsList}
        >
          {/* Visual Dual Gesture Showcase */}
          <View
            style={[
              styles.gestureShowcase,
              { backgroundColor: `${colors.flameAmber}0A`, borderColor: `${colors.flameAmber}2E`, borderRadius: 14 },
            ]}
          >
            {/* Forward Swipe Tile */}
            <View style={[styles.gestureTile, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: 10 }]}>
              <View style={[styles.gestureIconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Animated.View style={leftArrowAnimStyle}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M19 12H5M5 12L11 6M5 12L11 18"
                      stroke={colors.flameAmber}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Animated.View>
              </View>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8 }]}>
                Swipe Left
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '600', marginTop: 1 }]}>
                Next Page ➔
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginTop: 4, textAlign: 'center' }]}>
                or tap right corner
              </Text>
            </View>

            {/* Backward Swipe Tile */}
            <View style={[styles.gestureTile, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: 10 }]}>
              <View style={[styles.gestureIconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Animated.View style={rightArrowAnimStyle}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke={colors.flameAmber}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Animated.View>
              </View>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8 }]}>
                Swipe Right
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '600', marginTop: 1 }]}>
                ⬅ Turn Back
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginTop: 4, textAlign: 'center' }]}>
                active on page 2+
              </Text>
            </View>
          </View>

          {/* 1. Hold Word to Translate */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <TranslateIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Hold any word to translate
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Press and hold onto any word in the text to see its instant definition, translation, and grammatical notes.
              </Text>
            </View>
          </View>

          {/* 2. Select & Save Quotes */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <BookmarkIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Save quotes with drag sliders
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                After holding a word, tap <Text style={{ fontWeight: '600', color: colors.ink }}>"Save as quote"</Text>. Two slider handles will appear—drag them to highlight the exact passage.
              </Text>
            </View>
          </View>

          {/* 3. Reader Tools Menu */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <MenuIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Top-Left Tools Menu
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Tap the <Text style={{ fontWeight: '600', color: colors.ink }}>☰ menu</Text> at the top-left to adjust font sizes, toggle <Text style={{ fontWeight: '600', color: colors.ink }}>Day / Lamp modes</Text>, or translate the whole page.
              </Text>
            </View>
          </View>

          {/* 4. Listen to Nature Sounds */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <SoundWaveIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Ambient Sounds & Page Audio
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Select <Text style={{ fontWeight: '600', color: colors.ink }}>Listen to Nature Sounds</Text> from the menu to play soothing ambient soundscapes (rain, fire, forest) while you read.
              </Text>
            </View>
          </View>

          {/* Helpful reminder note */}
          <View style={styles.tipWrap}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, textAlign: 'center', lineHeight: 17 }]}>
              To view this guide again anytime, tap the menu (☰) in the top left corner.
            </Text>
          </View>
        </ScrollView>

        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 15, fontWeight: '700' }]}>
            Start Reading
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 9999,
    elevation: 50,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  dialog: {
    width: '100%',
    maxWidth: 395,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  itemsList: {
    gap: 14,
    paddingBottom: 6,
  },
  gestureShowcase: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  gestureTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  gestureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  itemContent: {
    flex: 1,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 12,
  },
  tipWrap: {
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 8,
  },
});
