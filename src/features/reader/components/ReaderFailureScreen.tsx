import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlow } from '@/components/FlameGlow';
import { useTheme } from '@/theme/ThemeProvider';
import { isBengaliText } from '@/theme/typography';
import type { ReaderFailureDetails, ReaderRecoveryActionType } from '../readerFailureHandler';

export interface ReaderFailureScreenProps {
  failure: ReaderFailureDetails;
  bookTitle?: string;
  coverUrl?: string | null;
  onAction: (actionType: ReaderRecoveryActionType) => void;
}

/**
 * Dedicated recovery screen for all reader error states (FULLAPP §8.6).
 * Provides clear typography, deterministic recovery actions, and ensures
 * only typed codes are shown rather than raw book or network text.
 */
export function ReaderFailureScreen({
  failure,
  bookTitle,
  coverUrl,
  onAction,
}: ReaderFailureScreenProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const isBengali = bookTitle ? isBengaliText(bookTitle) : false;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.parchment,
          paddingTop: Math.max(insets.top, 24) + spacing.lg,
          paddingBottom: Math.max(insets.bottom, 24) + spacing.lg,
        },
      ]}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={[StyleSheet.absoluteFill, styles.backgroundCover]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: coverUrl ? colors.primaryDark : 'transparent',
            opacity: coverUrl ? 0.88 : 0,
          },
        ]}
      />

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <FlameGlow size={54} variant="static" lit={false} />
        </View>

        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={[styles.coverThumbnail, { borderRadius: radius.card }]}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : null}

        {bookTitle ? (
          <Text
            style={[
              isBengali ? typography.banglaBookCoverTitle : typography.bookCoverTitle,
              {
                color: coverUrl ? colors.lampText : colors.ink,
                textAlign: 'center',
                marginTop: spacing.md,
                fontSize: 19,
                lineHeight: 25,
              },
            ]}
            numberOfLines={2}
          >
            {bookTitle}
          </Text>
        ) : null}

        <View style={[styles.codeBadge, { borderColor: colors.hairline, backgroundColor: coverUrl ? 'rgba(255,255,255,0.06)' : colors.card }]}>
          <Text style={[typography.metadataCaption, { color: coverUrl ? colors.mutedOnDark : colors.fawn, fontSize: 11 }]}>
            STATUS · {failure.code.toUpperCase()}
          </Text>
        </View>

        <Text
          style={[
            typography.screenTitle,
            {
              color: coverUrl ? colors.lampText : colors.ink,
              textAlign: 'center',
              marginTop: spacing.lg,
              fontSize: 20,
            },
          ]}
        >
          {failure.title}
        </Text>

        <Text
          style={[
            typography.metadataCaption,
            {
              color: coverUrl ? colors.mutedOnDark : colors.fawn,
              textAlign: 'center',
              marginTop: spacing.sm,
              lineHeight: 22,
              fontSize: 14.5,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          {failure.message}
        </Text>

        <View style={[styles.actionContainer, { marginTop: spacing.xl }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={failure.primaryAction.label}
            onPress={() => onAction(failure.primaryAction.type)}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.flameAmber,
                borderRadius: radius.pill,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 15 }]}>
              {failure.primaryAction.label}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={failure.secondaryAction.label}
            onPress={() => onAction(failure.secondaryAction.type)}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: coverUrl ? 'rgba(245, 237, 225, 0.28)' : colors.hairline,
                borderRadius: radius.pill,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                typography.uiRowTitle,
                { color: coverUrl ? colors.lampText : colors.ink, fontSize: 14 },
              ]}
            >
              {failure.secondaryAction.label}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backgroundCover: {
    opacity: 0.18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverThumbnail: {
    width: 68,
    height: 96,
    marginVertical: 10,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 10,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
