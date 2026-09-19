import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CultureMotif } from '@/components/CultureMotif';
import {
  getLiteraryThemeOption,
  getModularThemePresentation,
} from '@/features/settings/literaryTheme';
import { useMotherTongue, type MotherTongueCode } from '@/features/settings/motherTongue';
import {
  useTargetReadingLanguage,
  type TargetReadingLanguageCode,
} from '@/features/settings/targetReadingLanguage';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureMaterial, getCultureThemeColors } from '@/theme/tokens';
import { getNativeUiTextStyle } from '@/theme/typography';

export function CultureEditionBanner({
  compact = false,
  themeProgress,
  motherTongue: overrideMotherTongue,
  targetReadingLanguage: overrideTargetReadingLanguage,
}: {
  compact?: boolean;
  themeProgress?: SharedValue<number>;
  motherTongue?: MotherTongueCode;
  targetReadingLanguage?: TargetReadingLanguageCode;
}) {
  const { cultureTheme, scheme, spacing, radius, typography } = useTheme();
  const currentMotherTongue = useMotherTongue();
  const currentTargetReadingLanguage = useTargetReadingLanguage();
  const motherTongue = overrideMotherTongue ?? currentMotherTongue;
  const targetReadingLanguage = overrideTargetReadingLanguage ?? currentTargetReadingLanguage;
  const profile = getLiteraryThemeOption(cultureTheme);
  const presentation = getModularThemePresentation(cultureTheme, motherTongue, targetReadingLanguage);
  const material = getCultureMaterial(cultureTheme, scheme);
  const dayMaterial = getCultureMaterial(cultureTheme, 'day');
  const lampMaterial = getCultureMaterial(cultureTheme, 'lamp');
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  const language = presentation.displayLanguage;
  const isRTL = language === 'ar';
  const localProgress = useSharedValue(scheme === 'lamp' ? 1 : 0);
  const progress = themeProgress ?? localProgress;

  useEffect(() => {
    if (!themeProgress) {
      localProgress.set(withTiming(scheme === 'lamp' ? 1 : 0, { duration: 200 }));
    }
  }, [localProgress, scheme, themeProgress]);

  const animatedBannerStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      backgroundColor: interpolateColor(value, [0, 1], [dayMaterial.wash, lampMaterial.wash]),
      borderLeftColor: interpolateColor(value, [0, 1], [dayMaterial.accent, lampMaterial.accent]),
      borderRightColor: interpolateColor(value, [0, 1], [dayMaterial.accent, lampMaterial.accent]),
    };
  });

  const animatedMonogramStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      backgroundColor: interpolateColor(value, [0, 1], [dayColors.card, lampColors.card]),
      borderColor: interpolateColor(value, [0, 1], [dayMaterial.accent, lampMaterial.accent]),
    };
  });

  const animatedAccentTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [dayMaterial.accent, lampMaterial.accent]),
  }));

  const animatedInkTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [dayColors.ink, lampColors.ink]),
  }));

  const animatedUmberTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [dayColors.umber, lampColors.umber]),
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        compact && styles.bannerCompact,
        animatedBannerStyle,
        {
          borderLeftWidth: isRTL ? 0 : 4,
          borderRightWidth: isRTL ? 4 : 0,
          borderRadius: radius.card,
          marginTop: spacing.xsm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      accessibilityLabel={`${presentation.title} reading theme. ${presentation.nativeTitle}`}
    >
      <CultureMotif theme={cultureTheme} color={material.accent} />
      <Animated.View style={[styles.monogram, compact && styles.monogramCompact, animatedMonogramStyle]}>
        <Animated.Text style={[getNativeUiTextStyle(language, 'display'), styles.monogramText, animatedAccentTextStyle]}>
          {presentation.monogram}
        </Animated.Text>
      </Animated.View>
      <View style={[styles.copy, { marginLeft: isRTL ? 0 : spacing.xsm, marginRight: isRTL ? spacing.xsm : 0 }]}>
        <Animated.Text
          style={[
            getNativeUiTextStyle(language, 'display'),
            styles.title,
            animatedInkTextStyle,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
          numberOfLines={1}
        >
          {presentation.nativeTitle}
        </Animated.Text>
        <Animated.Text
          style={[
            getNativeUiTextStyle(language, 'metadata'),
            styles.subtitle,
            animatedUmberTextStyle,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
          numberOfLines={1}
        >
          {presentation.nativeSubtitle}
        </Animated.Text>
        <Animated.Text style={[typography.eyebrowLabel, styles.edition, animatedAccentTextStyle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {presentation.editionLabel}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 92,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerCompact: {
    minHeight: 76,
  },
  monogram: {
    width: 52,
    height: 58,
    borderWidth: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramCompact: {
    width: 44,
    height: 48,
  },
  monogramText: {
    fontSize: 25,
    lineHeight: 34,
  },
  copy: {
    flex: 1,
  },
  title: {
  },
  subtitle: {
    marginTop: -1,
  },
  edition: {
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
    letterSpacing: 1,
  },
});
