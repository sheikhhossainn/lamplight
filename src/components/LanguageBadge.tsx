import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function getLanguageScriptGlyph(code: string): string {
  switch (code) {
    case 'bn':
      return 'অ';
    case 'ja':
      return 'あ';
    case 'ko':
      return '한';
    case 'ar':
      return 'ض';
    case 'en':
    default:
      return 'Aa';
  }
}

type LanguageBadgeProps = {
  code: string;
  size?: number;
  isSelected?: boolean;
  color?: string;
  marginRight?: number;
};

export function LanguageBadge({
  code,
  size = 38,
  isSelected = false,
  color,
  marginRight,
}: LanguageBadgeProps) {
  const { colors, typography, scheme } = useTheme();
  const isDark = scheme === 'lamp';
  const glyph = getLanguageScriptGlyph(code);

  const activeColor = color ?? (isSelected ? colors.flameAmber : isDark ? colors.fawn : colors.umber);
  const bgColor = isSelected
    ? 'rgba(245, 166, 35, 0.16)'
    : isDark
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.04)';
  const borderColor = isSelected
    ? 'rgba(245, 166, 35, 0.35)'
    : isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.08)';

  const fontSize = size <= 24 ? Math.round(size * 0.52) : Math.round(size * 0.42);
  const borderRadius = Math.max(4, Math.round(size * 0.28));
  const rMargin = marginRight !== undefined ? marginRight : size > 24 ? 13 : 0;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
          borderColor,
          marginRight: rMargin,
        },
      ]}
    >
      <Text
        style={[
          typography.uiRowTitle,
          styles.glyph,
          {
            color: activeColor,
            fontSize,
          },
        ]}
      >
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
