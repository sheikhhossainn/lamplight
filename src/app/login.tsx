import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AuthBackgroundAnimation } from '@/components/AuthBackgroundAnimation';
import { getSession, sendEmailOtp, verifyEmailOtp } from '@/lib/supabaseAuth';
import {
  executeAccountMerge,
  snapshotLocalData,
  type LocalDataSnapshot,
} from '@/features/account/accountMergeService';
import { triggerSync } from '@/features/sync/syncWorker';
import { useTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSnapshot, setLocalSnapshot] = useState<LocalDataSnapshot | null>(null);

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Snapshot any local reading data so it can be merged safely upon login
      const snapshot = await snapshotLocalData();
      setLocalSnapshot(snapshot);

      const res = await sendEmailOtp(trimmed);
      if (res.success) {
        setStep('otp');
      } else {
        setErrorMessage(res.message || 'Failed to send verification code.');
      }
    } catch {
      setErrorMessage('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedToken = otpCode.trim();
    if (trimmedToken.length < 6) {
      setErrorMessage('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // If there are local items, execute merge to reconcile local and cloud data
      if (
        localSnapshot &&
        (localSnapshot.savedWordsCount > 0 ||
          localSnapshot.highlightsCount > 0 ||
          localSnapshot.booksCount > 0)
      ) {
        const mergeRes = await executeAccountMerge(
          email.trim().toLowerCase(),
          trimmedToken,
          localSnapshot,
        );
        if (mergeRes.success) {
          router.replace('/(tabs)/homescreen');
          return;
        } else {
          setErrorMessage(mergeRes.message || 'Failed to sign in.');
          return;
        }
      }

      // Standard sign in
      const res = await verifyEmailOtp(email.trim().toLowerCase(), trimmedToken);
      if (res.success) {
        const { coordinateAuthTransition } = await import('@/features/account/accountSessionCoordinator');
        const session = await getSession();
        await coordinateAuthTransition({
          newUserId: session.userId,
          type: 'login',
          preserveOutbox: false,
        });
        router.replace('/(tabs)/homescreen');
      } else {
        setErrorMessage(res.message || 'Invalid or expired code.');
      }
    } catch {
      setErrorMessage('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
      <AuthBackgroundAnimation />

      {/* Top Header */}
      <View
        style={[
          styles.headerRow,
          {
            paddingTop: insets.top + 10,
            paddingHorizontal: spacing.xl,
            paddingBottom: 10,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Pressable onPress={() => router.replace('/(tabs)/homescreen')} hitSlop={8}>
          <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 13 }]}>
            Continue as Guest
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing.xxl,
              paddingBottom: insets.bottom + 30,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              typography.wordmark,
              { color: colors.ink, fontSize: 26, lineHeight: 32, textAlign: 'center', marginTop: 16 },
            ]}
          >
            {step === 'email' ? 'Welcome Back' : 'Enter Verification Code'}
          </Text>

          <Text
            style={[
              typography.metadataCaption,
              { color: colors.umber, textAlign: 'center', marginTop: 8, lineHeight: 18, maxWidth: 300 },
            ]}
          >
            {step === 'email'
              ? 'Sign in to access your cloud reading streak, vocabulary notebook, and saved books.'
              : `We sent a 6-digit code to ${email}. Enter it below to sign in.`}
          </Text>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isLamp ? 'rgba(245, 166, 35, 0.22)' : colors.hairline,
                borderRadius: radius.card,
                marginTop: spacing.xl,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isLamp ? 0.35 : 0.06,
                shadowRadius: 16,
                elevation: 4,
              },
            ]}
          >
            {step === 'email' ? (
              <>
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 6 }]}>
                  EMAIL ADDRESS
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
                  placeholder="reader@example.com"
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

                {errorMessage ? (
                  <Text style={[typography.metadataCaption, { color: colors.highlight.clay, marginTop: 8 }]}>
                    {errorMessage}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleSendCode}
                  disabled={loading || !email.trim()}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      marginTop: spacing.lg,
                      opacity: loading || !email.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                      Send Verification Code
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {localSnapshot &&
                  (localSnapshot.savedWordsCount > 0 ||
                    localSnapshot.highlightsCount > 0 ||
                    localSnapshot.booksCount > 0 ||
                    localSnapshot.shelvesCount > 0) && (
                    <View
                      style={[
                        styles.mergePreviewCard,
                        { backgroundColor: colors.parchment, borderColor: colors.hairline },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13 }}>📚</Text>
                        <Text
                          style={[
                            typography.eyebrowLabel,
                            { color: colors.flameAmber, fontSize: 10, letterSpacing: 0.8 },
                          ]}
                        >
                          LOCAL READING MERGE PREVIEW
                        </Text>
                      </View>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.umber, marginTop: 4, lineHeight: 17 },
                        ]}
                      >
                        Your guest reading history will be combined into this account:
                      </Text>
                      <View style={{ marginTop: 6, gap: 2 }}>
                        {localSnapshot.booksCount > 0 && (
                          <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
                            • {localSnapshot.booksCount} reading position{localSnapshot.booksCount === 1 ? '' : 's'}
                          </Text>
                        )}
                        {localSnapshot.savedWordsCount > 0 && (
                          <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
                            • {localSnapshot.savedWordsCount} saved vocabulary word{localSnapshot.savedWordsCount === 1 ? '' : 's'}
                          </Text>
                        )}
                        {localSnapshot.highlightsCount > 0 && (
                          <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
                            • {localSnapshot.highlightsCount} saved quote{localSnapshot.highlightsCount === 1 ? '' : 's'} & highlight{localSnapshot.highlightsCount === 1 ? '' : 's'}
                          </Text>
                        )}
                        {localSnapshot.shelvesCount > 0 && (
                          <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 12 }]}>
                            • {localSnapshot.shelvesCount} shelf{localSnapshot.shelvesCount === 1 ? '' : 'ves'}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.fawn, fontSize: 11, marginTop: 6 },
                        ]}
                      >
                        Existing cloud books and words will merge safely without loss.
                      </Text>
                    </View>
                  )}

                <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 6 }]}>
                  6-DIGIT CODE
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                    {
                      borderColor: colors.hairline,
                      color: colors.ink,
                      backgroundColor: colors.parchment,
                      borderRadius: radius.card,
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={colors.straw}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(text) => {
                    setOtpCode(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                />

                {errorMessage ? (
                  <Text style={[typography.metadataCaption, { color: colors.highlight.clay, marginTop: 8 }]}>
                    {errorMessage}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleVerifyCode}
                  disabled={loading || otpCode.trim().length < 6}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      marginTop: spacing.lg,
                      opacity: loading || otpCode.trim().length < 6 ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                      Verify and Sign In
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStep('email');
                    setOtpCode('');
                    setErrorMessage(null);
                  }}
                  disabled={loading}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                    Change email address
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Switch to Sign Up */}
          <View style={[styles.switchWrap, { marginTop: spacing.xl }]}>
            <Text style={[typography.metadataCaption, { color: colors.umber }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/signup' as any)}>
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                Create an account
              </Text>
            </Pressable>
          </View>

          {/* Legal Links Footer */}
          <View style={[styles.footerLegal, { marginTop: spacing.xxl }]}>
            <Pressable onPress={() => router.push('/terms' as any)}>
              <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 11 }]}>
                Terms & Conditions
              </Text>
            </Pressable>
            <Text style={{ color: colors.straw, marginHorizontal: 8 }}>·</Text>
            <Pressable onPress={() => router.push('/privacy' as any)}>
              <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 11 }]}>
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 16,
  },
  glowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
  },
  primaryButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLegal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergePreviewCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
});
