import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CloseIcon, LiteraryThemeIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import {
  LITERARY_THEMES,
  type LiteraryThemeCode,
  type LiteraryThemeOption,
} from '@/features/settings/literaryTheme';
import { useTheme } from '@/theme/ThemeProvider';

export type LiteraryThemePickerProps = {
  visible: boolean;
  selected: LiteraryThemeCode;
  onSelect: (code: LiteraryThemeCode) => void;
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

function SparklesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LiteraryThemePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: LiteraryThemePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filteredThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LITERARY_THEMES;

    return LITERARY_THEMES.filter((opt) => {
      const codeMatch = opt.code.toLowerCase().includes(q);
      const titleMatch = opt.title.toLowerCase().includes(q);
      const subtitleMatch = opt.subtitle.toLowerCase().includes(q);
      const authorsMatch = opt.sampleAuthors.toLowerCase().includes(q);
      const paletteMatch = opt.paletteLabel ? opt.paletteLabel.toLowerCase().includes(q) : false;
      const nativeTitleMatch = opt.nativeTitle.toLowerCase().includes(q);
      const nativeSubtitleMatch = opt.nativeSubtitle.toLowerCase().includes(q);

      // Common natural aliases
      const aliasMatch =
        (q.includes('korea') && opt.code === 'korean') ||
        (q.includes('japan') && opt.code === 'japanese') ||
        (q.includes('bangla') && opt.code === 'bengali') ||
        (q.includes('bengal') && opt.code === 'bengali') ||
        (q.includes('arab') && opt.code === 'arabic') ||
        (q.includes('west') && opt.code === 'western') ||
        (q.includes('english') && opt.code === 'western') ||
        (q.includes('hanji') && opt.code === 'korean') ||
        (q.includes('washi') && opt.code === 'japanese');

      return (
        codeMatch ||
        titleMatch ||
        subtitleMatch ||
        authorsMatch ||
        paletteMatch ||
        nativeTitleMatch ||
        nativeSubtitleMatch ||
        aliasMatch
      );
    });
  }, [query]);

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="fullscreen">
      {({ requestClose }) => (
        <View style={[styles.root, { backgroundColor: colors.parchment, paddingTop: insets.top + 8 }]}>
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.screenTitle, { color: colors.ink }]}>Change themes</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
                Aesthetic atmosphere, paper textures, and typography
              </Text>
            </View>
            <Pressable
              onPress={requestClose}
              hitSlop={12}
              style={[styles.close, { backgroundColor: colors.card, borderColor: colors.hairline }]}
              accessibilityRole="button"
              accessibilityLabel="Close theme picker"
            >
              <CloseIcon color={colors.ink} size={18} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.pill,
                marginHorizontal: spacing.xl,
                marginTop: spacing.md,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <SearchIcon color={colors.fawn} />
            <TextInput
              ref={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search themes (e.g. Korean, Japanese, Hanji)..."
              placeholderTextColor={colors.fawn}
              autoCorrect={false}
              autoCapitalize="none"
              style={[typography.uiRowTitle, styles.searchInput, { color: colors.ink }]}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  Keyboard.dismiss();
                }}
                hitSlop={8}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <CloseIcon color={colors.fawn} size={14} />
              </Pressable>
            ) : null}
          </View>

          {/* Content */}
          {filteredThemes.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                {
                  marginHorizontal: spacing.xl,
                  marginTop: spacing.xxl,
                  padding: spacing.xl,
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: 'rgba(245, 166, 35, 0.12)',
                    borderColor: 'rgba(245, 166, 35, 0.28)',
                  },
                ]}
              >
                <SparklesIcon color={colors.flameAmber} />
              </View>
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: colors.ink,
                    fontSize: 16,
                    fontWeight: '600',
                    marginTop: 12,
                    textAlign: 'center',
                  },
                ]}
              >
                More themes are coming soon
              </Text>
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: colors.fawn,
                    fontSize: 12,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 18,
                    paddingHorizontal: 12,
                  },
                ]}
              >
                No themes matched “{query.trim()}”. We are crafting new literary atmospheres, typography, and paper textures.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredThemes}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={{ flex: 1, marginTop: spacing.md }}
              contentContainerStyle={{
                paddingHorizontal: spacing.xl,
                paddingBottom: insets.bottom + 24,
                gap: 12,
              }}
              renderItem={({ item }: { item: LiteraryThemeOption }) => {
                const isSelected = item.code === selected;
                return (
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      onSelect(item.code);
                      requestClose();
                    }}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.flameAmber : colors.hairline,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderRadius: radius.card,
                        padding: spacing.md,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeIconBox,
                        {
                          backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                          borderColor: isSelected ? 'rgba(245, 166, 35, 0.35)' : colors.hairline,
                          borderRadius: radius.card,
                        },
                      ]}
                    >
                      <LiteraryThemeIcon
                        theme={item.code}
                        color={isSelected ? colors.flameAmber : colors.fawn}
                        size={22}
                      />
                    </View>

                    <View style={styles.cardInfo}>
                      <View style={styles.titleRow}>
                        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>
                          {item.title}{' '}
                          <Text style={{ color: colors.fawn, fontSize: 13, fontWeight: '400' }}>
                            ({item.nativeTitle})
                          </Text>
                        </Text>
                      </View>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.flameAmber, fontSize: 11, marginTop: 2 },
                        ]}
                      >
                        {item.paletteLabel ?? item.subtitle}
                      </Text>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, fontSize: 12, marginTop: 2 },
                        ]}
                        numberOfLines={1}
                      >
                        {item.sampleAuthors}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: isSelected ? colors.flameAmber : colors.straw,
                          backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                        },
                      ]}
                    >
                      {isSelected ? <CheckIcon color={colors.primaryDark} /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}
    </ReaderOverlay>
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
    paddingBottom: 4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingLeft: 10,
    fontSize: 13,
  },
  clearBtn: {
    padding: 6,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  emptyContainer: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
