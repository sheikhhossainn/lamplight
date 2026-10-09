import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { CheckIcon, CloseIcon } from '@/components/icons';
import type { ExerciseOption } from '@/features/learn/exerciseEngine';
import { useTheme } from '@/theme/ThemeProvider';

export type ChoiceListProps = {
  options: ExerciseOption[];
  selectedId: string | null;
  onSelect: (option: ExerciseOption) => void;
  status?: 'idle' | 'checked';
  disabled?: boolean;
};

export function ChoiceList({
  options,
  selectedId,
  onSelect,
  status = 'idle',
  disabled = false,
}: ChoiceListProps) {
  const { colors, typography, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const isChecked = status === 'checked';

  const handlePress = (opt: ExerciseOption) => {
    if (disabled || isChecked) return;
    void Haptics.selectionAsync().catch(() => {});
    onSelect(opt);
  };

  return (
    <View style={styles.container}>
      {options.map((opt, index) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.isCorrect;

        let bg = isLamp ? colors.card : '#FFFFFF';
        let borderColor = colors.hairline;
        let borderWidth = 1;
        let textColor = colors.ink;

        if (isChecked) {
          if (isCorrect) {
            bg = isLamp ? '#2B251B' : '#FEF8EE';
            borderColor = colors.flameAmber;
            borderWidth = 2;
            textColor = colors.flameAmber;
          } else if (isSelected && !isCorrect) {
            bg = isLamp ? '#2C1D1F' : '#FDF2F2';
            borderColor = colors.highlight.clay;
            borderWidth = 2;
            textColor = colors.highlight.clay;
          }
        } else if (isSelected) {
          bg = isLamp ? '#2B251B' : '#FEF8EE';
          borderColor = colors.flameAmber;
          borderWidth = 2;
        }

        return (
          <Pressable
            key={opt.id}
            onPress={() => handlePress(opt)}
            disabled={disabled || isChecked}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: disabled || isChecked }}
            accessibilityLabel={`${opt.text}${opt.reading ? ` (${opt.reading})` : ''}`}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: bg,
                borderColor,
                borderWidth,
                opacity: pressed && !isChecked ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.optionIndexWrapper}>
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: isSelected || (isChecked && isCorrect) ? colors.flameAmber : colors.umber,
                    fontWeight: '600',
                  },
                ]}
              >
                {index + 1}
              </Text>
            </View>

            <View style={styles.textContainer}>
              <Text
                style={[
                  typography.screenTitle,
                  {
                    color: textColor,
                    fontSize: 20,
                    fontWeight: '600',
                  },
                ]}
              >
                {opt.text}
              </Text>
              {opt.reading ? (
                <Text
                  style={[
                    typography.metadataCaption,
                    {
                      color: colors.umber,
                      marginTop: 2,
                    },
                  ]}
                >
                  {opt.reading}
                </Text>
              ) : null}
            </View>

            {isChecked && isCorrect && (
              <View style={[styles.statusBadge, { backgroundColor: colors.flameAmber }]}>
                <CheckIcon size={14} color={colors.primaryDark} />
              </View>
            )}

            {isChecked && isSelected && !isCorrect && (
              <View style={[styles.statusBadge, { backgroundColor: colors.highlight.clay }]}>
                <CloseIcon size={14} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  optionCard: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  optionIndexWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
