import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

import type { ClozeQuestion } from '@/db/repositories/wordCache';
import { getClozeCache, getWordCluster, setClozeCache } from '@/db/repositories/wordCache';
import type { SavedWord } from '@/db/repositories/savedWords';
import { generateClozeQuestion, generateFreshClozeQuestion } from '@/features/vocabulary/clozeEngine';
import { sentenceContaining } from '@/features/reader/engine/words';
import { getMotherTongue } from '@/features/settings/motherTongue';
import { useTheme } from '@/theme/ThemeProvider';

type QuizItem = {
  word: SavedWord;
  question: ClozeQuestion;
  isCustomCluster?: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Splits a cloze sentence on ___ into [before, after]
function splitCloze(sentence: string): [string, string] {
  const idx = sentence.indexOf('___');
  if (idx === -1) return [sentence, ''];
  return [sentence.slice(0, idx), sentence.slice(idx + 3)];
}

type SingleQuestionProps = {
  item: QuizItem;
  onResult: (correct: boolean) => void;
};

function SingleQuestion({ item, onResult }: SingleQuestionProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const { question, word, isCustomCluster } = item;

  const [before, after] = splitCloze(question.sentence);
  // Shuffle options once per question
  const [options] = useState(() => shuffle([question.answer, ...question.distractors]));

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isCorrect = answered && selected?.toLowerCase() === question.answer.toLowerCase();

  const handlePick = (opt: string) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    setTimeout(() => {
      onResult(opt.toLowerCase() === question.answer.toLowerCase());
    }, 900);
  };

  const blankBg = answered
    ? isCorrect
      ? 'rgba(39,174,96,0.18)'
      : 'rgba(184,84,80,0.18)'
    : 'rgba(245,166,35,0.12)';
  const blankBorder = answered
    ? isCorrect
      ? '#27AE60'
      : '#B85450'
    : colors.flameAmber;
  const blankText = answered && selected ? ` ${selected} ` : '  ___  ';

  return (
    <View style={s.questionWrap}>
      {isCustomCluster ? (
        <View style={s.modeBadge}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, letterSpacing: 0.8 }]}>
            SYNONYMS & ANTONYMS MODE
          </Text>
        </View>
      ) : null}

      {/* Sentence Card with inline blank */}
      <View
        style={[
          s.sentenceBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.segmentedTrack,
            borderRadius: radius.card,
          },
        ]}
      >
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.ink, lineHeight: 30, textAlign: 'center', fontSize: 16 },
          ]}
        >
          {before}
          <Text
            style={[
              s.blank,
              {
                backgroundColor: blankBg,
                borderColor: blankBorder,
                color: answered ? blankBorder : colors.flameAmber,
              },
            ]}
          >
            {blankText}
          </Text>
          {after}
        </Text>
      </View>

      {/* Meaning hint toggle (never leaks the English word) */}
      {!answered ? (
        <Pressable
          onPress={() => setShowHint((h) => !h)}
          hitSlop={10}
          style={s.hintToggle}
        >
          <Text style={[typography.eyebrowLabel, { color: showHint ? colors.flameAmber : colors.straw, fontSize: 11 }]}>
            {showHint ? `HINT: ${word.translation}` : 'Tap for meaning hint'}
          </Text>
        </Pressable>
      ) : null}

      {/* Feedback Banner */}
      {answered ? (
        <Text
          style={[
            typography.eyebrowLabel,
            {
              color: isCorrect ? '#27AE60' : '#B85450',
              marginTop: spacing.sm,
              marginBottom: spacing.xs,
              textAlign: 'center',
              fontSize: 13,
            },
          ]}
        >
          {isCorrect ? 'Correct!' : `Answer: "${question.answer}"`}
        </Text>
      ) : (
        <Text
          style={[
            typography.eyebrowLabel,
            { color: colors.fawn, fontSize: 11, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xs },
          ]}
        >
          Choose the word that fits the context:
        </Text>
      )}

      {/* Options Chips */}
      <View style={s.chipsRow}>
        {options.map((opt) => {
          const isPicked = answered && opt === selected;
          const isTheRightAnswer = answered && opt.toLowerCase() === question.answer.toLowerCase();
          const chipBorder = isPicked
            ? isCorrect
              ? '#27AE60'
              : '#B85450'
            : isTheRightAnswer
              ? '#27AE60'
              : colors.segmentedTrack;

          const chipBg = isPicked
            ? isCorrect
              ? 'rgba(39,174,96,0.18)'
              : 'rgba(184,84,80,0.18)'
            : isTheRightAnswer
              ? 'rgba(39,174,96,0.12)'
              : colors.card;

          const textColor = isPicked
            ? isCorrect
              ? '#27AE60'
              : '#B85450'
            : isTheRightAnswer
              ? '#27AE60'
              : colors.ink;

          return (
            <Pressable
              key={opt}
              onPress={() => handlePick(opt)}
              disabled={answered}
              style={[
                s.chip,
                {
                  backgroundColor: chipBg,
                  borderColor: chipBorder,
                  opacity: answered && !isPicked && !isTheRightAnswer ? 0.35 : 1,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: textColor, fontSize: 15 }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  words: SavedWord[];
  mode?: 'normal' | 'fresh' | 'synonyms';
  maxQuestions?: number;
  onDone: (results: { word: SavedWord; correct: boolean }[]) => void;
};

export function ClozeChallenge({ words, mode = 'normal', maxQuestions = 10, onDone }: Props) {
  const { colors, typography, spacing } = useTheme();

  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Preparing your challenge…');
  const [qIndex, setQIndex] = useState(0);
  const [results, setResults] = useState<{ word: SavedWord; correct: boolean }[]>([]);

  // Slide animation for question transitions
  const screenWidth = Dimensions.get('window').width;
  const slideX = useSharedValue(0);
  const slideAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }));
  const isTransitioning = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const eligible = words.slice(0, maxQuestions);
        const built: QuizItem[] = [];
        const mt = getMotherTongue();

        for (let i = 0; i < eligible.length; i++) {
          if (cancelled) return;
          const w = eligible[i];
          setLoadingStatus(`Preparing question ${i + 1} of ${eligible.length}…`);

          let q: ClozeQuestion | null = null;
          let isCustom = false;

          try {
            if (mode === 'fresh') {
              q = await getClozeCache('fresh_' + w.id);
              if (!q) {
                q = await generateFreshClozeQuestion(w.sourceWord, w.contextSentence);
                if (q) {
                  await setClozeCache('fresh_' + w.id, q);
                }
              }
              if (!q) {
                q = await getClozeCache(w.id);
              }
            } else if (mode === 'synonyms') {
              q = await getClozeCache(w.id);
              if (!q) {
                const sentence = sentenceContaining(w.contextSentence, w.sourceWord) || w.contextSentence;
                q = await generateClozeQuestion(w.sourceWord, sentence);
                if (q) await setClozeCache(w.id, q);
              }
              if (q) {
                const cluster = await getWordCluster(w.id, mt);
                if (cluster) {
                  const clusterOptions = [
                    ...cluster.synonyms.map((s) => s.word),
                    ...cluster.antonyms.map((a) => a.word),
                  ].filter((opt) => opt.toLowerCase() !== q!.answer.toLowerCase());

                  if (clusterOptions.length >= 2) {
                    isCustom = true;
                    const dists = clusterOptions.slice(0, 3);
                    for (const d of q.distractors) {
                      if (dists.length < 3 && !dists.includes(d)) dists.push(d);
                    }
                    q = {
                      ...q,
                      distractors: dists,
                    };
                  }
                }
              }
            } else {
              q = await getClozeCache(w.id);
              if (!q) {
                const sentence = sentenceContaining(w.contextSentence, w.sourceWord) || w.contextSentence;
                q = await generateClozeQuestion(w.sourceWord, sentence);
                if (q) {
                  await setClozeCache(w.id, q);
                }
              }
            }
          } catch (itemErr) {
            console.warn('[ClozeChallenge] Error preparing question item:', itemErr);
          }

          // Offline / Edge-failure fallback: generate clean local cloze from sentence
          if (!q && w.sourceWord) {
            const sentence = sentenceContaining(w.contextSentence, w.sourceWord) || w.contextSentence || `The meaning of ${w.sourceWord} was evident.`;
            const re = new RegExp(`\\b${w.sourceWord}\\b`, 'i');
            const fallbackSentence = re.test(sentence) ? sentence.replace(re, '___') : `The word ___ fits naturally in this passage.`;
            const defaultDistractors = ['apparent', 'obscure', 'subtle', 'profound'].filter(
              (d) => d.toLowerCase() !== w.sourceWord.toLowerCase(),
            );
            q = {
              sentence: fallbackSentence,
              answer: w.sourceWord,
              distractors: defaultDistractors.slice(0, 3),
            };
          }

          if (q) {
            built.push({ word: w, question: q, isCustomCluster: isCustom });
          }
        }

        if (!cancelled) {
          setItems(built);
        }
      } catch (err) {
        console.warn('[ClozeChallenge] Quiz preparation error:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [words, mode, maxQuestions]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.flameAmber} size="large" />
        <Text style={[typography.uiRowTitle, { color: colors.ink, marginTop: spacing.md }]}>
          Preparing Quiz
        </Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs }]}>
          {loadingStatus}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={s.center}>
        <Text style={[typography.metadataCaption, { color: colors.umber, textAlign: 'center', lineHeight: 22 }]}>
          Could not generate challenge questions at this moment.{'\n'}Please check your internet connection and try again.
        </Text>
        <Pressable
          onPress={() => onDone([])}
          style={[s.doneBtn, { backgroundColor: colors.flameAmber }]}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Back to Review</Text>
        </Pressable>
      </View>
    );
  }

  const currentItem = items[qIndex];

  const handleResult = (correct: boolean) => {
    if (!currentItem || isTransitioning.current) return;
    const updated = [...results, { word: currentItem.word, correct }];
    if (qIndex + 1 >= items.length) {
      onDone(updated);
      return;
    }
    // Slide current question out to the left, then bring next in from the right
    isTransitioning.current = true;
    slideX.value = withTiming(-screenWidth, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(setResults)(updated);
        runOnJS(setQIndex)((i: number) => i + 1);
        slideX.value = screenWidth;
        slideX.value = withTiming(0, { duration: 220 }, () => {
          runOnJS(() => { isTransitioning.current = false; })();
        });
      }
    });
  };

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <View style={s.modeBadge}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, letterSpacing: 0.8 }]}>
            {mode === 'synonyms'
              ? 'SYNONYMS & ANTONYMS'
              : mode === 'fresh'
                ? 'FRESH QUESTIONS'
                : 'FILL IN THE BLANK'}
          </Text>
        </View>
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 11 }]}>
          {qIndex + 1} of {items.length}
        </Text>
      </View>
      <Animated.View style={[{ flex: 1 }, slideAnimStyle]}>
        {currentItem ? (
          <SingleQuestion
            key={`${currentItem.word.id}-${mode}-${qIndex}`}
            item={currentItem}
            onResult={handleResult}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  questionWrap: { flex: 1 },
  modeBadge: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
  },
  sentenceBox: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  blank: {
    borderBottomWidth: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  hintToggle: {
    alignSelf: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 14,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  doneBtn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
});
