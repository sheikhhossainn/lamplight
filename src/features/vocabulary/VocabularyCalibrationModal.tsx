import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { getLiteraryTheme } from '@/features/settings/literaryTheme';
import { useTargetReadingLanguage } from '@/features/settings/targetReadingLanguage';
import { logEvent } from '@/features/analytics/analytics';
import {
  CALIBRATION_WORDS,
  calculateVocabularyEstimate,
  getPresetWordIds,
  saveCalibrationData,
  type CalibrationPreset,
  type VocabularyEstimate,
} from '@/features/vocabulary/calibration';

type VocabularyCalibrationModalProps = {
  visible: boolean;
  onClose: () => void;
  onCalibrated?: (estimate: VocabularyEstimate) => void;
};

function CheckMiniIcon({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <Text style={{ color, fontSize: size, fontWeight: '700', lineHeight: size + 2 }}>✓</Text>
  );
}

export function VocabularyCalibrationModal({
  visible,
  onClose,
  onCalibrated,
}: VocabularyCalibrationModalProps) {
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetReadingLanguage();
  const activeTheme = getLiteraryTheme();

  const words = useMemo(() => {
    return CALIBRATION_WORDS[targetLanguage] ?? CALIBRATION_WORDS.en;
  }, [targetLanguage]);

  const [activePreset, setActivePreset] = useState<CalibrationPreset>('intermediate');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(() => {
    return new Set(getPresetWordIds(targetLanguage, 'intermediate'));
  });

  const vocabEstimate = useMemo(() => {
    return calculateVocabularyEstimate(targetLanguage, selectedWordIds, activeTheme);
  }, [targetLanguage, selectedWordIds, activeTheme]);

  const handleSelectPreset = useCallback(
    (preset: CalibrationPreset) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActivePreset(preset);
      setSelectedWordIds(new Set(getPresetWordIds(targetLanguage, preset)));
    },
    [targetLanguage],
  );

  const handleToggleWord = useCallback((wordId: string) => {
    void Haptics.selectionAsync();
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const wordList = Array.from(selectedWordIds);
      await saveCalibrationData({
        targetReadingLanguage: targetLanguage,
        estimatedWords: vocabEstimate.count,
        tierLabel: vocabEstimate.tierLabel,
        selectedWordIds: wordList,
        recommendedBookId: vocabEstimate.startingBook.id,
        isSkipped: false,
      });

      logEvent('vocabulary_calibrated', {
        target_language: targetLanguage,
        estimated_words: vocabEstimate.count,
        tier: vocabEstimate.tierLabel,
        book_id: vocabEstimate.startingBook.id,
      });

      onCalibrated?.(vocabEstimate);
      onClose();
    } catch (err) {
      console.warn('[VocabularyCalibrationModal] Failed to save calibration:', err);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [targetLanguage, vocabEstimate, selectedWordIds, onCalibrated, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isLamp ? '#1F1D20' : colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.8 },
                  ]}
                >
                  VOCABULARY CALIBRATION
                </Text>
              </View>
              <Text
                style={[
                  typography.uiRowTitle,
                  { color: colors.ink, fontSize: 18, marginTop: 4, fontWeight: '700' },
                ]}
              >
                Find Your Comfortable Level
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                { backgroundColor: isLamp ? '#2B2621' : 'rgba(0, 0, 0, 0.05)' },
              ]}
            >
              <CloseIcon color={colors.umber} size={16} />
            </Pressable>
          </View>

          <Text
            style={[
              typography.metadataCaption,
              { color: colors.umber, marginHorizontal: 20, marginBottom: 12, fontSize: 12 },
            ]}
          >
            Select the words you recognize comfortably. We’ll calculate your lexicon and recommend the ideal starting classic.
          </Text>

          {/* Presets Row */}
          <View style={styles.presetsRow}>
            {(
              [
                { key: 'foundational', label: 'Foundational' },
                { key: 'intermediate', label: 'Intermediate' },
                { key: 'advanced', label: 'Advanced' },
                { key: 'scholar', label: 'Scholar' },
              ] as const
            ).map((p) => {
              const isActive = activePreset === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => handleSelectPreset(p.key)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isActive ? colors.flameAmber : isLamp ? '#292524' : 'rgba(0,0,0,0.04)',
                      borderColor: isActive ? colors.flameAmber : colors.hairline,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.eyebrowLabel,
                      {
                        color: isActive ? colors.primaryDark : colors.ink,
                        fontSize: 10.5,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 12-Word Matrix Grid */}
          <ScrollView
            style={styles.wordsScroll}
            contentContainerStyle={styles.wordsGrid}
            showsVerticalScrollIndicator={false}
          >
            {words.map((itemWord) => {
              const isChecked = selectedWordIds.has(itemWord.id);
              return (
                <Pressable
                  key={itemWord.id}
                  onPress={() => handleToggleWord(itemWord.id)}
                  style={({ pressed }) => [
                    styles.wordCard,
                    {
                      backgroundColor: isChecked
                        ? 'rgba(245, 166, 35, 0.12)'
                        : isLamp
                        ? '#262326'
                        : 'rgba(0,0,0,0.02)',
                      borderColor: isChecked ? colors.flameAmber : colors.hairline,
                      borderWidth: isChecked ? 1.5 : 1,
                      borderRadius: radius.card,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.wordCheckDot,
                      {
                        backgroundColor: isChecked ? colors.flameAmber : 'transparent',
                        borderColor: isChecked ? colors.flameAmber : colors.hairline,
                      },
                    ]}
                  >
                    {isChecked ? <CheckMiniIcon color={colors.primaryDark} size={10} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.uiRowTitle,
                        {
                          color: isChecked ? colors.flameAmber : colors.ink,
                          fontSize: 13.5,
                          fontWeight: isChecked ? '600' : '400',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {itemWord.word}
                      {itemWord.phonetic ? (
                        <Text style={{ color: colors.fawn, fontSize: 11, fontWeight: '400' }}>
                          {' '}· {itemWord.phonetic}
                        </Text>
                      ) : null}
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.umber, fontSize: 10.5, marginTop: 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {itemWord.meaning}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Live Lexicon Readout Card */}
          <View
            style={[
              styles.readoutCard,
              {
                backgroundColor: isLamp ? '#272322' : 'rgba(245, 166, 35, 0.08)',
                borderColor: 'rgba(245, 166, 35, 0.35)',
                borderRadius: radius.card,
              },
            ]}
          >
            <View style={styles.readoutTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 13 }}>✦</Text>
                <Text
                  style={[
                    typography.uiRowTitle,
                    { color: colors.ink, fontSize: 13, fontWeight: '700' },
                  ]}
                >
                  Lexicon: {vocabEstimate.countLabel}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                ]}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.primaryDark, fontSize: 9.5, letterSpacing: 0.5 },
                  ]}
                >
                  {vocabEstimate.coverageBadge}
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.metadataCaption,
                { color: colors.umber, fontSize: 11, marginTop: 4 },
              ]}
              numberOfLines={1}
            >
              Unlocked Classic: <Text style={{ color: colors.flameAmber, fontWeight: '600' }}>{vocabEstimate.startingBook.title}</Text>
            </Text>
          </View>

          {/* Action Button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveButton,
              { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
            ]}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 14 }]}>
              {saving ? 'Saving…' : 'Save & Calibrate Books'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordsScroll: {
    maxHeight: 250,
    paddingHorizontal: 20,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  wordCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  wordCheckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutCard: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
  },
  readoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
