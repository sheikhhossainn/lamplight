import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppUpdateBanner } from '@/features/app-update/useAppUpdateBanner';
import { useTheme } from '@/theme/ThemeProvider';

// Global, rendered once at the app root (see _layout.tsx) — a downloaded
// update is relevant regardless of which screen someone's on.
export function AppUpdateBanner() {
  const { status, downloadProgress, applyUpdate } = useAppUpdateBanner();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  if (status === 'idle') return null;

  const containerStyle = [
    styles.banner,
    { top: insets.top + 8, backgroundColor: colors.card, borderColor: colors.hairline },
  ];

  if (status === 'ready') {
    return (
      <Pressable onPress={applyUpdate} style={containerStyle}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Update ready</Text>
        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 12 }]}>
          Tap to restart
        </Text>
      </Pressable>
    );
  }

  if (status === 'error') {
    return (
      <View style={containerStyle}>
        <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
          Update check failed
        </Text>
      </View>
    );
  }

  const label =
    status === 'downloading'
      ? `Downloading update… ${Math.round((downloadProgress ?? 0) * 100)}%`
      : 'Checking for update…';

  return (
    <View style={containerStyle}>
      <ActivityIndicator size="small" color={colors.flameAmber} />
      <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 50,
  },
});
