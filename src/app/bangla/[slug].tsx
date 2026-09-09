import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookSpine, isDarkSpineColor, spineColorForBook } from '@/components/BookSpine';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CheckIcon, ChevronLeftIcon, TrashIcon } from '@/components/icons';
import {
  fetchBanglaBookDetail,
  type BanglaBookDetail,
} from '@/features/content-ingestion/banglaApi';
import {
  deleteBanglaBookDownload,
  downloadBanglaBook,
  isBanglaBookDownloaded,
} from '@/features/content-ingestion/banglaDownloader';
import { getBook, type BookRow } from '@/db/repositories/books';
import { getReadingPosition, type ReadingPosition } from '@/db/repositories/readingPosition';
import { toBengaliNumerals } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

export default function BanglaBookDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [detail, setDetail] = useState<BanglaBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [readingPos, setReadingPos] = useState<ReadingPosition | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await fetchBanglaBookDetail(slug);
      setDetail(data);

      const downloaded = isBanglaBookDownloaded(data.id);
      setIsDownloaded(downloaded);

      const pos = await getReadingPosition(data.id);
      setReadingPos(pos);
    } catch (err) {
      console.warn('[BanglaBookDetailScreen] error loading:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const handleStartDownloadAndRead = async () => {
    if (!detail || downloading) return;

    if (isDownloaded) {
      // Already downloaded, launch reader immediately
      router.push({
        pathname: '/reader/[bookId]',
        params: { bookId: detail.id },
      });
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress({ current: 0, total: detail.chapters.length });

      await downloadBanglaBook(detail, (completed, total) => {
        setDownloadProgress({ current: completed, total });
      });

      setIsDownloaded(true);
      setDownloading(false);

      // Open reader
      router.push({
        pathname: '/reader/[bookId]',
        params: { bookId: detail.id },
      });
    } catch (err) {
      setDownloading(false);
      Alert.alert('ডাউনলোড ব্যর্থ হয়েছে', 'অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।');
    }
  };

  const handleDeleteDownload = async () => {
    if (!detail) return;
    setConfirmDeleteVisible(false);
    await deleteBanglaBookDownload(detail.id, detail.slug);
    setIsDownloaded(false);
  };

  if (loading || !detail) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.parchment }]}>
        <ActivityIndicator size="large" color={colors.flameAmber} />
      </View>
    );
  }

  const coverColor = spineColorForBook(detail.id, 0);
  const coverIsDark = isDarkSpineColor(coverColor);
  const coverTextColor = coverIsDark ? colors.lampText : colors.ink;

  return (
    <ScrollView
      style={{ backgroundColor: colors.parchment }}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      {/* Top Bar */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
        {isDownloaded ? (
          <Pressable onPress={() => setConfirmDeleteVisible(true)} hitSlop={12}>
            <TrashIcon color={colors.ink} size={18} />
          </Pressable>
        ) : null}
      </View>

      {/* Book Cover Card */}
      <View style={[styles.coverContainer, { backgroundColor: coverColor }]}>
        {detail.coverUrl ? (
          <Image
            source={{ uri: detail.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={styles.coverTextContent}>
            <View style={[styles.coverAccent, { backgroundColor: colors.flameAmber, opacity: 0.6 }]} />
            <Text style={[typography.banglaBookCoverTitle, { color: coverTextColor }]}>{detail.title}</Text>
            <Text
              style={[
                typography.banglaEyebrowLabel,
                { color: coverTextColor, opacity: 0.85, fontSize: 12, marginTop: 8 },
              ]}
            >
              {detail.author}
            </Text>
          </View>
        )}
      </View>

      {/* Metadata */}
      <View style={styles.metaContainer}>
        <Text style={[typography.banglaScreenTitle, { color: colors.ink, textAlign: 'center' }]}>
          {detail.title}
        </Text>
        <Text
          style={[
            typography.banglaMetadataCaption,
            { color: colors.umber, textAlign: 'center', marginTop: 6, fontSize: 16 },
          ]}
        >
          {detail.author} · {detail.genre}
        </Text>

        {readingPos ? (
          <Text
            style={[
              typography.banglaMetadataCaption,
              { color: colors.flameAmber, textAlign: 'center', marginTop: 8, fontSize: 14, fontWeight: '500' },
            ]}
          >
            পঠিত: {toBengaliNumerals(Math.round(readingPos.percentComplete * 100))}% · অধ্যায় {toBengaliNumerals(readingPos.chapterIndex + 1)}
          </Text>
        ) : null}
      </View>

      {/* CTA Button & Download Area */}
      <View style={{ marginTop: spacing.lg }}>
        {downloading ? (
          <View
            style={[
              styles.downloadingContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.flameAmber,
                borderWidth: 1,
                borderRadius: radius.card,
                padding: spacing.md,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <ActivityIndicator size="small" color={colors.flameAmber} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.banglaUiRowTitle, { color: colors.ink, fontSize: 15 }]}>
                  {downloadProgress && downloadProgress.total > 0
                    ? `অধ্যায় ${toBengaliNumerals(downloadProgress.current)} / ${toBengaliNumerals(downloadProgress.total)} সংরক্ষিত হচ্ছে…`
                    : 'বইটি প্রস্তুত ও ডাউনলোড হচ্ছে…'}
                </Text>
                <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, fontSize: 13, marginTop: 2 }]}>
                  {downloadProgress && downloadProgress.total > 0
                    ? `${toBengaliNumerals(Math.round((downloadProgress.current / downloadProgress.total) * 100))}% সম্পন্ন`
                    : 'দয়া করে অপেক্ষা করুন'}
                </Text>
              </View>
            </View>

            {/* Mini Progress Bar */}
            <View style={[styles.miniProgressTrack, { backgroundColor: colors.hairline, borderRadius: radius.pill }]}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    backgroundColor: colors.flameAmber,
                    borderRadius: radius.pill,
                    width: `${downloadProgress && downloadProgress.total > 0 ? Math.max(8, Math.round((downloadProgress.current / downloadProgress.total) * 100)) : 10}%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={handleStartDownloadAndRead}
            style={[
              styles.ctaButton,
              {
                backgroundColor: colors.flameAmber,
                borderRadius: radius.pill,
                height: 50,
              },
            ]}
          >
            <Text style={[typography.banglaButtonLabel, { color: colors.primaryDark, fontSize: 16 }]}>
              {isDownloaded
                ? readingPos
                  ? 'পড়া চালিয়ে যান'
                  : 'পড়া শুরু করুন'
                : 'বইটি ডাউনলোড করুন ও পড়ুন'}
            </Text>
          </Pressable>
        )}

        {/* Download Info Subtitle */}
        <View style={{ marginTop: 10, alignItems: 'center' }}>
          {isDownloaded ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckIcon color="#2E7D32" size={14} />
              <Text
                style={[
                  typography.banglaMetadataCaption,
                  { color: '#2E7D32', fontSize: 13, marginLeft: 6, fontWeight: '500' },
                ]}
              >
                বইটি সম্পূর্ণ ডাউনলোড করা হয়েছে (অফলাইনে প্রস্তুত)
              </Text>
            </View>
          ) : !downloading ? (
            <Text
              style={[
                typography.banglaMetadataCaption,
                { color: colors.fawn, fontSize: 13, textAlign: 'center' },
              ]}
            >
              একবার ডাউনলোড করলেই ইন্টারনেট ছাড়াই যেকোনো সময় পড়তে পারবেন
            </Text>
          ) : null}
        </View>
      </View>

      {/* Synopsis */}
      {detail.synopsis ? (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.banglaEyebrowLabel, { color: colors.fawn, marginBottom: spacing.xs }]}>
            সারসংক্ষেপ
          </Text>
          <Text
            style={[
              typography.banglaReadingBody,
              { color: colors.ink, fontSize: 17, lineHeight: 30, opacity: 0.95 },
            ]}
          >
            {detail.synopsis}
          </Text>
        </View>
      ) : null}

      {/* Table of Contents / Chapters */}
      <View style={{ marginTop: spacing.xl }}>
        <Text style={[typography.banglaEyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
          সূচিপত্র ({toBengaliNumerals(detail.chapters.length)}টি অধ্যায়)
        </Text>
        <View style={[styles.chapterList, { backgroundColor: colors.card, borderRadius: radius.card }]}>
          {detail.chapters.map((ch, i) => (
            <View
              key={ch.slug}
              style={[
                styles.chapterRow,
                { borderBottomColor: colors.hairline, borderBottomWidth: i < detail.chapters.length - 1 ? 1 : 0 },
              ]}
            >
              <Text style={[typography.banglaMetadataCaption, { color: colors.fawn, width: 34, fontSize: 15 }]}>
                {toBengaliNumerals(i + 1)}.
              </Text>
              <Text
                style={[
                  typography.banglaUiRowTitle,
                  { color: colors.ink, flex: 1, fontSize: 16 },
                ]}
                numberOfLines={1}
              >
                {ch.title}
              </Text>
              {isDownloaded ? (
                <View style={[styles.savedChapterBadge, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                  <CheckIcon color="#2E7D32" size={12} />
                  <Text style={[typography.banglaMetadataCaption, { color: '#2E7D32', fontSize: 11, marginLeft: 4, fontWeight: '600' }]}>
                    সংরক্ষিত
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Delete Download Confirm Dialog */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="বইটি ডিভাইস থেকে মুছে ফেলবেন?"
        message="বইটির সমস্ত অধ্যায় ও সংরক্ষিত ফাইল মুছে ফেলা হবে। পরবর্তীতে যেকোনো সময় পুনরায় ডাউনলোড করতে পারবেন। আপনার পড়ার অগ্রগতি ও সংরক্ষিত নোট অক্ষুণ্ণ থাকবে।"
        confirmLabel="মুছে ফেলুন"
        cancelLabel="বাতিল"
        destructive
        onConfirm={handleDeleteDownload}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  coverContainer: {
    width: 140,
    height: 200,
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    justifyContent: 'flex-end',
  },
  coverTextContent: {
    padding: 12,
    justifyContent: 'flex-end',
  },
  coverAccent: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  metaContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  ctaButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingContainer: {
    overflow: 'hidden',
  },
  miniProgressTrack: {
    height: 5,
    width: '100%',
    overflow: 'hidden',
    marginTop: 4,
  },
  miniProgressFill: {
    height: '100%',
  },
  chapterList: {
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  savedChapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
