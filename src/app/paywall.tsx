import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { FlameGlow } from '@/components/FlameGlow';
import { restorePurchases } from '@/features/subscription/subscriptionState';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Plan = 'monthly' | 'yearly';

const FEATURES = [
  'Unlimited word & quote translations',
  'Extra lamp themes & page-turn sounds',
  'Offline language packs',
];

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10l4 4 8-9" stroke="#F5A623" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PaywallScreen() {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [restoring, setRestoring] = useState(false);

  const startPremium = () => {
    Alert.alert('Not yet available', 'Billing is coming in a later milestone.');
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restorePurchases();
      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Purchases Restored', res.message, [
          { text: 'Continue', onPress: () => router.back() },
        ]);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const title =
          res.code === 'clock_desync'
            ? 'Clock Out of Sync'
            : res.code === 'offline'
            ? 'Connection Required'
            : 'Restore Purchases';
        Alert.alert(title, res.message);
      }
    } catch {
      Alert.alert('Restore Failed', 'Unable to reach the verification service. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

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

      <View style={[styles.content, { paddingHorizontal: spacing.xxl }]}>
        <FlameGlow size={56} variant="flicker" />

        <Text
          style={[
            typography.wordmark,
            { color: colors.lampText, fontSize: 26, lineHeight: 34, marginTop: spacing.md },
          ]}
        >
          Keep the lamp lit
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 },
          ]}
        >
          You've used today's free translations. Unlock unlimited understanding, anytime.
        </Text>

        <View style={[styles.featureList, { marginTop: spacing.xl }]}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <CheckIcon />
              </View>
              <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13, flex: 1 }]}>
                {feature}
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
            <Text style={[typography.uiRowTitle, { fontSize: 12, color: colors.mutedOnDark }]}>Monthly</Text>
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
              Yearly · save 35%
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.xxl, paddingBottom: 26 }}>
        <Pressable
          onPress={startPremium}
          style={[
            styles.cta,
            { backgroundColor: colors.flameAmber, borderRadius: radius.pill, height: layout.buttonHeight },
          ]}
        >
          <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>
            Start Premium — $3.33/mo
          </Text>
        </Pressable>
        <Pressable
          disabled={restoring}
          onPress={handleRestore}
          style={styles.restoreBtn}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.flameAmber} />
          ) : (
            <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 13, fontWeight: '600' }]}>
              Restore Purchases
            </Text>
          )}
        </Pressable>

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureList: {
    width: '100%',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    width: '100%',
    marginTop: 22,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 6,
  },
  maybeLater: {
    alignItems: 'center',
  },
});
