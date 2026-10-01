import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import {
  formatHeatmapDateLabel,
  formatHeatmapDuration,
  type CalendarHeatmapData,
  type HeatmapDay,
  type HeatmapLevel,
} from '@/features/analytics/calendarHeatmap';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  data: CalendarHeatmapData | null;
  loading?: boolean;
  hasInsightsAccess: boolean;
  onUnlockPress?: () => void;
};

const CELL_SIZE = 11;
const CELL_GAP = 3;
const WEEKDAY_ROW_HEIGHT = CELL_SIZE + CELL_GAP;

function getCellColor(
  level: HeatmapLevel,
  isLamp: boolean,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (level) {
    case 0:
      return isLamp ? '#232026' : colors.segmentedTrack;
    case 1:
      return isLamp ? 'rgba(245, 166, 35, 0.22)' : 'rgba(245, 166, 35, 0.25)';
    case 2:
      return isLamp ? 'rgba(245, 166, 35, 0.45)' : 'rgba(245, 166, 35, 0.50)';
    case 3:
      return isLamp ? 'rgba(245, 166, 35, 0.72)' : 'rgba(245, 166, 35, 0.75)';
    case 4:
      return colors.flameAmber;
  }
}

export function CalendarHeatmapCard({
  data,
  loading = false,
  hasInsightsAccess,
  onUnlockPress,
}: Props) {
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const scrollViewRef = useRef<ScrollView>(null);

  // Selected Day for interactive inspection
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Auto-select today on data load and scroll to current week
  useEffect(() => {
    if (!data || data.weeks.length === 0) return;

    // Find today's day in the last week
    const lastWeek = data.weeks[data.weeks.length - 1];
    const today = lastWeek.days.find((d) => d.isToday) ?? lastWeek.days[lastWeek.days.length - 1];
    setSelectedDay(today);

    // Scroll to right edge to reveal latest activity
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const handleCellPress = (day: HeatmapDay) => {
    if (day.isFuture) return;
    void Haptics.selectionAsync().catch(() => {});
    setSelectedDay(day);
  };

  const handleUnlock = () => {
    void Haptics.selectionAsync().catch(() => {});
    if (onUnlockPress) {
      onUnlockPress();
    } else {
      router.push('/paywall?feature=reading_insights&trigger=calendar_heatmap' as any);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          borderRadius: radius.card,
          padding: spacing.md,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 10 }]}>
            ANNUAL READING CADENCE
          </Text>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginTop: 2 }]}>
            Calendar Activity Heatmap
          </Text>
        </View>

        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: isLamp ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.2)',
              borderColor: colors.hairline,
              borderRadius: radius.pill,
            },
          ]}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9.5 }]}>
            {data ? `${data.totalActiveDays} ACTIVE DAYS` : '—'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.flameAmber} size="small" />
        </View>
      ) : data ? (
        <>
          {/* Key Totals Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                YEAR TIME
              </Text>
              <Text style={[typography.wordmark, { color: colors.ink, fontSize: 16, marginTop: 2 }]}>
                {formatHeatmapDuration(data.totalPeriodMinutes)}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 1 }]}>
                {data.totalPeriodPages} pages
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                CURRENT STREAK
              </Text>
              <Text style={[typography.wordmark, { color: colors.flameAmber, fontSize: 16, marginTop: 2 }]}>
                {data.currentStreak} {data.currentStreak === 1 ? 'day' : 'days'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 1 }]}>
                Active cadence
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 9 }]}>
                LONGEST STREAK
              </Text>
              <Text style={[typography.wordmark, { color: colors.ink, fontSize: 16, marginTop: 2 }]}>
                {data.longestStreak} {data.longestStreak === 1 ? 'day' : 'days'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 10, marginTop: 1 }]}>
                Personal record
              </Text>
            </View>
          </View>

          {/* Heatmap Grid & Weekdays */}
          <View style={styles.gridContainer}>
            {/* Weekday labels: Mon (row 1), Wed (row 3), Fri (row 5) */}
            <View style={styles.weekdayCol}>
              <View style={{ height: 16 }} />
              <View style={[styles.weekdayLabelBox, { top: 16 + 1 * WEEKDAY_ROW_HEIGHT }]}>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 8.5 }]}>M</Text>
              </View>
              <View style={[styles.weekdayLabelBox, { top: 16 + 3 * WEEKDAY_ROW_HEIGHT }]}>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 8.5 }]}>W</Text>
              </View>
              <View style={[styles.weekdayLabelBox, { top: 16 + 5 * WEEKDAY_ROW_HEIGHT }]}>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 8.5 }]}>F</Text>
              </View>
            </View>

            {/* Scrollable Columns */}
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: spacing.sm }}
            >
              <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
                {data.weeks.map((week) => (
                  <View key={week.weekIndex} style={styles.weekColumn}>
                    {/* Month label header */}
                    <View style={styles.monthHeader}>
                      {week.monthLabel ? (
                        <Text
                          numberOfLines={1}
                          style={[typography.metadataCaption, { color: colors.fawn, fontSize: 8.5 }]}
                        >
                          {week.monthLabel}
                        </Text>
                      ) : null}
                    </View>

                    {/* 7 Days in Week */}
                    <View style={{ gap: CELL_GAP }}>
                      {week.days.map((day) => {
                        const isSelected = selectedDay?.dateStr === day.dateStr;
                        const cellColor = getCellColor(day.level, isLamp, colors);

                        return (
                          <Pressable
                            key={day.dateStr}
                            disabled={day.isFuture}
                            onPress={() => handleCellPress(day)}
                            style={[
                              styles.cell,
                              {
                                backgroundColor: cellColor,
                                opacity: day.isFuture ? 0.2 : 1,
                                borderColor: isSelected
                                  ? colors.flameAmber
                                  : day.isToday
                                  ? colors.ink
                                  : 'transparent',
                                borderWidth: isSelected ? 1.5 : day.isToday ? 1 : 0,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Selected Day Info Banner */}
          <View
            style={[
              styles.selectedDayBanner,
              {
                backgroundColor: colors.parchment,
                borderColor: colors.hairline,
                borderRadius: radius.card,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12.5 }]}>
                {selectedDay ? formatHeatmapDateLabel(selectedDay.dateStr) : 'Select a day'}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
                {selectedDay
                  ? selectedDay.minutesRead > 0
                    ? `${formatHeatmapDuration(selectedDay.minutesRead)} read · ${selectedDay.pagesRead} pages · ${selectedDay.sessionCount} session${selectedDay.sessionCount === 1 ? '' : 's'}`
                    : selectedDay.isFuture
                    ? 'Upcoming day'
                    : 'No reading recorded on this day'
                  : 'Tap any square to view day statistics'}
              </Text>
            </View>

            {selectedDay && selectedDay.minutesRead > 0 && (
              <View
                style={[
                  styles.selectedDayLevelPill,
                  {
                    backgroundColor: getCellColor(selectedDay.level, isLamp, colors),
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    {
                      color: selectedDay.level >= 3 ? colors.primaryDark : colors.ink,
                      fontSize: 9,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {selectedDay.minutesRead}m
                </Text>
              </View>
            )}
          </View>

          {/* Legend Row */}
          <View style={styles.legendRow}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginRight: 4 }]}>
              Less
            </Text>
            {([0, 1, 2, 3, 4] as HeatmapLevel[]).map((lvl) => (
              <View
                key={lvl}
                style={[
                  styles.legendCell,
                  {
                    backgroundColor: getCellColor(lvl, isLamp, colors),
                    borderColor: colors.hairline,
                  },
                ]}
              />
            ))}
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginLeft: 4 }]}>
              More
            </Text>
          </View>

          {/* Premium Insights Paywall Gate */}
          {!hasInsightsAccess && (
            <View
              style={[
                styles.paywallGateBox,
                {
                  backgroundColor: colors.parchment,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9 }]}>
                  PREMIUM READING INSIGHTS
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(245, 166, 35, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 8.5 }]}>
                    PLUS / SCHOLAR
                  </Text>
                </View>
              </View>

              <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 6, lineHeight: 16 }]}>
                Gain full 52-week calendar insights, seasonal habit patterns, velocity trends, and completion forecasts.
              </Text>

              <Pressable
                onPress={handleUnlock}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.hairline,
                }}
              >
                <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>
                  Unlock Full Annual Heatmap
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 18l6-6-6-6" stroke={colors.flameAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  statCol: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayCol: {
    width: 14,
    marginRight: 4,
    position: 'relative',
  },
  weekdayLabelBox: {
    position: 'absolute',
    left: 0,
    height: CELL_SIZE,
    justifyContent: 'center',
  },
  weekColumn: {
    width: CELL_SIZE,
  },
  monthHeader: {
    height: 16,
    justifyContent: 'flex-start',
    overflow: 'visible',
    width: 24,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2.5,
  },
  selectedDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  selectedDayLevelPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  legendCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  paywallGateBox: {
    padding: 12,
    borderWidth: 1,
  },
});
