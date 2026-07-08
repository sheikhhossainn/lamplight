import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { HighlightColorKey } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const COLOR_KEYS: HighlightColorKey[] = ['amber', 'sage', 'clay', 'dusk'];

// Each swatch carries its own glyph — dot / dash / cross / ring — so hue
// alone never carries meaning (colorblind-safe by construction).
function SwatchGlyph({ colorKey }: { colorKey: HighlightColorKey }) {
  if (colorKey === 'amber') {
    return <View style={styles.dotGlyph} />;
  }
  if (colorKey === 'sage') {
    return <View style={styles.dashGlyph} />;
  }
  if (colorKey === 'clay') {
    return (
      <Svg width={10} height={10} viewBox="0 0 10 10">
        <Path d="M5 0v10M0 5h10" stroke="#1C1B1E" strokeWidth={1.4} />
      </Svg>
    );
  }
  return <View style={styles.ringGlyph} />;
}

type HighlightColorPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (colorKey: HighlightColorKey) => void;
};

export function HighlightColorPicker({ visible, onClose, onSelect }: HighlightColorPickerProps) {
  const { colors, typography, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.pill, { backgroundColor: colors.primaryDark, borderRadius: radius.pill }]}
        >
          {COLOR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={[
                styles.swatch,
                {
                  backgroundColor: colors.highlight[key],
                  borderWidth: key === 'amber' ? 2 : 0,
                  borderColor: colors.parchment,
                },
              ]}
            >
              <SwatchGlyph colorKey={key} />
            </Pressable>
          ))}

          <View style={styles.divider} />

          <Pressable style={styles.saveQuote} onPress={() => onSelect('amber')}>
            <Svg width={13} height={13} viewBox="0 0 20 20">
              <Path d="M5 2h10v16l-5-4-5 4V2z" fill={colors.flameAmber} />
            </Svg>
            <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 11 }]}>
              Save Quote
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGlyph: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1C1B1E',
  },
  dashGlyph: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1C1B1E',
  },
  ringGlyph: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.6,
    borderColor: '#1C1B1E',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(240,230,214,0.2)',
  },
  saveQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 2,
  },
});
