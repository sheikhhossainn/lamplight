import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Generic dim row placeholders for any list screen whose first DB read is
// still in flight — same visual language (dim rect, opacity 0.6) as
// library.tsx's SkeletonShelf and ContinueReadingSkeleton.
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const { colors, spacing } = useTheme();
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, opacity: 0.6 }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: '55%',
                height: 13,
                borderRadius: 4,
                backgroundColor: colors.card,
                marginBottom: spacing.sm,
              }}
            />
            <View style={{ width: '35%', height: 10, borderRadius: 4, backgroundColor: colors.card }} />
          </View>
        </View>
      ))}
    </View>
  );
}
