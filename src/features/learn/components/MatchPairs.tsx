import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { CheckIcon } from '@/components/icons';
import { speakWord } from '@/features/audio/pronunciationEngine';
import type { MatchPair } from '@/features/learn/exerciseEngine';
import { useTheme } from '@/theme/ThemeProvider';

export type MatchPairsProps = {
  pairs: MatchPair[];
  onComplete: () => void;
  lang?: string;
  disabled?: boolean;
};

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function MatchPairs({
  pairs,
  onComplete,
  lang = 'ja',
  disabled = false,
}: MatchPairsProps) {
  const { colors, typography, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  // Left items stay in initial order, right items shuffled once on mount / pairs change
  const leftItems = useMemo(() => pairs.map((p) => ({ id: p.leftId, text: p.leftText })), [pairs]);
  const rightItems = useMemo(
    () => shuffleArray(pairs.map((p) => ({ id: p.rightId, text: p.rightText }))),
    [pairs],
  );

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [mismatchIds, setMismatchIds] = useState<{ left?: string; right?: string } | null>(null);

  // Check completion
  useEffect(() => {
    if (pairs.length > 0 && matchedIds.size === pairs.length) {
      const timer = setTimeout(() => {
        onComplete();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [matchedIds, pairs.length, onComplete]);

  const handleSelectLeft = (id: string, text: string) => {
    if (disabled || matchedIds.has(id) || mismatchIds) return;

    void Haptics.selectionAsync().catch(() => {});
    void speakWord(text, lang, 'normal');

    if (selectedRight) {
      checkMatch(id, selectedRight);
    } else {
      setSelectedLeft(id === selectedLeft ? null : id);
    }
  };

  const handleSelectRight = (id: string) => {
    if (disabled || matchedIds.has(id) || mismatchIds) return;

    void Haptics.selectionAsync().catch(() => {});

    if (selectedLeft) {
      checkMatch(selectedLeft, id);
    } else {
      setSelectedRight(id === selectedRight ? null : id);
    }
  };

  const checkMatch = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      // Correct match!
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setMatchedIds((prev) => new Set([...prev, leftId]));
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Mismatch
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setMismatchIds({ left: leftId, right: rightId });
      setTimeout(() => {
        setMismatchIds(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 600);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Column (Kana / Source) */}
      <View style={styles.column}>
        {leftItems.map((item) => {
          const isMatched = matchedIds.has(item.id);
          const isSelected = selectedLeft === item.id;
          const isMismatch = mismatchIds?.left === item.id;

          let bg = isLamp ? colors.card : '#FFFFFF';
          let borderColor = colors.hairline;
          let borderWidth = 1;

          if (isMatched) {
            bg = isLamp ? '#23201B' : '#FAF6EE';
            borderColor = colors.hairline;
          } else if (isMismatch) {
            borderColor = colors.highlight.clay;
            borderWidth = 2;
            bg = isLamp ? '#2C1D1F' : '#FDF2F2';
          } else if (isSelected) {
            borderColor = colors.flameAmber;
            borderWidth = 2;
            bg = isLamp ? '#2B251B' : '#FEF8EE';
          }

          return (
            <Pressable
              key={`left-${item.id}`}
              onPress={() => handleSelectLeft(item.id, item.text)}
              disabled={disabled || isMatched || Boolean(mismatchIds)}
              accessibilityRole="button"
              accessibilityLabel={`${item.text} ${isMatched ? '(matched)' : ''}`}
              style={({ pressed }) => [
                styles.pairCard,
                {
                  backgroundColor: bg,
                  borderColor,
                  borderWidth,
                  opacity: isMatched ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.screenTitle,
                  {
                    color: isMatched
                      ? colors.umber
                      : isSelected
                        ? colors.flameAmber
                        : colors.ink,
                    fontSize: 22,
                    fontWeight: '700',
                  },
                ]}
              >
                {item.text}
              </Text>
              {isMatched && (
                <View style={styles.checkIconWrapper}>
                  <CheckIcon size={12} color={colors.flameAmber} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Right Column (Meaning / Sound) */}
      <View style={styles.column}>
        {rightItems.map((item) => {
          const isMatched = matchedIds.has(item.id);
          const isSelected = selectedRight === item.id;
          const isMismatch = mismatchIds?.right === item.id;

          let bg = isLamp ? colors.card : '#FFFFFF';
          let borderColor = colors.hairline;
          let borderWidth = 1;

          if (isMatched) {
            bg = isLamp ? '#23201B' : '#FAF6EE';
            borderColor = colors.hairline;
          } else if (isMismatch) {
            borderColor = colors.highlight.clay;
            borderWidth = 2;
            bg = isLamp ? '#2C1D1F' : '#FDF2F2';
          } else if (isSelected) {
            borderColor = colors.flameAmber;
            borderWidth = 2;
            bg = isLamp ? '#2B251B' : '#FEF8EE';
          }

          return (
            <Pressable
              key={`right-${item.id}`}
              onPress={() => handleSelectRight(item.id)}
              disabled={disabled || isMatched || Boolean(mismatchIds)}
              accessibilityRole="button"
              accessibilityLabel={`${item.text} ${isMatched ? '(matched)' : ''}`}
              style={({ pressed }) => [
                styles.pairCard,
                {
                  backgroundColor: bg,
                  borderColor,
                  borderWidth,
                  opacity: isMatched ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.screenTitle,
                  {
                    color: isMatched
                      ? colors.umber
                      : isSelected
                        ? colors.flameAmber
                        : colors.ink,
                    fontSize: 18,
                    fontWeight: '600',
                  },
                ]}
              >
                {item.text}
              </Text>
              {isMatched && (
                <View style={styles.checkIconWrapper}>
                  <CheckIcon size={12} color={colors.flameAmber} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    paddingVertical: 8,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  pairCard: {
    minHeight: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  checkIconWrapper: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
