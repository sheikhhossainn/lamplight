import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Exact per-book cover colors from the shipped mockup (Lamplight Mobile App.dc.html).
// Falls back to a neutral-tone cycle for any book not in this list — amber is
// reserved as the one recurring accent, sage/clay/dusk for the highlighter only.
const SPINE_COLOR_BY_BOOK: Record<string, string> = {
  'pride-and-prejudice': '#1C1B1E',
  'don-quixote': '#C9791A',
  'the-odyssey': '#6B3A32',
  'anna-karenina': '#8A6A3A',
  'crime-and-punishment': '#4A4038',
};

const FALLBACK_TONES = ['#1C1B1E', '#5C5346', '#8A7F6E', '#C6B896', '#252228'];

export function spineColorForBook(bookId: string, fallbackIndex = 0): string {
  return SPINE_COLOR_BY_BOOK[bookId] ?? FALLBACK_TONES[fallbackIndex % FALLBACK_TONES.length];
}

export function isDarkSpineColor(hex: string): boolean {
  return hex !== '#F5EDE1' && hex !== '#C6B896';
}

type BookSpineProps = {
  bookId: string;
  title: string;
  toneIndex: number;
  onPress: () => void;
  width?: number;
  height?: number;
  rotateDeg?: number;
};

export function BookSpine({
  bookId,
  title,
  toneIndex,
  onPress,
  width = 96,
  height = 140,
  rotateDeg = 0,
}: BookSpineProps) {
  const { colors, typography, radius, scheme } = useTheme();
  const backgroundColor = spineColorForBook(bookId, toneIndex);
  const isDark = isDarkSpineColor(backgroundColor);
  const titleColor = isDark ? colors.lampText : colors.ink;
  const curlTint = isDark ? 'rgba(245,237,225,0.18)' : 'rgba(43,38,33,0.2)';
  // A subtle edge so a cover whose color matches the page background (e.g. the
  // charcoal Pride and Prejudice spine on the dark shelf) still reads as a card.
  const edgeColor = scheme === 'lamp' ? 'rgba(240,230,214,0.16)' : 'rgba(43,38,33,0.10)';

  return (
    <Pressable onPress={onPress} style={{ transform: [{ rotate: `${rotateDeg}deg` }] }}>
      <View
        style={[
          styles.spine,
          {
            width,
            height,
            backgroundColor,
            borderWidth: 1,
            borderColor: edgeColor,
            borderTopLeftRadius: radius.bookCoverSpine,
            borderBottomLeftRadius: radius.bookCoverSpine,
            borderTopRightRadius: radius.bookCoverOuter,
            borderBottomRightRadius: radius.bookCoverOuter,
          },
        ]}
      >
        <Text numberOfLines={3} style={[typography.bookSpineTitle, { color: titleColor }]}>
          {title}
        </Text>
        <View style={[styles.curl, { borderBottomColor: curlTint }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spine: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  curl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderBottomWidth: 14,
    borderLeftWidth: 14,
    borderLeftColor: 'transparent',
  },
});
