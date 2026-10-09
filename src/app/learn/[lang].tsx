import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, ChevronLeftIcon } from '@/components/icons';
import { speakWord } from '@/features/audio/pronunciationEngine';
import { getScriptSets, type ScriptChar } from '@/features/learn/scripts';
import { getLearnedChars, setLearnedChars } from '@/features/learn/scriptProgress';
import { getTargetReadingLanguageOption, type TargetReadingLanguageCode } from '@/features/settings/targetReadingLanguage';
import { useTheme } from '@/theme/ThemeProvider';

export default function ScriptCourseScreen() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const sets = useMemo(() => getScriptSets(String(lang)), [lang]);
  const languageName = getTargetReadingLanguageOption(lang as TargetReadingLanguageCode).name;

  const [setIndex, setSetIndex] = useState(0);
  const [selected, setSelected] = useState<ScriptChar | null>(null);
  const [learned, setLearned] = useState<Set<string>>(new Set());

  useEffect(() => {
    void getLearnedChars(String(lang)).then(setLearned);
  }, [lang]);

  const activeSet = sets[setIndex];
  const allChars = useMemo(() => activeSet?.groups.flatMap((g) => g.items) ?? [], [activeSet]);
  const learnedInSet = allChars.filter((c) => learned.has(c.char)).length;

  const play = useCallback(
    (c: ScriptChar) => {
      void speakWord(c.say, String(lang), 'slow');
    },
    [lang],
  );

  const handleSelect = useCallback(
    (c: ScriptChar) => {
      setSelected(c);
      play(c);
    },
    [play],
  );

  const toggleLearned = useCallback(
    (c: ScriptChar) => {
      setLearned((prev) => {
        const next = new Set(prev);
        if (next.has(c.char)) next.delete(c.char);
        else next.add(c.char);
        void setLearnedChars(String(lang), next);
        return next;
      });
    },
    [lang],
  );

  if (!activeSet) {
    return (
      <View style={[styles.root, { backgroundColor: colors.libraryBackground, paddingTop: insets.top + 16, paddingHorizontal: spacing.lg }]}>
        <Text style={[typography.uiRowTitle, { color: colors.ink }]}>No script course for this language yet.</Text>
      </View>
    );
  }

  const isSelectedLearned = selected ? learned.has(selected.char) : false;

  return (
    <View style={[styles.root, { backgroundColor: colors.libraryBackground }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: spacing.lg }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <ChevronLeftIcon color={colors.ink} size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>STAGE 1 · WRITING SYSTEM</Text>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>{languageName}</Text>
        </View>
      </View>

      {sets.length > 1 ? (
        <View style={[styles.tabs, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill, marginHorizontal: spacing.lg }]}>
          {sets.map((s, i) => {
            const active = i === setIndex;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSetIndex(i);
                  setSelected(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.tab, { borderRadius: radius.pill, backgroundColor: active ? colors.flameAmber : 'transparent' }]}
              >
                <Text style={[typography.uiRowTitle, { color: active ? colors.primaryDark : colors.umber, fontSize: 13 }]}>
                  {s.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={[typography.metadataCaption, { color: colors.fawn, marginHorizontal: spacing.lg, marginTop: 10 }]}>
        {learnedInSet} of {allChars.length} learned · tap a letter to hear it
      </Text>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {activeSet.groups.map((group) => (
          <View key={group.label} style={{ marginBottom: spacing.md }}>
            <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 8 }]}>{group.label.toUpperCase()}</Text>
            <View style={styles.grid}>
              {group.items.map((c) => {
                const isLearned = learned.has(c.char);
                const isActive = selected?.char === c.char;
                return (
                  <Pressable
                    key={c.char}
                    onPress={() => handleSelect(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.char}, ${c.roman}`}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: colors.card,
                        borderRadius: radius.card,
                        borderColor: isActive ? colors.flameAmber : colors.hairline,
                        borderWidth: isActive ? 1.5 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.ink, fontSize: 28 }}>{c.char}</Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                      {c.roman}
                    </Text>
                    {isLearned ? <View style={[styles.dot, { backgroundColor: colors.flameAmber }]} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {selected ? (
        <View
          style={[
            styles.detail,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.hairline,
              paddingBottom: insets.bottom + 14,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <Text style={{ color: colors.ink, fontSize: 56, minWidth: 72, textAlign: 'center' }}>{selected.char}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 20 }]}>{selected.roman}</Text>
            <Pressable
              onPress={() => play(selected)}
              accessibilityRole="button"
              accessibilityLabel="Hear pronunciation"
              hitSlop={8}
              style={{ marginTop: 6 }}
            >
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>▶ Hear it again</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => toggleLearned(selected)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelectedLearned }}
            style={[
              styles.learnBtn,
              {
                borderRadius: radius.pill,
                backgroundColor: isSelectedLearned ? colors.flameAmber : 'transparent',
                borderColor: colors.flameAmber,
              },
            ]}
          >
            {isSelectedLearned ? <CheckIcon color={colors.primaryDark} size={12} /> : null}
            <Text style={[typography.uiRowTitle, { color: isSelectedLearned ? colors.primaryDark : colors.flameAmber, fontSize: 13 }]}>
              {isSelectedLearned ? 'Learned' : 'I know this'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
  back: { marginRight: 12 },
  tabs: { flexDirection: 'row', padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '18%', minWidth: 58, flexGrow: 1, alignItems: 'center', paddingVertical: 10 },
  dot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  detail: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
  },
  learnBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5 },
});
