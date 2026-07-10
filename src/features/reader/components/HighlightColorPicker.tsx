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

// A proper quotation-mark glyph — "Save Quote" was previously a plain
// bookmark icon, which reads as "save my place," not "save this passage."
function QuoteIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 12c0-3.5 1.8-6 4.6-7l.6 1.7c-1.8.8-2.7 2-2.9 3.3.4-.2.9-.3 1.4-.3 1.5 0 2.6 1.1 2.6 2.6 0 1.6-1.3 2.7-2.8 2.7C5.5 15 4 13.5 4 12z"
        fill={color}
      />
      <Path
        d="M12 12c0-3.5 1.8-6 4.6-7l.6 1.7c-1.8.8-2.7 2-2.9 3.3.4-.2.9-.3 1.4-.3 1.5 0 2.6 1.1 2.6 2.6 0 1.6-1.3 2.7-2.8 2.7-1.9 0-3.4-1.5-3.4-3z"
        fill={color}
      />
    </Svg>
  );
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
            <View style={[styles.saveQuoteBadge, { backgroundColor: 'rgba(245,166,35,0.16)' }]}>
              <QuoteIcon color={colors.flameAmber} size={13} />
            </View>
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
    gap: 7,
    paddingRight: 2,
  },
  saveQuoteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
