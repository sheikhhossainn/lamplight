import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import { router } from 'expo-router';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
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
  const { colors, typography, spacing, radius, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const insets = useSafeAreaInsets();
  const currentStyleId = usePageStyle();
  const typographyPrefs = useReadingTypography();
  const isPremium = isPremiumUser();
  const isDefaultTypography =
    typographyPrefs.fontSize === DEFAULT_READING_FONT_SIZE_PX &&
    Math.abs(typographyPrefs.lineHeightRatio - DEFAULT_READING_LINE_HEIGHT_RATIO) < 0.01;

  const handleSelectStyle = (style: PageStyleConfig) => {
    if (style.isPremium && !isPremium) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onClose();
      router.push({ pathname: '/paywall', params: { feature: 'premium_page_styles' } });
      return;
    }
    void hapticFlashcardAction('graduate');
    setPageStyle(style.id);
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
            contentContainerStyle={{
              paddingVertical: 12,
              paddingBottom: Math.max(insets.bottom + 48, 64),
              gap: 14,
            }}
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
                  onPress={() => handleSelectStyle(style)}
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
                  {/* Row 1: Title and Status Indicator */}
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, flexShrink: 1 }]}
                      numberOfLines={1}
                    >
                      {isBangla ? style.nameBangla : style.name}
                    </Text>

                    {isSelected ? (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
                        ]}
                      >
                        <CheckIcon color={colors.primaryDark} size={14} />
                      </View>
                    ) : style.isPremium && !isPremium ? (
                      <View
                        style={[
                          styles.lockBadge,
                          { backgroundColor: `${colors.fawn}18`, borderRadius: radius.pill },
                        ]}
                      >
                        <Text style={{ fontSize: 11, color: colors.fawn }}>🔒</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Row 2: Badges Row - wraps gracefully without clipping or going out of bounds */}
                  <View style={styles.badgeRow}>
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

                    <View
                      style={[
                        styles.tierBadge,
                        {
                          backgroundColor: style.isPremium
                            ? (isPremium ? `${colors.flameAmber}22` : colors.flameAmber)
                            : `${colors.fawn}18`,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.eyebrowLabel,
                          {
                            color: style.isPremium
                              ? (isPremium ? colors.flameAmber : colors.primaryDark)
                              : colors.fawn,
                            fontSize: 9,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {style.isPremium ? (isPremium ? 'PREMIUM' : '★ PREMIUM') : 'FREE'}
                      </Text>
                    </View>

                    {/* Paper Swatch Badge */}
                    <View
                      style={[
                        styles.swatchPill,
                        {
                          backgroundColor: isLamp ? style.background.lampBackground : style.background.dayBackground,
                          borderColor: isLamp ? style.background.lampSpineColor : style.background.daySpineColor,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 3.5,
                          backgroundColor: isLamp ? style.background.lampAccent : style.background.dayAccent,
                          marginRight: 5,
                        }}
                      />
                      <Text
                        style={[
                          typography.eyebrowLabel,
                          {
                            color: isLamp ? style.background.lampTextColor : style.background.dayTextColor,
                            fontSize: 8.5,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {style.background.swatchLabel}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.fawn, marginTop: 4, marginBottom: 12, fontSize: 12 },
                    ]}
                  >
                    {style.description}
                  </Text>

                  {/* Visual typography sample with authentic page theme template styling */}
                  <View
                    style={[
                      styles.sampleBox,
                      {
                        backgroundColor: isLamp ? style.background.lampBackground : style.background.dayBackground,
                        borderColor: isSelected
                          ? colors.flameAmber
                          : (isLamp ? style.background.lampSpineColor : style.background.daySpineColor),
                        borderRadius: radius.bookCoverOuter,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    {/* Template: Newspaper masthead rule */}
                    {style.background.template === 'newspaper' ? (
                      <View style={{ marginBottom: 6, borderBottomWidth: 1, borderBottomColor: isLamp ? '#333338' : '#1A1A1A', paddingBottom: 3 }}>
                        <View style={{ borderTopWidth: 1.5, borderTopColor: isLamp ? '#333338' : '#1A1A1A', paddingTop: 2 }}>
                          <Text
                            style={{
                              fontSize: 8,
                              letterSpacing: 1.1,
                              textAlign: 'center',
                              color: isLamp ? style.background.lampTextColor : style.background.dayTextColor,
                              fontWeight: '700',
                              textTransform: 'uppercase',
                            }}
                          >
                            {style.background.previewMasthead}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Template: Oxford gold inner frame */}
                    {style.background.template === 'oxford' ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          right: 4,
                          bottom: 4,
                          borderWidth: 1,
                          borderColor: `${isLamp ? style.background.lampAccent : style.background.dayAccent}66`,
                          borderRadius: 6,
                        }}
                        pointerEvents="none"
                      />
                    ) : null}

                    {/* Template: Kraft stitched left binding */}
                    {style.background.template === 'kraft' ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 6,
                          width: 2,
                          borderLeftWidth: 1.5,
                          borderLeftColor: isLamp ? 'rgba(238, 214, 191, 0.35)' : 'rgba(100, 60, 25, 0.45)',
                          borderStyle: 'dashed',
                        }}
                        pointerEvents="none"
                      />
                    ) : null}

                    {/* Template: Antique left spine shadow */}
                    {style.background.template === 'antique' ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          width: 8,
                          backgroundColor: isLamp ? 'rgba(0,0,0,0.30)' : 'rgba(50,30,10,0.15)',
                        }}
                        pointerEvents="none"
                      />
                    ) : null}

                    {/* Template: Sage botanical indicator */}
                    {style.background.template === 'sage' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isLamp ? style.background.lampAccent : style.background.dayAccent }} />
                        <Text style={{ fontSize: 7.5, letterSpacing: 0.8, color: isLamp ? '#8FBF94' : '#2D5A38', fontWeight: '700' }}>
                          BOTANICA · EYE COMFORT
                        </Text>
                      </View>
                    ) : null}

                    <Text
                      style={{
                        fontFamily: sampleFont,
                        fontSize: effectiveFontSize,
                        lineHeight: effectiveLineHeight,
                        letterSpacing: isBangla ? style.banglaLetterSpacing : style.letterSpacing,
                        color: isLamp ? style.background.lampTextColor : style.background.dayTextColor,
                        paddingLeft: style.background.template === 'kraft' ? 10 : style.background.template === 'antique' ? 6 : 0,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  lockBadge: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  swatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
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
    minHeight: 68,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
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
