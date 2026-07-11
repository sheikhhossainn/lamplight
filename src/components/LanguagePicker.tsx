import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CloseIcon } from '@/components/icons';
import { TARGET_LANGUAGES, type TargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

type LanguagePickerProps = {
  visible: boolean;
  selected: TargetLanguage;
  onSelect: (code: TargetLanguage) => void;
  onClose: () => void;
};

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Circle cx={9} cy={9} r={5.5} stroke={color} strokeWidth={1.6} />
      <Path d="M13.5 13.5L17 17" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10.5l4 4 8-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Full-screen picker (not a bottom sheet). A sheet shrank and "settled" as the
// keyboard toggled or results emptied — jarring. Full screen keeps the search
// pinned at top and the results list simply flexes above the keyboard, so the
// empty-state message never slides out of view.
export function LanguagePicker({ visible, selected, onSelect, onClose }: LanguagePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  // Reset the search each time it opens so it never re-opens pre-filtered.
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TARGET_LANGUAGES;
    return TARGET_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.short.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.parchment, paddingTop: insets.top + 8 }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
          <Text style={[typography.screenTitle, { color: colors.ink }]}>Translate to</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <CloseIcon color={colors.ink} size={18} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: radius.pill,
              marginHorizontal: spacing.xl,
              marginTop: spacing.md,
            },
          ]}
        >
          <SearchIcon color={colors.fawn} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search languages"
            placeholderTextColor={colors.fawn}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            style={[typography.uiRowTitle, styles.searchInput, { color: colors.ink }]}
          />
        </View>

        {filtered.length === 0 ? (
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.fawn, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.xl },
            ]}
          >
            No languages match “{query.trim()}”.
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={{ flex: 1, marginTop: spacing.sm }}
            contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => {
              const active = item.code === selected;
              return (
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(item.code);
                  }}
                  style={[
                    styles.row,
                    active && { backgroundColor: colors.pairPillBackground, borderRadius: radius.card },
                  ]}
                >
                  <Text
                    style={[typography.uiRowTitle, { color: active ? colors.pairPillText : colors.ink, fontSize: 15 }]}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.rowRight}>
                    <Text
                      style={[typography.eyebrowLabel, { color: active ? colors.pairPillText : colors.fawn, fontSize: 11 }]}
                    >
                      {item.short}
                    </Text>
                    {active ? <CheckIcon color={colors.pairPillText} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
