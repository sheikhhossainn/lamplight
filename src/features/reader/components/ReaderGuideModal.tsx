import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CloseIcon, TranslateIcon } from '@/components/icons';
import { targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

type ReaderGuideModalProps = {
  visible: boolean;
  onClose: () => void;
  onOpenLanguagePicker: () => void;
};

export function ReaderGuideModal({ visible, onClose, onOpenLanguagePicker }: ReaderGuideModalProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const targetLanguage = useTargetLanguage();

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
                How to Read & Translate
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Guide items */}
          <View style={styles.itemsList}>
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
                  Swipe left to turn page
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Swipe left anywhere on the page, or tap the bottom-right corner to advance.
                </Text>
              </View>
            </View>

            {/* 2. Full Page Translation */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <TranslateIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Tap 🌐 to translate entire page
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  A single tap on the globe icon at the top translates the whole page into your language.
                </Text>
              </View>
            </View>

            {/* 3. Word Translation */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 6h16M4 12h10M4 18h14"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M18 10l3 3-3 3"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                  Hold any word to translate it
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Long-press a word for an instant translation popup or to save a quote.
                </Text>
              </View>
            </View>

            {/* 4. Language Selection */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 4v6m0 0l-3-3m3 3l3-3M7 20v-6m0 0l3 3m-3-3l-3 3"
                    stroke={colors.flameAmber}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.itemContent}>
                <View style={styles.langRow}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14 }]}>
                    Hold 🌐 to change language
                  </Text>
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenLanguagePicker();
                    }}
                    hitSlop={8}
                    style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
                  >
                    <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10, fontWeight: '700' }]}>
                      EN → {targetLanguageLabel(targetLanguage)} ▾
                    </Text>
                  </Pressable>
                </View>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16 }]}>
                  Long-press the top globe (or tap the pill above) to switch translation languages anytime.
                </Text>
              </View>
            </View>
          </View>

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
    marginBottom: 18,
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
    marginBottom: 22,
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
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginLeft: 6,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
});
