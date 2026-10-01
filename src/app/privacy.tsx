import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export default function PrivacyPolicyScreen() {
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
          Privacy Policy
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
          GLOBAL DATA PROTECTION STANDARDS · EFFECTIVE SEPTEMBER 2026
        </Text>

        <Text
          style={[
            typography.screenTitle,
            { color: colors.ink, fontSize: 24, lineHeight: 32, marginBottom: spacing.md },
          ]}
        >
          Lamplight Privacy Policy
        </Text>

        <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 22, fontSize: 14, marginBottom: spacing.lg }]}>
          At Lamplight, we believe that reading is an intimate, contemplative sanctuary. We treat your personal data and literary habits with the utmost reverence. This policy details how we handle data under global standards, including the EU General Data Protection Regulation (GDPR), United States state privacy laws (CCPA/CPRA, CalOPPA, COPPA), and Asian regulations (India DPDP, Singapore & Malaysia PDPA, Japan APPI, South Korea PIPA).
        </Text>

        {/* Local-First Architecture */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            1. Local-First Architecture: What Stays on Your Device
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            By design, Lamplight is local-first:
            {'\n\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>On-Device Storage:</Text> Your reading positions, saved vocabulary cards, notes, highlights, and offline book downloads are stored directly in a local SQLite database on your device.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Anonymous Guest Mode:</Text> You can read completely offline without creating an account or providing an email address.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Cloud Sync:</Text> Only when you choose to link or protect your account with an email are your reading positions, saved words, and reading session aggregates backed up to our secure Supabase cloud infrastructure.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Voice Queries:</Text> If you use the microphone for a scripture search or question, the short recording is sent securely to Lamplight's transcription service, processed by our configured speech provider, and retained only for the duration of the request.
          </Text>
        </View>

        {/* EU & UK GDPR */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            2. European Union & UK Compliance (GDPR / UK GDPR)
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            For users residing in the European Economic Area (EEA) and the United Kingdom:
            {'\n\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Legal Bases for Processing (Art. 6 GDPR):</Text> We process personal data only when necessary for the performance of our contract with you (providing cloud backup and translation services), compliance with legal obligations, or based on our legitimate interests in securing and maintaining our app without overriding your fundamental privacy rights.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Your Data Subject Rights:</Text> You possess the right to:
            {'\n'}  - Access and obtain a copy of your personal data (Art. 15);
            {'\n'}  - Rectify inaccurate information (Art. 16);
            {'\n'}  - Erasure ("Right to be Forgotten", Art. 17) via our in-app Delete Account button;
            {'\n'}  - Restrict or object to data processing (Arts. 18 & 21);
            {'\n'}  - Data portability (Art. 20) via our "Export Reading Data" tool;
            {'\n'}  - Lodge a complaint with your national Supervisory Authority.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>International Transfers:</Text> Where data is transferred outside the EEA, we implement Standard Contractual Clauses (SCCs) to ensure equivalent protection.
          </Text>
        </View>

        {/* United States Laws */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            3. United States Privacy Rights (CCPA, CPRA & COPPA)
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            For residents of California, Virginia, Colorado, and other US states:
            {'\n\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>"Do Not Sell or Share My Personal Information":</Text> Lamplight does NOT sell, rent, or share your personal information or reading activity with third-party data brokers, advertising networks, or marketing partners.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Categories of Information Collected:</Text> Identifiers (email address, support ID) and internet/app activity (reading session aggregates, word translation counts).
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Children's Privacy (COPPA):</Text> Lamplight does not knowingly collect personal information from children under the age of 13.
          </Text>
        </View>

        {/* Asian Jurisdictions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            4. Asian Jurisdictions (India DPDP, Singapore & Malaysia PDPA, Japan APPI, South Korea PIPA)
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            We adhere strictly to privacy regulations across Asia:
            {'\n\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>India (Digital Personal Data Protection Act 2023):</Text> Personal data is processed solely for specified, lawful reading and account management purposes. You have statutory rights of grievance redressal, correction, and complete erasure.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Singapore & Malaysia (PDPA):</Text> We observe strict purpose limitation, notification, accuracy, and retention rules. Data is retained only as long as necessary for reading functionality.
            {'\n'}
            • <Text style={{ fontFamily: 'Manrope_700Bold' }}>Japan (APPI) & South Korea (PIPA):</Text> We implement robust technical safeguards against data interception and notify users of any cross-border cloud storage locations.
          </Text>
        </View>

        {/* Account Deletion */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            5. Self-Service Account Deletion & Erasure
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            In compliance with Apple App Store and Google Play requirements, you have the absolute right to delete your account self-sufficiently without contacting support. Simply navigate to your Profile screen and tap "Delete Account". This action permanently purges your authentication record, cloud reading positions, saved words, and analytics events from our servers immediately.
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.lg }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: 8 }]}>
            6. Contact & Data Protection Officer
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, lineHeight: 20 }]}>
            For any privacy inquiries, data subject access requests, or regulatory questions, please contact our Data Protection team at:
            {'\n\n'}
            <Text style={{ fontFamily: 'Manrope_700Bold', color: colors.flameAmber }}>privacy@lamplightapp.org</Text>
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
