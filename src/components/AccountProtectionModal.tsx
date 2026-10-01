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
import Svg, { Path } from 'react-native-svg';

import { linkEmailToGuest, sendEmailOtp, signInWithGoogle, verifyGuestEmailLink } from '@/lib/supabaseAuth';
import {
  executeAccountMerge,
  snapshotLocalData,
  type LocalDataSnapshot,
} from '@/features/account/accountMergeService';
import { triggerSync } from '@/features/sync/syncWorker';
import { useTheme } from '@/theme/ThemeProvider';

export type AccountTriggerReason =
  | 'vocab_limit'
  | 'quotes_limit'
  | 'translation_cap'
  | 'quiz_gate'
  | 'general';

const TRIGGER_CONTENT: Record<
  AccountTriggerReason,
  { title: string; subtitle: string; highlight: string }
> = {
  vocab_limit: {
    title: 'Expand Your Vocabulary Sanctuary',
    subtitle:
      "Guest readers can save up to 15 words per book. Create a free account to unlock 30 words per book, weekly flashcard quizzes, and automatic cloud backup.",
    highlight: 'Unlock 30 words per book & weekly reviews',
  },
  quotes_limit: {
    title: 'Keep More Memorable Passages',
    subtitle:
      "Guest readers can save up to 5 quotes per book. Create a free account to save up to 15 quotes per book and sync them across all your devices.",
    highlight: 'Unlock 15 quotes per book & cloud sync',
  },
  translation_cap: {
    title: "Today's Guest Lookups Reached",
    subtitle:
      "Guest readers receive 20 translations per day. Create a free account to expand to 50 translations daily, unlock weekly reviews, and save your progress.",
    highlight: 'Unlock 50 daily translations & weekly quizzes',
  },
  quiz_gate: {
    title: 'Unlock Weekly Vocabulary Reviews',
    subtitle:
      'Turn your reading into lifelong memory with gentle weekly quizzes. Create a free account to unlock your personalized quiz shelf and cloud sync.',
    highlight: 'Unlock personalized quizzes & 50 daily lookups',
  },
  general: {
    title: 'Protect and sync your library',
    subtitle:
      'Link an email to back up your saved words, reading positions, and highlights across devices with free cloud sync.',
    highlight: 'Free cloud backup & 50 daily translations',
  },
};

type AccountProtectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  trigger?: AccountTriggerReason;
  customTitle?: string;
  customSubtitle?: string;
};

type Step = 'email' | 'merge_prompt' | 'otp';

export function AccountProtectionModal({
  visible,
  onClose,
  onSuccess,
  trigger = 'general',
  customTitle,
  customSubtitle,
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

  const handleGoogleProtect = async () => {
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const snapshot = await snapshotLocalData().catch(() => null);
      const res = await signInWithGoogle({ snapshot: snapshot || undefined });

      if (res.success) {
        setIsError(false);
        setMessage('Account protected successfully! Your library is backed up.');
        onSuccess?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (!res.cancelled) {
        setIsError(true);
        setMessage(res.message || 'Google authentication could not be completed.');
      }
    } catch (err: unknown) {
      setIsError(true);
      setMessage((err as Error)?.message || 'Google sign-in error occurred.');
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
          void triggerSync({ forceImmediate: true });
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

  const activeConfig = TRIGGER_CONTENT[trigger ?? 'general'];
  const title = customTitle ?? activeConfig.title;
  const subtitle = customSubtitle ?? activeConfig.subtitle;

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
                {title}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
                {subtitle}
              </Text>

              <View
                style={{
                  backgroundColor: colors.parchment,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: radius.card,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  marginBottom: spacing.xs,
                }}
              >
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.flameAmber, fontSize: 9, marginBottom: 6 },
                  ]}
                >
                  FREE ACCOUNT INCLUDES
                </Text>
                <View style={{ gap: 4 }}>
                  <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11 }]}>
                    ⚡ 50 daily translations (up from 20)
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11 }]}>
                    📖 30 words & 15 quotes saved per book
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11 }]}>
                    🧠 Weekly vocabulary review & quizzes
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 11 }]}>
                    ☁️ Seamless cross-device reading sync
                  </Text>
                </View>
              </View>

              {/* Google One-Tap Protect */}
              <Pressable
                onPress={handleGoogleProtect}
                disabled={loading}
                style={({ pressed }) => [
                  styles.googleButton,
                  {
                    borderColor: colors.hairline,
                    backgroundColor: '#FFFFFF',
                    borderRadius: radius.pill,
                    opacity: pressed || loading ? 0.75 : 1,
                  },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                  />
                  <Path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z"
                  />
                  <Path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </Svg>
                <Text
                  style={[
                    typography.buttonLabel,
                    { color: colors.ink, fontSize: 13, marginLeft: 8 },
                  ]}
                >
                  Protect with Google
                </Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.fawn, fontSize: 11, marginHorizontal: 10 },
                  ]}
                >
                  or with email
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
              </View>

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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
