import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon } from '@/components/icons';
import {
  createBibleHighlight,
  deleteBibleHighlight,
  listBibleHighlightsForBook,
  saveBibleWord,
  upsertBibleReadingPosition,
  type BibleHighlight,
} from '@/db/repositories/bible';
import { getBookMeta, getBookVerses } from '@/features/bible-content/bibleNtData';
import { TappableWords } from '@/features/reader/components/TappableWords';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { cleanWordForLookup } from '@/features/reader/engine/words';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type FlatVerse = { chapter: number; verse: { number: number; text: string; commentary?: string } };

type HeldWord = {
  word: string;
  chapter: number;
  verseNumber: number;
  anchor: { x: number; y: number };
};

function verseKey(chapter: number, verse: number): string {
  return `${chapter}:${verse}`;
}

export default function BibleNtVerseReaderScreen() {
  const { bookId, jumpChapter, jumpVerse } = useLocalSearchParams<{
    bookId: string;
    jumpChapter?: string;
    jumpVerse?: string;
  }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const listRef = useRef<FlatList<FlatVerse>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookMeta = getBookMeta(bookId);
  const verses = useMemo(() => getBookVerses(bookId), [bookId]);

  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);
  const [heldWord, setHeldWord] = useState<HeldWord | null>(null);
  const [activeWord, setActiveWord] = useState<HeldWord | null>(null);
  const [expandedInterpretation, setExpandedInterpretation] = useState<Set<string>>(new Set());

  const toggleInterpretation = useCallback((chapter: number, verseNumber: number) => {
    const key = verseKey(chapter, verseNumber);
    setExpandedInterpretation((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    void listBibleHighlightsForBook(bookId).then(setHighlights);
  }, [bookId]);

  useEffect(() => {
    if (!jumpChapter || !jumpVerse) return;
    const index = verses.findIndex(
      (v) => v.chapter === Number(jumpChapter) && v.verse.number === Number(jumpVerse),
    );
    if (index <= 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
    return () => clearTimeout(timer);
  }, [jumpChapter, jumpVerse, verses]);

  const highlightByVerse = useMemo(
    () => new Map(highlights.map((h) => [verseKey(h.chapter, h.verse), h])),
    [highlights],
  );

  const persistPosition = useCallback(
    (chapter: number, verse: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void upsertBibleReadingPosition({ bookId, chapter, verse });
      }, 800);
    },
    [bookId],
  );

  const handleToggleHighlight = useCallback(
    async (chapter: number, verseNumber: number) => {
      const existing = highlightByVerse.get(verseKey(chapter, verseNumber));
      if (existing) {
        setHighlights((prev) => prev.filter((h) => h.id !== existing.id));
        await deleteBibleHighlight(existing.id);
      } else {
        const created = await createBibleHighlight({ bookId, chapter, verse: verseNumber, colorKey: 'amber' });
        setHighlights((prev) => [...prev, created]);
      }
    },
    [bookId, highlightByVerse],
  );

  const handleSaveTranslation = useCallback(
    async (translation: string) => {
      if (!activeWord) return;
      await saveBibleWord({
        bookId,
        chapter: activeWord.chapter,
        verse: activeWord.verseNumber,
        sourceWord: activeWord.word,
        sourceLang: 'en',
        targetLang: targetLanguage,
        translation,
      });
      setActiveWord(null);
    },
    [activeWord, bookId, targetLanguage],
  );

  if (!bookMeta) return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, marginLeft: spacing.md }]}>{bookMeta.name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(item) => verseKey(item.chapter, item.verse.number)}
        contentContainerStyle={{
          paddingHorizontal: layout.screenMargin,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 32,
        }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 100);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onViewableItemsChanged={({ viewableItems }) => {
          const first = viewableItems[0]?.item as FlatVerse | undefined;
          if (first) persistPosition(first.chapter, first.verse.number);
        }}
        renderItem={({ item, index }) => {
          const isChapterStart = index === 0 || verses[index - 1].chapter !== item.chapter;
          const highlighted = highlightByVerse.has(verseKey(item.chapter, item.verse.number));
          const interpretationOpen = expandedInterpretation.has(verseKey(item.chapter, item.verse.number));
          return (
            <View>
              {isChapterStart ? (
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.progressLabel, marginTop: index === 0 ? 0 : spacing.lg, marginBottom: spacing.sm },
                  ]}
                >
                  Chapter {item.chapter}
                </Text>
              ) : null}
              <View
                style={[
                  styles.verseBlock,
                  {
                    backgroundColor: highlighted ? `${colors.highlight.amber}30` : 'transparent',
                    borderRadius: radius.card,
                    marginBottom: spacing.xs,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View style={styles.verseRow}>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, width: 22 }]}>
                    {item.verse.number}
                  </Text>
                  <TappableWords
                    text={item.verse.text}
                    cleanWord={cleanWordForLookup}
                    style={[typography.readingBody, { color: colors.ink, flex: 1 }]}
                    onWordLongPress={(word, anchor) =>
                      setHeldWord({ word, chapter: item.chapter, verseNumber: item.verse.number, anchor })
                    }
                  />
                </View>
                {item.verse.commentary ? (
                  <View style={{ marginLeft: 30 }}>
                    <Pressable
                      onPress={() => toggleInterpretation(item.chapter, item.verse.number)}
                      style={styles.interpretationToggle}
                      hitSlop={8}
                    >
                      <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, fontSize: 10 }]}>
                        Interpretation
                      </Text>
                      <View style={{ transform: [{ rotate: interpretationOpen ? '90deg' : '0deg' }] }}>
                        <ChevronRightIcon color={colors.progressLabel} size={12} />
                      </View>
                    </Pressable>
                    {interpretationOpen ? (
                      <>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.umber, marginTop: spacing.sm, lineHeight: 20 },
                          ]}
                        >
                          {item.verse.commentary}
                        </Text>
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: spacing.xs }]}>
                          — Jamieson-Fausset-Brown
                        </Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.verseActions}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/verse-share',
                        params: {
                          text: item.verse.text,
                          attribution: `${bookMeta.name} ${item.chapter}:${item.verse.number} · World English Bible`,
                        },
                      })
                    }
                    hitSlop={8}
                    style={{ marginRight: spacing.sm }}
                  >
                    <ShareIcon color={colors.straw} size={16} />
                  </Pressable>
                  <Pressable onPress={() => void handleToggleHighlight(item.chapter, item.verse.number)} hitSlop={8}>
                    <BookmarkIcon color={colors.flameAmber} size={16} filled={highlighted} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <WordActionMenu
        word={heldWord?.word ?? null}
        anchor={heldWord?.anchor ?? null}
        saveLabel={
          heldWord && highlightByVerse.has(verseKey(heldWord.chapter, heldWord.verseNumber))
            ? 'Remove highlight'
            : 'Highlight verse'
        }
        onTranslate={() => {
          setActiveWord(heldWord);
          setHeldWord(null);
        }}
        onSaveQuote={() => {
          if (heldWord) void handleToggleHighlight(heldWord.chapter, heldWord.verseNumber);
          setHeldWord(null);
        }}
        onClose={() => setHeldWord(null)}
      />

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        anchor={activeWord?.anchor ?? null}
        onClose={() => setActiveWord(null)}
        onSave={handleSaveTranslation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verseBlock: {},
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  interpretationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
