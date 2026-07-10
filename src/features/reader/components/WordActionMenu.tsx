import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CARD_WIDTH = 208;
const POINTER_SIZE = 14;
const EDGE_MARGIN = 12;
// Vertical clearance between the held word and the card's near edge — the
// pointer (the little diamond tail) sits inside this gap.
const WORD_GAP = 16;

type WordActionMenuProps = {
  // The word being held (shown so the reader can confirm what their hold landed
  // on); null hides the menu.
  word: string | null;
  // Exact screen position of the hold (nativeEvent.pageX/pageY) — the menu
  // anchors here so its pointer tail points at the word.
  anchor: { x: number; y: number } | null;
  onTranslate: () => void;
  onSaveQuote: () => void;
  onClose: () => void;
};

// Thin-stroke language/translate glyph (two overlapping speech marks) — stroked,
// per the icon spec.
function TranslateIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path d="M3 4h7M6.5 4v1.5M8.5 5.5C8 8 6 10 3.5 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.5 8.5C6 10 8 11.2 9.5 11.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.5 17l3-8 3 8M11.6 14.5h3.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// The one filled glyph in the system — the dog-ear/bookmark (fold motif) that
// marks Save.
function BookmarkIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={16} viewBox="0 0 20 20" fill="none">
      <Path d="M5 2.5h10v15l-5-4-5 4V2.5z" fill={color} />
    </Svg>
  );
}

export function WordActionMenu({ word, anchor, onTranslate, onSaveQuote, onClose }: WordActionMenuProps) {
  const { colors, typography, spacing, radius } = useTheme();

  // Show below the word by default; flip above when the hold is low enough that
  // a below-card would run off the bottom. Clamp horizontally so the card never
  // runs off either edge. (Mirrors WordTranslationPopup's anchoring.)
  const showBelow = !anchor || anchor.y < screenHeight * 0.55;
  const cardLeft = anchor
    ? Math.min(Math.max(anchor.x - CARD_WIDTH / 2, EDGE_MARGIN), screenWidth - CARD_WIDTH - EDGE_MARGIN)
    : (screenWidth - CARD_WIDTH) / 2;
  const pointerLeft = anchor
    ? Math.min(
        Math.max(anchor.x - cardLeft - POINTER_SIZE / 2, EDGE_MARGIN),
        CARD_WIDTH - POINTER_SIZE - EDGE_MARGIN,
      )
    : CARD_WIDTH / 2 - POINTER_SIZE / 2;
  const positionStyle = anchor
    ? showBelow
      ? { top: anchor.y + WORD_GAP }
      : { bottom: screenHeight - anchor.y + WORD_GAP }
    : { top: screenHeight / 2 - 80 };

  return (
    <Modal visible={word != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.cardWrap, { left: cardLeft }, positionStyle]}>
          <View
            style={[
              styles.pointer,
              { backgroundColor: colors.primaryDark, left: pointerLeft },
              showBelow ? { top: -6 } : { bottom: -6 },
            ]}
          />
          <Pressable
            style={[styles.card, { backgroundColor: colors.primaryDark, borderRadius: radius.card }]}
            onPress={() => {}}
          >
            <Text
              style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginBottom: 4 }]}
              numberOfLines={1}
            >
              {word}
            </Text>

            <Pressable style={styles.row} onPress={onTranslate}>
              <TranslateIcon color={colors.flameAmber} />
              <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13 }]}>Translate</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.row} onPress={onSaveQuote}>
              <BookmarkIcon color={colors.flameAmber} />
              <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13 }]}>Save as quote</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  cardWrap: {
    position: 'absolute',
    width: CARD_WIDTH,
  },
  pointer: {
    position: 'absolute',
    width: POINTER_SIZE,
    height: POINTER_SIZE,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  card: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(240,230,214,0.10)',
  },
});
