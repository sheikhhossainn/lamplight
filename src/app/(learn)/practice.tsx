import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ModeSwitch } from '@/components/ModeSwitch';
import { ChevronRightIcon, JapaneseThemeIcon, ReloadIcon, SparkleIcon } from '@/components/icons';
import { getDueCourseItems, type CourseItemRecord } from '@/db/repositories/courseRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function LearnPracticeScreen() {
  const { colors, typography, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [dueItems, setDueItems] = useState<CourseItemRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    void getDueCourseItems('ja').then((items) => {
      if (mounted) {
        setDueItems(items);
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenScriptChart = () => {
    void Haptics.selectionAsync().catch(() => {});
    router.push('/learn/ja' as any);
  };

  const handleStartReview = () => {
    void Haptics.selectionAsync().catch(() => {});
    // When review session runner is built in Phase F
    router.push('/learn/lesson/ja-u1-l1' as any);
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
        {/* Header Row */}
        <View style={styles.headerRow}>
          <ModeSwitch active="learn" />
          <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>
            Practice & Review
          </Text>
        </View>

        <View style={styles.titleSection}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>
            Daily Practice
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}>
            Strengthen your memory with spaced repetition
          </Text>
        </View>

        {/* SRS Review Queue Card */}
        <View style={[styles.practiceCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.flameAmber }]}>
              <ReloadIcon color={colors.primaryDark} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Spaced Repetition Review
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                {dueItems.length > 0
                  ? `${dueItems.length} items ready for review`
                  : 'All caught up! No due items today.'}
              </Text>
            </View>
          </View>

          {dueItems.length > 0 ? (
            <Pressable
              onPress={handleStartReview}
              style={[styles.actionButton, { backgroundColor: colors.flameAmber }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontWeight: '700' }]}>
                Start Review Session
              </Text>
              <SparkleIcon color={colors.primaryDark} size={15} />
            </Pressable>
          ) : null}
        </View>

        {/* Letter Chart Entry */}
        <Pressable
          onPress={handleOpenScriptChart}
          style={[styles.practiceCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.fawn }]}>
              <JapaneseThemeIcon color={colors.primaryDark} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Kana Letter Chart
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                Hiragana and Katakana character reference with audio
              </Text>
            </View>
            <ChevronRightIcon color={colors.umber} size={18} />
          </View>
        </Pressable>
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
  titleSection: {
    paddingHorizontal: 4,
  },
  practiceCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
});
