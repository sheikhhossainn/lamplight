import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { CloseIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const CARD_WIDTH = Math.min(Dimensions.get('window').width - 48, 300);
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9;

type Variant = 'parchment' | 'gradient' | 'foldSplit';
const VARIANTS: Variant[] = ['parchment', 'gradient', 'foldSplit'];

const FLAME_PATH =
  'M100 46 C 78 78, 70 100, 84 122 C 84 108, 92 98, 100 92 C 108 98, 116 108, 116 122 C 130 100, 122 78, 100 46 Z';

function FlameMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d={FLAME_PATH} fill="#F5A623" />
    </Svg>
  );
}

// Generic shareable text card — renders `text` + `attribution` as a
// swipeable, three-variant branded image and shares it via expo-sharing.
// Used for both prose quotes (quote-share/[highlightId].tsx) and scripture
// verses (verse-share.tsx) — no prose- or scripture-specific fields here.
export function ShareCardScreen({ text, attribution }: { text: string; attribution: string }) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [variant, setVariant] = useState<Variant>('parchment');
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  // Functional update (not a captured index) so the responder — created once —
  // always cycles from the current variant instead of a stale closure value.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < 30) return;
        const dir = gesture.dx < 0 ? 1 : -1;
        setVariant((prev) => {
          const idx = VARIANTS.indexOf(prev);
          return VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length];
        });
      },
    }),
  ).current;

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share' });
      } else {
        Alert.alert('Sharing unavailable', 'This device can’t share files directly.');
      }
    } catch {
      Alert.alert('Share failed', 'Could not create the share image. Try again.');
    } finally {
      setSharing(false);
    }
  };

  const shareButtonIsDark = variant !== 'gradient';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.primaryDark, padding: 24, paddingTop: insets.top + 24 },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.close} hitSlop={16}>
        <CloseIcon color={colors.lampText} size={18} />
      </Pressable>

      <View style={styles.cardWrap} {...panResponder.panHandlers}>
        <View ref={cardRef} collapsable={false}>
          <ShareCard variant={variant} text={text} attribution={attribution} />
        </View>
      </View>

      <View style={[styles.variantRow, { marginTop: spacing.lg }]}>
        {VARIANTS.map((v) => (
          <Pressable key={v} onPress={() => setVariant(v)} hitSlop={10} style={styles.variantDotTouchable}>
            <View
              style={[
                styles.variantDot,
                {
                  backgroundColor: variant === v ? colors.flameAmber : colors.hairline,
                  borderRadius: radius.pill,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onShare}
        disabled={sharing}
        style={[
          styles.shareButton,
          {
            backgroundColor: shareButtonIsDark ? colors.primaryDark : colors.flameAmber,
            borderRadius: radius.pill,
            marginTop: spacing.xl,
            opacity: sharing ? 0.6 : 1,
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 13V2M10 2l-4 4M10 2l4 4M4 15v2a1 1 0 001 1h10a1 1 0 001-1v-2"
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
          {sharing ? 'Preparing…' : 'Share'}
        </Text>
      </Pressable>
    </View>
  );
}

// Adaptive quote sizing: a longer text gets a smaller font so it always fits
// the card. Real quotes fill fully; only an extreme selection would be capped
// by the per-variant numberOfLines safety net below.
function quoteFontStyle(text: string, big = 22): { fontSize: number; lineHeight: number } {
  const len = text.length;
  const fontSize =
    len <= 90 ? big : len <= 160 ? 20 : len <= 240 ? 18 : len <= 340 ? 16 : len <= 470 ? 14 : 12.5;
  return { fontSize, lineHeight: Math.round(fontSize * 1.45) };
}

// A big opening quotation mark that sits behind the text — a literary flourish
// that anchors the card and reads instantly as "a quote".
function QuoteGlyph({ color }: { color: string }) {
  return (
    <Svg width={44} height={38} viewBox="0 0 44 38" fill="none">
      <Path
        d="M4 24c0-10 5.5-18 15-21l1.6 4.6C15 10 12 14 11.4 18.5c1.1-.5 2.4-.8 3.8-.8 4.1 0 7 3 7 7.2 0 4.4-3.4 7.6-7.8 7.6C8.5 32.5 4 28.5 4 24Zm22 0c0-10 5.5-18 15-21l1.6 4.6C37 10 34 14 33.4 18.5c1.1-.5 2.4-.8 3.8-.8 4.1 0 7 3 7 7.2 0 4.4-3.4 7.6-7.8 7.6C30.5 32.5 26 28.5 26 24Z"
        fill={color}
      />
    </Svg>
  );
}

// Consistent branded credit for every card variant: the caller-supplied
// attribution line and the "Shared from Lamplight" flame tag, always centered
// at the card's foot so a shared image is recognisably from the app.
function CardCredit({ attribution, tone }: { attribution: string; tone: 'dark' | 'light' }) {
  const attributionColor = tone === 'dark' ? 'rgba(240,230,214,0.62)' : 'rgba(43,38,33,0.55)';
  const ruleColor = tone === 'dark' ? 'rgba(240,230,214,0.18)' : 'rgba(43,38,33,0.14)';
  return (
    <View style={styles.credit}>
      <Text style={[styles.attribution, { color: attributionColor }]} numberOfLines={2}>
        {attribution}
      </Text>
      <View style={[styles.creditRule, { backgroundColor: ruleColor }]} />
      <View style={styles.brandRow}>
        <FlameMark size={13} />
        <Text style={styles.brandTag}>Shared from Lamplight</Text>
      </View>
    </View>
  );
}

function ShareCard({ variant, text, attribution }: { variant: Variant; text: string; attribution: string }) {
  const { colors, radius } = useTheme();
  const q = quoteFontStyle(text);

  if (variant === 'parchment') {
    return (
      <View style={[styles.card, { backgroundColor: '#EFE4D2', borderRadius: radius.card, overflow: 'hidden' }]}>
        <View style={styles.quoteBlock}>
          <QuoteGlyph color="rgba(180,134,58,0.35)" />
          <Text
            numberOfLines={13}
            adjustsFontSizeToFit
            style={[styles.quoteText, q, { color: '#2B2621', marginTop: 14 }]}
          >
            {text}
          </Text>
        </View>
        <CardCredit attribution={attribution} tone="light" />
        <View style={[styles.foldCurl, { borderBottomColor: 'rgba(43,38,33,0.16)' }]} />
      </View>
    );
  }

  if (variant === 'foldSplit') {
    const topHeight = CARD_HEIGHT * 0.58;
    // Keep the text inside the light triangle — bounded height + line cap so a
    // long verse/quote can never bleed into the dark lower half.
    const fold = quoteFontStyle(text, 20);
    return (
      <View style={[styles.card, { backgroundColor: colors.primaryDark, borderRadius: radius.card, overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topHeight }}>
          <Svg width={CARD_WIDTH} height={topHeight}>
            <Polygon points={`0,0 ${CARD_WIDTH},0 ${CARD_WIDTH},${topHeight * 0.82} 0,${topHeight}`} fill="#F5EDE1" />
          </Svg>
        </View>
        <View style={{ position: 'absolute', top: 40, left: 32, right: 32, maxHeight: topHeight - 70 }}>
          <QuoteGlyph color="rgba(180,134,58,0.35)" />
          <Text
            numberOfLines={9}
            adjustsFontSizeToFit
            style={[styles.quoteText, fold, { color: '#2B2621', textAlign: 'left', marginTop: 10 }]}
          >
            {text}
          </Text>
        </View>
        <CardCredit attribution={attribution} tone="dark" />
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
          <RadialGradient id="gradGlow" cx="50%" cy="36%" r="55%">
            <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={0.22} />
            <Stop offset="62%" stopColor={colors.flameAmber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#gradBase)" />
        <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#gradGlow)" />
      </Svg>
      <View style={styles.quoteBlock}>
        <FlameMark size={34} />
        <Text
          numberOfLines={13}
          adjustsFontSizeToFit
          style={[styles.quoteText, q, { color: colors.lampText, marginTop: 20 }]}
        >
          {text}
        </Text>
      </View>
      <CardCredit attribution={attribution} tone="dark" />
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
  // Text sits in the upper-middle; the credit footer owns the bottom band.
  quoteBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  quoteText: {
    fontFamily: 'Lora_500Medium_Italic',
    fontSize: 22,
    lineHeight: 33,
    letterSpacing: 0,
    textAlign: 'center',
  },
  credit: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 26,
    alignItems: 'center',
  },
  attribution: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  creditRule: {
    width: 30,
    height: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#F5A623',
  },
  variantRow: {
    flexDirection: 'row',
  },
  variantDotTouchable: {
    padding: 12,
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
