import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { logEvent } from '@/features/analytics/analytics';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { checkTranslationCap, recordTranslationUsage, translationProvider } from '@/features/translation';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CARD_WIDTH = 216;
const POINTER_SIZE = 14;
const EDGE_MARGIN = 12;
// Vertical clearance between the tapped word and the card's near edge — the
// pointer (the little diamond tail) sits inside this gap.
const WORD_GAP = 16;

type WordTranslationPopupProps = {
  word: string | null;
  // Exact screen position of the tap (nativeEvent.pageX/pageY) — the popup
  // anchors here instead of the middle of the screen, so the pointer tail
  // actually points at the word that was translated.
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onSave: (translation: string) => void;
  // Defaults to 'en'/'EN' — every prose-book caller has a single source
  // language. The Quran verse reader passes 'ar'/'AR' when the tapped word
  // came from the Arabic line, not the English translation.
  sourceLang?: string;
  sourceLangLabel?: string;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'capped' }
  | { status: 'error' }
  | { status: 'ready'; translation: string };

function CopyIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 20 20" fill="none">
      <Rect x={6} y={6} width={11} height={11} rx={1.5} stroke={color} strokeWidth={1.4} />
      <Path d="M3 13V4a1 1 0 011-1h9" stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

function SaveIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={13} viewBox="0 0 20 20" fill="none">
      <Path d="M5 2h10v16l-5-4-5 4V2z" fill={color} />
    </Svg>
  );
}

export function WordTranslationPopup({
  word,
  anchor,
  onClose,
  onSave,
  sourceLang = 'en',
  sourceLangLabel = 'EN',
}: WordTranslationPopupProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const targetLanguage = useTargetLanguage();

  // Show below the word by default; flip above it when the tap is low enough
  // on screen that a below-card would run off the bottom edge. Clamp
  // horizontally so the card never runs off the left/right edges either.
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

  useEffect(() => {
    if (!word) return;
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const premium = isPremiumUser();
      const cap = await checkTranslationCap(premium);
      if (!cap.allowed) {
        if (!cancelled) setState({ status: 'capped' });
        return;
      }
      try {
        const result = await translationProvider.translateWord(word, sourceLang, targetLanguage);
        await recordTranslationUsage(premium);
        logEvent('translate_tap', { target_lang: targetLanguage });
        if (!cancelled) setState({ status: 'ready', translation: result.translatedText });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [word, targetLanguage, sourceLang]);

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
            <View style={styles.headerRow}>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>{word}</Text>
              {/* Display-only pair — the target language is chosen in Settings,
                  never from the reading page. */}
              <View style={[styles.pairTag, { backgroundColor: '#2B2621' }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                  {sourceLangLabel} → {targetLanguageLabel(targetLanguage)}
                </Text>
              </View>
            </View>

            {state.status === 'loading' ? (
              <ActivityIndicator color={colors.flameAmber} style={{ marginVertical: spacing.md }} />
            ) : null}

            {state.status === 'capped' ? (
              <>
                <Text style={[typography.metadataCaption, { color: colors.lampText, marginTop: spacing.sm }]}>
                  You've reached today's free translation limit.
                </Text>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.flameAmber, marginTop: 12 }]}
                  onPress={() => {
                    onClose();
                    router.push('/paywall');
                  }}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                    Keep the lamp lit
                  </Text>
                </Pressable>
              </>
            ) : null}

            {state.status === 'error' ? (
              <Text style={[typography.metadataCaption, { color: colors.lampText, marginTop: spacing.sm }]}>
                Couldn't translate — check your connection and try again.
              </Text>
            ) : null}

            {state.status === 'ready' ? (
              <>
                <Text style={[typography.translatedWordPopup, { color: colors.flameAmber, marginTop: spacing.sm }]}>
                  {state.translation}
                </Text>
                <View style={styles.buttonRow}>
                  <Pressable style={[styles.actionButton, { backgroundColor: '#2B2621' }]}>
                    <CopyIcon color={colors.lampText} />
                    <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 11 }]}>Copy</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.flameAmber }]}
                    onPress={() => onSave(state.translation)}
                  >
                    <SaveIcon color={colors.primaryDark} />
                    <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                      Save
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
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
    padding: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  pairTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
});
