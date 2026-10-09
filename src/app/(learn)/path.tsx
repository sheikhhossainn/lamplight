import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ModeSwitch } from '@/components/ModeSwitch';
import { CheckIcon, ChevronRightIcon, SparkleIcon } from '@/components/icons';
import { loadCoursePackage } from '@/features/learn/content';
import {
  getAllCourseProgress,
  getDueCourseItems,
  computeLessonStatus,
  type CourseProgressRecord,
} from '@/db/repositories/courseRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function LearnPathScreen() {
  const { colors, typography, layout, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [coursePkg] = useState(() => loadCoursePackage('ja', 'bn'));
  const [progressMap, setProgressMap] = useState<Map<string, CourseProgressRecord>>(new Map());
  const [dueCount, setDueCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void Promise.all([
        getAllCourseProgress('ja'),
        getDueCourseItems('ja'),
      ]).then(([progressList, dueItems]) => {
        if (mounted) {
          const map = new Map<string, CourseProgressRecord>();
          for (const p of progressList) {
            map.set(p.lessonId, p);
          }
          setProgressMap(map);
          setDueCount(dueItems.length);
        }
      }).catch(() => {});

      return () => {
        mounted = false;
      };
    }, []),
  );

  const manifest = coursePkg?.manifest;
  const allLessonsInOrder = (manifest?.units ?? []).flatMap((u) => u.lessons.map((l) => l.id));

  // Find current next lesson to continue
  let nextLesson: { lessonId: string; title: string; unitNumber: number } | null = null;
  for (const unit of manifest?.units ?? []) {
    for (const l of unit.lessons) {
      const status = computeLessonStatus(l.id, progressMap, allLessonsInOrder);
      if (status !== 'done') {
        nextLesson = { lessonId: l.id, title: l.title, unitNumber: unit.number };
        break;
      }
    }
    if (nextLesson) break;
  }

  const handleOpenLesson = (lessonId: string, status: string) => {
    if (status === 'locked') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    void Haptics.selectionAsync().catch(() => {});
    // When lesson runner is built in Phase C, navigate to runner
    router.push(`/learn/lesson/${lessonId}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.screenMargin,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Fixed Top Header Row */}
        <View style={styles.headerRow}>
          <ModeSwitch active="learn" />
          <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>
            日本語 ✦ বাংলা
          </Text>
        </View>

        {/* Path Progress Header */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
            LEARNING PATH
          </Text>
          <Text style={[typography.screenTitle, { color: colors.ink, marginTop: 4 }]}>
            Japanese from Zero
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
            Taught in Bangla · script to real books
          </Text>

          {/* Continue CTA */}
          {nextLesson && (
            <Pressable
              onPress={() => handleOpenLesson(nextLesson!.lessonId, 'open')}
              style={[styles.continueButton, { backgroundColor: colors.flameAmber }]}
            >
              <View style={styles.continueTextRow}>
                <SparkleIcon color={colors.primaryDark} size={15} />
                <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontWeight: '700' }]}>
                  Continue · Unit {nextLesson.unitNumber}
                </Text>
              </View>
              <Text style={[typography.metadataCaption, { color: colors.primaryDark, opacity: 0.8 }]}>
                {nextLesson.title}
              </Text>
            </Pressable>
          )}

          {/* Due Review Count banner if any */}
          {dueCount > 0 && (
            <Pressable
              onPress={() => router.push('/(learn)/practice' as any)}
              style={[styles.dueBanner, { borderColor: colors.hairline }]}
            >
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '600' }]}>
                Review · {dueCount} items due
              </Text>
              <ChevronRightIcon color={colors.flameAmber} size={14} />
            </Pressable>
          )}
        </View>

        {/* Units & Lessons Map */}
        <View style={styles.unitsList}>
          {manifest?.units.map((unit) => (
            <View key={unit.id} style={styles.unitSection}>
              <View style={styles.unitHeader}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
                  UNIT {unit.number}
                </Text>
                <Text style={[typography.titleUiContext, { color: colors.ink, marginTop: 2 }]}>
                  {unit.title}
                </Text>
                {unit.grammarTheme && (
                  <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                    {unit.grammarTheme}
                  </Text>
                )}
              </View>

              <View style={styles.lessonsContainer}>
                {unit.lessons.map((lesson, lIdx) => {
                  const status = computeLessonStatus(lesson.id, progressMap, allLessonsInOrder);
                  const isDone = status === 'done';
                  const isOpen = status === 'open';

                  return (
                    <Pressable
                      key={lesson.id}
                      onPress={() => handleOpenLesson(lesson.id, status)}
                      style={[
                        styles.lessonRow,
                        {
                          backgroundColor: colors.card,
                          borderColor: isOpen ? colors.flameAmber : colors.hairline,
                          opacity: status === 'locked' ? 0.6 : 1,
                        },
                      ]}
                    >
                      <View style={styles.lessonStatusCol}>
                        {isDone ? (
                          <View style={[styles.statusBadge, { backgroundColor: colors.flameAmber }]}>
                            <CheckIcon color={colors.primaryDark} size={12} />
                          </View>
                        ) : isOpen ? (
                          <View style={[styles.statusBadge, { borderColor: colors.flameAmber, borderWidth: 2 }]} />
                        ) : (
                          <View style={[styles.statusBadge, { borderColor: colors.hairline, borderWidth: 1 }]} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            typography.uiRowTitle,
                            {
                              color: isOpen ? colors.ink : colors.ink,
                              fontWeight: isOpen ? '700' : '500',
                            },
                          ]}
                        >
                          {lesson.title}
                        </Text>
                        <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                          Lesson {lIdx + 1} of {unit.lessons.length} · {lesson.type}
                        </Text>
                      </View>

                      <ChevronRightIcon color={colors.umber} size={16} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  continueButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  continueTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueBanner: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitsList: {
    gap: 24,
    marginTop: 8,
  },
  unitSection: {
    gap: 10,
  },
  unitHeader: {
    paddingHorizontal: 4,
  },
  lessonsContainer: {
    gap: 8,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  lessonStatusCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
