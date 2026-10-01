import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { CloseIcon } from '@/components/icons';
import type { SavedWord } from '@/db/repositories/savedWords';
import {
  addWordsToDeckBatch,
  addWordToDeck,
  createVocabularyDeck,
  listDeckIdsForWord,
  listVocabularyDecks,
  removeWordFromDeck,
  validateDeckName,
  type VocabularyDeckWithCount,
} from '@/db/repositories/vocabularyDecks';
import { canUse } from '@/features/subscription/subscriptionState';
import { useTheme } from '@/theme/ThemeProvider';

export type AddToDeckModalProps = {
  visible: boolean;
  words: SavedWord[];
  onClose: () => void;
  onDecksUpdated?: () => void;
};

export function AddToDeckModal({
  visible,
  words,
  onClose,
  onDecksUpdated,
}: AddToDeckModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const isPremium = canUse('unlimited_learning');

  const [decks, setDecks] = useState<VocabularyDeckWithCount[]>([]);
  const [wordDeckIds, setWordDeckIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (words.length === 0) return;
    setLoading(true);
    try {
      const allDecks = await listVocabularyDecks();
      setDecks(allDecks);

      if (words.length === 1) {
        const assigned = await listDeckIdsForWord(words[0].id);
        setWordDeckIds(new Set(assigned));
      } else {
        setWordDeckIds(new Set());
      }
    } catch (err) {
      console.warn('[AddToDeckModal] Failed to load decks:', err);
    } finally {
      setLoading(false);
    }
  }, [words]);

  useEffect(() => {
    if (visible) {
      setError(null);
      setIsCreating(false);
      setNewDeckName('');
      void loadData();
    }
  }, [visible, loadData]);

  if (!visible) return null;

  const handleToggleDeck = async (deck: VocabularyDeckWithCount) => {
    void Haptics.selectionAsync().catch(() => {});
    try {
      if (words.length === 1) {
        const word = words[0];
        const isAssigned = wordDeckIds.has(deck.id);
        if (isAssigned) {
          await removeWordFromDeck(deck.id, word.id);
          setWordDeckIds((prev) => {
            const next = new Set(prev);
            next.delete(deck.id);
            return next;
          });
        } else {
          await addWordToDeck(deck.id, word.id);
          setWordDeckIds((prev) => {
            const next = new Set(prev);
            next.add(deck.id);
            return next;
          });
        }
      } else {
        // Multi-word batch addition
        await addWordsToDeckBatch(
          deck.id,
          words.map((w) => w.id),
        );
      }
      await loadData();
      onDecksUpdated?.();
      if (words.length > 1) {
        onClose();
      }
    } catch (err) {
      console.warn('[AddToDeckModal] Failed to toggle deck:', err);
    }
  };

  const handleCreateDeck = async () => {
    if (!isPremium) {
      onClose();
      router.push({
        pathname: '/paywall',
        params: { feature: 'unlimited_learning', trigger: 'custom_deck' },
      });
      return;
    }

    const validation = validateDeckName(newDeckName);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid deck name');
      return;
    }

    setError(null);
    try {
      const created = await createVocabularyDeck(validation.cleanName);
      if (words.length > 0) {
        await addWordsToDeckBatch(
          created.id,
          words.map((w) => w.id),
        );
      }
      setNewDeckName('');
      setIsCreating(false);
      await loadData();
      onDecksUpdated?.();
      if (words.length > 1) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create deck');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.card,
              maxHeight: '80%',
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                {words.length > 1 ? `ADD ${words.length} WORDS TO STUDY DECK` : 'CUSTOM STUDY DECKS'}
              </Text>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                {words.length === 1 ? `Deck for “${words[0].sourceWord}”` : 'Select Study Deck'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close deck selector"
            >
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* New Deck Row / Creator */}
          {isCreating ? (
            <View
              style={[
                styles.createBox,
                {
                  backgroundColor: colors.parchment,
                  borderColor: error ? colors.highlight.clay : colors.hairline,
                  borderRadius: radius.card,
                  marginTop: spacing.sm,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                NEW DECK NAME
              </Text>
              <TextInput
                value={newDeckName}
                onChangeText={(text) => {
                  setNewDeckName(text);
                  if (error) setError(null);
                }}
                placeholder="e.g. Philosophy Classics, GRE 1000…"
                placeholderTextColor={colors.fawn}
                autoFocus
                maxLength={50}
                style={[
                  typography.readingBody,
                  {
                    color: colors.ink,
                    fontSize: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.flameAmber,
                    paddingVertical: 6,
                    marginTop: 4,
                  },
                ]}
              />

              {error && (
                <Text style={[typography.metadataCaption, { color: colors.highlight.clay, marginTop: 4 }]}>
                  {error}
                </Text>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: spacing.md }}>
                <Pressable
                  onPress={() => {
                    setIsCreating(false);
                    setError(null);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 13 }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateDeck}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                  ]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                    Create & Add
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                if (!isPremium) {
                  onClose();
                  router.push({
                    pathname: '/paywall',
                    params: { feature: 'unlimited_learning', trigger: 'custom_deck' },
                  });
                  return;
                }
                setIsCreating(true);
              }}
              style={[
                styles.addDeckTrigger,
                {
                  backgroundColor: isLamp ? '#262224' : 'rgba(245, 166, 35, 0.08)',
                  borderColor: isLamp ? 'rgba(245, 166, 35, 0.25)' : 'rgba(245, 166, 35, 0.4)',
                  borderRadius: radius.pill,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <Text style={{ color: colors.flameAmber, fontSize: 15, fontWeight: '700' }}>+</Text>
              <Text
                style={[
                  typography.buttonLabel,
                  { color: isLamp ? colors.flameAmber : '#9A5B00', fontSize: 13 },
                ]}
              >
                Create New Study Deck
              </Text>
              {!isPremium && (
                <View
                  style={{
                    backgroundColor: colors.flameAmber,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ color: colors.primaryDark, fontSize: 9.5, fontWeight: '800' }}>
                    PREMIUM
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Decks List */}
          <ScrollView
            style={{ marginTop: spacing.md }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.flameAmber} />
              </View>
            ) : decks.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center' }]}>
                  No custom decks created yet.{'\n'}Create your first deck to study across books.
                </Text>
              </View>
            ) : (
              decks.map((deck) => {
                const isSelected = wordDeckIds.has(deck.id);
                return (
                  <Pressable
                    key={deck.id}
                    onPress={() => handleToggleDeck(deck)}
                    style={({ pressed }) => [
                      styles.deckRow,
                      {
                        backgroundColor: isSelected
                          ? isLamp
                            ? 'rgba(245, 166, 35, 0.16)'
                            : 'rgba(245, 166, 35, 0.12)'
                          : colors.parchment,
                        borderColor: isSelected ? colors.flameAmber : colors.hairline,
                        borderRadius: radius.card,
                        marginBottom: 8,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                        {deck.name}
                      </Text>
                      <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
                        {deck.wordCount} {deck.wordCount === 1 ? 'word' : 'words'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: isSelected ? colors.flameAmber : colors.fawn,
                          backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: '800' }}>
                          ✓
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  closeBtn: {
    padding: 4,
  },
  addDeckTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
  },
  createBox: {
    borderWidth: 1,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
