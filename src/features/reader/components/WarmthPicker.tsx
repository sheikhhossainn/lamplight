import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const PRESETS = [0, 0.25, 0.5, 0.75, 1];

type WarmthPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

// A row of discrete presets rather than a continuous drag slider — a
// pragmatic simplification that still gives real brightness/warmth control.
export function WarmthPicker({ value, onChange }: WarmthPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {PRESETS.map((preset) => (
        <Pressable
          key={preset}
          onPress={() => onChange(preset)}
          style={[
            styles.dot,
            {
              backgroundColor: colors.flameAmber,
              opacity: 0.35 + preset * 0.65,
              borderWidth: value === preset ? 2 : 0,
              borderColor: colors.lampText,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
