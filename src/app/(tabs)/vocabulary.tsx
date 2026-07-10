import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronRightIcon } from '@/components/icons';
import { type BookRow, listBooks } from '@/db/repositories/books';
import { deleteSavedWord, listSavedWords, type SavedWord } from '@/db/repositories/savedWords';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'list' | 'flashcards';

export default function VocabularyScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [tab, setTab] = useState<Tab>('list');

  const reload = useCallback(() => {
    Promise.all([listSavedWords(), listBooks()]).then(([w, b]) => {
      setWords(w);
      setBooks(b);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const bookTitle = (bookId: string) => books.find((b) => b.id === bookId)?.title ?? bookId;
  const groups = words.reduce<Record<string, SavedWord[]>>((acc, word) => {
    (acc[word.bookId] ??= []).push(word);
    return acc;
  }, {});

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.parchment, paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.screenTitle, { color: colors.ink }]}>Vocabulary</Text>
        <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>
          {words.length} {words.length === 1 ? 'word' : 'words'}
        </Text>
      </View>

      <View style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}>
        <Pressable
          onPress={() => setTab('list')}
          style={[
            styles.segment,
            tab === 'list' && { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
          ]}
        >
          <Text
            style={[
              typography.uiRowTitle,
              { fontSize: 12, color: tab === 'list' ? colors.lampText : colors.fawn },
            ]}
          >
            List
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('flashcards')}
          style={[
            styles.segment,
            tab === 'flashcards' && { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
          ]}
        >
          <Text
            style={[
              typography.uiRowTitle,
              { fontSize: 12, color: tab === 'flashcards' ? colors.lampText : colors.fawn },
            ]}
          >
            Flashcards
          </Text>
        </Pressable>
      </View>

      {tab === 'flashcards' ? (
        <View style={styles.emptyState}>
          <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center' }]}>
            Flashcard review is coming in a later milestone — same saved words, quiz framing.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {words.length === 0 ? (
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.lg }]}>
              Words you save while reading will appear here.
            </Text>
          ) : (
            Object.entries(groups).map(([bookId, groupWords]) => (
              <View key={bookId} style={{ marginBottom: spacing.xl }}>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.progressLabel, marginBottom: spacing.sm },
                  ]}
                >
                  {bookTitle(bookId)}
                </Text>
                {groupWords.map((word, index) => (
                  <Pressable
                    key={word.id}
                    // Tap -> open the book at exactly the page the word was saved
                    // on. Long-press -> remove it (with a confirm).
                    onPress={() =>
                      router.push({
                        pathname: '/reader/[bookId]',
                        params: {
                          bookId: word.bookId,
                          jumpChapter: String(word.chapterIndex),
                          jumpPage: String(word.pageIndex),
                        },
                      })
                    }
                    onLongPress={() =>
                      Alert.alert('Remove word', `Remove "${word.sourceWord}" from your vocabulary?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteSavedWord(word.id);
                            reload();
                          },
                        },
                      ])
                    }
                    style={[
                      styles.row,
                      index < groupWords.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(43,38,33,0.08)',
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.translatedWordInline, { color: colors.ink, fontSize: 15 }]}>
                        {word.sourceWord}{' '}
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                          → {word.translation}
                        </Text>
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[typography.metadataCaption, { color: colors.textFaint, marginTop: 2 }]}
                      >
                        &ldquo;{word.contextSentence}&rdquo;
                      </Text>
                    </View>
                    <ChevronRightIcon color={colors.straw} size={15} />
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 18,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  emptyState: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
});
