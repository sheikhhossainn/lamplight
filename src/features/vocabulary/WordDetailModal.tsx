import { useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { SavedWord } from '@/db/repositories/savedWords';
import { speakWord } from '@/features/audio/pronunciationEngine';
import { getWordMasteryInfo, type WordMasteryInfo } from '@/features/vocabulary/mastery';
import { useTheme } from '@/theme/ThemeProvider';
import { getNativeUiTextStyle } from '@/theme/typography';
import { useMotherTongue } from '@/features/settings/motherTongue';

const { width: screenWidth } = Dimensions.get('window');

type WordDetailModalProps = {
  visible: boolean;
  word: SavedWord | null;
  bookTitle?: string;
  onClose: () => void;
  onReadInBook: (word: SavedWord) => void;
  onDeleteWord: (word: SavedWord) => void;
  onAddToDeck?: (word: SavedWord) => void;
};

export function WordDetailModal({
  visible,
  word,
  bookTitle,
  onClose,
  onReadInBook,
  onDeleteWord,
  onAddToDeck,
}: WordDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const motherTongue = useMotherTongue();
  const isLamp = scheme === 'lamp';

  const mastery: WordMasteryInfo | null = useMemo(() => {
    if (!word) return null;
    return getWordMasteryInfo(word);
  }, [word]);

  if (!word || !mastery) return null;

  const stageColor =
    mastery.primaryStage === 'mastered'
      ? colors.highlight.sage
      : mastery.primaryStage === 'reviewing'
      ? colors.flameAmber
      : mastery.primaryStage === 'learning'
      ? colors.highlight.amber
      : colors.fawn;

  const formattedDueDate =
    word.srsDueDate && word.srsDueDate > 0
      ? new Date(word.srsDueDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Not yet scheduled';

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
              maxHeight: '85%',
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          onPress={() => {}}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
                VOCABULARY MEMORY RECORD
              </Text>
              <View
                style={[
                  styles.langPill,
                  {
                    backgroundColor: colors.pairPillBackground,
                  },
                ]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 9 }]}>
                  {word.sourceLang.toUpperCase()} → {word.targetLang.toUpperCase()}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={colors.straw}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Word & Pronunciation */}
            <View style={{ marginTop: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.wordmark, { color: colors.ink, fontSize: 28, flex: 1 }]}>
                  {word.sourceWord}
                </Text>
                <Pressable
                  onPress={() => void speakWord(word.sourceWord, word.sourceLang)}
                  hitSlop={8}
                  style={[styles.speakerBtn, { borderColor: colors.hairline, backgroundColor: colors.parchment }]}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 5L6 9H2v6h4l5 4V5z"
                      stroke={colors.flameAmber}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                      stroke={colors.flameAmber}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>

              <Text
                style={[
                  getNativeUiTextStyle(motherTongue, 'row'),
                  { color: colors.flameAmber, fontSize: 18, marginTop: 4, fontWeight: '600' },
                ]}
              >
                {word.translation}
              </Text>

              {word.phonetic ? (
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13, marginTop: 2 }]}>
                  /{word.phonetic}/
                </Text>
              ) : null}
            </View>

            {/* Plain-Language Mastery Status Banner */}
            <View
              style={[
                styles.masteryBanner,
                {
                  backgroundColor: colors.parchment,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: stageColor }]} />
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                    {mastery.stageLabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.duePill,
                    {
                      backgroundColor: mastery.isDue ? 'rgba(245, 166, 35, 0.15)' : colors.card,
                      borderColor: mastery.isDue ? colors.flameAmber : colors.hairline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.eyebrowLabel,
                      {
                        color: mastery.isDue ? colors.flameAmber : colors.fawn,
                        fontSize: 9,
                      },
                    ]}
                  >
                    {mastery.dueLabel.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.umber, marginTop: 6, lineHeight: 17, fontSize: 12 },
                ]}
              >
                {mastery.stageDescription}
              </Text>
            </View>

            {/* SRS History Metrics Grid */}
            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.fawn, fontSize: 10, marginTop: spacing.md, marginBottom: 8 },
              ]}
            >
              SPACED REPETITION HISTORY
            </Text>

            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                  REPETITIONS
                </Text>
                <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                  {word.srsReps ?? 0}
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10 }]}>
                  reviews logged
                </Text>
              </View>

              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                  INTERVAL
                </Text>
                <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                  {word.srsIntervalDays ?? 0}d
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10 }]}>
                  memory span
                </Text>
              </View>

              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                  RECALL LAPSES
                </Text>
                <Text
                  style={[
                    typography.wordmark,
                    {
                      color: (word.srsLapses ?? 0) > 0 ? colors.highlight.clay : colors.ink,
                      fontSize: 18,
                      marginTop: 2,
                    },
                  ]}
                >
                  {word.srsLapses ?? 0}
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10 }]}>
                  {(word.srsLapses ?? 0) > 0 ? 'needs practice' : 'clean recall'}
                </Text>
              </View>

              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                  EASE FACTOR
                </Text>
                <Text style={[typography.wordmark, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>
                  {(word.srsEaseFactor ?? 2.5).toFixed(2)}x
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10 }]}>
                  decay rate
                </Text>
              </View>
            </View>

            {/* Next Scheduled Review */}
            <View
              style={[
                styles.dueFullRow,
                { backgroundColor: colors.parchment, borderColor: colors.hairline, marginTop: 8 },
              ]}
            >
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                Next Scheduled Review:
              </Text>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12 }]}>
                {formattedDueDate}
              </Text>
            </View>

            {/* Source Context Sentence */}
            {word.contextSentence ? (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.fawn, fontSize: 10, marginBottom: 8 },
                  ]}
                >
                  LITERARY CONTEXT
                </Text>
                <View
                  style={[
                    styles.contextBox,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                >
                  <Text
                    style={[
                      typography.metadataCaption,
                      {
                        color: isLamp ? '#D6CEBE' : '#474034',
                        fontStyle: 'italic',
                        fontSize: 13,
                        lineHeight: 20,
                      },
                    ]}
                  >
                    &ldquo;{word.contextSentence}&rdquo;
                  </Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.fawn, fontSize: 11, marginTop: 8 },
                    ]}
                  >
                    {bookTitle ?? 'Library Book'} · Chapter {(word.chapterIndex ?? 0) + 1}, Page{' '}
                    {(word.pageIndex ?? 0) + 1}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Pressable
              onPress={() => onDeleteWord(word)}
              hitSlop={8}
              style={[
                styles.deleteBtn,
                { borderColor: colors.hairline, backgroundColor: colors.parchment },
              ]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke={colors.highlight.clay}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>

            {onAddToDeck && (
              <Pressable
                onPress={() => onAddToDeck(word)}
                style={[
                  styles.deckBtn,
                  { borderColor: colors.hairline, backgroundColor: colors.parchment, borderRadius: radius.pill },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add to study deck"
              >
                <Text style={{ color: colors.flameAmber, fontSize: 13, marginRight: 4 }}>✦</Text>
                <Text style={[typography.buttonLabel, { color: colors.ink, fontSize: 12.5 }]}>
                  Deck
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => onReadInBook(word)}
              style={[
                styles.readBtn,
                { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                Read in Book →
              </Text>
            </Pressable>
          </View>
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
    paddingBottom: 10,
  },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  closeBtn: {
    padding: 4,
  },
  speakerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masteryBanner: {
    borderWidth: 1,
    padding: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  duePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  dueFullRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contextBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    marginTop: 6,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  readBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
