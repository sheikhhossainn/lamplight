import { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { TARGET_LANGUAGES, type TargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

const SCREEN_H = Dimensions.get('window').height;
// Bounded height so the list scrolls within the sheet (a FlatList needs a
// definite height to scroll — a maxHeight-only parent won't give it one).
const LIST_MAX_HEIGHT = SCREEN_H * 0.58;
// Rough height of the sheet chrome above the list (grabber + title + search +
// paddings) — used to keep the list fitting above the keyboard.
const SHEET_CHROME_H = 150;

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

export function LanguagePicker({ visible, selected, onSelect, onClose }: LanguagePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Reset the search each time it opens so it never re-opens pre-filtered.
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  // Track the keyboard so the sheet lifts above it and the list shrinks to stay
  // visible — otherwise the keyboard covers the results as you type.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const listMaxHeight = Math.max(
    140,
    Math.min(LIST_MAX_HEIGHT, SCREEN_H - insets.top - keyboardHeight - SHEET_CHROME_H),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TARGET_LANGUAGES;
    return TARGET_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.short.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              // Lift the whole sheet above the keyboard; drop the safe-area bottom
              // padding when lifted (it would sit under the keyboard anyway).
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
            Translate to
          </Text>

          <View
            style={[
              styles.searchRow,
              { backgroundColor: colors.segmentedTrack, borderColor: colors.hairline, borderRadius: radius.pill },
            ]}
          >
            <SearchIcon color={colors.fawn} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search languages"
              placeholderTextColor={colors.fawn}
              autoCorrect={false}
              autoCapitalize="none"
              style={[typography.uiRowTitle, styles.searchInput, { color: colors.ink }]}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={[styles.list, { maxHeight: listMaxHeight }]}
            ListEmptyComponent={
              <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.lg }]}>
                No languages match “{query}”.
              </Text>
            }
            renderItem={({ item }) => {
              const active = item.code === selected;
              return (
                <Pressable
                  onPress={() => onSelect(item.code)}
                  style={[
                    styles.row,
                    active && { backgroundColor: colors.pairPillBackground, borderRadius: radius.card },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: active ? colors.pairPillText : colors.ink, fontSize: 15 },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.rowRight}>
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: active ? colors.pairPillText : colors.fawn, fontSize: 11 },
                      ]}
                    >
                      {item.short}
                    </Text>
                    {active ? <CheckIcon color={colors.pairPillText} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
