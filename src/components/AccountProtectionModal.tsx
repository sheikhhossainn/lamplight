import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { linkEmailToGuest, sendEmailOtp, verifyGuestEmailLink } from '@/lib/supabaseAuth';
import {
  executeAccountMerge,
  snapshotLocalData,
  type LocalDataSnapshot,
} from '@/features/account/accountMergeService';
import { useTheme } from '@/theme/ThemeProvider';

type AccountProtectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Step = 'email' | 'merge_prompt' | 'otp';

export function AccountProtectionModal({
  visible,
  onClose,
  onSuccess,
}: AccountProtectionModalProps) {
  const { colors, typography, radius, spacing } = useTheme();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isMergeFlow, setIsMergeFlow] = useState(false);
  const [localSnapshot, setLocalSnapshot] = useState<LocalDataSnapshot | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('email');
      setEmail('');
      setOtpCode('');
      setMessage(null);
      setIsError(false);
      setIsMergeFlow(false);
      setLocalSnapshot(null);
    }
  }, [visible]);

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setIsError(true);
      setMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      // 1. Snapshot local data first
      const snapshot = await snapshotLocalData();
      setLocalSnapshot(snapshot);

      // 2. Attempt to link email to current guest
      const linkRes = await linkEmailToGuest(trimmed);

      if (linkRes.requiresMerge) {
        // Existing account detected -> ask confirmation to merge
        setIsMergeFlow(true);
        // Send OTP to the existing account for sign-in verification
        await sendEmailOtp(trimmed);
        setStep('merge_prompt');
      } else if (linkRes.success) {
        // New account linking initiated
        setIsMergeFlow(false);
        setStep('otp');
      } else {
        setIsError(true);
        setMessage(linkRes.message || 'Failed to send code.');
      }
    } catch {
      setIsError(true);
      setMessage('Failed to send verification code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMerge = () => {
    setStep('otp');
    setMessage(null);
    setIsError(false);
  };

  const handleVerifyOtp = async () => {
    const trimmedToken = otpCode.trim();
    if (trimmedToken.length < 6) {
      setIsError(true);
      setMessage('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      if (isMergeFlow) {
        if (!localSnapshot) {
          throw new Error('Local snapshot missing for account merge.');
        }
        const mergeRes = await executeAccountMerge(email.trim().toLowerCase(), trimmedToken, localSnapshot);
        if (mergeRes.success) {
          setIsError(false);
          setMessage('Account merged and reading data synced successfully!');
          onSuccess?.();
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setIsError(true);
          setMessage(mergeRes.message || 'Failed to merge account.');
        }
      } else {
        const verifyRes = await verifyGuestEmailLink(email.trim().toLowerCase(), trimmedToken);
        if (verifyRes.success) {
          setIsError(false);
          setMessage('Account protected successfully! Your library is backed up.');
          onSuccess?.();
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setIsError(true);
          setMessage(verifyRes.message || 'Invalid or expired code.');
        }
      }
    } catch (err: unknown) {
      setIsError(true);
      setMessage((err as Error)?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
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
          {step === 'email' && (
            <>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Protect and sync your library
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
                Link an email to back up your saved words, reading positions, and highlights across devices.
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
                placeholder="Enter your email"
                placeholderTextColor={colors.straw}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (message) setMessage(null);
                }}
                editable={!loading}
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
                <Pressable
                  onPress={handleClose}
                  disabled={loading}
                  style={[styles.button, styles.cancelButton, { borderRadius: radius.pill }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSendCode}
                  disabled={loading || !email.trim()}
                  style={[
                    styles.button,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      opacity: loading || !email.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                      Send Code
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {step === 'merge_prompt' && (
            <>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Merge this device's reading data?
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
                An existing account was found for <Text style={{ fontWeight: 'bold' }}>{email}</Text>.
              </Text>

              <View
                style={[
                  styles.snapshotCard,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline, borderRadius: radius.card },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 12, marginBottom: 4 }]}>
                  Found on this device:
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                  • {localSnapshot?.savedWordsCount ?? 0} saved words{'\n'}• {localSnapshot?.booksCount ?? 0} books with reading progress{'\n'}• {localSnapshot?.highlightsCount ?? 0} highlights
                </Text>
              </View>

              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: spacing.xs, fontSize: 11, lineHeight: 16 }]}>
                Merging will combine your offline reading data with your existing account without losing your progress.
              </Text>

              <View style={[styles.actions, { marginTop: spacing.lg }]}>
                <Pressable
                  onPress={handleClose}
                  style={[styles.button, styles.cancelButton, { borderRadius: radius.pill }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmMerge}
                  style={[styles.button, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                    Merge & Continue
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                Enter verification code
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
                We sent a 6-digit code to {email}.
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.hairline,
                    color: colors.ink,
                    backgroundColor: colors.parchment,
                    borderRadius: radius.card,
                    letterSpacing: 4,
                    textAlign: 'center',
                    fontSize: 20,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.straw}
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text);
                  if (message) setMessage(null);
                }}
                editable={!loading}
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
                <Pressable
                  onPress={() => setStep(isMergeFlow ? 'merge_prompt' : 'email')}
                  disabled={loading}
                  style={[styles.button, styles.cancelButton, { borderRadius: radius.pill }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>Back</Text>
                </Pressable>

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={loading || otpCode.trim().length < 6}
                  style={[
                    styles.button,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      opacity: loading || otpCode.trim().length < 6 ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                      Verify & {isMergeFlow ? 'Merge' : 'Protect'}
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  snapshotCard: {
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  input: {
    marginTop: 16,
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
});
