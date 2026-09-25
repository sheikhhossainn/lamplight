import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, SearchIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import { useTheme } from '@/theme/ThemeProvider';

export type ReaderSearchResult = {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  pageIndex: number;
  pageGlobalIndex: number;
  paragraphIndex: number;
  matchStart: number;
  matchEnd: number;
  matchText: string;
  snippet: string;
};

type ReaderSearchModalProps = {
  visible: boolean;
  query: string;
  results: ReaderSearchResult[];
  onQueryChange: (query: string) => void;
  onSelectResult: (result: ReaderSearchResult) => void;
  onClose: () => void;
};

export function ReaderSearchModal({
  visible,
  query,
  results,
  onQueryChange,
  onSelectResult,
  onClose,
}: ReaderSearchModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const trimmedQuery = query.trim();

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: colors.hairline }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[typography.uiRowTitle, styles.title, { color: colors.ink }]}>Search this book</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                Search works offline across the current book
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close book search"
              hitSlop={12}
              onPress={requestClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.55 }]}
            >
              <CloseIcon color={colors.fawn} size={17} />
            </Pressable>
          </View>

          <View style={[styles.searchField, { backgroundColor: colors.parchment, borderColor: colors.hairline, borderRadius: radius.card }]}>
            <SearchIcon color={colors.fawn} size={18} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search words or phrases"
              placeholderTextColor={colors.fawn}
              selectionColor={colors.flameAmber}
              style={[typography.uiRowTitle, styles.input, { color: colors.ink }]}
              accessibilityLabel="Search within book"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => onQueryChange('')}
              >
                <CloseIcon color={colors.fawn} size={15} />
              </Pressable>
            ) : null}
          </View>

          {!trimmedQuery ? (
            <View style={styles.emptyState}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>Find a passage quickly</Text>
              <Text style={[typography.metadataCaption, styles.emptyCopy, { color: colors.fawn }]}>Try a character, place, or phrase from the book.</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[typography.uiRowTitle, { color: colors.ink }]}>No matches found</Text>
              <Text style={[typography.metadataCaption, styles.emptyCopy, { color: colors.fawn }]}>Try a shorter word or a different spelling.</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(result) => result.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open result in ${item.chapterTitle}`}
                  onPress={() => {
                    onSelectResult(item);
                    requestClose();
                  }}
                  style={({ pressed }) => [
                    styles.resultRow,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline, borderRadius: radius.card },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <View style={styles.resultMeta}>
                    <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
                      {item.chapterTitle}
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn }]}>Page {item.pageIndex + 1}</Text>
                  </View>
                  <Text style={[typography.metadataCaption, styles.snippet, { color: colors.umber }]} numberOfLines={3}>
                    {(() => {
                      const trimmed = query.trim();
                      if (!trimmed) return item.snippet;
                      const normSnippet = item.snippet.normalize('NFC').toLocaleLowerCase();
                      const normQuery = trimmed.normalize('NFC').toLocaleLowerCase();
                      const idx = normSnippet.indexOf(normQuery);
                      if (idx === -1) return item.snippet;
                      const before = item.snippet.slice(0, idx);
                      const match = item.snippet.slice(idx, idx + trimmed.length);
                      const after = item.snippet.slice(idx + trimmed.length);
                      return (
                        <>
                          {before}
                          <Text style={{ color: colors.flameAmber, fontWeight: '700' }}>{match}</Text>
                          {after}
                        </>
                      );
                    })()}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '86%',
  },
  grabber: {
    alignItems: 'center',
    marginBottom: 14,
  },
  grabberBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 6,
    marginTop: 1,
  },
  searchField: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    marginLeft: 9,
    paddingVertical: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 34,
  },
  emptyCopy: {
    marginTop: 4,
    textAlign: 'center',
  },
  resultRow: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snippet: {
    marginTop: 6,
    lineHeight: 18,
  },
});
