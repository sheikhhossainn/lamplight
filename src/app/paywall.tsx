import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FlameGlow } from '@/components/FlameGlow';
import { useBilling } from '@/features/billing/BillingProvider';
import type { PremiumPackage } from '@/features/billing/billingTypes';
import { useAppFlag } from '@/features/config/appConfig';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Plan = 'monthly' | 'yearly';

type FeatureDetail = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const FEATURE_DETAILS: Record<string, FeatureDetail> = {
  unlimited_learning: {
    title: 'Unlimited Learning',
    subtitle: 'Build your vocabulary and save memorable passages without limits.',
    bullets: [
      'Unlimited saved words per book (surpasses 30-word cap)',
      'Unlimited saved quotes per book (surpasses 15-quote cap)',
      'Unlimited daily word & phrase translations',
    ],
  },
  advanced_quiz: {
    title: 'Advanced Quizzes',
    subtitle: 'Deepen vocabulary mastery with active retrieval and variation.',
    bullets: [
      'In fresh sentences — quiz with new literary contexts',
      'Synonyms & antonyms recall challenges',
      'Unlimited quiz sessions without weekly sample limits',
    ],
  },
  reading_insights: {
    title: 'Reading Insights',
    subtitle: 'Track your reading rhythms and build gentle, lifelong habits.',
    bullets: [
      'Adaptive anti-guilt pacing & catch-up scheduling',
      'Reading speed, habit consistency, and progress forecasts',
      'Detailed vocabulary retention and SRS metrics',
    ],
  },
  full_ambience: {
    title: 'Atmospheric Soundscapes',
    subtitle: 'Immerse yourself deeper in every book with soothing audio environments.',
    bullets: [
      'Full ambient collection: Rain on the path, Misty rain, Forest brook',
      'Continuous background playback while reading',
      'Offline audio caching for distraction-free sessions',
    ],
  },
  premium_quote_cards: {
    title: 'Artisan Quote Cards',
    subtitle: 'Share memorable passages with handcrafted typographic elegance.',
    bullets: [
      'All artisan themes: Ex Libris, Clothbound, Archive, and more',
      'High-definition image export for sharing and wallpapers',
      'Fine-tuned editorial typography and layout treatments',
    ],
  },
};

const DEFAULT_DETAIL: FeatureDetail = {
  title: 'Keep the lamp lit',
  subtitle: "You've reached a Premium feature. Unlock unlimited understanding, anytime.",
  bullets: [
    'Unlimited saved words, quotes, and translations',
    'Advanced quiz modes without the weekly sample limit',
    'Full ambient soundscapes & artisan quote cards',
  ],
};

