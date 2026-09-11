import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CloseIcon,
  MoonIcon,
  SoundWaveIcon,
  SunIcon,
  TranslateIcon,
} from '@/components/icons';
import { TargetLanguage, targetLanguageLabel } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
  onToggleTranslation: () => void;
  isTranslated: boolean;
  isTranslating: boolean;
  onOpenDecipher?: () => void;
  onOpenLanguagePicker: () => void;
  targetLanguage: TargetLanguage;
  onOpenAmbience: () => void;
  ambienceLabel: string | null;
  mode: 'day' | 'lamp';
  onToggleMode: () => void;
};

export function ReaderMenuModal({
  visible,
  onClose,
  onOpenGuide,
  onToggleTranslation,
  isTranslated,
  isTranslating,
  onOpenDecipher,
  onOpenLanguagePicker,
  targetLanguage,
  onOpenAmbience,
  ambienceLabel,
  mode,
  onToggleMode,
}: ReaderMenuModalProps) {
  const { colors, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const modeProgress = useSharedValue(mode === 'lamp' ? 1 : 0);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      modeProgress.set(
        withSpring(mode === 'lamp' ? 1 : 0, {
          duration: 300,
          dampingRatio: 0.82,
          reduceMotion: ReduceMotion.System,
        })
      );
    }
  }, [mode, modeProgress]);

  const modeIconAnimatedStyle = useAnimatedStyle(() => {
    const p = modeProgress.get();
    const rotate = interpolate(p, [0, 1], [0, 360], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 0.5, 1], [1, 0.85, 1], Extrapolation.CLAMP);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.hairline, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
              Reader Tools
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Menu Items */}
          <View style={styles.itemsList}>
            {/* 1. Reader Guide */}
            <Pressable
              onPress={() => {
                onClose();
                onOpenGuide();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderRadius: radius.card },
                pressed && { backgroundColor: `${colors.flameAmber}10` },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14, fontWeight: '700' }]}>
                  ?
                </Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Reader Guide
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                  How to turn pages, translate & save quotes
                </Text>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: `${colors.flameAmber}20`, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, fontWeight: '700' }]}>
                  GUIDE
                </Text>
              </View>
            </Pressable>

            {/* 2. Full Page Translation */}
            <Pressable
              onPress={() => {
                onClose();
                onToggleTranslation();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderRadius: radius.card },
                pressed && { backgroundColor: `${colors.flameAmber}10` },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isTranslated ? colors.flameAmber : `${colors.flameAmber}18` },
                ]}
              >
                <TranslateIcon color={isTranslated ? colors.primaryDark : colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemBody}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Translate Page
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                  {isTranslating
                    ? 'Translating current page…'
                    : isTranslated
                    ? 'Showing translated page · tap to revert'
                    : 'Translate current page into target language'}
                </Text>
              </View>
              {isTranslated ? (
                <View style={[styles.pillBadge, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}>
                  <Text style={[typography.eyebrowLabel, { color: colors.primaryDark, fontSize: 10, fontWeight: '700' }]}>
                    ACTIVE
                  </Text>
                </View>
              ) : null}
            </Pressable>

            {/* Decipher Page (Illuminated Interlinear Breakdown) */}
            {onOpenDecipher ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenDecipher();
                }}
                style={({ pressed }) => [
                  styles.itemRow,
                  { borderRadius: radius.card },
                  pressed && { backgroundColor: `${colors.flameAmber}10` },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${colors.flameAmber}18` },
                  ]}
                >
                  <TranslateIcon color={colors.flameAmber} size={18} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                    Decipher Page
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                    Interlinear phonetics, word chips & translation
                  </Text>
                </View>
                <View style={[styles.pillBadge, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}>
                  <Text style={[typography.eyebrowLabel, { color: colors.primaryDark, fontSize: 10, fontWeight: '700' }]}>
                    SLA
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {/* 3. Target Language */}
            <Pressable
              onPress={() => {
                onClose();
                onOpenLanguagePicker();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderRadius: radius.card },
                pressed && { backgroundColor: `${colors.flameAmber}10` },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${colors.flameAmber}18` }]}>
                <TranslateIcon color={colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemBody}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Target Language
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                  Language used for dictionary lookups & translation
                </Text>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10.5, fontWeight: '600' }]}>
                  EN → {targetLanguageLabel(targetLanguage)} ▾
                </Text>
              </View>
            </Pressable>

            {/* 4. Reading Ambience */}
            <Pressable
              onPress={() => {
                onClose();
                onOpenAmbience();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderRadius: radius.card },
                pressed && { backgroundColor: `${colors.flameAmber}10` },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: ambienceLabel ? colors.flameAmber : `${colors.flameAmber}18` },
                ]}
              >
                <SoundWaveIcon color={ambienceLabel ? colors.primaryDark : colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemBody}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Reading Ambience
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                  {ambienceLabel ? `Playing: ${ambienceLabel}` : 'Background rain, fire, and library sounds'}
                </Text>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10.5, fontWeight: '600' }]}>
                  {ambienceLabel ? ambienceLabel : 'Off'} ▾
                </Text>
              </View>
            </Pressable>

            {/* 5. Day / Lamp Mode */}
            <Pressable
              hitSlop={6}
              onPress={() => {
                const nextVal = mode === 'lamp' ? 0 : 1;
                modeProgress.set(
                  withSpring(nextVal, {
                    duration: 260,
                    dampingRatio: 0.82,
                    reduceMotion: ReduceMotion.System,
                  })
                );
                onToggleMode();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderRadius: radius.card },
                pressed && { backgroundColor: `${colors.flameAmber}10`, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Animated.View style={[styles.iconBox, { backgroundColor: `${colors.flameAmber}18` }, modeIconAnimatedStyle]}>
                {mode === 'lamp' ? (
                  <MoonIcon color={colors.flameAmber} size={18} />
                ) : (
                  <SunIcon color={colors.flameAmber} size={18} />
                )}
              </Animated.View>
              <View style={styles.itemBody}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Reading Mode
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5, marginTop: 1 }]}>
                  {mode === 'lamp' ? 'Lamp mode (candlelit charcoal)' : 'Day mode (warm parchment)'}
                </Text>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10.5, fontWeight: '600' }]}>
                  {mode === 'lamp' ? '🌙 Lamp' : '☀️ Day'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  closeBtn: {
    padding: 6,
  },
  itemsList: {
    gap: 4,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBody: {
    flex: 1,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
});
