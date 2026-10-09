import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

export type FeedbackSheetProps = {
  status: 'correct' | 'wrong';
  correctAnswer?: string;
  explanation?: string;
  onContinue: () => void;
  continueLabel?: string;
};

export function FeedbackSheet({
  status,
  correctAnswer,
  explanation,
  onContinue,
  continueLabel = 'চালিয়ে যান',
}: FeedbackSheetProps) {
  const { colors, typography, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const isCorrect = status === 'correct';

  useEffect(() => {
    if (isCorrect) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [isCorrect]);

  const sheetBg = isCorrect
    ? isLamp
      ? '#26221A'
      : '#FDF8EF'
    : isLamp
      ? '#2B1C1D'
      : '#FDF2F2';

  const borderColor = isCorrect ? colors.flameAmber : colors.highlight.clay;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: sheetBg,
          borderTopColor: borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Status indicator row */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isCorrect ? colors.flameAmber : colors.highlight.clay,
              },
            ]}
          >
            {isCorrect ? (
              <CheckIcon size={16} color={colors.primaryDark} />
            ) : (
              <CloseIcon size={16} color="#FFFFFF" />
            )}
          </View>
          <Text
            style={[
              typography.screenTitle,
              {
                fontSize: 19,
                color: isCorrect ? colors.flameAmber : colors.highlight.clay,
                fontWeight: '700',
              },
            ]}
          >
            {isCorrect ? 'ঠিক হয়েছে!' : 'সঠিক নয়'}
          </Text>
        </View>

        {/* Incorrect explanation / correct answer */}
        {!isCorrect && correctAnswer && (
          <View style={styles.answerSection}>
            <Text style={[typography.metadataCaption, { color: colors.umber }]}>
              সঠিক উত্তর:
            </Text>
            <Text
              style={[
                typography.titleUiContext,
                {
                  color: colors.ink,
                  fontSize: 18,
                  fontWeight: '600',
                  marginTop: 2,
                },
              ]}
            >
              {correctAnswer}
            </Text>
          </View>
        )}

        {/* Explanation text */}
        {explanation ? (
          <Text
            style={[
              typography.metadataCaption,
              {
                color: colors.umber,
                marginTop: 4,
                lineHeight: 18,
              },
            ]}
          >
            {explanation}
          </Text>
        ) : null}

        {/* Continue Button */}
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={`${continueLabel} (Continue)`}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: isCorrect ? colors.flameAmber : colors.primaryDark,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              typography.uiRowTitle,
              {
                color: isCorrect ? colors.primaryDark : '#FFFFFF',
                fontWeight: '700',
              },
            ]}
          >
            {continueLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 2,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  content: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerSection: {
    marginTop: 2,
  },
  continueButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
});
