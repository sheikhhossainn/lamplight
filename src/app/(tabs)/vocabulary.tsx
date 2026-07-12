import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@/components/icons';
import {
  FlashcardsIllustration,
  QuotesIllustration,
  WordsIllustration,
} from '@/components/NotebookIllustrations';
import { type BookRow, listBooks } from '@/db/repositories/books';
import { deleteHighlight, listAllHighlights, type Highlight } from '@/db/repositories/highlights';
import { deleteSavedWord, listSavedWords, type SavedWord } from '@/db/repositories/savedWords';
import { sentenceContaining } from '@/features/reader/engine/words';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'list' | 'flashcards' | 'quotes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'Words' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'quotes', label: 'Quotes' },
];

export default function VocabularyScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [quotes, setQuotes] = useState<Highlight[]>([]);
  // The daily review prompt lands here with tab=flashcards, so it opens on the
  // deck rather than dropping the reader on the word list to find it.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'flashcards' ? 'flashcards' : 'list');
  // One themed confirm for both remove flows (word / quote), replacing the OS
  // alert. Holds the title/message and the action to run on confirm.
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const reload = useCallback(() => {
    Promise.all([listSavedWords(), listBooks(), listAllHighlights()]).then(([w, b, q]) => {
      setWords(w);
      setBooks(b);
      setQuotes(q);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // The tab screen stays mounted, so the initial state above only covers a cold
  // launch — arriving here from the review prompt has to switch the tab too.
  useEffect(() => {
    if (params.tab === 'flashcards') setTab('flashcards');
  }, [params.tab]);

  const confirmRemoveWord = useCallback(
    (word: SavedWord) => {
      setConfirm({
        title: 'Remove word',
        message: `Remove “${word.sourceWord}” from your vocabulary?`,
        onConfirm: async () => {
          await deleteSavedWord(word.id);
          reload();
        },
      });
    },
    [reload],
  );

  const confirmRemoveQuote = useCallback(
    (quote: Highlight) => {
      setConfirm({
        title: 'Remove quote',
        message: 'Remove this saved quote?',
        onConfirm: async () => {
          await deleteHighlight(quote.id);
          reload();
        },
      });
    },
    [reload],
  );

  const bookTitle = (bookId: string) => books.find((b) => b.id === bookId)?.title ?? bookId;
  const groups = words.reduce<Record<string, SavedWord[]>>((acc, word) => {
    (acc[word.bookId] ??= []).push(word);
    return acc;
  }, {});
  const quoteGroups = quotes.reduce<Record<string, Highlight[]>>((acc, quote) => {
    (acc[quote.bookId] ??= []).push(quote);
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
        <Text style={[typography.screenTitle, { color: colors.ink }]}>Notebook</Text>
        <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>
          {tab === 'quotes'
            ? `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`
            : `${words.length} ${words.length === 1 ? 'word' : 'words'}`}
        </Text>
      </View>

      <View style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}>
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.segment, tab === key && { backgroundColor: colors.primaryDark, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { fontSize: 12, color: tab === key ? colors.lampText : colors.fawn }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'flashcards' ? (
        words.length === 0 ? (
          <EmptyPrompt variant="flashcards" message="Save words while reading to build your flashcard deck." />
        ) : (
          <FlashcardDeck words={words} books={books} />
        )
      ) : tab === 'quotes' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {quotes.length === 0 ? (
            <EmptyPrompt variant="quotes" message="Quotes you save while reading will appear here." />
          ) : (
            Object.entries(quoteGroups).map(([bookId, groupQuotes]) => (
              <View key={bookId} style={{ marginBottom: spacing.xl }}>
                <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, marginBottom: spacing.sm }]}>
                  {bookTitle(bookId)}
                </Text>
                {groupQuotes.map((quote, index) => (
                  <Pressable
                    key={quote.id}
                    // Tap -> reopen the share card for this quote. Long-press ->
                    // remove it (with a confirm) — same action as the trash icon.
                    onPress={() =>
                      router.push({ pathname: '/quote-share/[highlightId]', params: { highlightId: quote.id } })
                    }
                    onLongPress={() => confirmRemoveQuote(quote)}
                    style={[
                      styles.row,
                      index < groupQuotes.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(43,38,33,0.08)',
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={[typography.poeticTagline, { color: colors.ink }]}>
                        &ldquo;{quote.quoteText}&rdquo;
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmRemoveQuote(quote)} hitSlop={10} style={styles.rowTrash}>
                      <TrashIcon color={colors.straw} size={16} />
                    </Pressable>
                    <ChevronRightIcon color={colors.straw} size={15} />
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {words.length === 0 ? (
            <EmptyPrompt variant="list" message="Words you save while reading will appear here." />
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
                    // on. Long-press -> remove it (with a confirm) — same action
                    // as the visible trash icon, just a faster gesture for it.
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
                    onLongPress={() => confirmRemoveWord(word)}
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
                        &ldquo;{sentenceContaining(word.contextSentence, word.sourceWord)}&rdquo;
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmRemoveWord(word)} hitSlop={10} style={styles.rowTrash}>
                      <TrashIcon color={colors.straw} size={16} />
                    </Pressable>
                    <ChevronRightIcon color={colors.straw} size={15} />
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirm != null}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

// One empty-state layout for all three segments so the caption and CTA sit at
// the same position no matter which tab is active.
function EmptyPrompt({ message, variant }: { message: string; variant: Tab }) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={[styles.emptyState, { marginTop: spacing.lg }]}>
      <View style={{ marginBottom: spacing.lg }}>
        {variant === 'list' ? (
          <WordsIllustration />
        ) : variant === 'flashcards' ? (
          <FlashcardsIllustration />
        ) : (
          <QuotesIllustration />
        )}
      </View>
      <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center' }]}>{message}</Text>
      <Pressable
        onPress={() => router.push('/library')}
        style={[
          styles.emptyCta,
          { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.lg },
        ]}
      >
        <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Browse books to read</Text>
      </Pressable>
    </View>
  );
}

// Fisher-Yates. Save order is a poor review order — it lets you learn a card by
// its position in the deck instead of by the word.
function shuffled(words: SavedWord[]): SavedWord[] {
  const out = [...words];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function FlashcardDeck({ words, books }: { words: SavedWord[]; books: BookRow[] }) {
  const { colors, typography, spacing, radius } = useTheme();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Keyed on the word ids, not the array identity: a refocus that reloads the
  // same words must not reshuffle the deck out from under the reader.
  const wordIds = words.map((w) => w.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deck = useMemo(() => shuffled(words), [wordIds]);

  const clampedIndex = index % deck.length;
  const word = deck[clampedIndex];
  const bookTitle = books.find((b) => b.id === word.bookId)?.title ?? '';

  const goTo = (nextIndex: number) => {
    setFlipped(false);
    setIndex((nextIndex + deck.length) % deck.length);
  };

  return (
    <View style={styles.deckWrap}>
      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.md }]}>
        {clampedIndex + 1} / {deck.length}
      </Text>
      <Pressable
        onPress={() => setFlipped((f) => !f)}
        style={[styles.flashcard, { backgroundColor: colors.card, borderRadius: radius.card }]}
      >
        {flipped ? (
          <>
            <Text style={[typography.translatedWordPopup, { color: colors.flameAmber, textAlign: 'center' }]}>
              {word.translation}
            </Text>
            <Text
              style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.md, textAlign: 'center' }]}
            >
              {bookTitle}
            </Text>
          </>
        ) : (
          <>
            <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center' }]}>
              {word.sourceWord}
            </Text>
            <Text
              numberOfLines={3}
              style={[
                typography.metadataCaption,
                { color: colors.textFaint, marginTop: spacing.md, textAlign: 'center' },
              ]}
            >
              &ldquo;{sentenceContaining(word.contextSentence, word.sourceWord)}&rdquo;
            </Text>
          </>
        )}
        <Text style={[typography.eyebrowLabel, { color: colors.straw, marginTop: spacing.lg }]}>
          {flipped ? 'Tap to see word' : 'Tap to reveal'}
        </Text>
      </Pressable>
      <View style={[styles.deckNav, { marginTop: spacing.xl }]}>
        <Pressable
          onPress={() => goTo(clampedIndex - 1)}
          style={[styles.deckNavButton, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}
        >
          <ChevronLeftIcon color={colors.ink} size={18} />
        </Pressable>
        <Pressable
          onPress={() => goTo(clampedIndex + 1)}
          style={[styles.deckNavButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <ChevronRightIcon color={colors.primaryDark} size={18} />
        </Pressable>
      </View>
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
  rowTrash: {
    padding: 4,
  },
  emptyState: {
    paddingHorizontal: 8,
  },
  emptyCta: {
    height: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
  flashcard: {
    width: '100%',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  deckNav: {
    flexDirection: 'row',
    gap: 16,
  },
  deckNavButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
