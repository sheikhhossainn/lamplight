import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { CloseIcon } from '@/components/icons';
import {
  getRateLimitState,
  hydrateRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '@/lib/rateLimiter';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/supabaseAuth';
import { useTheme } from '@/theme/ThemeProvider';

type AccountProtectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (email: string) => void;
};

export function AccountProtectionModal({
  visible,
  onClose,
  onSuccess,
}: AccountProtectionModalProps) {
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rate limiting lock state
  const [isLocked, setIsLocked] = useState(false);
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rateLimitKey = `account_otp_${email.trim().toLowerCase()}`;

  // Check rate limit state whenever entering OTP step or opening modal
  useEffect(() => {
    if (visible && step === 'otp' && email) {
      void (async () => {
        const state = await hydrateRateLimit(rateLimitKey);
        updateLockState(state.locked, state.remainingSeconds);
      })();
    }
  }, [visible, step, email, rateLimitKey]);

  // Clean up timer on unmount
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
            setErrorMessage(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await sendEmailOtp(trimmed);
      if (res.success) {
        setStep('otp');
        setOtpCode('');
        const state = await hydrateRateLimit(`account_otp_${trimmed.toLowerCase()}`);
        updateLockState(state.locked, state.remainingSeconds);
        void Haptics.selectionAsync();
      } else {
        setErrorMessage(res.message || 'Failed to send verification code.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setErrorMessage('Network connection error. Please try again.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isLocked) return;

    const trimmedCode = otpCode.trim();
    if (trimmedCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyEmailOtp(email, trimmedCode);
      if (res.success) {
        await resetRateLimit(rateLimitKey);
        setSuccessMessage('Account authenticated & protected!');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.(email.trim());

        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        // Record failed attempt for brute-force rate limiting
        const lockState = await recordFailedAttempt(rateLimitKey);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (lockState.locked) {
          updateLockState(true, lockState.remainingSeconds);
          setErrorMessage(
            `Too many failed attempts. Code entry locked for ${lockState.remainingSeconds}s to protect your account.`,
          );
        } else {
          const remainingAttempts = 5 - (lockState.attempts % 5);
          setErrorMessage(
            `${res.message || 'Invalid code.'} (${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining)`,
          );
        }
      }
    } catch {
      setErrorMessage('Unable to connect to verification service.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setStep('email');
    setEmail('');
    setOtpCode('');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              borderColor: colors.hairline,
            },
          ]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 17 }]}>
                {step === 'email' ? 'Protect Your Reading Sanctuary' : 'Enter Verification Code'}
              </Text>
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.fawn, marginTop: 4, lineHeight: 18 },
                ]}
              >
                {step === 'email'
                  ? 'Sign in or link your email to securely back up your reading progress, notes, and vocabulary to the cloud.'
                  : `We sent a 6-digit code to ${email}. Enter it below to confirm.`}
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                { backgroundColor: isLamp ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
              ]}
            >
              <CloseIcon color={colors.fawn} size={15} />
            </Pressable>
          </View>

          {/* Form Content */}
          <View style={{ marginTop: spacing.lg }}>
            {step === 'email' ? (
              <>
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
                  placeholder="name@example.com"
                  placeholderTextColor={colors.straw}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                />

                <Pressable
                  disabled={loading || !email.trim()}
                  onPress={handleSendOtp}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: email.trim() ? colors.flameAmber : colors.hairline,
                      borderRadius: radius.pill,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text
                      style={[
                        typography.buttonLabel,
                        { color: email.trim() ? colors.primaryDark : colors.fawn },
                      ]}
                    >
                      Send Verification Code
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                    {
                      borderColor: isLocked ? colors.highlight.clay : colors.hairline,
                      color: colors.ink,
                      backgroundColor: isLocked
                        ? (isLamp ? 'rgba(235, 87, 87, 0.1)' : 'rgba(235, 87, 87, 0.06)')
                        : colors.parchment,
                      borderRadius: radius.card,
                    },
                  ]}
                  placeholder="••••••"
                  placeholderTextColor={colors.straw}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(text) => {
                    setOtpCode(text);
                    if (errorMessage && !isLocked) setErrorMessage(null);
                  }}
                  editable={!loading && !isLocked}
                />

                <Pressable
                  disabled={loading || otpCode.trim().length < 6 || isLocked}
                  onPress={handleVerifyOtp}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: isLocked
                        ? colors.hairline
                        : otpCode.trim().length >= 6
                        ? colors.flameAmber
                        : colors.hairline,
                      borderRadius: radius.pill,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text
                      style={[
                        typography.buttonLabel,
                        {
                          color: isLocked
                            ? colors.fawn
                            : otpCode.trim().length >= 6
                            ? colors.primaryDark
                            : colors.fawn,
                        },
                      ]}
                    >
                      {isLocked ? `Locked (${remainingLockSeconds}s)` : 'Verify & Protect'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStep('email');
                    setErrorMessage(null);
                  }}
                  style={{ alignItems: 'center', marginTop: spacing.md }}
                >
                  <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                    ← Change email address
                  </Text>
                </Pressable>
              </>
            )}

            {/* Error or Success Feedback */}
            {errorMessage ? (
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: colors.highlight.clay,
                    marginTop: spacing.md,
                    textAlign: 'center',
                    lineHeight: 18,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}

            {successMessage ? (
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: colors.flameAmber,
                    marginTop: spacing.md,
                    textAlign: 'center',
                    fontWeight: '700',
                  },
                ]}
              >
                ✓ {successMessage}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
  },
  primaryButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
