import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CloseIcon, LibraryIcon, SettingsIcon, TranslateIcon, VocabularyIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

const { height: screenHeight } = Dimensions.get('window');

type HomeGuideModalProps = {
  visible: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'library' | 'vocabulary' | 'settings') => void;
};

export function HomeGuideModal({ visible, onClose, onNavigateTab }: HomeGuideModalProps) {
  const { colors, typography, radius, spacing } = useTheme();

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
              borderRadius: 22,
              maxHeight: Math.min(680, screenHeight * 0.88),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={[styles.badge, { backgroundColor: `${colors.flameAmber}22`, borderRadius: radius.pill }]}>
                <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, fontWeight: '700' }]}>
                  APP GUIDE
                </Text>
              </View>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20, marginTop: 6 }]}>
                Where Everything Lives
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginTop: 2 }]}>
                A quick tour of Lamplight's core features
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          {/* Scrollable list of feature items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={styles.itemsList}
          >
            {/* 1. Library & Reading */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <LibraryIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}>
                  Library & Reading
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16.5 }]}>
                  Tap any book spine on the shelf to start reading. Jump back into <Text style={{ fontWeight: '600', color: colors.ink }}>Continue Reading</Text>, explore sacred texts (Quran, Bible, Vedas), or tap <Text style={{ fontWeight: '600', color: colors.ink }}>+ Import EPUB</Text> to add your own books.
                </Text>
              </View>
            </View>

            {/* 2. Flashcards & Notebook */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <VocabularyIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}>
                    Notebook & Flashcards
                  </Text>
                  {onNavigateTab ? (
                    <Pressable
                      onPress={() => onNavigateTab('vocabulary')}
                      hitSlop={8}
                      style={[styles.jumpPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
                    >
                      <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10, fontWeight: '700' }]}>
                        Open tab ➔
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16.5 }]}>
                  Words you look up while reading are saved to your <Text style={{ fontWeight: '600', color: colors.ink }}>Notebook</Text> tab. Tap <Text style={{ fontWeight: '600', color: colors.ink }}>Flashcards</Text> inside Notebook to test and reinforce your vocabulary with interactive flip cards!
                </Text>
              </View>
            </View>

            {/* 3. Settings & Translation Language */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <SettingsIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}>
                    Settings & Language
                  </Text>
                  {onNavigateTab ? (
                    <Pressable
                      onPress={() => onNavigateTab('settings')}
                      hitSlop={8}
                      style={[styles.jumpPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
                    >
                      <Text style={[typography.eyebrowLabel, { color: colors.pairPillText, fontSize: 10, fontWeight: '700' }]}>
                        Open tab ➔
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16.5 }]}>
                  In the <Text style={{ fontWeight: '600', color: colors.ink }}>Settings</Text> tab, choose your default translation language (e.g. Spanish, French, Bengali), toggle <Text style={{ fontWeight: '600', color: colors.ink }}>Day / Lamp</Text> reading modes, or toggle page-turn sounds.
                </Text>
              </View>
            </View>

            {/* 4. Reading Gestures */}
            <View style={styles.guideItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.flameAmber}18` }]}>
                <TranslateIcon color={colors.flameAmber} size={20} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14.5 }]}>
                  Reading & Gestures
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11.5, marginTop: 2, lineHeight: 16.5 }]}>
                  Inside any book: <Text style={{ fontWeight: '600', color: colors.ink }}>Swipe left</Text> to turn page, tap <Text style={{ fontWeight: '600', color: colors.ink }}>🌐</Text> at the top to translate the full page, or <Text style={{ fontWeight: '600', color: colors.ink }}>hold any word</Text> to look it up or save a quote.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action button */}
          <Pressable
            onPress={onClose}
            style={[styles.startButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 15, fontWeight: '700' }]}>
              Start Exploring
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
    maxWidth: 395,
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
    paddingBottom: 6,
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
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jumpPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    marginLeft: 6,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 16,
  },
});
