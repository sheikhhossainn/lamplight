import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { CheckIcon } from '@/components/icons';
import { getPendingWhatsNew, markWhatsNewSeen } from '@/features/app-update/whatsNew';
import { hasCompletedOnboarding } from '@/features/settings/onboardingStatus';
import { useTheme } from '@/theme/ThemeProvider';

// Floating, non-intrusive changelog modal. Never acts as a splash screen,
// never mounts during onboarding or inside reader screens, and uses a gentle translucent backdrop.
export function WhatsNewOverlay() {
  const { colors, typography, spacing, radius } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();
  const entry = getPendingWhatsNew();

  if (!entry || dismissed) return null;

  // Never show on splash, onboarding, or during reading sessions to avoid collisions/splash-feel
  const isExcludedRoute =
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/onboarding' ||
    (typeof pathname === 'string' &&
      (pathname.startsWith('/reader') ||
        pathname.startsWith('/quran') ||
        pathname.startsWith('/bible') ||
        pathname.startsWith('/vedas') ||
        pathname.startsWith('/torah') ||
        pathname.startsWith('/bangla')));

  if (isExcludedRoute || !hasCompletedOnboarding()) {
    return null;
  }

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markWhatsNewSeen(entry.version);
    setDismissed(true);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
              padding: spacing.xl,
            },
          ]}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: 'rgba(245, 166, 35, 0.15)',
                  borderColor: 'rgba(245, 166, 35, 0.3)',
                },
              ]}
            >
              <Text style={{ color: colors.flameAmber, fontSize: 16 }}>✦</Text>
            </View>
            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.flameAmber, marginTop: 8, letterSpacing: 0.8 },
              ]}
            >
              WHAT’S NEW IN LAMPLIGHT
            </Text>
            <Text
              style={[
                typography.screenTitle,
                { color: colors.ink, fontSize: 18, marginTop: 4, textAlign: 'center' },
              ]}
            >
              {entry.headline}
            </Text>
          </View>

          {/* Changelog items */}
          <View style={[styles.list, { marginVertical: spacing.md, gap: spacing.md }]}>
            {entry.changes.map((change, index) => (
              <View key={index} style={styles.row}>
                <View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: 'rgba(245, 166, 35, 0.18)', borderRadius: radius.card },
                  ]}
                >
                  <CheckIcon color={colors.flameAmber} size={12} />
                </View>
                <Text
                  style={[
                    typography.readingBody,
                    { color: colors.ink, flex: 1, fontSize: 14, lineHeight: 20 },
                  ]}
                >
                  {change}
                </Text>
              </View>
            ))}
          </View>

          {/* Dismiss button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.flameAmber,
                borderRadius: radius.pill,
                marginTop: spacing.md,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={handleDismiss}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>
              Continue Reading
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
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
    marginTop: 1,
  },
  button: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
