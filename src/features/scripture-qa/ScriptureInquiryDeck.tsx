import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, ChevronLeftIcon } from '@/components/icons';
import { createBibleHighlight } from '@/db/repositories/bible';
import { createQuranHighlight } from '@/db/repositories/quran';
import { useTheme } from '@/theme/ThemeProvider';

import {
  type ScriptureQAVerse,
  type TraditionGroup,
} from './curatedScriptureQA';
import {
  queryScriptureInquiry,
  type ScriptureInquiryResult,
} from './scriptureInquiryApi';
import { SACRED_TRADITION_EMBLEMS, IslamEmblem } from './TraditionEmblems';

type ScriptureInquiryDeckProps = {
  questionQuery: string;
  initialTradition?: string;
};

export function ScriptureInquiryDeck({ questionQuery, initialTradition }: ScriptureInquiryDeckProps) {
  const { colors, typography, radius, scheme } = useTheme();
  const isDark = scheme === 'lamp';
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScriptureInquiryResult | null>(null);
  const [selectedTraditionIndex, setSelectedTraditionIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadingStep(0);

    const timer1 = setTimeout(() => {
      if (mounted) setLoadingStep(1);
    }, 450);

    const timer2 = setTimeout(() => {
      if (mounted) setLoadingStep(2);
    }, 1200);

    queryScriptureInquiry(questionQuery)
      .then((res) => {
        if (mounted) {
          setData(res);
          const preferredTradition = initialTradition || res.initialTradition;
          if (preferredTradition) {
            const idx = res.traditions.findIndex(
              (t) =>
                t.tradition === preferredTradition ||
                (preferredTradition === 'torah' &&
                  (t.tradition === 'torah' || t.tradition === 'bible-ot')),
            );
            setSelectedTraditionIndex(idx !== -1 ? idx : 0);
          } else {
            setSelectedTraditionIndex(0);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [questionQuery]);

  // Deep linking directly into scripture readers with auto-scroll & highlight illumination
  const handleReadChapter = (verse: ScriptureQAVerse) => {
    if (verse.tradition === 'quran') {
      router.push({
        pathname: `/quran/${verse.chapter}` as any,
        params: { jumpVerse: String(verse.verseNumber) },
      });
    } else if (verse.tradition === 'vedas') {
      if (verse.bookId) {
        router.push({
          pathname: `/vedas/${verse.bookId}` as any,
          params: { jumpChapter: String(verse.chapter), jumpVerse: String(verse.verseNumber) },
        });
      }
    } else if (verse.tradition === 'bible-nt') {
      if (verse.bookId) {
        router.push({
          pathname: `/bible-nt/${verse.bookId}` as any,
          params: { jumpChapter: String(verse.chapter), jumpVerse: String(verse.verseNumber) },
        });
      }
    } else {
      // 'bible-ot' or 'torah'
      if (verse.bookId) {
        router.push({
          pathname: `/bible/${verse.bookId}` as any,
          params: { jumpChapter: String(verse.chapter), jumpVerse: String(verse.verseNumber) },
        });
      }
    }
  };

  const handleToggleBookmark = async (verse: ScriptureQAVerse) => {
    const isSaved = savedIds.has(verse.id);
    if (isSaved) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(verse.id);
        return next;
      });
      return;
    }

    setSavedIds((prev) => new Set([...prev, verse.id]));
    try {
      if (verse.tradition === 'quran') {
        await createQuranHighlight({
          surahNumber: verse.chapter,
          verseNumber: verse.verseNumber,
          colorKey: 'amber',
        });
      } else if (verse.bookId) {
        await createBibleHighlight({
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verseNumber,
          colorKey: 'amber',
        });
      }
    } catch {
      // Tolerate if already saved
    }
  };

  const currentGroup: TraditionGroup | undefined = data?.traditions[selectedTraditionIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment, paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeftIcon color={colors.ink} size={22} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, letterSpacing: 1.5 }]}>
            SCRIPTURE INQUIRY
          </Text>
          <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 19, marginTop: 1 }]}>
            Comparative Deck
          </Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.flameAmber} />
          <Text
            style={[
              typography.screenTitle,
              { color: colors.ink, marginTop: 18, fontSize: 17, textAlign: 'center' },
            ]}
          >
            {loadingStep === 0
              ? 'Checking on-device cache...'
              : loadingStep === 1
              ? 'Synthesizing scriptural citations...'
              : 'Hydrating verified texts & commentaries...'}
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.fawn, marginTop: 8, fontSize: 12.5, textAlign: 'center' },
            ]}
          >
            Quran • New Testament • Torah • Rigveda
          </Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Title Header */}
          <View style={styles.questionHeader}>
            {data.isFromCache ? (
              <View
                style={[
                  styles.provenanceBadge,
                  {
                    backgroundColor: isDark ? '#1C3322' : '#E6F4EA',
                    borderColor: isDark ? '#2E5A39' : '#C2E5CA',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: isDark ? '#A3D9A8' : '#1B5E20', fontSize: 10 },
                  ]}
                >
                  SAVED OFFLINE • PRIMARY SCRIPTURES
                </Text>
              </View>
            ) : data.isCurated ? (
              <View
                style={[
                  styles.provenanceBadge,
                  {
                    backgroundColor: isDark ? '#332918' : '#FDF7E7',
                    borderColor: isDark ? '#554224' : '#EADBB6',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: isDark ? colors.flameAmber : '#8A5A16', fontSize: 10 },
                  ]}
                >
                  CURATED COMPARATIVE STUDY • 4 TRADITIONS
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.provenanceBadge,
                  {
                    backgroundColor: isDark ? colors.ember : '#F4ECE0',
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.flameAmber, fontSize: 10 },
                  ]}
                >
                  SCHOLARLY INQUIRY • VERIFIED TEXTS
                </Text>
              </View>
            )}

            <Text style={[typography.screenTitle, styles.questionTitleText, { color: colors.ink }]}>
              {data.question}
            </Text>

            {data.criticalControversy ? (
              <View
                style={[
                  styles.criticalControversyBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                {/* Context Status Badge */}
                <View style={styles.statusBadgeRow}>
                  <View
                    style={[
                      styles.statusBadgePill,
                      {
                        backgroundColor: isDark ? '#332918' : '#F9F1DC',
                        borderColor: isDark ? '#554224' : '#DFCFA6',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: isDark ? colors.flameAmber : '#8A5A16', fontSize: 10.5 },
                      ]}
                    >
                      {data.criticalControversy.contextStatusLabel}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.umber, fontSize: 13, lineHeight: 19, marginBottom: 12 },
                  ]}
                >
                  {data.criticalControversy.contextStatusDescription}
                </Text>

                {/* Key Original Term Box if present */}
                {data.criticalControversy.keyOriginalTerm && (
                  <View
                    style={[
                      styles.keyTermCard,
                      {
                        backgroundColor: isDark ? colors.ember : '#F8F3E9',
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <View style={styles.keyTermHeader}>
                      <Text
                        style={[
                          typography.arabicVerse,
                          { fontSize: 22, color: colors.ink, textAlign: 'left' },
                        ]}
                      >
                        {data.criticalControversy.keyOriginalTerm.term}
                      </Text>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.flameAmber, fontWeight: '700', fontSize: 12.5 },
                        ]}
                      >
                        {data.criticalControversy.keyOriginalTerm.transliteration}
                      </Text>
                    </View>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.umber, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
                      ]}
                    >
                      Literal: “{data.criticalControversy.keyOriginalTerm.literalMeaning}”
                    </Text>
                    {data.criticalControversy.keyOriginalTerm.linguisticDebate ? (
                      <Text
                        style={[
                          typography.metadataCaption,
                          {
                            color: colors.fawn,
                            fontSize: 11.5,
                            lineHeight: 16.5,
                            marginTop: 4,
                            fontStyle: 'italic',
                          },
                        ]}
                      >
                        {data.criticalControversy.keyOriginalTerm.linguisticDebate}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Critic Position vs Scholarly Position */}
                <View style={styles.dialecticWrap}>
                  <View
                    style={[
                      styles.dialecticBlock,
                      {
                        backgroundColor: isDark ? '#3D2525' : '#FDF4F3',
                        borderColor: isDark ? '#5C3434' : '#F4D4D1',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: isDark ? '#E59898' : '#A8322D', fontSize: 10, letterSpacing: 0.8 },
                      ]}
                    >
                      CRITICAL DILEMMA & SKEPTICAL READING
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: isDark ? '#F0CECE' : '#5C2220', fontSize: 12.5, lineHeight: 18.5, marginTop: 5 },
                      ]}
                    >
                      {data.criticalControversy.coreControversy.criticPosition}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.dialecticBlock,
                      {
                        backgroundColor: isDark ? '#233626' : '#F3F8F4',
                        borderColor: isDark ? '#36533A' : '#D5E6D8',
                        marginTop: 10,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: isDark ? '#A3D9A8' : '#2E6E38', fontSize: 10, letterSpacing: 0.8 },
                      ]}
                    >
                      CLASSICAL HISTORICAL DEFENSE
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: isDark ? '#CFECCF' : '#1B4722', fontSize: 12.5, lineHeight: 18.5, marginTop: 5 },
                      ]}
                    >
                      {data.criticalControversy.coreControversy.theologicalDefense}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.neutralBanner,
                  { backgroundColor: colors.card, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 13, lineHeight: 19 }]}>
                  {data.topicBackground}
                </Text>
              </View>
            )}
          </View>

          {/* Section Header: Choose a Tradition */}
          <View style={styles.sectionHeadingRow}>
            <Text style={[typography.eyebrowLabel, { color: colors.fawn, letterSpacing: 1.2 }]}>
              SELECT SCRIPTURAL TRADITION
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11.5 }]}>
              {data.traditions.length} traditions
            </Text>
          </View>

          {/* Tradition Switcher Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.traditionCardsRow}
          >
            {data.traditions.map((group, idx) => {
              const isSelected = selectedTraditionIndex === idx;
              const EmblemComponent = SACRED_TRADITION_EMBLEMS[group.tradition] ?? IslamEmblem;

              return (
                <Pressable
                  key={group.tradition}
                  onPress={() => setSelectedTraditionIndex(idx)}
                  style={({ pressed }) => [
                    styles.religionCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.ember
                          : colors.primaryDark
                        : colors.card,
                      borderColor: isSelected ? colors.flameAmber : colors.hairline,
                      borderWidth: isSelected ? 1.5 : 1,
                      opacity: pressed ? 0.9 : 1,
                      borderRadius: radius.card,
                    },
                  ]}
                >
                  <View style={styles.religionCardTop}>
                    <EmblemComponent
                      color={isSelected ? colors.flameAmber : colors.fawn}
                      size={26}
                    />
                    <View
                      style={[
                        styles.verseCountBadge,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#332918'
                              : '#332F2B'
                            : isDark
                            ? colors.ember
                            : '#FDF7E7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.eyebrowLabel,
                          {
                            color: colors.flameAmber,
                            fontSize: 9.5,
                          },
                        ]}
                      >
                        {group.verses.length} VERSES
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      typography.uiRowTitle,
                      styles.religionCardTitle,
                      {
                        color: isSelected
                          ? isDark
                            ? colors.lampText
                            : '#F5EDE1'
                          : colors.ink,
                      },
                    ]}
                  >
                    {group.traditionName}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      typography.metadataCaption,
                      styles.religionCardSubtitle,
                      {
                        color: isSelected
                          ? isDark
                            ? colors.fawn
                            : '#B7ADA0'
                          : colors.fawn,
                      },
                    ]}
                  >
                    {group.subtitle}
                  </Text>

                  <View
                    style={[
                      styles.selectedIndicatorBar,
                      { backgroundColor: isSelected ? colors.flameAmber : 'transparent' },
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Verses List for the Currently Selected Religion */}
          {currentGroup ? (
            <View style={styles.traditionVersesSection}>
              <View style={styles.traditionHeaderRow}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, letterSpacing: 1.5 }]}>
                  PRIMARY SCRIPTURAL TEXTS
                </Text>
                <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                  {currentGroup.traditionName} ({currentGroup.verses.length} relevant verses)
                </Text>
              </View>

              {/* List of Individual Verse Cards */}
              <View style={styles.versesList}>
                {currentGroup.verses.map((verse) => {
                  const isSaved = savedIds.has(verse.id);

                  return (
                    <View
                      key={verse.id}
                      style={[
                        styles.detailedVerseCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.hairline,
                          borderRadius: radius.card,
                        },
                      ]}
                    >
                      {/* Verse Header / Citation */}
                      <View style={styles.verseHeaderRow}>
                        <View
                          style={[
                            styles.citationPill,
                            {
                              backgroundColor: isDark ? '#332918' : '#FDF7E7',
                              borderColor: isDark ? '#554224' : '#EADBB6',
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[
                              typography.eyebrowLabel,
                              {
                                color: isDark ? colors.flameAmber : '#8A5A16',
                                fontSize: 11,
                              },
                            ]}
                          >
                            {verse.book} {verse.chapter}:{verse.verseNumber}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleToggleBookmark(verse)}
                          hitSlop={8}
                          style={styles.bookmarkSmallBtn}
                        >
                          <BookmarkIcon
                            color={isSaved ? colors.flameAmber : colors.fawn}
                            filled={isSaved}
                            size={18}
                          />
                        </Pressable>
                      </View>

                      {/* Original Sacred Script (Amiri Arabic for Quran) */}
                      {verse.originalText ? (
                        <View
                          style={[
                            styles.originalScriptBox,
                            {
                              backgroundColor: isDark ? colors.ember : '#F7F1E6',
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography.arabicVerse,
                              styles.originalScriptText,
                              { color: colors.ink },
                            ]}
                          >
                            {verse.originalText}
                          </Text>
                        </View>
                      ) : null}

                      {/* English Translation — STRICTLY adheres to reading body floor */}
                      <View style={styles.translationBox}>
                        <Text style={[styles.quoteMark, { color: colors.flameAmber }]}>“</Text>
                        <Text
                          style={[
                            typography.readingBody,
                            styles.translationText,
                            { color: colors.ink },
                          ]}
                        >
                          {verse.translation}
                        </Text>
                      </View>

                      {/* Historical Context & Occasion */}
                      <View
                        style={[
                          styles.contextInfoBox,
                          {
                            backgroundColor: isDark ? colors.ember : '#FAF6EF',
                            borderColor: colors.hairline,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            { color: colors.flameAmber, fontSize: 10, marginBottom: 4 },
                          ]}
                        >
                          HISTORICAL CONTEXT & OCCASION
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.ink, fontSize: 13, lineHeight: 19.5 },
                          ]}
                        >
                          {verse.historicalContext}
                        </Text>
                      </View>

                      {/* Classical Interpretation (Tafsir / Commentary) */}
                      {verse.classicalCommentary ? (
                        <View
                          style={[
                            styles.commentaryInfoBox,
                            {
                              backgroundColor: isDark ? colors.ember : '#F4ECE1',
                              borderColor: colors.hairline,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography.eyebrowLabel,
                              { color: colors.flameAmber, fontSize: 10, marginBottom: 4 },
                            ]}
                          >
                            CLASSICAL EXEGESIS (TAFSIR / COMMENTARY)
                          </Text>
                          <Text
                            style={[
                              typography.metadataCaption,
                              { color: colors.ink, fontSize: 13, lineHeight: 19.5 },
                            ]}
                          >
                            {verse.classicalCommentary}
                          </Text>
                        </View>
                      ) : null}

                      {/* Deep Link Action Button */}
                      <View style={[styles.verseActionRow, { borderTopColor: colors.hairline }]}>
                        <Pressable
                          onPress={() => handleReadChapter(verse)}
                          style={({ pressed }) => [
                            styles.jumpToReaderBtn,
                            {
                              backgroundColor: isDark ? '#332918' : '#FDF7E7',
                              borderColor: isDark ? '#554224' : '#EADBBF',
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography.uiRowTitle,
                              {
                                color: isDark ? colors.flameAmber : '#8A5A16',
                                fontSize: 12.5,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            Read in scripture context ➔
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  topTitleWrap: {
    alignItems: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  questionHeader: {
    marginBottom: 20,
  },
  provenanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  questionTitleText: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 12,
  },
  neutralBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  traditionCardsRow: {
    gap: 12,
    paddingBottom: 6,
  },
  religionCard: {
    width: 175,
    padding: 14,
    position: 'relative',
  },
  religionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  verseCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  religionCardTitle: {
    fontSize: 15,
    marginBottom: 3,
  },
  religionCardSubtitle: {
    fontSize: 11.5,
    marginBottom: 8,
  },
  selectedIndicatorBar: {
    height: 2.5,
    borderRadius: 1.25,
    marginTop: 2,
  },

  // Verses Section
  traditionVersesSection: {
    marginTop: 24,
  },
  traditionHeaderRow: {
    marginBottom: 16,
  },
  versesList: {
    gap: 16,
  },
  detailedVerseCard: {
    borderWidth: 1,
    padding: 18,
  },
  verseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  citationPill: {
    flexShrink: 1,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  bookmarkSmallBtn: {
    padding: 4,
    flexShrink: 0,
  },
  originalScriptBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  originalScriptText: {
    fontSize: 21,
    lineHeight: 38,
    textAlign: 'right',
  },
  translationBox: {
    marginBottom: 14,
  },
  quoteMark: {
    fontSize: 24,
    lineHeight: 24,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  translationText: {
    // readingBody provides fontSize: 17 and lineHeight: 31 — never overridden
  },
  contextInfoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  commentaryInfoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  verseActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  jumpToReaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  criticalControversyBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  keyTermCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  keyTermHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialecticWrap: {
    marginTop: 4,
  },
  dialecticBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
});
