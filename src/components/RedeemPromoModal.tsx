import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { hydrateRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimiter';
import { redeemPromoCode } from '@/features/subscription/entitlementService';
import { isAuthenticatedAccount } from '@/lib/supabaseAuth';
import { useTheme } from '@/theme/ThemeProvider';

type RedeemPromoModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

const PROMO_RATE_LIMIT_KEY = 'redeem_promo_code';

export function RedeemPromoModal({ visible, onClose, onSuccess }: RedeemPromoModalProps) {
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Rate limiting lock state
  const [isLocked, setIsLocked] = useState(false);
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      void (async () => {
        const [state, authStatus] = await Promise.all([
          hydrateRateLimit(PROMO_RATE_LIMIT_KEY),
          isAuthenticatedAccount().catch(() => false),
        ]);
        setIsGuest(!authStatus);
        updateLockState(state.locked, state.remainingSeconds);
      })();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, []);

  const updateLockState = (locked: boolean, seconds: number) => {
    setIsLocked(locked);
    setRemainingLockSeconds(seconds);

    if (lockTimerRef.current) clearInterval(lockTimerRef.current);

    if (locked && seconds > 0) {
      lockTimerRef.current = setInterval(() => {
        setRemainingLockSeconds((prev) => {
          if (prev <= 1) {
            if (lockTimerRef.current) clearInterval(lockTimerRef.current);
            setIsLocked(false);
            setMessage(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleRedeem = async () => {
    if (isLocked) return;

    const auth = await isAuthenticatedAccount().catch(() => false);
    if (!auth) {
      setIsGuest(true);
      setIsError(true);
      setMessage('Please sign in or create an account first to redeem your promo code.');
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await redeemPromoCode(trimmed);
      if (res.success) {
        await resetRateLimit(PROMO_RATE_LIMIT_KEY);
        setIsError(false);
        setMessage(res.message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.(res.message);
        setTimeout(() => {
          onClose();
          setCode('');
          setMessage(null);
        }, 1200);
      } else {
        const lockState = await recordFailedAttempt(PROMO_RATE_LIMIT_KEY);
        setIsError(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (lockState.locked) {
          updateLockState(true, lockState.remainingSeconds);
          setMessage(`Too many attempts. Entry locked for ${lockState.remainingSeconds}s.`);
        } else {
          const remaining = 5 - (lockState.attempts % 5);
          setMessage(`${res.message} (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining)`);
        }
      }
    } catch {
      setIsError(true);
      setMessage('Failed to redeem promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setCode('');
    setMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.hairline },
          ]}
          onPress={() => {}}
        >
          {isGuest ? (
            <>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Account Required
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 19 }]}>
                Promo code access is linked to a permanent account so your library, reading streaks, and subscription stay backed up across all devices. Please log in or create an account to activate your code.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
                <Pressable
                  onPress={() => {
                    handleClose();
                    router.push('/login' as any);
                  }}
                  style={[
                    styles.guestAuthButton,
                    {
                      backgroundColor: isLamp ? '#302A24' : colors.segmentedTrack,
                      borderColor: colors.hairline,
                      borderWidth: 1,
                      borderRadius: radius.pill,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                    Log In
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleClose();
                    router.push('/signup' as any);
                  }}
                  style={[
                    styles.guestAuthButton,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }]}>
                    Create Account
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleClose}
                style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 4 }}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>Redeem promo code</Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
                Enter your code below to activate your Lamplight access grant.
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.hairline,
                    color: colors.ink,
                    backgroundColor: colors.parchment,
                    borderRadius: radius.card,
                  },
                ]}
                placeholder="Enter promo code"
                placeholderTextColor={colors.straw}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (message) setMessage(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading && !isLocked}
                returnKeyType="done"
                onSubmitEditing={handleRedeem}
              />

          {message ? (
            <Text
              style={[
                typography.metadataCaption,
                { color: isError ? colors.highlight.clay : colors.flameAmber, marginTop: spacing.sm },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.action} disabled={loading}>
              <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 14 }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleRedeem}
              hitSlop={8}
              style={[
                styles.action,
                styles.redeemBtn,
                {
                  backgroundColor: isLocked ? colors.hairline : colors.flameAmber,
                  borderRadius: radius.pill,
                },
              ]}
              disabled={loading || !code.trim() || isLocked}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text
                  style={[
                    typography.buttonLabel,
                    { color: isLocked ? colors.fawn : colors.primaryDark, fontSize: 14 },
                  ]}
                >
                  {isLocked ? `Locked (${remainingLockSeconds}s)` : 'Redeem'}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  </Pressable>
</Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  redeemBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAuthButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
