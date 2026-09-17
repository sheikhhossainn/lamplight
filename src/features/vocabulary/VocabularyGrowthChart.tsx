import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import type { DailySavedWordCount } from '@/db/repositories/savedWords';
import { fillGrowthSeries, VOCABULARY_GROWTH_DAYS } from '@/features/vocabulary/growthSeries';
import { useTheme } from '@/theme/ThemeProvider';

const CHART_HEIGHT = 72;

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function VocabularyGrowthChart({ counts, totalWords }: { counts: DailySavedWordCount[]; totalWords: number }) {
  const { colors, typography, spacing, radius } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const series = useMemo(() => fillGrowthSeries(counts), [counts]);
  const periodTotal = series.reduce((total, point) => total + point.count, 0);
  const maxCount = Math.max(...series.map((point) => point.count), 1);
  const baseline = CHART_HEIGHT - 1;
  const chartPoints = series
    .map((point, index) => {
      const x = series.length > 1 ? (index / (series.length - 1)) * chartWidth : chartWidth / 2;
      const y = baseline - (point.count / maxCount) * (CHART_HEIGHT - 8);
      return { x, y };
    });
  const points = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const latest = series[series.length - 1];
  const latestX = chartWidth;
  const latestY = baseline - (latest.count / maxCount) * (CHART_HEIGHT - 8);
  const summary = totalWords === 0
    ? 'No saved words yet.'
    : `${totalWords} saved words. ${periodTotal} saved in the last ${VOCABULARY_GROWTH_DAYS} days.`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Vocabulary growth. ${summary}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          borderRadius: radius.card,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>VOCABULARY GROWTH</Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 2 }]}>Last {VOCABULARY_GROWTH_DAYS} days</Text>
        </View>
        <Text style={[typography.translatedWordInline, { color: colors.flameAmber, fontSize: 18 }]}>{totalWords}</Text>
      </View>

      <View
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width);
          if (width > 0 && width !== chartWidth) setChartWidth(width);
        }}
        style={{ height: CHART_HEIGHT, marginTop: spacing.md }}
      >
        {chartWidth > 0 ? (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Line x1={0} y1={baseline} x2={chartWidth} y2={baseline} stroke={colors.hairline} strokeWidth={1} />
            <Line x1={0} y1={Math.round(CHART_HEIGHT / 2)} x2={chartWidth} y2={Math.round(CHART_HEIGHT / 2)} stroke={colors.hairline} strokeWidth={1} strokeDasharray="3 4" />
            <Polyline points={points} fill="none" stroke={colors.flameAmber} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {latest.count > 0 ? <Circle cx={latestX} cy={latestY} r={3} fill={colors.flameAmber} /> : null}
          </Svg>
        ) : null}
      </View>

      <View style={[styles.labels, { marginTop: spacing.xs }]}>
        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>{formatDateLabel(series[0].date)}</Text>
        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>{formatDateLabel(latest.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
