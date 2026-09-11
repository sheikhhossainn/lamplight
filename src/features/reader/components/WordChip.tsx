import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type WordChipProps = {
  word: string;
  definition: string;
  isSaved?: boolean;
  onSave: () => Promise<void> | void;
};

export function WordChip({ word, definition, isSaved = false, onSave }: WordChipProps) {
  const { colors, typography, radius } = useTheme();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  const handlePress = async () => {
    if (saved || saving) return;
    setSaving(true);
    setSaved(true);
    try {
      await onSave();
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: saved ? 'rgba(245, 166, 35, 0.12)' : colors.card,
          borderColor: saved ? colors.flameAmber : colors.hairline,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Text style={[styles.wordText, { color: colors.ink }]}>{word}</Text>
      {definition ? (
        <Text style={[styles.defText, { color: colors.umber }]} numberOfLines={1}>
          · {definition}
        </Text>
      ) : null}
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        style={[
          styles.actionBtn,
          {
            backgroundColor: saved ? colors.flameAmber : 'transparent',
            borderColor: colors.flameAmber,
          },
        ]}
      >
        <Text
          style={[
            styles.actionBtnText,
            { color: saved ? colors.primaryDark : colors.flameAmber },
          ]}
        >
          {saved ? '✓' : '+'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  wordText: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 13,
  },
  defText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginLeft: 4,
    maxWidth: 140,
  },
  actionBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    lineHeight: 14,
  },
});
