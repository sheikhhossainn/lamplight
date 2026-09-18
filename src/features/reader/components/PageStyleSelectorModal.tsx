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

  const handleSelectStyle = (id: PageStyleId) => {
    void hapticFlashcardAction('graduate');
    setPageStyle(id);
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
                Select your preferred reading typography & page atmosphere
              </Text>
            </View>
            <Pressable onPress={requestClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Style cards */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12, gap: 14 }}
          >
            {PAGE_STYLE_LIST.map((style: PageStyleConfig) => {
              const isSelected = currentStyleId === style.id;
              const sampleText = isBangla ? style.previewSampleBangla : style.previewSample;
              const sampleFont = isBangla ? style.banglaFont : style.englishFont;

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
                        fontSize: isBangla ? style.banglaFontSize : style.fontSize,
                        lineHeight: isBangla ? style.banglaLineHeight : style.lineHeight,
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
});
