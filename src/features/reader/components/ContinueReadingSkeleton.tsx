import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Dim placeholder for the "Continue reading" card, shown while its DB read is
// in flight — same visual language (dim rect, opacity 0.6) as library.tsx's
// SkeletonShelf.
export function ContinueReadingSkeleton() {
  const { colors, spacing, radius, layout } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: colors.card,
        borderRadius: radius.card,
        marginHorizontal: layout.screenMargin,
        marginTop: spacing.lg,
        opacity: 0.6,
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ width: 100, height: 10, borderRadius: 4, backgroundColor: colors.hairline, marginBottom: spacing.sm }} />
        <View style={{ width: 160, height: 14, borderRadius: 4, backgroundColor: colors.hairline }} />
      </View>
    </View>
  );
}
