import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronDownIcon, CloseIcon, TranslateIcon } from '@/components/icons';
import { LanguagePicker } from '@/components/LanguagePicker';
import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { listSavedWordsForBook, saveWord } from '@/db/repositories/savedWords';
import { transliterateSentence } from '@/features/reader/engine/transliterate';
import { targetLanguageLabel, type TargetLanguage } from '@/features/settings/languagePair';
import { translationProvider } from '@/features/translation';
import { useTheme } from '@/theme/ThemeProvider';
import { WordChip } from './WordChip';

const FREE_DAILY_DECIPHER_LIMIT = 20;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type DecipherSentence = {
  original: string;
  phonetic: string;
  translation: string;
  words: Array<{ word: string; definition: string }>;
};

type DecipherPageSheetProps = {
  visible: boolean;
  onClose: () => void;
  bookId: string;
  pageText: string;
  pageIndex: number;
  chapterIndex: number;
  sourceLanguage?: string;
  targetLanguage?: string;
  isPremium?: boolean;
  onTargetLanguageChange?: (code: TargetLanguage) => void;
};

export function DecipherPageSheet({
  visible,
  onClose,
  bookId,
  pageText,
  pageIndex,
  chapterIndex,
  sourceLanguage = 'en',
  targetLanguage = 'es',
  isPremium = false,
  onTargetLanguageChange,
}: DecipherPageSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTargetLang, setActiveTargetLang] = useState<string>(targetLanguage);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [remainingUsage, setRemainingUsage] = useState(FREE_DAILY_DECIPHER_LIMIT);
  const [sentences, setSentences] = useState<DecipherSentence[]>([]);
  const [savedWordSet, setSavedWordSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveTargetLang(targetLanguage);
  }, [targetLanguage]);

  const initDecipher = useCallback(async () => {
    if (!visible) return;
    setLoading(true);

    // 1. Check daily limit (bypassed in __DEV__ or premium)
    const key = `decipher_usage_${getTodayKey()}`;
    const rawCount = await getSetting(key);
    const countUsed = rawCount ? parseInt(rawCount, 10) || 0 : 0;

    if (!isPremium && !__DEV__ && countUsed >= FREE_DAILY_DECIPHER_LIMIT) {
      setLimitReached(true);
      setRemainingUsage(0);
      setLoading(false);
      return;
    }

    setLimitReached(false);
    const newRemaining = Math.max(0, FREE_DAILY_DECIPHER_LIMIT - (countUsed + 1));
    setRemainingUsage(isPremium || __DEV__ ? Infinity : newRemaining);

    if (!isPremium && !__DEV__) {
      await setSetting(key, (countUsed + 1).toString());
    }

    // 2. Fetch existing saved words for book
    try {
      const existing = await listSavedWordsForBook(bookId);
      setSavedWordSet(new Set(existing.map((w) => w.sourceWord.toLowerCase().trim())));
    } catch {
      // Continue
    }

    // 3. Break page into sentences
    const cleanText = pageText.replace(/\r\n/g, '\n').trim();
    const rawSentences =
      cleanText.match(/[^.!?。！？\n]+[.!?。！？\n]*/g)?.map((s) => s.trim()).filter((s) => s.length > 2) ||
      [cleanText];

    const parsed: DecipherSentence[] = [];

    for (const raw of rawSentences.slice(0, 10)) {
      const phonetic = transliterateSentence(raw, sourceLanguage);

      // Translate sentence
      let translation = '';
      try {
        const res = await translationProvider.translateSelection(
          raw,
          sourceLanguage as any,
          activeTargetLang as any,
        );
        translation = res.translatedText;
      } catch {
        translation = 'Translation unavailable offline.';
      }

      // Extract key words
      const rawWords =
        raw.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu)?.filter((w) => w.length > 2) || [];
      const words: Array<{ word: string; definition: string }> = [];

      // Translate up to 5 distinctive words per sentence
      const uniqueWords = Array.from(new Set(rawWords)).slice(0, 5);
      for (const w of uniqueWords) {
        try {
          const wRes = await translationProvider.translateWord(
            w,
            sourceLanguage as any,
            activeTargetLang as any,
          );
          words.push({ word: w, definition: wRes.translatedText });
        } catch {
          words.push({ word: w, definition: '' });
        }
      }

      parsed.push({
        original: raw,
        phonetic,
        translation,
        words,
      });
    }

    setSentences(parsed);
    setLoading(false);
  }, [visible, bookId, pageText, sourceLanguage, activeTargetLang, isPremium]);

  useEffect(() => {
    if (visible) {
      initDecipher();
    }
  }, [visible, initDecipher]);

  const handleSelectLanguage = (code: TargetLanguage) => {
    setActiveTargetLang(code);
    setLangPickerVisible(false);
    onTargetLanguageChange?.(code);
  };

  const handleSaveWord = async (word: string, def: string, sentence: string) => {
    try {
      await saveWord({
        bookId,
        sourceWord: word,
        sourceLang: sourceLanguage,
        targetLang: activeTargetLang,
        translation: def || 'Key vocabulary',
        contextSentence: sentence,
        chapterIndex,
        pageIndex,
        paragraphIndex: 0,
        status: 'learning',
      });
      setSavedWordSet((prev) => new Set([...prev, word.toLowerCase().trim()]));
    } catch (err) {
      console.warn('Failed to save word:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <TranslateIcon color={colors.flameAmber} size={18} />
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginLeft: 8 }]}>
                  Illuminated Decryption Sheet
                </Text>
              </View>
              <View style={styles.subHeaderRow}>
                <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                  Page {pageIndex + 1} · {isPremium || __DEV__ ? 'Unlimited Decryptions' : `${remainingUsage} free left today`}
                </Text>
                <Pressable
                  onPress={() => setLangPickerVisible(true)}
                  hitSlop={8}
                  style={[
                    styles.langPill,
                    { backgroundColor: colors.hairline, borderColor: colors.fawn, borderRadius: radius.pill },
                  ]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.ink, fontSize: 11, marginRight: 4 }]}>
                    → {targetLanguageLabel(activeTargetLang as TargetLanguage)}
                  </Text>
                  <ChevronDownIcon color={colors.fawn} size={12} />
                </Pressable>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={18} />
            </Pressable>
          </View>

          {/* Content Body */}
          {limitReached ? (
            <View style={[styles.paywallCard, { borderColor: colors.flameAmber, backgroundColor: colors.parchment }]}>
              <Text style={[typography.screenTitle, { color: colors.primaryDark, fontSize: 18, textAlign: 'center' }]}>
                Daily Decryption Limit Reached
              </Text>
              <Text
                style={[
                  typography.readingBody,
                  { color: colors.umber, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8 },
                ]}
              >
                Free tier provides 20 Illuminated Page Decryptions per day. Upgrade to Lamplight
                Fellowship for unlimited sentence-by-sentence phonetic breakdowns.
              </Text>
              <Pressable
                onPress={onClose}
                style={[
                  styles.ctaButton,
                  { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.md },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>
                  Close Sheet
                </Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.flameAmber} size="large" />
              <Text style={[typography.readingBody, { color: colors.umber, marginTop: 12, fontSize: 14 }]}>
                Illuminating sentences and phonetics…
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
            >
              {sentences.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.sentenceCard,
                    {
                      borderBottomColor: colors.hairline,
                      borderBottomWidth: idx < sentences.length - 1 ? 1 : 0,
                      paddingBottom: spacing.lg,
                      marginBottom: spacing.lg,
                    },
                  ]}
                >
                  {/* Layer 1: Original text in Lora serif */}
                  <Text
                    style={[
                      typography.readingBody,
                      {
                        color: colors.ink,
                        fontSize: 17,
                        lineHeight: 28,
                      },
                    ]}
                  >
                    {item.original}
                  </Text>

                  {/* Layer 2: Phonetic Pronunciation Guide */}
                  {item.phonetic ? (
                    <Text
                      style={[
                        typography.metadataCaption,
                        {
                          color: colors.fawn,
                          fontSize: 13,
                          lineHeight: 20,
                          marginTop: 4,
                          fontStyle: 'italic',
                        },
                      ]}
                    >
                      {item.phonetic}
                    </Text>
                  ) : null}

                  {/* Layer 3: Word Chips with [+] save buttons */}
                  {item.words.length > 0 ? (
                    <View style={styles.chipWrap}>
                      {item.words.map((w) => (
                        <WordChip
                          key={w.word}
                          word={w.word}
                          definition={w.definition}
                          isSaved={savedWordSet.has(w.word.toLowerCase().trim())}
                          onSave={() => handleSaveWord(w.word, w.definition, item.original)}
                        />
                      ))}
                    </View>
                  ) : null}

                  {/* Layer 4: Natural Full Sentence Translation */}
                  {item.translation ? (
                    <View
                      style={[
                        styles.translationBox,
                        {
                          backgroundColor: colors.parchment,
                          borderColor: colors.hairline,
                          borderRadius: radius.card,
                          padding: spacing.sm,
                          marginTop: spacing.xs,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.readingBody,
                          {
                            color: colors.primaryDark,
                            fontSize: 14,
                            lineHeight: 22,
                          },
                        ]}
                      >
                        {item.translation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <LanguagePicker
        visible={langPickerVisible}
        selected={activeTargetLang as TargetLanguage}
        onSelect={handleSelectLanguage}
        onClose={() => setLangPickerVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(140, 122, 107, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingRight: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  paywallCard: {
    margin: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentenceCard: {
    marginTop: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  translationBox: {
    borderWidth: 1,
  },
});
