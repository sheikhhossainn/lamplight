import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { CloseIcon } from '@/components/icons';
import {
  calculateCadencePacing,
  deleteReadingGoal,
  getReadingGoal,
  saveReadingGoal,
  type ReadingGoal,
} from '@/db/repositories/readingGoals';
import { formatHourMinute } from '@/features/reading-goal/cadenceScheduler';
import { canUse } from '@/features/subscription/subscriptionState';
import {
  scheduleCadenceReminder,
  cancelCadenceReminder,
} from '@/features/notifications/notificationService';
import { useTheme } from '@/theme/ThemeProvider';

export type ReadingCadenceModalProps = {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  totalChapters: number;
  currentChapterIndex?: number;
  onClose: () => void;
  onGoalSaved?: (goal: ReadingGoal) => void;
};

const DAY_OPTIONS = [7, 14, 30, 60] as const;
const MINUTE_OPTIONS = [15, 25, 45] as const;
const TIME_OPTIONS = [
  { label: 'Morning', hour: 7, minute: 30 },
  { label: 'Afternoon', hour: 14, minute: 0 },
  { label: 'Evening', hour: 20, minute: 30 },
  { label: 'Night', hour: 22, minute: 0 },
] as const;

export function ReadingCadenceModal({
  visible,
  bookId,
  bookTitle,
  totalChapters,
  currentChapterIndex = 0,
  onClose,
  onGoalSaved,
}: ReadingCadenceModalProps) {
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const isPremium = canUse('reading_insights');

  const [selectedDays, setSelectedDays] = useState<number>(14);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedTimeIdx, setSelectedTimeIdx] = useState<number>(2); // Evening 8:30 PM default
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [isAdaptive, setIsAdaptive] = useState<boolean>(isPremium);
  const [hasExistingGoal, setHasExistingGoal] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || !bookId) return;
    let mounted = true;
    void getReadingGoal(bookId).then((existing) => {
      if (!mounted) return;
      if (existing) {
        setHasExistingGoal(true);
        setSelectedDays(existing.targetDays);
        setSelectedMinutes(existing.dailyMinutes);
        setNotificationsEnabled(existing.notificationsEnabled);
        setIsAdaptive(existing.isAdaptive);

        const foundIdx = TIME_OPTIONS.findIndex(
          (t) => t.hour === existing.preferredHour && t.minute === existing.preferredMinute,
        );
        if (foundIdx !== -1) {
          setSelectedTimeIdx(foundIdx);
        }
      } else {
        setHasExistingGoal(false);
        setSelectedDays(14);
        setSelectedMinutes(25);
        setSelectedTimeIdx(2);
        setNotificationsEnabled(true);
        setIsAdaptive(isPremium);
      }
    });
    return () => {
      mounted = false;
    };
  }, [visible, bookId, isPremium]);

  if (!visible) return null;

  const targetDateMs = Date.now() + selectedDays * 24 * 60 * 60 * 1000;
  const preferredTime = TIME_OPTIONS[selectedTimeIdx] ?? TIME_OPTIONS[2];

  const previewGoal: ReadingGoal = {
    bookId,
    targetDays: selectedDays,
    targetCompletionDate: targetDateMs,
    dailyMinutes: selectedMinutes,
    preferredHour: preferredTime.hour,
    preferredMinute: preferredTime.minute,
    notificationsEnabled,
    isAdaptive,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const pacing = calculateCadencePacing({
    goal: previewGoal,
    totalChapters: Math.max(1, totalChapters),
    currentChapterIndex,
  });

  const handleSave = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const saved = await saveReadingGoal({
      bookId,
      targetDays: selectedDays,
      targetCompletionDate: targetDateMs,
      dailyMinutes: selectedMinutes,
      preferredHour: preferredTime.hour,
      preferredMinute: preferredTime.minute,
      notificationsEnabled,
      isAdaptive,
    });
    if (notificationsEnabled) {
      await scheduleCadenceReminder({
        goal: saved,
        bookTitle,
        currentChapterIndex,
        totalChapters,
      });
    } else {
      await cancelCadenceReminder(bookId);
    }
    onGoalSaved?.(saved);
    onClose();
  };

  const handleDelete = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteReadingGoal(bookId);
    await cancelCadenceReminder(bookId);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
            },
          ]}
        >
          {/* Top Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.hairline }]}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.8 },
                  ]}
                >
                  READING CADENCE
                </Text>
              </View>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 18, marginTop: 2 }]} numberOfLines={1}>
                {bookTitle}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={15} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Target Days Section */}
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.md, marginBottom: 8 }]}>
              Target to finish the book
            </Text>
            <View style={styles.chipRow}>
              {DAY_OPTIONS.map((days) => {
                const isSelected = selectedDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => {
                      setSelectedDays(days);
                      void Haptics.selectionAsync();
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? colors.flameAmber : colors.hairline,
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        {
                          color: isSelected ? colors.flameAmber : colors.umber,
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {days} Days
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Daily Minutes Section */}
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.lg, marginBottom: 8 }]}>
              Daily reading time you can give
            </Text>
            <View style={styles.chipRow}>
              {MINUTE_OPTIONS.map((mins) => {
                const isSelected = selectedMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => {
                      setSelectedMinutes(mins);
                      void Haptics.selectionAsync();
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? colors.flameAmber : colors.hairline,
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        {
                          color: isSelected ? colors.flameAmber : colors.umber,
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {mins} mins / day
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preferred Reading Hour */}
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.lg, marginBottom: 8 }]}>
              Preferred lamp lighting hour (Daily reminder)
            </Text>
            <View style={styles.chipGrid}>
              {TIME_OPTIONS.map((opt, idx) => {
                const isSelected = selectedTimeIdx === idx;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => {
                      setSelectedTimeIdx(idx);
                      void Haptics.selectionAsync();
                    }}
                    style={[
                      styles.timeChip,
                      {
                        borderColor: isSelected ? colors.flameAmber : colors.hairline,
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        {
                          color: isSelected ? colors.flameAmber : colors.ink,
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        {
                          color: isSelected ? colors.flameAmber : colors.fawn,
                          fontSize: 11,
                          marginTop: 2,
                        },
                      ]}
                    >
                      {formatHourMinute(opt.hour, opt.minute)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Smart Pacing Preview Card */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: isLamp ? '#232023' : 'rgba(245, 166, 35, 0.08)',
                  borderColor: 'rgba(245, 166, 35, 0.25)',
                  borderRadius: radius.card,
                  marginTop: spacing.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10.5 }]}>
                  CALCULATED READING PACING
                </Text>
              </View>

              <Text style={[typography.readingBody, { color: colors.ink, fontSize: 13.5, lineHeight: 20, marginTop: 6 }]}>
                Read <Text style={{ fontWeight: '700', color: colors.flameAmber }}>{pacing.requiredChaptersToday} chapters</Text> (~{pacing.estimatedMinutesToday} mins) daily to finish by{' '}
                <Text style={{ fontWeight: '700', color: colors.ink }}>{pacing.formattedCompletionDate}</Text>.
              </Text>

              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 4 }]}>
                Notification will trigger at {formatHourMinute(preferredTime.hour, preferredTime.minute)} using default system sound.
              </Text>

              {/* Adaptive Anti-Guilt Hook */}
              <Pressable
                disabled={isPremium}
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: '/paywall',
                    params: { feature: 'reading_insights', trigger: 'adaptive_pacing' },
                  });
                }}
                style={{ borderTopColor: colors.hairline, borderTopWidth: 1, marginTop: 10, paddingTop: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                      Adaptive Anti-Guilt Pacing
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10.5 }]}>
                      {isPremium
                        ? 'Missed a day? The schedule dynamically auto-smoothes without guilt.'
                        : 'Unlock with Lamplight Premium to auto-smooth missed days.'}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                      backgroundColor: isPremium ? 'rgba(245, 166, 35, 0.15)' : colors.hairline,
                    }}
                  >
                    <Text style={[typography.eyebrowLabel, { color: isPremium ? colors.flameAmber : colors.fawn, fontSize: 9.5 }]}>
                      {isPremium ? 'Active' : 'Premium'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Action Buttons */}
            <Pressable
              onPress={handleSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  marginTop: spacing.lg,
                },
              ]}
            >
              <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 14 }]}>
                {hasExistingGoal ? 'Update Cadence' : 'Kindle Target Pace'}
              </Text>
            </Pressable>

            {hasExistingGoal ? (
              <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteLink}>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                  Remove reading target
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  previewBox: {
    borderWidth: 1,
  },
  saveButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
