import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { getBook, type BookRow } from '@/db/repositories/books';
import { getHighlight, type Highlight } from '@/db/repositories/highlights';
import { useTheme } from '@/theme/ThemeProvider';

const CARD_WIDTH = Math.min(Dimensions.get('window').width - 48, 300);
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9;

type Variant = 'parchment' | 'gradient' | 'foldSplit';

const FLAME_PATH =
  'M100 46 C 78 78, 70 100, 84 122 C 84 108, 92 98, 100 92 C 108 98, 116 108, 116 122 C 130 100, 122 78, 100 46 Z';

function FlameMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d={FLAME_PATH} fill="#F5A623" />
    </Svg>
  );
}

export default function QuoteShareScreen() {
  const { highlightId } = useLocalSearchParams<{ highlightId: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);
  const [variant, setVariant] = useState<Variant>('parchment');

  useEffect(() => {
    (async () => {
      const h = await getHighlight(highlightId);
      setHighlight(h);
      if (h) setBook(await getBook(h.bookId));
    })();
  }, [highlightId]);

  if (!highlight || !book) return null;

  const onShare = () => {
    Share.share({
      message: `"${highlight.quoteText}"\n\n— ${book.title}, ${book.author}\n\nShared from Lamplight`,
    });
  };

  const shareButtonIsDark = variant !== 'gradient';

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark, padding: 24 }]}>
      <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
        <Text style={[typography.uiRowTitle, { color: colors.lampText }]}>{'✕'}</Text>
      </Pressable>

      <View style={styles.cardWrap}>
        <QuoteCard variant={variant} highlight={highlight} book={book} />
      </View>

      <View style={[styles.variantRow, { gap: spacing.sm, marginTop: spacing.lg }]}>
        {(['parchment', 'gradient', 'foldSplit'] as Variant[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => setVariant(v)}
            style={[
              styles.variantDot,
              {
                backgroundColor: variant === v ? colors.flameAmber : colors.hairline,
                borderRadius: radius.pill,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        onPress={onShare}
        style={[
          styles.shareButton,
          {
            backgroundColor: shareButtonIsDark ? colors.primaryDark : colors.flameAmber,
            borderRadius: radius.pill,
            marginTop: spacing.xl,
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 2v11m0 0l-4-4m4 4l4-4M4 15v2a1 1 0 001 1h10a1 1 0 001-1v-2"
            stroke={shareButtonIsDark ? colors.flameAmber : colors.primaryDark}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            typography.buttonLabel,
            { color: shareButtonIsDark ? colors.lampText : colors.primaryDark, marginLeft: 8 },
          ]}
        >
          Share
        </Text>
      </Pressable>
    </View>
  );
}

function QuoteCard({ variant, highlight, book }: { variant: Variant; highlight: Highlight; book: BookRow }) {
  const { colors, typography, radius } = useTheme();

  if (variant === 'parchment') {
    return (
      <View style={[styles.card, { backgroundColor: '#EFE4D2', borderRadius: radius.card }]}>
        <View style={styles.centeredContent}>
          <View style={styles.ruleLine} />
          <Text style={[typography.quoteShareCard, { color: '#2B2621', textAlign: 'center', marginTop: 22 }]}>
            &ldquo;{highlight.quoteText}&rdquo;
          </Text>
          <View style={[styles.ruleLine, { marginTop: 22 }]} />
        </View>
        <View style={styles.bottomLeft}>
          <Text style={[typography.uiRowTitle, { color: '#8A7F6E', fontSize: 11 }]}>{book.title}</Text>
          <Text style={[typography.uiRowTitle, { color: '#8A7F6E', fontSize: 11, opacity: 0.7 }]}>
            {book.author}
          </Text>
        </View>
        <View style={styles.bottomRightIcon}>
          <FlameMark size={26} />
        </View>
        <View style={[styles.foldCurl, { borderBottomColor: 'rgba(43,38,33,0.14)' }]} />
      </View>
    );
  }

  if (variant === 'foldSplit') {
    const topHeight = 280;
    return (
      <View style={[styles.card, { backgroundColor: colors.primaryDark, borderRadius: radius.card, overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topHeight }}>
          <Svg width={CARD_WIDTH} height={topHeight}>
            <Polygon
              points={`0,0 ${CARD_WIDTH},0 ${CARD_WIDTH},${topHeight * 0.78} 0,${topHeight}`}
              fill="#F5EDE1"
            />
          </Svg>
        </View>
        <Text
          style={[
            typography.quoteShareCard,
            { color: '#2B2621', position: 'absolute', top: 60, left: 34, right: 34, fontSize: 21 },
          ]}
        >
          &ldquo;{highlight.quoteText}&rdquo;
        </Text>
        <View style={{ position: 'absolute', top: 310, left: 34, right: 34, alignItems: 'center' }}>
          <FlameMark size={30} />
          <Text
            style={[
              typography.uiRowTitle,
              { color: colors.lampText, opacity: 0.6, fontSize: 12, marginTop: 16, textAlign: 'center' },
            ]}
          >
            {book.title} — {book.author}
          </Text>
          <Text
            style={[
              typography.eyebrowLabel,
              { color: colors.flameAmber, opacity: 0.6, marginTop: 6, textAlign: 'center' },
            ]}
          >
            Shared from Lamplight
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderRadius: radius.card, overflow: 'hidden' }]}>
      <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gradBase" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0%" stopColor="#1C1B1E" />
            <Stop offset="55%" stopColor="#241F1A" />
            <Stop offset="100%" stopColor="#1C1B1E" />
          </LinearGradient>
          <RadialGradient id="gradGlow" cx="50%" cy="38%" r="55%">
            <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={0.22} />
            <Stop offset="62%" stopColor={colors.flameAmber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#gradBase)" />
        <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#gradGlow)" />
      </Svg>
      <View style={styles.centeredContent}>
        <FlameMark size={36} />
        <Text
          style={[
            typography.quoteShareCard,
            { color: colors.lampText, textAlign: 'center', marginTop: 22 },
          ]}
        >
          &ldquo;{highlight.quoteText}&rdquo;
        </Text>
      </View>
      <View style={styles.bottomLeft}>
        <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 11, opacity: 0.55 }]}>
          {book.title}
        </Text>
        <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 11, opacity: 0.4 }]}>
          {book.author}
        </Text>
      </View>
      <Text style={[styles.wordmarkTag, { color: colors.flameAmber }]}>Lamplight</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  close: {
    alignSelf: 'flex-end',
  },
  cardWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  centeredContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  ruleLine: {
    width: 26,
    height: 2,
    backgroundColor: '#B4863A',
  },
  bottomLeft: {
    position: 'absolute',
    left: 24,
    bottom: 22,
  },
  bottomRightIcon: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  wordmarkTag: {
    position: 'absolute',
    right: 24,
    bottom: 26,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  variantRow: {
    flexDirection: 'row',
  },
  variantDot: {
    width: 8,
    height: 8,
  },
  shareButton: {
    width: CARD_WIDTH,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldCurl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderBottomWidth: 30,
    borderLeftWidth: 30,
    borderLeftColor: 'transparent',
  },
});
