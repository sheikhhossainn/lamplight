import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon } from '@/components/icons';
import {
  createQuranHighlight,
  deleteQuranHighlight,
  listQuranHighlightsForSurah,
  saveQuranWord,
  upsertQuranReadingPosition,
  type QuranHighlight,
} from '@/db/repositories/quran';
import { TappableWords } from '@/features/reader/components/TappableWords';
import { WordActionMenu } from '@/features/reader/components/WordActionMenu';
import { WordTranslationPopup } from '@/features/reader/components/WordTranslationPopup';
import { cleanArabicWordForLookup, cleanWordForLookup } from '@/features/quran-content/verseWords';
import { getSurahMeta, getSurahVerses, type QuranVerse } from '@/features/quran-content/quranData';
import { useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type WordLang = 'ar' | 'en';

type HeldWord = {
  word: string;
  lang: WordLang;
  verseNumber: number;
  anchor: { x: number; y: number };
};

export default function QuranVerseReaderScreen() {
  const { surahNumber: surahNumberParam, jumpVerse } = useLocalSearchParams<{
    surahNumber: string;
    jumpVerse?: string;
  }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const targetLanguage = useTargetLanguage();
  const listRef = useRef<FlatList<QuranVerse>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const surahNumber = Number(surahNumberParam);
  const surahMeta = getSurahMeta(surahNumber);
  const verses = getSurahVerses(surahNumber);

  const [highlights, setHighlights] = useState<QuranHighlight[]>([]);
  const [heldWord, setHeldWord] = useState<HeldWord | null>(null);
  const [activeWord, setActiveWord] = useState<HeldWord | null>(null);
  const [expandedTafsir, setExpandedTafsir] = useState<Set<number>>(new Set());

  const toggleTafsir = useCallback((verseNumber: number) => {
    setExpandedTafsir((prev) => {
      const next = new Set(prev);
      if (next.has(verseNumber)) next.delete(verseNumber);
      else next.add(verseNumber);
      return next;
    });
  }, []);

  useEffect(() => {
    void listQuranHighlightsForSurah(surahNumber).then(setHighlights);
  }, [surahNumber]);

  useEffect(() => {
    if (!jumpVerse) return;
    const index = Number(jumpVerse) - 1;
    if (index <= 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
    return () => clearTimeout(timer);
  }, [jumpVerse]);

  const highlightByVerse = useMemo(
    () => new Map(highlights.map((h) => [h.verseNumber, h])),
    [highlights],
  );

  const persistPosition = useCallback(
    (verseNumber: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void upsertQuranReadingPosition({ surahNumber, verseNumber });
      }, 800);
    },
    [surahNumber],
  );

  const handleToggleHighlight = useCallback(
    async (verseNumber: number) => {
      const existing = highlightByVerse.get(verseNumber);
      if (existing) {
        setHighlights((prev) => prev.filter((h) => h.id !== existing.id));
        await deleteQuranHighlight(existing.id);
      } else {
        const created = await createQuranHighlight({ surahNumber, verseNumber, colorKey: 'amber' });
        setHighlights((prev) => [...prev, created]);
      }
    },
    [surahNumber, highlightByVerse],
  );

  const handleSaveTranslation = useCallback(
    async (translation: string) => {
      if (!activeWord) return;
      await saveQuranWord({
        surahNumber,
        verseNumber: activeWord.verseNumber,
        sourceWord: activeWord.word,
        sourceLang: activeWord.lang,
        targetLang: targetLanguage,
        translation,
      });
      setActiveWord(null);
    },
    [activeWord, surahNumber, targetLanguage],
  );

  if (!surahMeta) return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <View style={{ marginLeft: spacing.md }}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>{surahMeta.nameEnglish}</Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            {surahMeta.nameTranslation} · {surahMeta.revelationType}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(item) => String(item.number)}
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
          const first = viewableItems[0]?.item as QuranVerse | undefined;
          if (first) persistPosition(first.number);
        }}
        renderItem={({ item }) => {
          const highlighted = highlightByVerse.has(item.number);
          const tafsirOpen = expandedTafsir.has(item.number);
          return (
            <View
              style={[
                styles.verseCard,
                {
                  backgroundColor: highlighted ? `${colors.highlight.amber}30` : colors.card,
                  borderRadius: radius.card,
                  marginBottom: spacing.md,
                  padding: spacing.lg,
                },
              ]}
            >
              <View style={[styles.verseBadge, { backgroundColor: colors.hairline, borderRadius: radius.pill }]}>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                  {item.number}
                </Text>
              </View>
              <View style={styles.verseActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/verse-share',
                      params: {
                        text: item.textEnglish,
                        attribution: `${surahMeta.nameEnglish} ${item.number} · Sahih International`,
                      },
                    })
                  }
                  hitSlop={8}
                  style={{ marginRight: spacing.sm }}
                >
                  <ShareIcon color={colors.straw} size={17} />
                </Pressable>
                <Pressable onPress={() => void handleToggleHighlight(item.number)} hitSlop={8}>
                  <BookmarkIcon color={colors.flameAmber} size={17} filled={highlighted} />
                </Pressable>
              </View>
              <TappableWords
                text={item.textArabic}
                cleanWord={cleanArabicWordForLookup}
                style={[typography.arabicVerse, { color: colors.ink, textAlign: 'right', marginTop: spacing.sm }]}
                onWordLongPress={(word, anchor) => setHeldWord({ word, lang: 'ar', verseNumber: item.number, anchor })}
              />
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.fawn, fontStyle: 'italic', fontSize: 14, marginTop: spacing.sm },
                ]}
              >
                {item.textTransliteration}
              </Text>
              <TappableWords
                text={item.textEnglish}
                cleanWord={cleanWordForLookup}
                style={[typography.readingBody, { color: colors.umber, marginTop: spacing.sm }]}
                onWordLongPress={(word, anchor) => setHeldWord({ word, lang: 'en', verseNumber: item.number, anchor })}
              />
              {item.textTafsir ? (
                <>
                  <Pressable
                    onPress={() => toggleTafsir(item.number)}
                    style={[styles.tafsirToggle, { marginTop: spacing.sm }]}
                    hitSlop={8}
                  >
                    <Text style={[typography.eyebrowLabel, { color: colors.progressLabel, fontSize: 10 }]}>
                      Tafsir/Interpretation
                    </Text>
                    <View style={{ transform: [{ rotate: tafsirOpen ? '90deg' : '0deg' }] }}>
                      <ChevronRightIcon color={colors.progressLabel} size={12} />
                    </View>
                  </Pressable>
                  {tafsirOpen ? (
                    <>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, marginTop: spacing.sm, lineHeight: 20 },
                        ]}
                      >
                        {item.textTafsir}
                      </Text>
                      <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: spacing.xs }]}>
                        — Tafsir al-Jalalayn
                      </Text>
                    </>
                  ) : null}
                </>
              ) : null}
            </View>
          );
        }}
      />

      <WordActionMenu
        word={heldWord?.word ?? null}
        anchor={heldWord?.anchor ?? null}
        saveLabel={heldWord && highlightByVerse.has(heldWord.verseNumber) ? 'Remove highlight' : 'Highlight verse'}
        onTranslate={() => {
          setActiveWord(heldWord);
          setHeldWord(null);
        }}
        onSaveQuote={() => {
          if (heldWord) void handleToggleHighlight(heldWord.verseNumber);
          setHeldWord(null);
        }}
        onClose={() => setHeldWord(null)}
      />

      <WordTranslationPopup
        word={activeWord?.word ?? null}
        anchor={activeWord?.anchor ?? null}
        sourceLang={activeWord?.lang ?? 'en'}
        sourceLangLabel={activeWord?.lang === 'ar' ? 'AR' : 'EN'}
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
  verseCard: {
    position: 'relative',
  },
  verseBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  verseActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  tafsirToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
});
