import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { getBook, type BookRow } from '@/db/repositories/books';
import { getHighlight, type Highlight } from '@/db/repositories/highlights';
import { ShareCardScreen } from '@/features/reader/components/ShareCardScreen';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { cloudTranslationProvider } from '@/features/translation/cloudTranslationProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function QuoteShareScreen() {
  const { highlightId, translation: initialTranslation } = useLocalSearchParams<{
    highlightId: string;
    translation?: string;
  }>();
  const { colors } = useTheme();
  const targetLang = useTargetLanguage();

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);
  const [translation, setTranslation] = useState<string | null>(initialTranslation ?? null);
  const [showTranslation, setShowTranslation] = useState<boolean>(Boolean(initialTranslation));
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    (async () => {
      const h = await getHighlight(highlightId);
      setHighlight(h);
      if (h) {
        const b = await getBook(h.bookId);
        setBook(b);
      }
    })();
  }, [highlightId]);

  const handleToggleTranslation = useCallback(async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translation && translation.trim().length > 0) {
      setShowTranslation(true);
      return;
    }

    if (!highlight) return;

    setIsTranslating(true);
    try {
      const sourceLang = book?.sourceLanguage || 'en';
      const result = await cloudTranslationProvider.translateSelection(
        highlight.quoteText,
        sourceLang,
        targetLang,
      );
      if (result.translatedText) {
        setTranslation(result.translatedText);
        setShowTranslation(true);
      }
    } catch {
      Alert.alert('Translation Unavailable', 'Could not translate this quote right now.');
    } finally {
      setIsTranslating(false);
    }
  }, [showTranslation, translation, highlight, book, targetLang]);

  if (!highlight || !book) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.primaryDark }]}>
        <ActivityIndicator color={colors.flameAmber} size="small" />
      </View>
    );
  }

  return (
    <ShareCardScreen
      text={highlight.quoteText}
      attribution={`${book.title} · ${book.author}`}
      translation={showTranslation && translation ? translation : undefined}
      onToggleTranslation={handleToggleTranslation}
      hasTranslationAvailable={true}
      isTranslating={isTranslating}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
