import { StyleSheet, Text, View } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

import { CultureMotif } from '@/components/CultureMotif';
import { LamplightClassicThemeIcon } from '@/components/icons';
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
import { getCultureMaterial } from '@/theme/tokens';
import { getNativeUiTextStyle } from '@/theme/typography';

export function CultureEditionBanner({
  compact = false,
  themeProgress: _themeProgress,
  motherTongue: overrideMotherTongue,
  targetReadingLanguage: overrideTargetReadingLanguage,
}: {
  compact?: boolean;
  themeProgress?: SharedValue<number>;
  motherTongue?: MotherTongueCode;
  targetReadingLanguage?: TargetReadingLanguageCode;
}) {
  const { colors, cultureTheme, scheme, spacing, radius, typography } = useTheme();
  const currentMotherTongue = useMotherTongue();
  const currentTargetReadingLanguage = useTargetReadingLanguage();
  const motherTongue = overrideMotherTongue ?? currentMotherTongue;
  const targetReadingLanguage = overrideTargetReadingLanguage ?? currentTargetReadingLanguage;
  const presentation = getModularThemePresentation(cultureTheme, motherTongue, targetReadingLanguage);
  const material = getCultureMaterial(cultureTheme, scheme);
  const language = presentation.displayLanguage;
  const subtitleLanguage = presentation.subtitleLanguage ?? motherTongue;
  const isRTL = language === 'ar';

  return (
    <View
      style={[
        styles.banner,
        compact && styles.bannerCompact,
        {
          backgroundColor: material.wash,
          borderLeftColor: material.accent,
          borderRightColor: material.accent,
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
      <View
        style={[
          styles.monogram,
          compact && styles.monogramCompact,
          {
            backgroundColor: colors.card,
            borderColor: material.accent,
          },
        ]}
      >
        {cultureTheme === 'classic' ? (
          <LamplightClassicThemeIcon
            color={scheme === 'day' ? '#8A5A16' : '#F5A623'}
            flameColor={scheme === 'day' ? '#F5A623' : '#FFBF42'}
            size={compact ? 22 : 26}
          />
        ) : (
          <Text
            style={[
              getNativeUiTextStyle(language, 'display'),
              styles.monogramText,
              { color: material.accent },
            ]}
          >
            {presentation.monogram}
          </Text>
        )}
      </View>
      <View style={[styles.copy, { marginLeft: isRTL ? 0 : spacing.xsm, marginRight: isRTL ? spacing.xsm : 0 }]}>
        <Text
          style={[
            getNativeUiTextStyle(language, 'display'),
            styles.title,
            { color: colors.ink, textAlign: isRTL ? 'right' : 'left' },
          ]}
          numberOfLines={1}
        >
          {presentation.nativeTitle}
        </Text>
        <Text
          style={[
            getNativeUiTextStyle(subtitleLanguage, 'metadata'),
            styles.subtitle,
            {
              fontSize: subtitleLanguage === 'ar' ? 14 : subtitleLanguage === 'bn' ? 13.5 : 13,
              lineHeight: subtitleLanguage === 'ar' ? 20 : subtitleLanguage === 'bn' ? 19 : 18,
              color: colors.umber,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={compact ? 1 : 2}
        >
          {presentation.nativeSubtitle}
        </Text>
        <Text
          style={[
            typography.eyebrowLabel,
            styles.edition,
            { color: material.accent, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {presentation.editionLabel}
        </Text>
      </View>
    </View>
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
    width: 48,
    height: 54,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramCompact: {
    width: 42,
    height: 46,
  },
  monogramText: {
    fontSize: 24,
    lineHeight: 32,
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
