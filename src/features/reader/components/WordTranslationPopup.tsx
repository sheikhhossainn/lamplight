import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ReloadIcon } from '@/components/icons';
import { AccountProtectionModal } from '@/components/AccountProtectionModal';
import { speakWord } from '@/features/audio/pronunciationEngine';
import { logEvent } from '@/features/analytics/analytics';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { canUse } from '@/features/subscription/subscriptionState';
import { checkTranslationCap, recordTranslationUsage, translationProvider } from '@/features/translation';
import { fetchContextTranslation, type ContextEnrichment } from '@/features/translation/contextTranslation';
import { hapticSaveWord } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const POINTER_SIZE = 14;
const EDGE_MARGIN = 12;
// Vertical clearance between the tapped word and the card's near edge — the
// pointer (the little diamond tail) sits inside this gap.
const WORD_GAP = 16;
const MIN_CARD_WIDTH = 210;
const MAX_CARD_WIDTH = Math.min(screenWidth - EDGE_MARGIN * 2, 330);

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
  onChangeLanguage?: () => void;
  showPronunciation?: boolean;
  onSaveForLater?: () => void;
  contextSentence?: string;
  bookTitle?: string;
  bookAuthor?: string;
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
  onChangeLanguage,
  showPronunciation = true,
  onSaveForLater,
  contextSentence,
  bookTitle,
  bookAuthor,
}: WordTranslationPopupProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [contextEnrichment, setContextEnrichment] = useState<ContextEnrichment | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [cardWidth, setCardWidth] = useState(MIN_CARD_WIDTH);
  const [capInfo, setCapInfo] = useState<{ isGuest: boolean; limit: number }>({ isGuest: false, limit: 50 });
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const targetLanguage = useTargetLanguage();

  // Show below the word by default; flip above it when the tap is low enough
  // on screen that a below-card would run off the bottom edge. Clamp
  // horizontally so the card never runs off the left/right edges either.
  const showBelow = !anchor || anchor.y < screenHeight * 0.55;
  const cardLeft = anchor
    ? Math.min(Math.max(anchor.x - cardWidth / 2, EDGE_MARGIN), screenWidth - cardWidth - EDGE_MARGIN)
    : (screenWidth - cardWidth) / 2;
  const pointerLeft = anchor
    ? Math.min(
        Math.max(anchor.x - cardLeft - POINTER_SIZE / 2, EDGE_MARGIN),
        cardWidth - POINTER_SIZE - EDGE_MARGIN,
      )
    : cardWidth / 2 - POINTER_SIZE / 2;
  const positionStyle = anchor
    ? showBelow
      ? { top: anchor.y + WORD_GAP }
      : { bottom: screenHeight - anchor.y + WORD_GAP }
    : { top: screenHeight / 2 - 80 };

  useEffect(() => {
    if (!word) return;
    let cancelled = false;
    setState({ status: 'loading' });
    setContextEnrichment(null);

    (async () => {
      const premium = canUse('unlimited_learning');
      const cap = await checkTranslationCap(premium);
      setCapInfo({ isGuest: cap.isGuest, limit: cap.limit });
      if (!cap.allowed) {
        if (!cancelled) setState({ status: 'capped' });
        return;
      }
      try {
        const result = await translationProvider.translateWord(word, sourceLang, targetLanguage);
        await recordTranslationUsage(premium);
        logEvent('translate_tap', { target_lang: targetLanguage });
        if (!cancelled) {
          setState({ status: 'ready', translation: result.translatedText });
        }
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }

      // Context-aware enrichment (LEARN-04)
      if (contextSentence && canUse('context_translation')) {
        if (!cancelled) setLoadingContext(true);
        try {
          const ctxRes = await fetchContextTranslation({
            word,
            contextSentence,
            fromLang: sourceLang,
            toLang: targetLanguage,
            bookTitle,
            bookAuthor,
          });
          if (!cancelled && ctxRes.enrichment) {
            setContextEnrichment(ctxRes.enrichment);
          }
        } catch {
          // Fall back gracefully to literal translation
        } finally {
          if (!cancelled) setLoadingContext(false);
        }
      } else {
        if (!cancelled) {
          setContextEnrichment(null);
          setLoadingContext(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [word, targetLanguage, sourceLang, contextSentence, bookTitle, bookAuthor]);

  return (
    <>
      <Modal visible={word != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.cardWrap, { left: cardLeft }, positionStyle]}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && Math.abs(w - cardWidth) > 3) {
              setCardWidth(w);
            }
          }}
        >
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
              <View style={styles.wordRow}>
                <Text numberOfLines={1} style={[typography.metadataCaption, styles.wordText, { color: colors.fawn }]}>
                  {word}
                </Text>
                {word && showPronunciation ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel="Repeat pronunciation"
                    onPress={() => void speakWord(word, sourceLang, 'normal')}
                    onLongPress={() => void speakWord(word, sourceLang, 'slow')}
                    style={styles.speakerBtn}
                  >
                    <ReloadIcon color={colors.flameAmber} size={13} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={onChangeLanguage}
                disabled={!onChangeLanguage}
                hitSlop={8}
                style={[styles.pairTag, { backgroundColor: '#2B2621' }]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                  {sourceLangLabel} → {targetLanguageLabel(targetLanguage)}{onChangeLanguage ? ' ▾' : ''}
                </Text>
              </Pressable>
            </View>

            {state.status === 'loading' ? (
              <ActivityIndicator color={colors.flameAmber} style={{ marginVertical: spacing.md }} />
            ) : null}

            {state.status === 'capped' ? (
              <>
                <Text style={[typography.metadataCaption, { color: colors.lampText, marginTop: spacing.sm }]}>
                  {capInfo.isGuest
                    ? "You've reached today's 20 guest translations."
                    : "You've reached today's 50 free translations."}
                </Text>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.flameAmber, marginTop: 12 }]}
                  onPress={() => {
                    if (capInfo.isGuest) {
                      setAccountModalVisible(true);
                    } else {
                      onClose();
                      router.push({
                        pathname: '/paywall',
                        params: { feature: 'unlimited_learning', trigger: 'daily_translation_cap' },
                      });
                    }
                  }}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                    {capInfo.isGuest ? 'Unlock 50/day (Free Account)' : 'Keep the lamp lit'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {state.status === 'error' ? (
              <>
                <Text style={[typography.metadataCaption, { color: colors.lampText, marginTop: spacing.sm }]}>
                  Couldn't translate — check your connection and try again.
                </Text>
                {onSaveForLater ? (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.flameAmber, marginTop: 12 }]}
                    onPress={() => {
                      onSaveForLater();
                      onClose();
                    }}
                  >
                    <SaveIcon color={colors.primaryDark} />
                    <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 11 }]}>
                      Save for later
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {state.status === 'ready' ? (
              <>
                <Text style={[typography.translatedWordPopup, { color: colors.flameAmber, marginTop: spacing.sm }]}>
                  {state.translation}
                </Text>

                {/* Context-Aware Enrichment (LEARN-04) */}
                {contextSentence ? (
                  canUse('context_translation') ? (
                    loadingContext ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 4 }}>
                        <ActivityIndicator size="small" color={colors.flameAmber} />
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10.5 }]}>
                          Interpreting literary context…
                        </Text>
                      </View>
                    ) : contextEnrichment ? (
                      <View
                        style={{
                          backgroundColor: '#262228',
                          borderColor: 'rgba(245, 166, 35, 0.25)',
                          borderWidth: 1,
                          borderRadius: radius.card,
                          padding: 10,
                          marginTop: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                            ✦ CONTEXT MEANING
                          </Text>
                          {contextEnrichment.partOfSpeech ? (
                            <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 8.5 }]}>
                              [{contextEnrichment.partOfSpeech.toUpperCase()}]
                            </Text>
                          ) : null}
                        </View>

                        {contextEnrichment.contextualTranslation.toLowerCase() !== state.translation.toLowerCase() && (
                          <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13, marginTop: 3 }]}>
                            {contextEnrichment.contextualTranslation}
                          </Text>
                        )}

                        <Text style={[typography.metadataCaption, { color: colors.lampText, fontSize: 11, marginTop: 3, lineHeight: 15 }]}>
                          {contextEnrichment.definition}
                        </Text>

                        {contextEnrichment.contextFit ? (
                          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginTop: 4, fontStyle: 'italic', lineHeight: 14 }]}>
                            “{contextEnrichment.contextFit}”
                          </Text>
                        ) : null}

                        {contextEnrichment.synonyms.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, alignItems: 'center' }}>
                            <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 8.5 }]}>
                              SYN:
                            </Text>
                            {contextEnrichment.synonyms.map((s) => (
                              <View
                                key={s.word}
                                style={{
                                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                                  paddingHorizontal: 5,
                                  paddingVertical: 1,
                                  borderRadius: radius.pill,
                                }}
                              >
                                <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 9.5 }]}>
                                  {s.word}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {contextEnrichment.grammarNote ? (
                          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 9.5, marginTop: 4 }]}>
                            Note: {contextEnrichment.grammarNote}
                          </Text>
                        ) : null}
                      </View>
                    ) : null
                  ) : (
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: '/paywall',
                          params: { feature: 'context_translation', trigger: 'word_translation_popup' },
                        });
                      }}
                      style={{
                        backgroundColor: '#262228',
                        borderColor: 'rgba(245, 166, 35, 0.22)',
                        borderWidth: 1,
                        borderRadius: radius.card,
                        padding: 8,
                        marginTop: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                          ✦ CONTEXT TRANSLATION
                        </Text>
                        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 8.5 }]}>
                          UPGRADE →
                        </Text>
                      </View>
                      <Text style={[typography.metadataCaption, { color: colors.lampText, fontSize: 10, marginTop: 3, lineHeight: 14 }]}>
                        See how this word functions specifically in this sentence with literary nuances.
                      </Text>
                    </Pressable>
                  )
                ) : null}

                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: '#2B2621' }]}
                    onPress={() => void Clipboard.setStringAsync(contextEnrichment?.contextualTranslation || state.translation)}
                  >
                    <CopyIcon color={colors.lampText} />
                    <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 11 }]}>Copy</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.flameAmber }]}
                    onPress={() => {
                      void hapticSaveWord();
                      onSave(contextEnrichment?.contextualTranslation || state.translation);
                    }}
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
      <AccountProtectionModal
        visible={accountModalVisible}
        trigger="translation_cap"
        onClose={() => {
          setAccountModalVisible(false);
          onClose();
        }}
        onSuccess={() => {
          setAccountModalVisible(false);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  cardWrap: {
    position: 'absolute',
    alignSelf: 'flex-start',
    minWidth: MIN_CARD_WIDTH,
    maxWidth: MAX_CARD_WIDTH,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  wordText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  pairTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 100,
    flexShrink: 0,
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
  speakerBtn: {
    padding: 4,
    borderRadius: 100,
    backgroundColor: '#2B2621',
    flexShrink: 0,
  },
});
