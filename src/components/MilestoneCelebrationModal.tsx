import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import type { MilestoneConfig } from '@/features/milestones/milestoneService';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

type MilestoneCelebrationModalProps = {
  visible: boolean;
  milestone: MilestoneConfig | null;
  isGuest?: boolean;
  onClose: () => void;
  onProtectAccount?: () => void;
  onFeedback?: () => void;
};

export function MilestoneCelebrationModal({
  visible,
  milestone,
  isGuest = false,
  onClose,
  onProtectAccount,
  onFeedback,
}: MilestoneCelebrationModalProps) {
  const { colors, typography, radius, spacing } = useTheme();

  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  if (!milestone) return null;

  const showAccountProtection = isGuest && milestone.isOwnershipMilestone && !!onProtectAccount;
  const showFeedbackPrompt = milestone.offersFeedbackPrompt && !!onFeedback;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
            },
          ]}
          onPress={() => {}}
        >
          {/* Milestone Icon Medallion */}
          <View style={styles.centerCol}>
            <View
              style={[
                styles.iconMedallion,
                {
                  backgroundColor: colors.parchment,
                  borderColor: colors.flameAmber,
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>{milestone.icon}</Text>
            </View>

            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.flameAmber, fontSize: 10, marginTop: 14 },
              ]}
            >
              MILESTONE REACHED
            </Text>

            <Text
              style={[
                typography.wordmark,
                { color: colors.ink, fontSize: 22, marginTop: 4, textAlign: 'center' },
              ]}
            >
              {milestone.title}
            </Text>

            <Text
              style={[
                typography.metadataCaption,
                {
                  color: colors.umber,
                  fontSize: 13,
                  lineHeight: 19,
                  textAlign: 'center',
                  marginTop: 8,
                  paddingHorizontal: 8,
                },
              ]}
            >
              {milestone.description}
            </Text>
          </View>

          {/* Secondary Account Protection Banner for Guests */}
          {showAccountProtection ? (
            <View
              style={[
                styles.subCard,
                {
                  backgroundColor: colors.parchment,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9.5 }]}>
                  PROTECT YOUR DATA
                </Text>
              </View>

              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.umber, fontSize: 11.5, marginTop: 4, lineHeight: 16 },
                ]}
              >
                Link a free account so your personal notes, words, and reading progress are safely preserved.
              </Text>

              <Pressable
                onPress={() => {
                  onClose();
                  onProtectAccount?.();
                }}
                style={[
                  styles.protectBtn,
                  { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.pill },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>
                  Save With Free Account →
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Optional Feedback Prompt */}
          {showFeedbackPrompt ? (
            <Pressable
              onPress={() => {
                onClose();
                onFeedback?.();
              }}
              style={[
                styles.feedbackRow,
                {
                  borderTopColor: colors.hairline,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  marginTop: spacing.md,
                  paddingTop: 10,
                },
              ]}
            >
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                Enjoying Lamplight? Share quiet feedback
              </Text>
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 11 }]}>
                Rate →
              </Text>
            </Pressable>
          ) : null}

          {/* Dismiss / Continue Action */}
          <Pressable
            onPress={onClose}
            style={[
              styles.continueBtn,
              {
                backgroundColor: colors.primaryDark,
                borderRadius: radius.pill,
                marginTop: showAccountProtection ? spacing.md : spacing.lg,
              },
            ]}
          >
            <Text style={[typography.buttonLabel, { color: colors.parchment, fontSize: 13 }]}>
              Continue
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 22,
  },
  centerCol: {
    alignItems: 'center',
  },
  iconMedallion: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCard: {
    borderWidth: 1,
    padding: 12,
  },
  protectBtn: {
    marginTop: 8,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
