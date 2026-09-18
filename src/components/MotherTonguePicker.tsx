import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CultureMotif } from '@/components/CultureMotif';
import { CheckIcon, CloseIcon } from '@/components/icons';
import {
  getSuggestedThemeForMotherTongue,
  type LiteraryThemeCode,
} from '@/features/settings/literaryTheme';
import {
  MOTHER_TONGUES,
  type MotherTongueCode,
  type MotherTongueOption,
} from '@/features/settings/motherTongue';
import { useTheme } from '@/theme/ThemeProvider';
import { getNativeUiTextStyle } from '@/theme/typography';

type MotherTonguePickerProps = {
  visible: boolean;
  selected: MotherTongueCode;
  onSelect: (code: MotherTongueCode) => void;
  onClose: () => void;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function CultureThemeWash({ theme, onComplete }: { theme: LiteraryThemeCode; onComplete: () => void }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const duration = reducedMotion ? 140 : 280;
    translateX.set(reducedMotion ? 0 : -8);
    opacity.set(
      withSequence(
        withTiming(0.14, { duration: reducedMotion ? 50 : 80, easing: EASE_OUT, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: reducedMotion ? 90 : 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System }),
      ),
    );
    if (!reducedMotion) {
      translateX.set(withTiming(0, { duration, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
    }

    const timeout = setTimeout(onComplete, duration);
    return () => clearTimeout(timeout);
  }, [onComplete, opacity, reducedMotion, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: translateX.get() }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.themeWash, animatedStyle]}>
      <CultureMotif theme={theme} color={colors.umber} />
    </Animated.View>
  );
}

export function MotherTonguePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: MotherTonguePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [applyingTheme, setApplyingTheme] = useState<LiteraryThemeCode | null>(null);

  useEffect(() => {
    if (!visible) setApplyingTheme(null);
  }, [visible]);

  const handleSelect = (code: MotherTongueCode) => {
    onSelect(code);
    setApplyingTheme(getSuggestedThemeForMotherTongue(code));
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { backgroundColor: colors.parchment, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
          <View>
            <Text style={[typography.screenTitle, { color: colors.ink }]}>Mother Tongue</Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
              Curates your native literature shelf and bilingual lookups
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <CloseIcon color={colors.ink} size={18} />
          </Pressable>
        </View>

        <View style={[styles.list, { paddingHorizontal: spacing.xl, marginTop: spacing.xl }]}>
          {MOTHER_TONGUES.map((opt: MotherTongueOption) => {
            const isSelected = selected === opt.code;
            return (
              <Pressable
                key={opt.code}
                disabled={applyingTheme != null}
                onPress={() => {
                  handleSelect(opt.code);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.flameAmber : colors.hairline,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderRadius: radius.card,
                    padding: spacing.md,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <View style={styles.cardInfo}>
                  <Text style={[getNativeUiTextStyle(opt.code, 'row'), { color: colors.ink }]}>
                    {opt.nativeName}{' '}
                    <Text style={{ color: colors.fawn, fontSize: 13, fontWeight: '400' }}>
                      ({opt.name})
                    </Text>
                  </Text>
                  <Text
                    style={[
                      getNativeUiTextStyle(opt.code, 'metadata'),
                      { color: colors.flameAmber, marginTop: 2 },
                    ]}
                  >
                    {opt.sourceName}
                  </Text>
                  <Text
                    style={[
                      getNativeUiTextStyle(opt.code, 'metadata'),
                      { color: colors.umber, fontSize: opt.code === 'bn' ? 14 : 12, marginTop: 2 },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.sampleAuthors}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? colors.flameAmber : colors.straw,
                      backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <CheckIcon color={colors.primaryDark} size={11} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {applyingTheme ? <CultureThemeWash theme={applyingTheme} onComplete={onClose} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 26,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  themeWash: {
    backgroundColor: 'transparent',
  },
});