function packageForPlan(packages: PremiumPackage[], plan: Plan): PremiumPackage | null {
  const desiredType = plan === 'yearly' ? 'ANNUAL' : 'MONTHLY';
  return packages.find((item) => item.packageType.toUpperCase().includes(desiredType))
    ?? packages.find((item) => item.identifier.toLowerCase().includes(plan === 'yearly' ? 'annual' : 'month'))
    ?? null;
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10l4 4 8-9" stroke="#F5A623" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PaywallScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const { feature, trigger } = useLocalSearchParams<{ feature?: string; trigger?: string }>();
  const { status, packages, isLoadingPackages, purchase, restore, openManagement } = useBilling();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);

  const selectedPackage = useMemo(() => packageForPlan(packages, plan), [packages, plan]);
  const isPremium = status.state === 'premium';
  const billingUnavailable = status.state === 'unavailable';

  const detail = useMemo(() => {
    if (feature && FEATURE_DETAILS[feature]) {
      const base = FEATURE_DETAILS[feature];
      if (feature === 'unlimited_learning') {
        if (trigger === 'vocab_limit') {
          return {
            ...base,
            subtitle: "You've reached the 30 words per book free limit. Keep building your vocabulary without boundaries.",
          };
        }
        if (trigger === 'quotes_limit') {
          return {
            ...base,
            subtitle: "You've reached the 15 quotes per book free limit. Highlight and keep memorable passages without limits.",
          };
        }
        if (trigger === 'daily_translation_cap') {
          return {
            ...base,
            subtitle: "You've reached today's 50 free translations. Unlock unlimited translations anytime.",
          };
        }
      }
      return base;
    }
    return DEFAULT_DETAIL;
  }, [feature, trigger]);

  const startPremium = async () => {
    if (!selectedPackage || busy) {
      Alert.alert('Premium is unavailable', 'Premium packages are still loading. Please try again shortly.');
      return;
    }

    setBusy(true);
    const outcome = await purchase(selectedPackage.identifier);
    setBusy(false);

    if (outcome.type === 'failed') Alert.alert('Purchase could not be completed', outcome.message);
    if (outcome.type === 'completed_without_entitlement') {
      Alert.alert('Purchase received', 'Your purchase was received, but Premium access is still being verified.');
    }
  };

  const handleRestore = async () => {
    if (busy || billingUnavailable) return;
    setBusy(true);
    const outcome = await restore();
    setBusy(false);
    if (outcome.type === 'restored') {
      Alert.alert('Purchases restored', 'Premium is ready on this account.');
    } else if (outcome.type === 'nothing_found') {
      Alert.alert('No purchase found', 'We could not find an active Lamplight Premium purchase for this store account.');
    } else {
      Alert.alert('Restore could not be completed', outcome.message);
    }
  };

  const premiumVisible = useAppFlag('premium_visibility_enabled');

  if (!premiumVisible) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <Text style={[typography.screenTitle, { color: colors.flameAmber, textAlign: 'center', marginBottom: spacing.sm }]}>
          Store Maintenance
        </Text>
        <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, textAlign: 'center', marginBottom: spacing.lg, fontSize: 14, lineHeight: 20 }]}>
          Subscription upgrades are temporarily unavailable. Core reading, offline downloads, bookmarks, and private notes remain 100% free and active.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.card,
          }}
        >
          <Text style={[typography.buttonLabel, { color: colors.ink }]}>Return to Reading</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark }]}>
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="paywallGlow" cx="50%" cy="20%" r="55%">
            <Stop offset="0%" stopColor={colors.flameAmber} stopOpacity={0.16} />
            <Stop offset="60%" stopColor={colors.flameAmber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#paywallGlow)" />
      </Svg>

      <View style={[styles.topRow, { paddingHorizontal: spacing.xl }]}>
        <View />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Svg width={16} height={16} viewBox="0 0 20 20">
            <Path d="M4 4l12 12M16 4L4 16" stroke={colors.mutedOnDark} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xxl, paddingTop: 6, paddingBottom: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <FlameGlow size={52} variant="flicker" />

        <Text
          style={[
            typography.wordmark,
            { color: colors.lampText, fontSize: 25, lineHeight: 32, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          {detail.title}
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: spacing.xs, maxWidth: 300, lineHeight: 18 },
          ]}
        >
          {isPremium
            ? 'Your Lamplight Premium subscription is active.'
            : detail.subtitle}
        </Text>

        <View style={[styles.featureList, { marginTop: spacing.lg }]}>
          {detail.bullets.map((bullet) => (
            <View key={bullet} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <CheckIcon />
              </View>
              <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13, flex: 1 }]}>
                {bullet}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.segmented, { backgroundColor: colors.ember, borderRadius: radius.pill }]}>
          <Pressable
            onPress={() => setPlan('monthly')}
            style={[
              styles.segment,
              plan === 'monthly' && { backgroundColor: colors.ember, borderRadius: radius.pill },
            ]}
          >
            <Text style={[typography.uiRowTitle, { fontSize: 12, color: colors.mutedOnDark }]}>
              Monthly{plan === 'monthly' && selectedPackage ? ` · ${selectedPackage.priceString}` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPlan('yearly')}
            style={[
              styles.segment,
              plan === 'yearly' && { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
            ]}
          >
            <Text
              style={[
                typography.uiRowTitle,
                { fontSize: 12, color: plan === 'yearly' ? colors.primaryDark : colors.mutedOnDark },
              ]}
            >
              Yearly{plan === 'yearly' && selectedPackage ? ` · ${selectedPackage.priceString}` : ''}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.freeTierBox,
            {
              backgroundColor: 'rgba(240, 230, 214, 0.05)',
              borderColor: 'rgba(240, 230, 214, 0.10)',
              borderRadius: radius.card,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginTop: 16,
            },
          ]}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 9.5, letterSpacing: 0.8, textAlign: 'center' }]}>
            ALWAYS FREE IN LAMPLIGHT
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.mutedOnDark, fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 15 },
            ]}
          >
            Core reading, offline downloads, EPUB import, bookmarks, notes, and 30 words / 15 quotes per book remain free forever.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xxl, paddingBottom: 22, paddingTop: 4 }}>
        <Pressable
          onPress={startPremium}
          disabled={busy || billingUnavailable || !selectedPackage || isPremium}
          style={[
            styles.cta,
            {
              backgroundColor: colors.flameAmber,
              borderRadius: radius.pill,
              height: layout.buttonHeight,
              opacity: busy || billingUnavailable || !selectedPackage || isPremium ? 0.55 : 1,
            },
          ]}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>
            {isPremium ? 'Premium is active' : busy ? 'Connecting to the store…' : selectedPackage ? `Start Premium — ${selectedPackage.priceString}` : isLoadingPackages ? 'Loading Premium…' : 'Premium unavailable'}
          </Text>
        </Pressable>
        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10.5, textAlign: 'center', marginBottom: 6 }]}>
          {plan === 'yearly' ? 'Annual plan. ' : 'Monthly plan. '}
          Renews automatically until cancelled in store account settings. Cancel anytime.
        </Text>
        {billingUnavailable ? (
          <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, textAlign: 'center', marginBottom: 6 }]}>
            Billing is not configured for this build yet.
          </Text>
        ) : null}
        <Pressable onPress={handleRestore} disabled={busy || billingUnavailable} style={styles.secondaryAction}>
          <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Restore Purchases</Text>
        </Pressable>
        {isPremium ? (
          <Pressable onPress={() => void openManagement()} disabled={busy} style={styles.secondaryAction}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Manage Subscription</Text>
          </Pressable>
        ) : null}
        <View style={styles.legalRow}>
          <Pressable onPress={() => router.push('/terms')} hitSlop={6}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>Terms</Text>
          </Pressable>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}> · </Text>
          <Pressable onPress={() => router.push('/privacy')} hitSlop={6}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>Privacy</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.back()} style={styles.maybeLater}>
          <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    width: '100%',
    marginTop: 18,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
  },
  freeTierBox: {
    width: '100%',
    borderWidth: 1,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  maybeLater: {
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
});
