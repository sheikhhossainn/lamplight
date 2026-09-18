import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CultureMotif } from '@/components/CultureMotif';
import { getLiteraryThemeOption } from '@/features/settings/literaryTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureMaterial, getCultureThemeColors } from '@/theme/tokens';
import { getNativeUiTextStyle } from '@/theme/typography';

const LANGUAGE_BY_THEME = {
  bengali: 'bn',
  korean: 'ko',
  japanese: 'ja',
  arabic: 'ar',
  western: 'en',
} as const;

export function CultureEditionBanner({
  compact = false,
  themeProgress,
}: {
  compact?: boolean;
  themeProgress?: SharedValue<number>;
}) {
  const { colors, cultureTheme, scheme, spacing, radius, typography } = useTheme();
  const profile = getLiteraryThemeOption(cultureTheme);
  const material = getCultureMaterial(cultureTheme, scheme);
  const dayMaterial = getCultureMaterial(cultureTheme, 'day');
  const lampMaterial = getCultureMaterial(cultureTheme, 'lamp');
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  const language = LANGUAGE_BY_THEME[cultureTheme as keyof typeof LANGUAGE_BY_THEME] ?? 'en';
  const isRTL = cultureTheme === 'arabic';
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
      accessibilityLabel={`${profile.title} reading theme. ${profile.nativeTitle}`}
    >
      <CultureMotif theme={cultureTheme} color={material.accent} />
      <Animated.View style={[styles.monogram, compact && styles.monogramCompact, animatedMonogramStyle]}>
        <Animated.Text style={[getNativeUiTextStyle(language, 'display'), styles.monogramText, animatedAccentTextStyle]}>
          {profile.monogram}
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
          {profile.nativeTitle}
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
          {profile.nativeSubtitle}
        </Animated.Text>
        <Animated.Text style={[typography.eyebrowLabel, styles.edition, animatedAccentTextStyle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {profile.editionLabel}
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
