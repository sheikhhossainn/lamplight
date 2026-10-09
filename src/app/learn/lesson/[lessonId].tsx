import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { CheckIcon, SparkleIcon } from '@/components/icons';
import { loadCoursePackage } from '@/features/learn/content';
import {
  buildExerciseQueue,
  type ExerciseItem,
  type ExerciseOption,
} from '@/features/learn/exerciseEngine';
import { AudioButton } from '@/features/learn/components/AudioButton';
import { ChoiceList } from '@/features/learn/components/ChoiceList';
import { ExerciseShell } from '@/features/learn/components/ExerciseShell';
import { FeedbackSheet } from '@/features/learn/components/FeedbackSheet';
import { MatchPairs } from '@/features/learn/components/MatchPairs';
import {
  completeLesson,
  getCourseProgress,
  updateCourseItemSrs,
  updateExerciseIndex,
  upsertCourseItem,
} from '@/db/repositories/courseRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function LessonRunnerScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { colors, typography, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  const [coursePkg] = useState(() => loadCoursePackage('ja', 'bn'));
  const [queue, setQueue] = useState<ExerciseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<ExerciseOption | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Find lesson and unit from course manifest
  const { lesson, unit, nextLessonId } = useMemo(() => {
    if (!coursePkg || !lessonId) {
      return { lesson: null, unit: null, nextLessonId: null };
    }

    const units = coursePkg.manifest.units;
    let foundLesson = null;
    let foundUnit = null;
    let nextId = null;

    const allLessons = units.flatMap((u) => u.lessons);
    const lessonIdx = allLessons.findIndex((l) => l.id === lessonId);
    if (lessonIdx !== -1 && lessonIdx + 1 < allLessons.length) {
      nextId = allLessons[lessonIdx + 1].id;
    }

    for (const u of units) {
      const l = u.lessons.find((item) => item.id === lessonId);
      if (l) {
        foundLesson = l;
        foundUnit = u;
        break;
      }
    }

    return { lesson: foundLesson, unit: foundUnit, nextLessonId: nextId };
  }, [coursePkg, lessonId]);

  // Initial queue construction & resume point retrieval
  useEffect(() => {
    if (!lesson || !unit || !coursePkg) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const initialQueue = buildExerciseQueue({
      lesson,
      unit,
      allItems: coursePkg.items,
      allSentences: coursePkg.sentences,
      strings: coursePkg.strings,
    });

    void getCourseProgress('ja', lesson.id)
      .then((progress) => {
        if (!isMounted) return;

        setQueue(initialQueue);
        if (
          progress &&
          progress.exerciseIndex > 0 &&
          progress.exerciseIndex < initialQueue.length &&
          progress.status !== 'done'
        ) {
          setCurrentIndex(progress.exerciseIndex);
        } else {
          setCurrentIndex(0);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setQueue(initialQueue);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lesson, unit, coursePkg]);

  const currentExercise = queue[currentIndex];

  const handleSelectOption = (opt: ExerciseOption) => {
    setSelectedOption(opt);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption || !currentExercise) return;

    const correct = selectedOption.isCorrect;
    setIsCorrect(correct);
    setIsChecked(true);

    if (correct) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setMistakesCount((prev) => prev + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      // Kind repetition: re-insert current exercise at the end of the queue
      setQueue((prev) => [...prev, currentExercise]);
    }
  };

  const handleMatchPairsComplete = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsCorrect(true);
    setIsChecked(true);
  };

  const handleContinue = async () => {
    if (!lesson) return;

    const nextIdx = currentIndex + 1;
    setSelectedOption(null);
    setIsChecked(false);
    setIsCorrect(false);

    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
      void updateExerciseIndex('ja', lesson.id, nextIdx);
    } else {
      // Completed all exercises!
      const initialCount = Math.max(1, queue.length - mistakesCount);
      const accuracy = Math.max(0, Math.min(1, (initialCount - mistakesCount) / initialCount));

      await completeLesson('ja', lesson.id, accuracy);

      // Upsert SRS records for all learned items in lesson
      const now = Date.now();
      for (const itemId of lesson.itemIds) {
        await upsertCourseItem({
          lang: 'ja',
          itemId,
          srsStage: 1,
          srsIntervalDays: 1,
          srsEaseFactor: 2.5,
          srsDueDate: now + 24 * 60 * 60 * 1000, // Due in 24 hours
          srsReps: 1,
          srsLapses: 0,
        });
      }

      setIsCompleted(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const handleExit = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(learn)/path' as any);
    }
  };

  const handleGoToNextLesson = () => {
    if (nextLessonId) {
      router.replace(`/learn/lesson/${nextLessonId}` as any);
    } else {
      router.replace('/(learn)/path' as any);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.libraryBackground }]}>
        <ActivityIndicator size="large" color={colors.flameAmber} />
      </View>
    );
  }

  if (!lesson || !unit || queue.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.libraryBackground }]}>
        <Text style={[typography.screenTitle, { color: colors.ink }]}>
          পাঠটি পাওয়া যায়নি
        </Text>
        <Pressable
          onPress={handleExit}
          style={[styles.backButton, { backgroundColor: colors.flameAmber }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontWeight: '700' }]}>
            পাথ-এ ফিরে যান
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Completion Screen
  // ---------------------------------------------------------------------------
  if (isCompleted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
        <View style={styles.completionContent}>
          <View
            style={[
              styles.sparkleIconCircle,
              { backgroundColor: isLamp ? '#2D261A' : '#FEF8EE', borderColor: colors.flameAmber },
            ]}
          >
            <SparkleIcon size={36} color={colors.flameAmber} />
          </View>

          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, marginTop: 16 }]}>
            অভিনন্দন!
          </Text>
          <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 24, marginTop: 4 }]}>
            পাঠ সম্পন্ন হয়েছে
          </Text>
          <Text style={[typography.readingBody, { color: colors.umber, textAlign: 'center', marginTop: 8 }]}>
            {lesson.title} এর সমস্ত অনুশীলন শেষ হয়েছে। আপনার শব্দভাণ্ডারে নতুন বিষয় যোগ হয়েছে।
          </Text>

          {/* Stats Badge */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.statCol}>
              <Text style={[typography.screenTitle, { color: colors.flameAmber, fontSize: 22 }]}>
                {mistakesCount === 0 ? '১০০%' : `${Math.round(Math.max(0, 1 - mistakesCount / queue.length) * 100)}%`}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber }]}>নির্ভুলতা</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />
            <View style={styles.statCol}>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 22 }]}>
                {lesson.itemIds.length}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber }]}>নতুন বিষয়</Text>
            </View>
          </View>

          <View style={styles.completionActions}>
            {nextLessonId && (
              <Pressable
                onPress={handleGoToNextLesson}
                style={[styles.primaryActionBtn, { backgroundColor: colors.flameAmber }]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontWeight: '700' }]}>
                  পরের পাঠ শুরু করুন
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleExit}
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: isLamp ? colors.card : colors.parchment,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontWeight: '600' }]}>
                পাথ-এ ফিরুন
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Active Exercise Rendering
  // ---------------------------------------------------------------------------
  const correctOption = currentExercise.options?.find((o) => o.isCorrect);

  const renderExerciseContent = () => {
    switch (currentExercise.type) {
      case 'letter_read':
        return (
          <View style={styles.exerciseBody}>
            {/* Main Kana Display */}
            <View
              style={[
                styles.letterDisplayCard,
                { backgroundColor: colors.card, borderColor: colors.hairline },
              ]}
            >
              <Text style={[styles.japaneseChar, { color: colors.ink }]}>
                {currentExercise.prompt}
              </Text>
              {currentExercise.audioText && (
                <View style={styles.audioWrapper}>
                  <AudioButton
                    text={currentExercise.audioText}
                    autoPlay
                    size="normal"
                  />
                </View>
              )}
            </View>

            <Text style={[typography.metadataCaption, { color: colors.umber, marginBottom: 12 }]}>
              সঠিক উচ্চারণটি বেছে নিন:
            </Text>

            {currentExercise.options && (
              <ChoiceList
                options={currentExercise.options}
                selectedId={selectedOption?.id ?? null}
                onSelect={handleSelectOption}
                status={isChecked ? 'checked' : 'idle'}
              />
            )}
          </View>
        );

      case 'letter_listen':
        return (
          <View style={styles.exerciseBody}>
            {/* Audio Button Centerpiece */}
            <View
              style={[
                styles.listenCenterCard,
                { backgroundColor: colors.card, borderColor: colors.hairline },
              ]}
            >
              <AudioButton
                text={currentExercise.audioText || ''}
                autoPlay
                size="large"
              />
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 12 }]}>
                উচ্চারণ শুনে সঠিক অক্ষরটি চিহ্নিত করুন
              </Text>
            </View>

            {currentExercise.options && (
              <ChoiceList
                options={currentExercise.options}
                selectedId={selectedOption?.id ?? null}
                onSelect={handleSelectOption}
                status={isChecked ? 'checked' : 'idle'}
              />
            )}
          </View>
        );

      case 'match_pairs':
        return (
          <View style={styles.exerciseBody}>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginBottom: 8 }]}>
              জাপানি অক্ষরের সাথে বাংলা উচ্চারণ মিলিয়ে নিন:
            </Text>
            <MatchPairs
              pairs={currentExercise.pairs || []}
              onComplete={handleMatchPairsComplete}
            />
          </View>
        );

      case 'word_meaning':
        return (
          <View style={styles.exerciseBody}>
            <View
              style={[
                styles.letterDisplayCard,
                { backgroundColor: colors.card, borderColor: colors.hairline },
              ]}
            >
              <Text style={[styles.wordChar, { color: colors.ink }]}>
                {currentExercise.prompt}
              </Text>
              {currentExercise.subPrompt ? (
                <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                  {currentExercise.subPrompt}
                </Text>
              ) : null}
              {currentExercise.audioText && (
                <View style={styles.audioWrapper}>
                  <AudioButton
                    text={currentExercise.audioText}
                    autoPlay
                    size="normal"
                  />
                </View>
              )}
            </View>

            <Text style={[typography.metadataCaption, { color: colors.umber, marginBottom: 12 }]}>
              শব্দটির বাংলা অর্থ বেছে নিন:
            </Text>

            {currentExercise.options && (
              <ChoiceList
                options={currentExercise.options}
                selectedId={selectedOption?.id ?? null}
                onSelect={handleSelectOption}
                status={isChecked ? 'checked' : 'idle'}
              />
            )}
          </View>
        );

      default:
        return (
          <View style={styles.exerciseBody}>
            <Text style={[typography.readingBody, { color: colors.ink }]}>
              {currentExercise.prompt}
            </Text>
          </View>
        );
    }
  };

  const renderBottomArea = () => {
    if (isChecked) {
      return (
        <FeedbackSheet
          status={isCorrect ? 'correct' : 'wrong'}
          correctAnswer={correctOption?.text}
          explanation={currentExercise.explanation}
          onContinue={handleContinue}
        />
      );
    }

    if (currentExercise.type === 'match_pairs') {
      return null;
    }

    return (
      <View
        style={[
          styles.checkActionContainer,
          {
            backgroundColor: isLamp ? colors.libraryBackground : '#FFFFFF',
            borderTopColor: colors.hairline,
          },
        ]}
      >
        <Pressable
          onPress={handleCheckAnswer}
          disabled={!selectedOption}
          accessibilityRole="button"
          accessibilityLabel="যাচাই করুন (Check answer)"
          style={({ pressed }) => [
            styles.checkButton,
            {
              backgroundColor: selectedOption ? colors.flameAmber : colors.hairline,
              opacity: pressed && selectedOption ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              typography.uiRowTitle,
              {
                color: selectedOption ? colors.primaryDark : colors.umber,
                fontWeight: '700',
              },
            ]}
          >
            যাচাই করুন
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ExerciseShell
      currentIndex={currentIndex}
      totalExercises={queue.length}
      onExit={handleExit}
      promptTitle={`UNIT ${unit.number} · ${lesson.title.toUpperCase()}`}
      bottomArea={renderBottomArea()}
    >
      {renderExerciseContent()}
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exerciseBody: {
    flex: 1,
    paddingTop: 8,
  },
  letterDisplayCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  japaneseChar: {
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  wordChar: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  audioWrapper: {
    marginTop: 14,
  },
  listenCenterCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  checkActionContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  checkButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sparkleIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 28,
    width: '100%',
    maxWidth: 320,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  completionActions: {
    width: '100%',
    maxWidth: 320,
    marginTop: 36,
    gap: 12,
  },
  primaryActionBtn: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
