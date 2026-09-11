import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookSpine } from '@/components/BookSpine';
import { ChevronLeftIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { isBookCached } from '@/features/content-ingestion/bookDownloader';
import { GONGU_KOREAN_BOOKS } from '@/features/content-ingestion/koreanApi';
import { useTheme } from '@/theme/ThemeProvider';

type KoreanCatalogItem = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  synopsis: string;
  category: string;
  totalChapters: number;
};

const GENRES = [
  { id: null, label: '전체' },
  { id: '소설', label: '소설' },
  { id: '시', label: '시' },
  { id: '고전문학', label: '고전문학' },
  { id: '수필', label: '수필' },
];

export default function KoreanLibraryScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<KoreanCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(35);
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const searchRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(
    async (targetPage = 1, append = false, targetQuery = query, targetGenre = activeGenre) => {
      if (targetPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        const limit = 30;
        const offset = (targetPage - 1) * limit;

        let fetchedItems: KoreanCatalogItem[] = [];

        if (supabaseUrl && supabaseKey) {
          let url = `${supabaseUrl}/rest/v1/books?source_language=eq.ko&select=id,title,author,cover_url,synopsis,categories,total_chapters&order=id.asc&limit=${limit}&offset=${offset}`;

          const cleanQuery = targetQuery.trim();
          if (cleanQuery) {
            url += `&or=(title.ilike.*${encodeURIComponent(cleanQuery)}*,author.ilike.*${encodeURIComponent(cleanQuery)}*)`;
          }

          if (targetGenre) {
            url += `&categories=cs.{${encodeURIComponent(targetGenre)}}`;
          }

          const res = await fetch(url, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: 'count=exact',
            },
          });

          if (res.ok) {
            const rangeHeader = res.headers.get('content-range');
            if (rangeHeader) {
              const parts = rangeHeader.split('/');
              if (parts[1]) {
                const parsedTotal = parseInt(parts[1], 10);
                if (!isNaN(parsedTotal)) setTotal(parsedTotal);
              }
            }

            const rows = await res.json();
            if (Array.isArray(rows)) {
              fetchedItems = rows.map((r: any) => ({
                id: r.id,
                title: r.title,
                author: r.author,
                coverUrl: r.cover_url,
                synopsis: r.synopsis,
                category: Array.isArray(r.categories) && r.categories[0] ? r.categories[0] : '한국문학',
                totalChapters: r.total_chapters || 0,
              }));
            }
          }
        }

        // Fallback to local hero books if offline or initial load with empty result
        if (fetchedItems.length === 0 && targetPage === 1 && !targetQuery) {
          fetchedItems = GONGU_KOREAN_BOOKS.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl,
            synopsis: b.synopsis,
            category: b.genre,
            totalChapters: b.totalChapters,
          }));
        }

        setBooks((prev) => (append ? [...prev, ...fetchedItems] : fetchedItems));
      } catch (err) {
        console.warn('[KoreanLibraryScreen] fetchBooks failed:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, activeGenre],
  );

  useEffect(() => {
    fetchBooks(1, false, query, activeGenre);
  }, [activeGenre]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchBooks(1, false, text, activeGenre);
    }, 350);
  };

  const handleClearQuery = () => {
    setQuery('');
    setPage(1);
    fetchBooks(1, false, '', activeGenre);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || books.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBooks(nextPage, true, query, activeGenre);
  };

  const handleOpenBook = (bookId: string) => {
    router.push({ pathname: '/book/[id]', params: { id: bookId } });
  };

  const renderBookItem = ({ item, index }: { item: KoreanCatalogItem; index: number }) => {
    const downloaded = isBookCached(item.id);

    return (
      <Pressable
        onPress={() => handleOpenBook(item.id)}
        style={({ pressed }) => [
          styles.bookCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <BookSpine
          bookId={item.id}
          title={item.title}
          coverUrl={item.coverUrl}
          toneIndex={index}
          width={80}
          height={116}
          onPress={() => handleOpenBook(item.id)}
        />
        <View style={styles.bookInfo}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={2}
              style={[typography.uiRowTitle, { color: colors.ink, flex: 1, fontSize: 15 }]}
            >
              {item.title}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[typography.metadataCaption, { color: colors.fawn, marginTop: 3 }]}
          >
            {item.author}
          </Text>
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.genrePill,
                { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.metadataCaption, { color: colors.pairPillText, fontSize: 11 }]}>
                {item.category}
              </Text>
            </View>
            {downloaded && (
              <View
                style={[
                  styles.genrePill,
                  { backgroundColor: `${colors.flameAmber}18`, borderRadius: radius.pill },
                ]}
              >
                <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>
                  ✓ 다운로드됨
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.libraryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: layout.screenMargin }]}>
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <ChevronLeftIcon color={colors.ink} size={22} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20 }]}>
              공유마당
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
              한국 고전 & 현대문학 · {total.toLocaleString()} 권
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderRadius: radius.pill, marginTop: spacing.md },
          ]}
        >
          <SearchIcon color={colors.fawn} size={16} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="작품명·작가명으로 검색…"
            placeholderTextColor={colors.fawn}
            style={[
              typography.uiRowTitle,
              { color: colors.ink, flex: 1, marginLeft: spacing.sm, paddingVertical: 0 },
            ]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClearQuery} hitSlop={12} style={styles.clearButton}>
              <CloseIcon color={colors.fawn} size={14} />
            </Pressable>
          )}
        </View>

        {/* Genre Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.genresRow}
          style={{ marginTop: spacing.md, marginBottom: spacing.xs }}
        >
          {GENRES.map((g) => {
            const isActive = activeGenre === g.id;
            return (
              <Pressable
                key={g.id ?? 'all'}
                onPress={() => {
                  setActiveGenre(g.id);
                  setPage(1);
                }}
                style={[
                  styles.genreChip,
                  {
                    backgroundColor: isActive ? colors.flameAmber : colors.card,
                    borderColor: isActive ? colors.flameAmber : colors.hairline,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.uiRowTitle,
                    {
                      fontSize: 12,
                      color: isActive ? colors.primaryDark : colors.umber,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Book List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.flameAmber} />
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.md }]}>
            한국 문학 라이브러리를 불러오는 중…
          </Text>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
            해당하는 작품을 찾을 수 없습니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={renderBookItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: layout.screenMargin, paddingBottom: insets.bottom + 32 },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.flameAmber} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
  },
  clearButton: {
    padding: 4,
  },
  genresRow: {
    gap: 8,
    paddingRight: 16,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    gap: 12,
  },
  bookCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 14,
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
