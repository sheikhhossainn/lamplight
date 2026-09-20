import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 14,
            paddingHorizontal: spacing.xl,
            borderBottomColor: colors.hairline,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Text
          style={[
            typography.uiRowTitle,
            { color: colors.ink, fontSize: 16, textAlign: 'center', flex: 1, marginRight: 24 },
          ]}
        >
          Terms and Conditions
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.xs }]}>
          LEGAL AGREEMENT · LAST UPDATED: SEPTEMBER 2026
        </Text>

        <Text
          style={[
            typography.screenTitle,
            { color: colors.ink, fontSize: 24, lineHeight: 32, marginBottom: spacing.md },
          ]}
        >
          Lamplight Terms of Service
        </Text>

        <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 22, fontSize: 14, marginBottom: spacing.lg }]}>
          Welcome to Lamplight. By downloading, accessing, or using our mobile application and related services,
          you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use Lamplight.
        </Text>

        {/* Section 1 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            1. Purpose and Literary Heritage
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            Lamplight is an editorial, distraction-free reading companion designed for timeless literature, sacred scriptures, and multi-lingual classics. Many literary works available through our public catalog are in the Public Domain (e.g. Project Gutenberg, Aozora Bunko, Gongu). The digital typesetting, custom typographic layouts, spaced repetition algorithms, word-lookup interfaces, and reading atmosphere engines remain the exclusive intellectual property of Lamplight.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            2. Offline-First Architecture & Free Tier
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            Lamplight is built with a local-first philosophy. Free users can read downloaded books, save bookmarks, and use core reading tools completely offline without creating an account. The free tier includes fair-use allocations for word lookups and vocabulary saves. We reserve the right to establish and adjust fair-use caps to maintain infrastructure stability.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            3. Premium Subscriptions & Billing
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            Lamplight Premium unlocks unlimited word lookups, context-aware translations, reading habit insights, and cloud cross-device backup.
            {'\n\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Account Requirement:</Text> Access to Premium features requires an authenticated account and an active internet connection to verify your subscription.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Billing & Renewal:</Text> Subscriptions are processed through Apple App Store, Google Play, or authorized payment processors. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current billing cycle.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Cancellation & Refunds:</Text> You can manage and cancel your subscription anytime in your device account settings. Refunds follow the policies of the respective app store.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            4. User-Imported Content (EPUBs)
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            If you import your own EPUB or text files into Lamplight, you affirm that you have the legal right or license to possess and read that material. Lamplight does not monitor or claim ownership of personal files stored on your device or in your personal cloud sync storage.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            5. Account Deletion and Termination
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            You may terminate your account at any time directly within the Profile screen. Upon confirmation, your remote account, reading history, saved vocabulary, and highlights will be permanently purged from our servers in compliance with Apple App Store rules and global privacy regulations.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            6. Disclaimers and Limitation of Liability
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            Lamplight is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied. Translations and contextual annotations are algorithmic and intended for educational assistance; we do not guarantee infallible accuracy. In no event shall Lamplight be liable for indirect, incidental, or consequential damages.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  sectionCard: {
    borderWidth: 1,
    padding: 16,
  },
});
