import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { FlameGlow } from '@/components/FlameGlow';
import { useTheme } from '@/theme/ThemeProvider';
import { isBengaliText } from '@/theme/typography';

// Shown while a book downloads and paginates. React Native's fetch can't
// report byte progress reliably, and parsing has no progress at all, so the
// bar isn't byte-accurate — it eases smoothly toward "almost done" and the
// screen is replaced by the first page the moment the real work finishes,
// which reads as completion. Friendlier than a bare flicker: the reader can
// see it's working and roughly how far along.
const STATUS_LINES = ['Fetching the text…', 'Turning it into pages…', 'Warming the lamp…'];

export function BookLoadingScreen({ title, coverUrl }: { title: string; coverUrl?: string | null }) {
  const { colors, typography, radius, spacing } = useTheme();
  const progress = useSharedValue(0);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    // Ease toward 92% over ~6s; the screen unmounts on ready, so it never has
    // to sit awkwardly at 100%.
    progress.value = withTiming(0.92, { duration: 6000, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  // Advance the reassuring status line while the work runs.
  useEffect(() => {
    const timers = [
      setTimeout(() => setStatusIndex(1), 2200),
      setTimeout(() => setStatusIndex(2), 4600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.root, { backgroundColor: colors.parchment }]}>
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={[StyleSheet.absoluteFill, styles.backgroundCover]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryDark, opacity: coverUrl ? 0.9 : 0 }]} />

      <View style={styles.content}>
        <FlameGlow size={52} variant="flicker" />

        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={[styles.cover, { borderRadius: radius.card }]}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : null}

        <Text
          style={[
            isBengaliText(title) ? typography.banglaBookCoverTitle : typography.bookCoverTitle,
            { color: coverUrl ? colors.lampText : colors.ink, textAlign: 'center', marginTop: spacing.lg },
          ]}
        >
          {title}
        </Text>
        <Text style={[typography.metadataCaption, { color: coverUrl ? colors.lampText : colors.fawn, marginTop: spacing.sm }]}>
          {STATUS_LINES[statusIndex]}
        </Text>

        <View
          style={[
            styles.track,
            {
              backgroundColor: coverUrl ? 'rgba(245,237,225,0.28)' : colors.hairline,
              borderRadius: radius.pill,
              marginTop: spacing.xl,
            },
          ]}
        >
          <Animated.View
            style={[styles.fill, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }, fillStyle]}
          />
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
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  backgroundCover: {
    opacity: 0.22,
  },
  cover: {
    width: '52%',
    maxWidth: 210,
    aspectRatio: 2 / 3,
  },
  track: {
    width: '78%',
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
  },
});
