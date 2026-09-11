import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BookmarkIcon, CloseIcon, SoundWaveIcon, TranslateIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const { height: screenHeight } = Dimensions.get('window');

type ReaderGuideModalProps = {
  visible: boolean;
  onClose: () => void;
  onOpenLanguagePicker?: () => void;
};

export function ReaderGuideModal({ visible, onClose }: ReaderGuideModalProps) {
  const { colors, typography, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderRadius: 20,
              maxHeight: Math.min(640, screenHeight * 0.88),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <View style={[styles.badge, { backgroundColor: `${colors.flameAmber}22`, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, fontWeight: '700' }]}>
                  READER GUIDE
                </Text>
              </View>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 6 }]}>
                How to Read & Explore
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Guide items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={styles.itemsList}
          >
            {/* 1. Page Turn */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M5 12L11 6M5 12L11 18"
                    stroke={colors.flameAmber}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Turn pages effortlessly
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Swipe left anywhere on the page, or tap the bottom-right corner to advance to the next page.
                </Text>
              </View>
            </View>

            {/* 2. Reading Controls */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <SoundWaveIcon color={colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Reading Controls
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Use the top-right buttons to switch between Day & Lamp modes, play ambient soundscapes, or tap the globe button to translate the entire page. <Text style={{ fontWeight: '600', color: colors.ink }}>Hold the globe button</Text> to open the language dropdown.
                </Text>
              </View>
            </View>

            {/* 3. Word Translation */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <TranslateIcon color={colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Hold any word to translate
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Press and hold onto any word to reveal its definition, translation, and grammatical notes.
                </Text>
              </View>
            </View>

            {/* 4. Select & Save Quotes with Sliders */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <BookmarkIcon color={colors.flameAmber} size={18} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Select & save quotes with sliders
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  After holding a word, tap <Text style={{ fontWeight: '600', color: colors.ink }}>"Save as quote"</Text>. Two slider handles will appear—drag them to highlight the exact passage and save it.
                </Text>
              </View>
            </View>

            {/* Helpful reminder note */}
            <View style={styles.tipWrap}>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, textAlign: 'center', lineHeight: 17 }]}>
                To view this guide again anytime, tap the <Text style={{ color: colors.flameAmber, fontWeight: '700' }}>?</Text> button in the top left corner.
              </Text>
            </View>
          </ScrollView>

          {/* Action button */}
          <Pressable
            onPress={onClose}
            style={[styles.startButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 15, fontWeight: '700' }]}>
              Start Reading
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 390,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closeBtn: {
    padding: 6,
  },
  itemsList: {
    gap: 16,
    paddingBottom: 8,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  itemContent: {
    flex: 1,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 14,
  },
  tipWrap: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
});
