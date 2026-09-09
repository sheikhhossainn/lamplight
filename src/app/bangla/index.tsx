import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookSpine } from '@/components/BookSpine';
import { CheckIcon, ChevronLeftIcon, CloseIcon, FilterIcon, SearchIcon } from '@/components/icons';
import {
  fetchBanglaBooks,
  fetchBanglaTaxonomies,
  type BanglaBookSummary,
} from '@/features/content-ingestion/banglaApi';
import { isBanglaBookDownloaded } from '@/features/content-ingestion/banglaDownloader';
import { toBengaliNumerals } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

export default function BanglaLibraryScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<BanglaBookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  const searchRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTaxonomies = useCallback(async () => {
    try {
      const taxRes = await fetchBanglaTaxonomies();
      setGenres(taxRes.genres);
    } catch (err) {
      console.warn('[BanglaLibraryScreen] failed to load taxonomies:', err);
    }
  }, []);

  const loadBooks = useCallback(
    async (targetPage = 1, append = false, targetQuery = query, targetGenre = activeGenre) => {
      if (targetPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetchBanglaBooks({
          page: targetPage,
          limit: 30,
          search: targetQuery.trim() || undefined,
          genre: targetGenre || undefined,
        });

        setBooks((prev) => {
          const next = append ? [...prev, ...res.books] : res.books;
          // Refresh downloaded set
          const downloaded = new Set<string>();
          for (const b of next) {
            if (isBanglaBookDownloaded(b.id)) {
              downloaded.add(b.id);
            }
          }
          setDownloadedSet(downloaded);
          return next;
        });

        setTotal(res.total);
        setPage(targetPage);
      } catch (err) {
        console.warn('[BanglaLibraryScreen] failed to load books:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, activeGenre],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTaxonomies();
      void loadBooks(1, false, query, activeGenre);
    }, [loadTaxonomies, loadBooks]),
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void loadBooks(1, false, text, activeGenre);
    }, 350);
  };

  const handleGenreSelect = (genre: string | null) => {
    setActiveGenre(genre);
    void loadBooks(1, false, query, genre);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore) return;
    if (books.length >= total && total > 0) return;
    void loadBooks(page + 1, true, query, activeGenre);
  };

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => searchRef.current?.blur());
    return () => {
      sub.remove();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleOpenBook = (book: BanglaBookSummary) => {
    router.push({
      pathname: '/bangla/[slug]',
      params: { slug: book.slug },
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topRow,
          {
            paddingHorizontal: layout.screenMargin,
            paddingTop: insets.top + 16,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.banglaScreenTitle, { color: colors.ink }]}>বাংলা সাহিত্য</Text>
          <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, marginTop: 2 }]}>
            কালজয়ী ধ্রুপদী গ্রন্থমালা
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: layout.screenMargin, marginTop: spacing.md }}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderRadius: radius.pill,
              borderColor: colors.hairline,
              borderWidth: 1,
            },
          ]}
        >
          <SearchIcon color={colors.fawn} size={17} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="বই অথবা লেখকের নাম দিয়ে খুঁজুন…"
            placeholderTextColor={colors.fawn}
            style={[
              typography.banglaUiRowTitle,
              {
                color: colors.ink,
                flex: 1,
                marginLeft: spacing.sm,
                paddingVertical: 0,
                fontSize: 15,
              },
            ]}
            returnKeyType="search"
          />
          {query.trim().length > 0 ? (
            <Pressable onPress={() => handleQueryChange('')} hitSlop={12}>
              <CloseIcon color={colors.fawn} size={14} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Genre Filter Chips */}
      {genres.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={[styles.chipRow, { paddingHorizontal: layout.screenMargin }]}
          style={{ marginTop: spacing.md, flexGrow: 0 }}
        >
          {[{ id: null as string | null, label: 'সব' }, ...genres.map((g) => ({ id: g, label: g }))].map(
            (item) => {
              const on = item.id === activeGenre;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => handleGenreSelect(item.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? colors.flameAmber : colors.card,
                      borderColor: on ? colors.flameAmber : colors.hairline,
                      borderRadius: radius.pill,
                      marginRight: spacing.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.banglaButtonLabel,
                      {
                        fontSize: 13,
                        color: on ? colors.primaryDark : colors.umber,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
      ) : null}

      {/* Books List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.flameAmber} />
          <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, marginTop: spacing.md, fontSize: 14 }]}>
            গ্রন্থতালিকা লোড হচ্ছে…
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: layout.screenMargin, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.flameAmber} />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isDownloaded = downloadedSet.has(item.id);
            return (
              <Pressable
                onPress={() => handleOpenBook(item)}
                style={[
                  styles.bookCard,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.card,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    marginBottom: spacing.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <BookSpine
                  bookId={item.id}
                  title={item.title}
                  coverUrl={item.coverUrl}
                  toneIndex={index}
                  onPress={() => handleOpenBook(item)}
                  width={68}
                  height={98}
                />
                <View style={styles.bookMeta}>
                  <View style={styles.badgeRow}>
                    <Text
                      style={[
                        typography.banglaEyebrowLabel,
                        { color: colors.flameAmber, fontSize: 11 },
                      ]}
                    >
                      {item.genre}
                    </Text>
                    {isDownloaded ? (
                      <View
                        style={[
                          styles.downloadedBadge,
                          { backgroundColor: 'rgba(52, 199, 89, 0.15)' },
                        ]}
                      >
                        <CheckIcon color="#2E7D32" size={12} />
                        <Text style={[styles.downloadedText, { color: '#2E7D32' }]}>অফলাইন</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[typography.banglaUiRowTitle, { color: colors.ink, fontSize: 17, marginTop: 4 }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[typography.banglaMetadataCaption, { color: colors.umber, marginTop: 2, fontSize: 14 }]}
                    numberOfLines={1}
                  >
                    {item.author}
                  </Text>
                  <Text
                    style={[typography.banglaMetadataCaption, { color: colors.fawn, fontSize: 13, marginTop: 6, lineHeight: 19 }]}
                    numberOfLines={2}
                  >
                    {item.synopsis || 'কোনো বিবরণ নেই'}
                  </Text>
                  <Text
                    style={[
                      typography.banglaEyebrowLabel,
                      { color: colors.fawn, fontSize: 11, marginTop: 8 },
                    ]}
                  >
                    {item.totalChapters > 0 ? `${toBengaliNumerals(item.totalChapters)}টি অধ্যায়` : 'অধ্যায় তালিকা দেখুন'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[typography.banglaUiRowTitle, { color: colors.umber, fontSize: 17 }]}>
                কোনো বই পাওয়া যায়নি
              </Text>
              <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, marginTop: 4, fontSize: 14 }]}>
                ভিন্ন শব্দ অথবা লেখকের নাম দিয়ে আবার চেষ্টা করুন
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
  },
  chipRow: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  listContent: {
    paddingTop: 16,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookMeta: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  downloadedText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
