import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { ModeSwitch } from '@/components/ModeSwitch';
import { SpeakerIcon } from '@/components/icons';
import { loadCoursePackage } from '@/features/learn/content';
import { useTheme } from '@/theme/ThemeProvider';

export default function LearnGrammarScreen() {
  const { colors, typography, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [coursePkg] = useState(() => loadCoursePackage('ja', 'bn'));
  const grammarItems = (coursePkg?.items ?? []).filter((i) => i.kind === 'grammar');
  const strings = coursePkg?.strings;

  const handlePlayAudio = (text: string) => {
    void Haptics.selectionAsync().catch(() => {});
    Speech.stop();
    Speech.speak(text, { language: 'ja', rate: 0.85 });
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
            Grammar Reference
          </Text>
        </View>

        <View style={styles.titleSection}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>
            Grammar Points
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}>
            Pattern notes in Bangla with authentic examples
          </Text>
        </View>

        {/* Grammar List */}
        <View style={styles.grammarList}>
          {grammarItems.map((item) => {
            if (item.kind !== 'grammar') return null;
            const explanation = strings?.explanations[item.id];
            const examples = item.exampleIds
              .map((sId) => coursePkg?.sentences.find((s) => s.id === sId))
              .filter(Boolean);

            return (
              <View
                key={item.id}
                style={[styles.grammarCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[typography.titleUiContext, { color: colors.flameAmber, fontWeight: '700' }]}>
                    {item.pattern}
                  </Text>
                </View>

                {explanation && (
                  <Text style={[typography.readingBody, { color: colors.ink, marginTop: 8, lineHeight: 22 }]}>
                    {explanation}
                  </Text>
                )}

                {/* Examples */}
                {examples.length > 0 && (
                  <View style={styles.examplesList}>
                    <Text style={[typography.eyebrowLabel, { color: colors.umber, marginTop: 12 }]}>
                      EXAMPLES
                    </Text>
                    {examples.map((s) => {
                      if (!s) return null;
                      const japanese = s.tokens.map((t) => t.text).join(' ');
                      const promptBn = strings?.sentences?.[s.id];

                      return (
                        <View
                          key={s.id}
                          style={[styles.exampleRow, { borderLeftColor: colors.flameAmber }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>
                              {japanese}
                            </Text>
                            {promptBn && (
                              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>
                                {promptBn}
                              </Text>
                            )}
                          </View>
                          <Pressable
                            onPress={() => handlePlayAudio(s.tokens.map((t) => t.reading || t.text).join(''))}
                            hitSlop={8}
                            style={styles.speakerBtn}
                          >
                            <SpeakerIcon color={colors.flameAmber} size={18} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
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
  titleSection: {
    paddingHorizontal: 4,
  },
  grammarList: {
    gap: 16,
    marginTop: 8,
  },
  grammarCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examplesList: {
    gap: 10,
    marginTop: 4,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  speakerBtn: {
    padding: 6,
  },
});
