import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { getPendingWhatsNew, markWhatsNewSeen } from '@/features/app-update/whatsNew';
import { useTheme } from '@/theme/ThemeProvider';

// Global, rendered once at the app root (see _layout.tsx). Shows once per
// hydrate after an OTA update finishes applying — the entry is keyed by
// version in whatsNew.ts, marked seen on dismiss so it never repeats.
export function WhatsNewOverlay() {
  const { colors, typography, spacing, radius } = useTheme();
  const entry = getPendingWhatsNew();

  if (!entry) return null;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: colors.primaryDark, padding: spacing.xl }]}>
        <View style={styles.middleSection}>
          <Text style={[typography.onboardingHeadline, { color: colors.lampText, textAlign: 'center' }]}>
            {entry.headline}
          </Text>

          <View style={[styles.list, { marginTop: spacing.lg, gap: spacing.md }]}>
            {entry.changes.map((change, index) => (
              <View key={index} style={styles.row}>
                <View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: colors.flameAmber, borderRadius: radius.card },
                  ]}
                >
                  <CheckIcon color={colors.primaryDark} size={13} />
                </View>
                <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, flex: 1, fontSize: 15, lineHeight: 22 }]}>
                  {change}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: colors.flameAmber }]}
          onPress={() => markWhatsNewSeen(entry.version)}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Got it</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkBadge: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
