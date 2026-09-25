import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import {
  PAGE_STYLE_LIST,
  PageStyleConfig,
  type PageStyleId,
} from '@/features/reader/pageStyles';
import { setPageStyle, usePageStyle } from '@/features/settings/pageStylePrefs';
import {
  DEFAULT_READING_FONT_SIZE_PX,
  DEFAULT_READING_LINE_HEIGHT_RATIO,
  MAX_READING_FONT_SIZE_PX,
  MAX_READING_LINE_HEIGHT_RATIO,
  MIN_READING_FONT_SIZE_PX,
  MIN_READING_LINE_HEIGHT_RATIO,
  resetReadingTypographyPrefs,
  setReadingTypographyPrefs,
  useReadingTypography,
} from '@/features/settings/readingPrefs';
import * as Haptics from 'expo-haptics';
import { hapticFlashcardAction } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type PageStyleSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
  isBangla?: boolean;
};

export function PageStyleSelectorModal({
  visible,
  onClose,
  isBangla = false,
}: PageStyleSelectorModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const currentStyleId = usePageStyle();
  const typographyPrefs = useReadingTypography();
  const isDefaultTypography =
    typographyPrefs.fontSize === DEFAULT_READING_FONT_SIZE_PX &&
    Math.abs(typographyPrefs.lineHeightRatio - DEFAULT_READING_LINE_HEIGHT_RATIO) < 0.01;

  const handleSelectStyle = (id: PageStyleId) => {
    void hapticFlashcardAction('graduate');
    setPageStyle(id);
  };

  const handleDecreaseFontSize = () => {
    if (typographyPrefs.fontSize <= MIN_READING_FONT_SIZE_PX) return;
    void Haptics.selectionAsync();
    setReadingTypographyPrefs({ fontSize: Math.max(MIN_READING_FONT_SIZE_PX, typographyPrefs.fontSize - 1) });
  };

  const handleIncreaseFontSize = () => {
    if (typographyPrefs.fontSize >= MAX_READING_FONT_SIZE_PX) return;
    void Haptics.selectionAsync();
    setReadingTypographyPrefs({ fontSize: Math.min(MAX_READING_FONT_SIZE_PX, typographyPrefs.fontSize + 1) });
  };

  const handleDecreaseLineHeight = () => {
    if (typographyPrefs.lineHeightRatio <= MIN_READING_LINE_HEIGHT_RATIO) return;
    void Haptics.selectionAsync();
    setReadingTypographyPrefs({
      lineHeightRatio: Math.max(MIN_READING_LINE_HEIGHT_RATIO, Math.round((typographyPrefs.lineHeightRatio - 0.05) * 100) / 100),
    });
  };

  const handleIncreaseLineHeight = () => {
    if (typographyPrefs.lineHeightRatio >= MAX_READING_LINE_HEIGHT_RATIO) return;
    void Haptics.selectionAsync();
    setReadingTypographyPrefs({
      lineHeightRatio: Math.min(MAX_READING_LINE_HEIGHT_RATIO, Math.round((typographyPrefs.lineHeightRatio + 0.05) * 100) / 100),
    });
  };

  const handleResetTypography = () => {
    void hapticFlashcardAction('graduate');
    resetReadingTypographyPrefs();
  };

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 16, 28),
            },
          ]}
        >
          {/* Grabber */}
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}>
                Page & Font Style
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                Adjust size, line spacing, and reading atmosphere
              </Text>
            </View>
            <Pressable onPress={requestClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Style cards and typography adjustments */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12, gap: 14 }}
          >
            {/* Typography scale & line spacing */}
            <View
              style={[
                styles.controlsContainer,
                {
                  backgroundColor: colors.parchment,
                  borderColor: colors.hairline,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View style={styles.controlRow}>
                <View style={styles.controlMeta}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>Font size</Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                    Floor {MIN_READING_FONT_SIZE_PX}px • Max {MAX_READING_FONT_SIZE_PX}px
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease font size"
                    disabled={typographyPrefs.fontSize <= MIN_READING_FONT_SIZE_PX}
                    onPress={handleDecreaseFontSize}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.hairline,
                        opacity: typographyPrefs.fontSize <= MIN_READING_FONT_SIZE_PX ? 0.35 : pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18, lineHeight: 20 }]}>−</Text>
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                      {typographyPrefs.fontSize} px
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase font size"
                    disabled={typographyPrefs.fontSize >= MAX_READING_FONT_SIZE_PX}
                    onPress={handleIncreaseFontSize}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.hairline,
                        opacity: typographyPrefs.fontSize >= MAX_READING_FONT_SIZE_PX ? 0.35 : pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18, lineHeight: 20 }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.controlDivider, { backgroundColor: colors.hairline }]} />

              <View style={styles.controlRow}>
                <View style={styles.controlMeta}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>Line spacing</Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                    Floor {MIN_READING_LINE_HEIGHT_RATIO.toFixed(2)}× • Max {MAX_READING_LINE_HEIGHT_RATIO.toFixed(2)}×
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease line spacing"
                    disabled={typographyPrefs.lineHeightRatio <= MIN_READING_LINE_HEIGHT_RATIO}
                    onPress={handleDecreaseLineHeight}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.hairline,
                        opacity: typographyPrefs.lineHeightRatio <= MIN_READING_LINE_HEIGHT_RATIO ? 0.35 : pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18, lineHeight: 20 }]}>−</Text>
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                      {typographyPrefs.lineHeightRatio.toFixed(2)}×
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase line spacing"
                    disabled={typographyPrefs.lineHeightRatio >= MAX_READING_LINE_HEIGHT_RATIO}
                    onPress={handleIncreaseLineHeight}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.hairline,
                        opacity: typographyPrefs.lineHeightRatio >= MAX_READING_LINE_HEIGHT_RATIO ? 0.35 : pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18, lineHeight: 20 }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              {!isDefaultTypography ? (
                <>
                  <View style={[styles.controlDivider, { backgroundColor: colors.hairline }]} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Reset typography to recommended defaults"
                    onPress={handleResetTypography}
                    style={({ pressed }) => [
                      styles.resetButton,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '600' }]}>
                      Reset to recommended defaults
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>READING ATMOSPHERE</Text>
            </View>

            {PAGE_STYLE_LIST.map((style: PageStyleConfig) => {
              const isSelected = currentStyleId === style.id;
              const sampleText = isBangla ? style.previewSampleBangla : style.previewSample;
              const sampleFont = isBangla ? style.banglaFont : style.englishFont;
              const effectiveFontSize = isBangla
                ? typographyPrefs.fontSize + 0.5
                : typographyPrefs.fontSize;
              const effectiveLineHeight = Math.round(
                effectiveFontSize * (isBangla ? Math.max(1.95, typographyPrefs.lineHeightRatio) : typographyPrefs.lineHeightRatio)
              );

              return (
                <Pressable
                  key={style.id}
                  onPress={() => handleSelectStyle(style.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: isSelected ? `${colors.flameAmber}0E` : colors.parchment,
                      borderColor: isSelected ? colors.flameAmber : colors.hairline,
                      borderRadius: radius.card,
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                        {isBangla ? style.nameBangla : style.name}
                      </Text>
                      <View
                        style={[
                          styles.tagPill,
                          {
                            backgroundColor: isSelected
                              ? colors.flameAmber
                              : `${colors.fawn}22`,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            {
                              color: isSelected ? colors.primaryDark : colors.fawn,
                              fontSize: 9,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {style.tag}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                        ]}
                      >
                        <CheckIcon color={colors.primaryDark} size={14} />
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.fawn, marginTop: 4, marginBottom: 12, fontSize: 12 },
                    ]}
                  >
                    {style.description}
                  </Text>

                  {/* Visual typography sample */}
                  <View
                    style={[
                      styles.sampleBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? `${colors.flameAmber}44` : colors.hairline,
                        borderRadius: radius.bookCoverOuter,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: sampleFont,
                        fontSize: effectiveFontSize,
                        lineHeight: effectiveLineHeight,
                        letterSpacing: isBangla ? style.banglaLetterSpacing : style.letterSpacing,
                        color: colors.ink,
                      }}
                      numberOfLines={2}
                    >
                      {sampleText}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28,27,30,0.52)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 6,
    marginTop: 2,
  },
  card: {
    borderWidth: 1.5,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBox: {
    padding: 12,
    borderWidth: 1,
  },
  controlsContainer: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  controlMeta: {
    flex: 1,
    paddingRight: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDivider: {
    height: 1,
    marginVertical: 10,
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: -4,
  },
});
