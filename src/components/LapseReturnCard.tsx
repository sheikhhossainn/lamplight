import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ChevronRightIcon, CloseIcon } from '@/components/icons';
import type { LapseAction, LapsePrompt } from '@/features/retention/lapseRecovery';
import { useTheme } from '@/theme/ThemeProvider';

export type LapseReturnCardProps = {
  prompt: LapsePrompt;
  onAction: (action: LapseAction) => void;
  onDismiss: () => void;
};

export function LapseReturnCard({ prompt, onAction, onDismiss }: LapseReturnCardProps) {
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  const handleAction = () => {
    void Haptics.selectionAsync().catch(() => {});
    onAction(prompt.primaryAction);
  };

  const handleDismiss = () => {
    void Haptics.selectionAsync().catch(() => {});
    onDismiss();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.card,
          borderColor: isLamp ? 'rgba(245, 166, 35, 0.28)' : 'rgba(245, 166, 35, 0.45)',
          borderWidth: 1,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
          padding: spacing.lg,
        },
      ]}
    >
      {/* Top Header Row with Eyebrow and Dismiss */}
      <View style={styles.headerRow}>
        <View style={styles.eyebrowContainer}>
          <Text style={{ color: colors.flameAmber, fontSize: 13, marginRight: 6 }}>✦</Text>
          <Text
            style={[
              typography.eyebrowLabel,
              { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.8 },
            ]}
          >
            {prompt.subtitle.toUpperCase()}
          </Text>
        </View>

        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss return notice"
        >
          <CloseIcon color={colors.fawn} size={15} />
        </Pressable>
      </View>

      {/* Main Title */}
      <Text
        style={[
          typography.screenTitle,
          {
            color: colors.ink,
            fontSize: 18,
            lineHeight: 24,
            marginTop: spacing.xs,
          },
        ]}
      >
        {prompt.title}
      </Text>

      {/* Calm Message */}
      <Text
        style={[
          typography.readingBody,
          {
            color: colors.umber,
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
          },
        ]}
      >
        {prompt.message}
      </Text>

      {/* Primary Action Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 10 }}>
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.flameAmber,
              borderRadius: radius.pill,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={prompt.primaryAction.label}
        >
          <Text
            style={[
              typography.buttonLabel,
              { color: colors.primaryDark, fontSize: 13.5, fontWeight: '700' },
            ]}
          >
            {prompt.primaryAction.label}
          </Text>
          <View style={{ marginLeft: 6 }}>
            <ChevronRightIcon color={colors.primaryDark} size={14} />
          </View>
        </Pressable>

        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: colors.hairline,
              borderRadius: radius.pill,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
        >
          <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 12.5 }]}>
            Maybe later
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
