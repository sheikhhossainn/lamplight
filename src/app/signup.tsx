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

import { FlameGlow } from '@/components/FlameGlow';
import { sendEmailOtp, updateUserProfile, verifyEmailOtp } from '@/lib/supabaseAuth';
import {
  executeAccountMerge,
  snapshotLocalData,
  type LocalDataSnapshot,
} from '@/features/account/accountMergeService';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localSnapshot, setLocalSnapshot] = useState<LocalDataSnapshot | null>(null);

  const handleSendCode = async () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Please enter your name or a reading pseudonym.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage('Please review and agree to the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Snapshot any local guest data before sign-up
      const snapshot = await snapshotLocalData();
      setLocalSnapshot(snapshot);

      const res = await sendEmailOtp(trimmedEmail);
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
      const normalizedEmail = email.trim().toLowerCase();

      // If guest has local reading data, execute merge so nothing is lost
      if (
        localSnapshot &&
        (localSnapshot.savedWordsCount > 0 ||
          localSnapshot.highlightsCount > 0 ||
          localSnapshot.booksCount > 0)
      ) {
        const mergeRes = await executeAccountMerge(normalizedEmail, trimmedToken, localSnapshot);
        if (!mergeRes.success) {
          setErrorMessage(mergeRes.message || 'Verification failed.');
          return;
        }
      } else {
        const res = await verifyEmailOtp(normalizedEmail, trimmedToken);
        if (!res.success) {
          setErrorMessage(res.message || 'Invalid or expired code.');
          return;
        }
      }

      // Save user's display name to profile
      if (displayName.trim()) {
        await updateUserProfile(displayName.trim());
      }

      router.replace('/(tabs)/homescreen');
    } catch {
      setErrorMessage('Account creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
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
          <View style={styles.glowWrap}>
            <FlameGlow size={48} variant="flicker" />
          </View>

          <Text
            style={[
              typography.wordmark,
              { color: colors.ink, fontSize: 26, lineHeight: 32, textAlign: 'center', marginTop: 12 },
            ]}
          >
            {step === 'details' ? 'Join Lamplight' : 'Verify Your Email'}
          </Text>

          <Text
            style={[
              typography.metadataCaption,
              { color: colors.umber, textAlign: 'center', marginTop: 8, lineHeight: 18, maxWidth: 300 },
            ]}
          >
            {step === 'details'
              ? 'Create a sanctuary for your reading journey. Back up your notes, streaks, and library.'
              : `Enter the 6-digit confirmation code sent to ${email}.`}
          </Text>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderRadius: radius.card,
                marginTop: spacing.xl,
              },
            ]}
          >
            {step === 'details' ? (
              <>
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 6 }]}>
                  DISPLAY NAME
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.hairline,
                      color: colors.ink,
                      backgroundColor: colors.parchment,
                      borderRadius: radius.card,
                      marginBottom: spacing.md,
                    },
                  ]}
                  placeholder="e.g. Maya or Tagore"
                  placeholderTextColor={colors.straw}
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                />

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

                {/* Consent Checkbox */}
                <Pressable
                  onPress={() => {
                    setAcceptedTerms(!acceptedTerms);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  style={styles.checkboxRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: acceptedTerms ? colors.flameAmber : colors.straw,
                        backgroundColor: acceptedTerms ? colors.flameAmber : 'transparent',
                        borderRadius: 4,
                      },
                    ]}
                  >
                    {acceptedTerms ? (
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17l-5-5"
                          stroke={colors.primaryDark}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.umber, fontSize: 12, flex: 1, lineHeight: 17 },
                    ]}
                  >
                    I agree to the{' '}
                    <Text
                      style={{ color: colors.flameAmber, textDecorationLine: 'underline' }}
                      onPress={() => router.push('/terms' as any)}
                    >
                      Terms of Service
                    </Text>{' '}
                    and acknowledge the{' '}
                    <Text
                      style={{ color: colors.flameAmber, textDecorationLine: 'underline' }}
                      onPress={() => router.push('/privacy' as any)}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </Pressable>

                {errorMessage ? (
                  <Text style={[typography.metadataCaption, { color: colors.highlight.clay, marginTop: 8 }]}>
                    {errorMessage}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleSendCode}
                  disabled={loading || !email.trim() || !displayName.trim()}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      marginTop: spacing.lg,
                      opacity: loading || !email.trim() || !displayName.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}>
                      Continue
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
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
                      Complete Account Creation
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStep('details');
                    setOtpCode('');
                    setErrorMessage(null);
                  }}
                  disabled={loading}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                    Edit account details
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Switch to Sign In */}
          <View style={[styles.switchWrap, { marginTop: spacing.xl }]}>
            <Text style={[typography.metadataCaption, { color: colors.umber }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/login' as any)}>
              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                Sign in
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
});
