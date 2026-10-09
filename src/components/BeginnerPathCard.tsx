import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { countScriptChars, hasScriptCourse } from '@/features/learn/scripts';
import { getLearnedChars } from '@/features/learn/scriptProgress';
import { getLearnerLevel } from '@/features/settings/learnerLevel';
import { getTargetReadingLanguageOption, type TargetReadingLanguageCode } from '@/features/settings/targetReadingLanguage';
import { useTheme } from '@/theme/ThemeProvider';

// Home entry into the beginner course. Renders only for a language the learner
// said they are brand new to and that has a script course.
export function BeginnerPathCard({ language }: { language: TargetReadingLanguageCode }) {
  const { colors, typography, spacing, radius } = useTheme();
  const [state, setState] = useState<{ learned: number; total: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasScriptCourse(language)) {
        setState(null);
        return undefined;
      }
      void Promise.all([getLearnerLevel(language), getLearnedChars(language)]).then(([level, learned]) => {
        if (active) setState(level === 'zero' ? { learned: learned.size, total: countScriptChars(language) } : null);
      });
      return () => {
        active = false;
      };
    }, [language]),
  );

  if (!state) return null;
  const name = getTargetReadingLanguageOption(language).name;

  return (
    <Pressable
      onPress={() => router.push(`/learn/${language}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Continue learning the ${name} writing system`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.card,
          borderColor: colors.flameAmber,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
          padding: spacing.lg,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 11 }]}>YOUR PATH · STAGE 1</Text>
        <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 18, lineHeight: 24, marginTop: 4 }]}>
          Learn the {name} writing system
        </Text>
        <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}>
          {state.learned} of {state.total} letters learned
        </Text>
        <View style={[styles.track, { backgroundColor: colors.hairline }]}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              width: `${state.total ? (state.learned / state.total) * 100 : 0}%`,
              backgroundColor: colors.flameAmber,
            }}
          />
        </View>
      </View>
      <ChevronRightIcon color={colors.flameAmber} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  track: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
});
