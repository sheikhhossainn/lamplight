import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { checkTranslationCap, recordTranslationUsage, translationProvider } from '@/features/translation';
import { useTheme } from '@/theme/ThemeProvider';

type WordTranslationPopupProps = {
  word: string | null;
  onClose: () => void;
  onSave: (translation: string) => void;
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

export function WordTranslationPopup({ word, onClose, onSave }: WordTranslationPopupProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

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
        const result = await translationProvider.translateWord(word, 'en', 'es');
        await recordTranslationUsage(premium);
        if (!cancelled) setState({ status: 'ready', translation: result.translatedText });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [word]);

  return (
    <Modal visible={word != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.cardWrap}>
          <View style={[styles.pointer, { backgroundColor: colors.primaryDark }]} />
          <Pressable
            style={[styles.card, { backgroundColor: colors.primaryDark, borderRadius: radius.card }]}
            onPress={() => {}}
          >
            <View style={styles.headerRow}>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>{word}</Text>
              <View style={[styles.pairTag, { backgroundColor: colors.ink }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.quietOnLight, fontSize: 9 }]}>
                  EN → ES
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
                  <Pressable style={[styles.actionButton, { backgroundColor: colors.ink }]}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: 216,
  },
  pointer: {
    position: 'absolute',
    top: -6,
    left: 36,
    width: 14,
    height: 14,
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
