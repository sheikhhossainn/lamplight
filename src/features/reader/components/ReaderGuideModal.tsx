import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BookmarkIcon, CloseIcon, MenuIcon, SoundWaveIcon, TranslateIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const { height: screenHeight } = Dimensions.get('window');

type ReaderGuideModalProps = {
  visible?: boolean;
  progress: SharedValue<number>;
  onClose: () => void;
  onOpenLanguagePicker?: () => void;
};

export function ReaderGuideModal({ progress, onClose }: ReaderGuideModalProps) {
  const { colors, typography, radius } = useTheme();

  const overlayAnimStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      display: p <= 0.001 ? 'none' : 'flex',
    };
  });

  const dialogAnimStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      elevation: interpolate(p, [0, 0.05, 1], [0, 0, 14]),
      transform: [
        { scale: interpolate(p, [0, 1], [0.93, 1]) },
        { translateY: interpolate(p, [0, 1], [14, 0]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlayRoot, overlayAnimStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderRadius: 20,
            maxHeight: Math.min(640, screenHeight * 0.88),
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
            <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 6 }]}>
              How to Read & Explore
            </Text>
          </View>
          <Pressable
            onPress={onClose}
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

        {/* Guide items */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.itemsList}
        >
          {/* 1. Page Turn */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L11 6M5 12L11 18"
                  stroke={colors.flameAmber}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Turn pages effortlessly
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Swipe left anywhere on the page, or tap the bottom-right corner to advance to the next page.
              </Text>
            </View>
          </View>

          {/* 2. Reader Tools Menu */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <MenuIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Reader Tools Menu
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Tap the menu in the top left corner to access <Text style={{ fontWeight: '600', color: colors.ink }}>Page & Font Style</Text>, switch between <Text style={{ fontWeight: '600', color: colors.ink }}>Day & Lamp modes</Text>, or <Text style={{ fontWeight: '600', color: colors.ink }}>Translate the page</Text>.
              </Text>
            </View>
          </View>

          {/* 3. Listen to Nature Sounds */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <SoundWaveIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Listen to Nature Sounds
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Choose <Text style={{ fontWeight: '600', color: colors.ink }}>Listen to Nature Sounds</Text> from the menu to play soothing ambient soundscapes (rain, fire, forest) and page-turn audio.
              </Text>
            </View>
          </View>

          {/* 3. Word Translation */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <TranslateIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Hold any word to translate
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                Press and hold onto any word to reveal its definition, translation, and grammatical notes.
              </Text>
            </View>
          </View>

          {/* 4. Select & Save Quotes with Sliders */}
          <View style={styles.guideItem}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
              <BookmarkIcon color={colors.flameAmber} size={18} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                Select & save quotes with sliders
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                After holding a word, tap <Text style={{ fontWeight: '600', color: colors.ink }}>"Save as quote"</Text>. Two slider handles will appear—drag them to highlight the exact passage and save it.
              </Text>
            </View>
          </View>

          {/* Helpful reminder note */}
          <View style={styles.tipWrap}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, textAlign: 'center', lineHeight: 17 }]}>
              To view this guide again anytime, tap the menu in the top left corner.
            </Text>
          </View>
        </ScrollView>

        {/* Action button */}
        <Pressable
          onPress={onClose}
          style={[styles.startButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 15, fontWeight: '700' }]}>
            Start Reading
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  dialog: {
    width: '100%',
    maxWidth: 390,
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
    marginBottom: 16,
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
    gap: 16,
    paddingBottom: 8,
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
    marginTop: 14,
  },
  tipWrap: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
});
