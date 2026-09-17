import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import type { SavedWord } from '@/db/repositories/savedWords';
import { sentenceContaining } from '@/features/reader/engine/words';
import { useTheme } from '@/theme/ThemeProvider';
import { useEffect, useState } from 'react';
import { getWordCluster, type WordCluster } from '@/db/repositories/wordCache';
import { getMotherTongue } from '@/features/settings/motherTongue';

type Props = {
  results: { word: SavedWord; correct: boolean }[];
  onDone: () => void;
  onRetakeWithRelatedWords: () => void;
};

export function ClozeResultScreen({ results, onDone, onRetakeWithRelatedWords }: Props) {
  const { colors, typography, spacing, radius } = useTheme();
  const missed = results.filter((r) => !r.correct).map((r) => r.word);
  const correctCount = results.filter((r) => r.correct).length;
  const allCorrect = missed.length === 0;

  return (
    <ScrollView
      contentContainerStyle={[s.container, { paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
    >
      {allCorrect ? (
        <View style={s.congratsBox}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 13, letterSpacing: 1.5 }]}>
            PERFECT SCORE
          </Text>
          <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center', marginTop: spacing.xs }]}>
            Mastered All Words
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.xs }]}>
            {correctCount} of {results.length} questions answered correctly
          </Text>
        </View>
      ) : (
        <View style={s.partialBox}>
          <Text style={[typography.translatedWordPopup, { color: colors.ink, textAlign: 'center' }]}>
            {correctCount} / {results.length} correct
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center', marginTop: spacing.xs }]}>
            Review the words you missed:
          </Text>
        </View>
      )}

      {missed.map((word) => (
        <MissedWordCard key={word.id} word={word} colors={colors} typography={typography} spacing={spacing} radius={radius} />
      ))}

      <View style={s.actionRow}>
        <View style={[s.retakeSection, { backgroundColor: colors.card, borderColor: colors.segmentedTrack, borderRadius: radius.card }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 2, textAlign: 'center' }]}>
            Take another quiz
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginBottom: 14, textAlign: 'center' }]}>
            Practice the same ideas through related words.
          </Text>

          <Pressable
            onPress={onRetakeWithRelatedWords}
            style={[s.retakeOptionBtn, { borderColor: colors.flameAmber, backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: radius.card }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14 }]}>
              Related words quiz
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 3 }]}>
              Use close synonyms and antonyms as the challenge options
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onDone}
          style={[
            s.doneBtn,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.segmentedTrack,
              borderRadius: radius.pill,
              marginTop: 10,
            },
          ]}
        >
          <Text style={[typography.buttonLabel, { color: colors.ink }]}>
            Done for now
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MissedWordCard({
  word,
  colors,
  typography,
  spacing,
  radius,
}: {
  word: SavedWord;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  radius: ReturnType<typeof useTheme>['radius'];
}) {
  const [cluster, setCluster] = useState<WordCluster | null>(null);

  useEffect(() => {
    const mt = getMotherTongue();
    void getWordCluster(word.id, mt).then(setCluster);
  }, [word.id]);

  const sentence = sentenceContaining(word.contextSentence, word.sourceWord);

  return (
    <View
      style={[
        s.missedCard,
        { backgroundColor: colors.card, borderColor: 'rgba(184,84,80,0.25)', borderRadius: radius.card },
      ]}
    >
      <View style={s.missedHeader}>
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}>{word.sourceWord}</Text>
        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 13 }]}>{word.translation}</Text>
      </View>
      {sentence ? (
        <Text
          numberOfLines={3}
          style={[typography.metadataCaption, { color: colors.textFaint, marginTop: spacing.xs, fontStyle: 'italic' }]}
        >
          &ldquo;{sentence}&rdquo;
        </Text>
      ) : null}

      {cluster?.usageNote ? (
        <View style={[s.noteBox, { backgroundColor: 'rgba(245,166,35,0.07)', borderColor: 'rgba(245,166,35,0.2)' }]}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9, marginBottom: 3 }]}>
            WHEN & WHY USED
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, lineHeight: 19 }]}>{cluster.usageNote}</Text>
        </View>
      ) : null}

      {cluster?.synonyms && cluster.synonyms.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.straw, fontSize: 9, marginBottom: 4 }]}>
            SYNONYMS (সমার্থক শব্দ)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cluster.synonyms.map((syn, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: 'rgba(39,174,96,0.1)',
                  borderColor: 'rgba(39,174,96,0.3)',
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: colors.ink }}>
                  <Text style={{ fontWeight: '600' }}>{syn.word}</Text>
                  {syn.meaning ? ` · ${syn.meaning}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {cluster?.antonyms && cluster.antonyms.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.straw, fontSize: 9, marginBottom: 4 }]}>
            ANTONYMS (বিপরীত শব্দ)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cluster.antonyms.map((ant, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: 'rgba(184,84,80,0.1)',
                  borderColor: 'rgba(184,84,80,0.3)',
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: colors.ink }}>
                  <Text style={{ fontWeight: '600' }}>{ant.word}</Text>
                  {ant.meaning ? ` · ${ant.meaning}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, alignItems: 'stretch' },
  congratsBox: { alignItems: 'center', paddingVertical: 32 },
  partialBox: { alignItems: 'center', paddingVertical: 20 },
  trophy: { fontSize: 56 },
  missedCard: { borderWidth: 1, padding: 14, marginBottom: 12 },
  missedHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  noteBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 10 },
  actionRow: { alignItems: 'stretch', gap: 10, marginTop: 24 },
  retakeSection: {
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  retakeOptionBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  doneBtn: { alignSelf: 'center', paddingHorizontal: 36, paddingVertical: 12 },
});

