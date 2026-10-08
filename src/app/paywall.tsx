import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlow } from '@/components/FlameGlow';
import { CloseIcon } from '@/components/icons';
import { RedeemPromoModal } from '@/components/RedeemPromoModal';
import { useBilling } from '@/features/billing/BillingProvider';
import type { PremiumPackage } from '@/features/billing/billingTypes';
import { useAppFlag } from '@/features/config/appConfig';
import {
  getEntitlementSnapshot,
  refreshEntitlements,
  subscribeToEntitlements,
  type EntitlementSnapshot,
} from '@/features/subscription/entitlementService';
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
  premium_page_styles: {
    title: 'Artisan Page Styles',
    subtitle: 'Immerse your reading in handcrafted typographic atmospheres.',
    bullets: [
      'Unlock Oxford Clothbound, Gilded Vellum, Midnight Nocturne, and Kyoto Washi',
      'Fine-tuned leading, serif weights, and historic letterpress spacing',
      'Artisan reading textures crafted for both daylight and low-light night mode',
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
  return (
    packages.find((item) => item.packageType.toUpperCase().includes(desiredType)) ??
    packages.find((item) => item.identifier.toLowerCase().includes(plan === 'yearly' ? 'annual' : 'month')) ??
    null
  );
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
  const insets = useSafeAreaInsets();
  const { feature, trigger } = useLocalSearchParams<{ feature?: string; trigger?: string }>();
  const { status, packages, isLoadingPackages, purchase, restore, openManagement } = useBilling();
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>(getEntitlementSnapshot);
  const [plan, setPlan] = useState<Plan>('yearly');
  const [containerWidth, setContainerWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [promoModalVisible, setPromoModalVisible] = useState(false);

  useEffect(() => {
    return subscribeToEntitlements(setEntitlement);
  }, []);

  const activeIndex = useSharedValue(plan === 'yearly' ? 1 : 0);

  const handleSelectPlan = (nextPlan: Plan) => {
    if (nextPlan === plan) return;
    void Haptics.selectionAsync();
    setPlan(nextPlan);
    activeIndex.value = withSpring(nextPlan === 'yearly' ? 1 : 0, {
      damping: 22,
      stiffness: 260,
      mass: 0.6,
    });
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    if (containerWidth <= 0) {
      return { opacity: 0 };
    }
    const padding = 4;
    const availableWidth = containerWidth - padding * 2;
    const tabWidth = availableWidth / 2;
    return {
      opacity: 1,
      width: tabWidth,
      transform: [{ translateX: activeIndex.value * tabWidth }],
    };
  });

  const monthlyPkg = useMemo(() => packageForPlan(packages, 'monthly'), [packages]);
  const yearlyPkg = useMemo(() => packageForPlan(packages, 'yearly'), [packages]);
  const selectedPackage = useMemo(() => packageForPlan(packages, plan), [packages, plan]);

  const hasEntitlementActive =
    entitlement.status === 'premium' ||
    entitlement.status === 'trial' ||
    entitlement.status === 'grace' ||
    Boolean(entitlement.features?.unlimited_learning);

  const isPremium = status.state === 'premium' || hasEntitlementActive;
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
    if (isPremium) {
      router.back();
      return;
    }
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
        ]}
      >
        <Text style={[typography.screenTitle, { color: colors.flameAmber, textAlign: 'center', marginBottom: spacing.sm }]}>
          Store Maintenance
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginBottom: spacing.lg, fontSize: 14, lineHeight: 20 },
          ]}
        >
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

      <View
        style={[
          styles.topRow,
          {
            paddingTop: Math.max(insets.top + 8, 28),
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <View />
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.closeButton,
            {
              backgroundColor: pressed ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
          ]}
        >
          <CloseIcon color={colors.mutedOnDark} size={15} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xxl, paddingTop: 4, paddingBottom: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <FlameGlow size={52} variant="flicker" />

        <Text
          style={[
            typography.wordmark,
            { color: colors.lampText, fontSize: 25, lineHeight: 32, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          {isPremium ? 'The lamp is shining' : detail.title}
        </Text>

        {isPremium && (
          <View
            style={[
              styles.activeStatusBadge,
              {
                backgroundColor: 'rgba(245, 166, 35, 0.14)',
                borderColor: 'rgba(245, 166, 35, 0.45)',
              },
            ]}
          >
            <Text style={{ fontSize: 11, color: colors.flameAmber }}>✦</Text>
            <Text
              style={[
                typography.eyebrowLabel,
                {
                  color: colors.flameAmber,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                },
              ]}
            >
              PREMIUM ACTIVATED
            </Text>
            <Text style={{ fontSize: 11, color: colors.flameAmber }}>✦</Text>
          </View>
        )}

        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: isPremium ? 8 : spacing.xs, maxWidth: 310, lineHeight: 19 },
          ]}
        >
          {isPremium
            ? 'You are already using Lamplight Premium. All sanctuary features, unlimited translations, and soundscapes are active.'
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

        <View
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && w !== containerWidth) {
              setContainerWidth(w);
            }
          }}
          style={[styles.segmented, { backgroundColor: colors.ember, borderRadius: radius.pill }]}
        >
          <Animated.View
            style={[
              styles.animatedPill,
              {
                backgroundColor: colors.flameAmber,
                borderRadius: radius.pill,
              },
              pillAnimatedStyle,
            ]}
          />

          <Pressable
            onPress={() => handleSelectPlan('monthly')}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: plan === 'monthly' }}
          >
            <Text
              style={[
                typography.uiRowTitle,
                styles.segmentText,
                {
                  color: plan === 'monthly' ? colors.primaryDark : colors.mutedOnDark,
                  fontWeight: plan === 'monthly' ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              Monthly{monthlyPkg ? ` · ${monthlyPkg.priceString}` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSelectPlan('yearly')}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: plan === 'yearly' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text
                style={[
                  typography.uiRowTitle,
                  styles.segmentText,
                  {
                    color: plan === 'yearly' ? colors.primaryDark : colors.mutedOnDark,
                    fontWeight: plan === 'yearly' ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                Yearly{yearlyPkg ? ` · ${yearlyPkg.priceString}` : ''}
              </Text>
              <View
                style={[
                  styles.saveBadge,
                  {
                    backgroundColor: plan === 'yearly' ? colors.primaryDark : 'rgba(245, 166, 35, 0.25)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.saveBadgeText,
                    {
                      color: colors.flameAmber,
                    },
                  ]}
                >
                  SAVE 35%
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View
          style={[
            styles.freeTierBox,
            {
              backgroundColor: 'rgba(245, 166, 35, 0.07)',
              borderColor: 'rgba(245, 166, 35, 0.22)',
              borderRadius: radius.card,
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginTop: 20,
            },
          ]}
        >
          <View style={styles.freeTierHeaderRow}>
            <Text style={{ fontSize: 13, color: colors.flameAmber }}>✦</Text>
            <Text
              style={[
                typography.eyebrowLabel,
                {
                  color: colors.flameAmber,
                  fontSize: 11.5,
                  fontWeight: '700',
                  letterSpacing: 1.1,
                  textAlign: 'center',
                },
              ]}
            >
              ALWAYS FREE IN LAMPLIGHT
            </Text>
            <Text style={{ fontSize: 13, color: colors.flameAmber }}>✦</Text>
          </View>
          <Text
            style={[
              typography.uiRowTitle,
              {
                color: colors.lampText ?? '#F0E6D6',
                fontSize: 13,
                lineHeight: 19,
                textAlign: 'center',
                fontWeight: '400',
              },
            ]}
          >
            Core reading, offline downloads, EPUB import, bookmarks, private notes, and 30 words / 15 quotes per book remain free forever.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xxl, paddingBottom: Math.max(insets.bottom + 8, 22), paddingTop: 4 }}>
        <Pressable
          onPress={startPremium}
          disabled={!isPremium && (busy || billingUnavailable || !selectedPackage)}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.flameAmber,
              borderRadius: radius.pill,
              height: layout.buttonHeight,
              opacity: !isPremium && (busy || billingUnavailable || !selectedPackage) ? 0.55 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 15 }]}>
            {isPremium
              ? '✓ You are already using Premium'
              : busy
                ? 'Connecting to the store…'
                : selectedPackage
                  ? `Start Premium — ${selectedPackage.priceString}`
                  : isLoadingPackages
                    ? 'Loading Premium…'
                    : 'Premium unavailable'}
          </Text>
        </Pressable>

        {isPremium ? (
          <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, fontSize: 11, textAlign: 'center', marginBottom: 8 }]}>
            Active on this device · Tap above to return to reading
          </Text>
        ) : (
          <>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 10.5, textAlign: 'center', marginBottom: 6 }]}>
              {plan === 'yearly' ? 'Annual plan. ' : 'Monthly plan. '}
              Renews automatically until cancelled in store account settings. Cancel anytime.
            </Text>
            {billingUnavailable ? (
              <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, textAlign: 'center', marginBottom: 6 }]}>
                Billing is not configured for this build yet.
              </Text>
            ) : null}
          </>
        )}

        <View style={styles.actionLinksRow}>
          <Pressable onPress={handleRestore} disabled={busy || billingUnavailable} style={styles.secondaryAction}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12.5 }]}>Restore Purchases</Text>
          </Pressable>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>·</Text>
          <Pressable onPress={() => setPromoModalVisible(true)} style={styles.secondaryAction}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12.5 }]}>Redeem Code</Text>
          </Pressable>
        </View>

        {isPremium && status.state === 'premium' ? (
          <Pressable onPress={() => void openManagement()} disabled={busy} style={styles.secondaryAction}>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 12 }]}>Manage Subscription</Text>
          </Pressable>
        ) : null}
        <View style={styles.legalRow}>
          <Pressable onPress={() => router.push('/terms' as any)} hitSlop={6}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>Terms</Text>
          </Pressable>
          <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}> · </Text>
          <Pressable onPress={() => router.push('/privacy' as any)} hitSlop={6}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>Privacy</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.back()} style={styles.maybeLater}>
          <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 12 }]}>
            {isPremium ? 'Back to Sanctuary' : 'Maybe later'}
          </Text>
        </Pressable>
      </View>

      <RedeemPromoModal
        visible={promoModalVisible}
        onClose={() => setPromoModalVisible(false)}
        onSuccess={() => {
          setPromoModalVisible(false);
          void refreshEntitlements('paywall_promo_redeem');
        }}
      />
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
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
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
    position: 'relative',
  },
  animatedPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 2,
  },
  segmentText: {
    fontSize: 12.5,
  },
  saveBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  freeTierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
