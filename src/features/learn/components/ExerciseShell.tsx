import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { CloseIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

export type ExerciseShellProps = {
  currentIndex: number;
  totalExercises: number;
  onExit: () => void;
  children: React.ReactNode;
  promptTitle?: string;
  promptSubtitle?: string;
  headerRight?: React.ReactNode;
  bottomArea?: React.ReactNode;
};

export function ExerciseShell({
  currentIndex,
  totalExercises,
  onExit,
  children,
  promptTitle,
  promptSubtitle,
  headerRight,
  bottomArea,
}: ExerciseShellProps) {
  const { colors, typography, layout, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isLamp = scheme === 'lamp';

  const [showExitModal, setShowExitModal] = useState(false);

  const handlePressExit = () => {
    void Haptics.selectionAsync().catch(() => {});
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    onExit();
  };

  const progressFraction =
    totalExercises > 0 ? Math.min(1, Math.max(0, currentIndex / totalExercises)) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: layout.screenMargin,
          },
        ]}
      >
        <Pressable
          onPress={handlePressExit}
          accessibilityRole="button"
          accessibilityLabel="পাঠ থেকে বের হন (Exit lesson)"
          hitSlop={12}
          style={({ pressed }) => [
            styles.exitButton,
            {
              backgroundColor: isLamp ? colors.card : colors.parchment,
              borderColor: colors.hairline,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <CloseIcon size={18} color={colors.ink} />
        </Pressable>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isLamp ? colors.card : colors.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.flameAmber,
                  width: `${Math.round(progressFraction * 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {headerRight ? <View style={styles.headerRightContainer}>{headerRight}</View> : null}
      </View>

      {/* Main Body */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingHorizontal: layout.screenMargin,
            paddingBottom: bottomArea ? 16 : insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {promptTitle ? (
          <View style={styles.promptHeader}>
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
              {promptTitle}
            </Text>
            {promptSubtitle ? (
              <Text style={[typography.screenTitle, { color: colors.ink, marginTop: 4 }]}>
                {promptSubtitle}
              </Text>
            ) : null}
          </View>
        ) : null}

        {children}
      </ScrollView>

      {/* Bottom Area (Check button or FeedbackSheet) */}
      {bottomArea ? (
        <View style={{ paddingBottom: insets.bottom }}>
          {bottomArea}
        </View>
      ) : null}

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
              },
            ]}
          >
            <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20 }]}>
              পাঠ থেকে বের হবেন?
            </Text>
            <Text
              style={[
                typography.readingBody,
                {
                  color: colors.umber,
                  fontSize: 15,
                  lineHeight: 22,
                  marginTop: 8,
                },
              ]}
            >
              আপনার অগ্রগতি স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়েছে। পরে যেকোনো সময় ফিরে আসতে পারবেন।
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setShowExitModal(false)}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.hairline,
                  },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontWeight: '600' }]}>
                  চালিয়ে যান
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmExit}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.flameAmber,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.uiRowTitle,
                    {
                      color: colors.primaryDark,
                      fontWeight: '700',
                    },
                  ]}
                >
                  বের হন
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 12,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollBody: {
    flexGrow: 1,
    paddingTop: 8,
  },
  promptHeader: {
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
