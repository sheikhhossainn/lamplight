import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import type { HabitReport } from '@/features/analytics/habitReports';
import { useTheme } from '@/theme/ThemeProvider';
import { FontFamily } from '@/theme/typography';

const FLAME_PATH =
  'M100 46 C 78 78, 70 100, 84 122 C 84 108, 92 98, 100 92 C 108 98, 116 108, 116 122 C 130 100, 122 78, 100 46 Z';

function FlameMark({ size = 24, color = '#F5A623' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d={FLAME_PATH} fill={color} />
    </Svg>
  );
}

function formatHoursMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

interface ReadingReportCardProps {
  report: HabitReport | null;
  readerName?: string;
  onClose?: () => void;
}

export function ReadingReportCard({
  report,
  readerName = 'Reader',
}: ReadingReportCardProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!report?.hasSufficientData) {
      Alert.alert('No Reading Activity', 'Read a few chapters before sharing your report card.');
      return;
    }
    try {
      setSharing(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!cardRef.current) return;

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'Image sharing is not supported on this platform.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `${report.periodLabel} Literary Report Card`,
        UTI: 'public.png',
      });
    } catch (err) {
      console.warn('[ReadingReportCard] Failed to capture or share:', err);
      Alert.alert('Sharing Error', 'Unable to create the report card image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  if (!report || !report.hasSufficientData) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderRadius: radius.card,
          },
        ]}
      >
        <FlameMark size={32} color={colors.straw} />
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginTop: 8 }]}>
          Awaiting Reading Activity
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.fawn, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 },
          ]}
        >
          Track sessions in {report?.periodLabel ?? 'this period'} to generate your literary milestones report card.
        </Text>
      </View>
    );
  }

  const topBook = report.topBooks[0];

  return (
    <View style={styles.wrapper}>
      {/* Captured Report Card View */}
      <View
        ref={cardRef}
        collapsable={false}
        style={[
          styles.cardContainer,
          {
            backgroundColor: colors.primaryDark,
            borderColor: 'rgba(245, 166, 35, 0.25)',
            borderRadius: radius.card,
          },
        ]}
      >
        {/* Header with Flame & Period */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FlameMark size={22} color={colors.flameAmber} />
            <View>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9.5, letterSpacing: 1.2 }]}>
                LAMPLIGHT · READING REPORT
              </Text>
              <Text style={[typography.uiRowTitle, { color: colors.parchment, fontSize: 15, marginTop: 1 }]}>
                {report.periodLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.readerBadge,
              { backgroundColor: 'rgba(245, 237, 225, 0.08)', borderColor: 'rgba(245, 237, 225, 0.15)' },
            ]}
          >
            <Text style={[typography.metadataCaption, { color: colors.parchment, fontSize: 11 }]}>
              {readerName}
            </Text>
          </View>
        </View>

        {/* Three Core Stat Pillars */}
        <View style={[styles.statsRow, { borderColor: 'rgba(245, 237, 225, 0.12)' }]}>
          <View style={styles.statPillar}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10 }]}>
              READING TIME
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 17, marginTop: 2 }]}>
              {formatHoursMinutes(report.totalReadingMinutes)}
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9.5, marginTop: 1 }]}>
              {report.totalSessionsCount} sessions
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: 'rgba(245, 237, 225, 0.12)' }]} />

          <View style={styles.statPillar}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10 }]}>
              PAGES READ
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.parchment, fontSize: 17, marginTop: 2 }]}>
              {report.totalPagesRead}
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9.5, marginTop: 1 }]}>
              {report.averagePagesPerHour > 0 ? `~${report.averagePagesPerHour} pgs/hr` : '—'}
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: 'rgba(245, 237, 225, 0.12)' }]} />

          <View style={styles.statPillar}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10 }]}>
              VOCABULARY
            </Text>
            <Text style={[typography.uiRowTitle, { color: colors.parchment, fontSize: 17, marginTop: 2 }]}>
              +{report.vocabularyGrowth.wordsSavedCount}
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9.5, marginTop: 1 }]}>
              {report.vocabularyGrowth.wordsMasteredCount} mastered
            </Text>
          </View>
        </View>

        {/* Top Book Banner if Available */}
        {topBook ? (
          <View
            style={[
              styles.topBookSection,
              { backgroundColor: 'rgba(245, 237, 225, 0.05)', borderColor: 'rgba(245, 237, 225, 0.08)' },
            ]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 8.5 }]}>
                PRIMARY LITERARY WORK
              </Text>
              <Text
                style={{
                  fontFamily: FontFamily.loraItalicMedium,
                  fontSize: 13,
                  color: colors.parchment,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {topBook.title}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10, marginTop: 1 }]}>
                {topBook.author} · {formatHoursMinutes(topBook.minutesRead)} ({topBook.pagesRead} pages)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                {Math.round(topBook.percentComplete * 100)}%
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9 }]}>
                completed
              </Text>
            </View>
          </View>
        ) : null}

        {/* Footer: Rhythm and Seal */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10 }]}>
              Peak reading rhythm: {report.timeDistribution.dominantTime}
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 9.5, marginTop: 2 }]}>
              {report.activeReadingDays} active reading days in {report.periodLabel}
            </Text>
          </View>

          <View style={styles.watermarkTag}>
            <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 9, fontWeight: '700' }]}>
              LAMP · LIGHT
            </Text>
          </View>
        </View>
      </View>

      {/* Share Trigger Button */}
      <Pressable
        onPress={handleShare}
        disabled={sharing}
        style={[
          styles.shareButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderRadius: radius.card,
          },
        ]}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={colors.flameAmber} />
        ) : (
          <>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13"
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
              Share Literary Report Card
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
  },
  emptyContainer: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cardContainer: {
    padding: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  readerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statPillar: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  topBookSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  watermarkTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 10,
  },
});
