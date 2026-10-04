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
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  getSession,
  sendEmailOtp,
  signInWithGoogle,
  updateUserProfile,
  verifyEmailOtp,
} from '@/lib/supabaseAuth';
import {
  executeAccountMerge,
  snapshotLocalData,
  type LocalDataSnapshot,
} from '@/features/account/accountMergeService';
import { triggerSync } from '@/features/sync/syncWorker';
import { FlameGlow } from '@/components/FlameGlow';
import { UserAvatar } from '@/components/UserAvatar';
import {
  PRESET_AVATARS,
  setUserAvatar,
  refreshUserAvatar,
} from '@/features/account/userAvatar';
import { useTheme } from '@/theme/ThemeProvider';

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
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
  );
}

export type AuthCardProps = {
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onSkip?: () => void;
  showSkipButton?: boolean;
  skipButtonLabel?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export function AuthCard({
  initialMode = 'signin',
  onSuccess,
  onSkip,
  showSkipButton = true,
  skipButtonLabel = 'Continue as Guest',
  title,
  subtitle,
  compact = false,
}: AuthCardProps) {
  const { colors, typography, radius, spacing, scheme } = useTheme();
  const isLamp = scheme === 'lamp';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('flame');

  // Status
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [localSnapshot, setLocalSnapshot] = useState<LocalDataSnapshot | null>(null);

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    if (newMode === mode) return;
    void Haptics.selectionAsync();
    setMode(newMode);
    setStep('form');
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading || emailLoading) return;
    setGoogleLoading(true);
    setErrorMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Snapshot local reading records before authentication
      const snapshot = await snapshotLocalData().catch(() => null);
      const res = await signInWithGoogle({ snapshot: snapshot || undefined });

      if (res.success) {
        await refreshUserAvatar().catch(() => {});
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.();
      } else if (!res.cancelled) {
        setErrorMessage(res.message || 'Google sign-in could not be completed.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Unable to connect to Google authentication.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setErrorMessage('Please provide your name or reading pseudonym.');
      return;
    }

    setEmailLoading(true);
    setErrorMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const snapshot = await snapshotLocalData().catch(() => null);
      setLocalSnapshot(snapshot);

      const res = await sendEmailOtp(trimmedEmail);
      if (res.success) {
        setStep('otp');
        setSuccessNotice(`Verification code sent to ${trimmedEmail}`);
      } else {
        setErrorMessage(res.message || 'Failed to send verification code.');
      }
    } catch {
      setErrorMessage('Network error. Please check your internet connection.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedToken = otpCode.trim();
    if (trimmedToken.length < 6) {
      setErrorMessage('Please enter the full 6-digit code.');
      return;
    }

    setEmailLoading(true);
    setErrorMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // If guest has local reading data, merge with cloud account
      let snapshot = localSnapshot;
      if (!snapshot) {
        snapshot = await snapshotLocalData().catch(() => null);
      }
      if (
        snapshot &&
        (snapshot.savedWordsCount > 0 ||
          snapshot.highlightsCount > 0 ||
          snapshot.booksCount > 0 ||
          snapshot.shelvesCount > 0 ||
          snapshot.readingSessionsCount > 0)
      ) {
        const mergeRes = await executeAccountMerge(normalizedEmail, trimmedToken, snapshot);
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

      // If in sign-up mode and display name was provided, persist to profile
      if (mode === 'signup') {
        if (displayName.trim()) {
          await updateUserProfile(displayName.trim()).catch(() => {});
        }
        await setUserAvatar(`preset:${selectedAvatar}`).catch(() => {});
      }

      // Coordinate auth transition
      const { coordinateAuthTransition } = await import('@/features/account/accountSessionCoordinator');
      const session = await getSession();
      await coordinateAuthTransition({
        newUserId: session.userId,
        type: mode === 'signup' ? 'protect' : 'login',
        preserveOutbox: true,
      }).catch(() => {});

      await refreshUserAvatar().catch(() => {});

      void triggerSync();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
    } catch {
      setErrorMessage('Authentication failed. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrap}
    >
      <Animated.View
        layout={LinearTransition.springify().damping(22).stiffness(180)}
        style={[
          styles.card,
          {
            backgroundColor: isLamp ? colors.card : '#FFFFFF',
            borderColor: isLamp ? 'rgba(245, 166, 35, 0.22)' : colors.hairline,
            borderRadius: radius.card + 4,
            padding: compact ? spacing.lg : spacing.xl,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isLamp ? 0.4 : 0.07,
            shadowRadius: 18,
            elevation: 5,
          },
        ]}
      >
        {/* Flame Header Icon */}
        <View style={styles.headerIconRow}>
          <FlameGlow size={42} variant="flicker" showTile={false} />
        </View>

        {/* Card Title & Description */}
        <Animated.View layout={LinearTransition.springify().damping(22).stiffness(180)} style={{ alignItems: 'center' }}>
          <Text
            style={[
              typography.wordmark,
              {
                color: colors.ink,
                fontSize: compact ? 20 : 23,
                lineHeight: 28,
                textAlign: 'center',
                marginTop: spacing.xs,
              },
            ]}
          >
            {title || (mode === 'signin' ? 'Welcome Back' : 'Create an Account')}
          </Text>

          <Text
            style={[
              typography.metadataCaption,
              {
                color: colors.fawn,
                textAlign: 'center',
                marginTop: 4,
                marginBottom: spacing.lg,
                lineHeight: 18,
                fontSize: 12,
              },
            ]}
          >
            {subtitle ||
              (mode === 'signin'
                ? 'Sign in to access your cloud reading streak, vocabulary notebook & library.'
                : 'Save reading progress, access 50 daily translations & sync across devices.')}
          </Text>
        </Animated.View>

        {/* Segmented Mode Switcher (Sign In vs Create Account) */}
        {step === 'form' ? (
          <View
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: isLamp ? '#1B1A1E' : colors.parchment,
                borderColor: colors.hairline,
                borderRadius: radius.pill,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <Pressable
              onPress={() => handleModeChange('signin')}
              style={[
                styles.segmentTab,
                mode === 'signin' && {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: mode === 'signin' ? colors.primaryDark : colors.fawn,
                    fontSize: 13,
                    fontWeight: mode === 'signin' ? '700' : '400',
                  },
                ]}
              >
                Sign In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleModeChange('signup')}
              style={[
                styles.segmentTab,
                mode === 'signup' && {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: mode === 'signup' ? colors.primaryDark : colors.fawn,
                    fontSize: 13,
                    fontWeight: mode === 'signup' ? '700' : '400',
                  },
                ]}
              >
                Create Account
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Google OAuth Button */}
        {step === 'form' ? (
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={googleLoading || emailLoading}
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: isLamp ? '#232026' : '#FFFFFF',
                borderColor: isLamp ? 'rgba(255, 255, 255, 0.12)' : colors.hairline,
                borderRadius: radius.pill,
                opacity: pressed || googleLoading ? 0.8 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.flameAmber} />
            ) : (
              <>
                <GoogleIcon />
                <Text
                  style={[
                    typography.buttonLabel,
                    {
                      color: colors.ink,
                      fontSize: 14,
                      marginLeft: 10,
                      letterSpacing: 0.2,
                    },
                  ]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        ) : null}

        {/* Divider */}
        {step === 'form' ? (
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.fawn, fontSize: 11, marginHorizontal: 12 },
              ]}
            >
              or with email
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
          </View>
        ) : null}

        {/* Error / Notice Banners */}
        {errorMessage ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: 'rgba(201, 126, 126, 0.12)',
                borderColor: colors.highlight.clay,
              },
            ]}
          >
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.highlight.clay, fontSize: 12, lineHeight: 16 },
              ]}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {successNotice ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: 'rgba(127, 163, 122, 0.12)',
                borderColor: colors.highlight.sage,
              },
            ]}
          >
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.highlight.sage, fontSize: 12, lineHeight: 16 },
              ]}
            >
              {successNotice}
            </Text>
          </View>
        ) : null}

        {/* Step 1: Email Form */}
        {step === 'form' ? (
          <Animated.View
            layout={LinearTransition.springify().damping(22).stiffness(180)}
            style={styles.formContainer}
          >
            {mode === 'signup' ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(160)}
                layout={LinearTransition.springify().damping(22).stiffness(180)}
              >
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[typography.eyebrowLabel, { color: colors.fawn, letterSpacing: 0.8 }]}>
                      CHOOSE YOUR AVATAR
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                      {PRESET_AVATARS.find((p) => p.id === selectedAvatar)?.label}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.avatarScrollRow}
                  >
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = selectedAvatar === preset.id;
                      return (
                        <Pressable
                          key={preset.id}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setSelectedAvatar(preset.id);
                          }}
                          style={[
                            styles.avatarOption,
                            {
                              borderColor: isSelected ? colors.flameAmber : 'transparent',
                              borderWidth: 2,
                            },
                          ]}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={preset.label}
                        >
                          <UserAvatar avatar={preset.id} size={40} focused={isSelected} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 5, letterSpacing: 0.8 }]}>
                    YOUR READING NAME
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.hairline,
                        color: colors.ink,
                        backgroundColor: isLamp ? '#1E1B22' : colors.parchment,
                        borderRadius: radius.card,
                      },
                    ]}
                    placeholder="e.g. Ishmael or Eleanor"
                    placeholderTextColor={colors.straw}
                    autoCapitalize="words"
                    autoCorrect={false}
                    value={displayName}
                    onChangeText={(val) => {
                      setDisplayName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!emailLoading}
                  />
                </View>
              </Animated.View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 5 }]}>
                EMAIL ADDRESS
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.hairline,
                    color: colors.ink,
                    backgroundColor: isLamp ? '#1E1B22' : colors.parchment,
                    borderRadius: radius.card,
                  },
                ]}
                placeholder="reader@example.com"
                placeholderTextColor={colors.straw}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!emailLoading}
              />
            </View>

            <Pressable
              onPress={handleSendEmailCode}
              disabled={emailLoading || !email.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  opacity: pressed || emailLoading || !email.trim() ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
            >
              {emailLoading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text
                  style={[
                    typography.buttonLabel,
                    {
                      color: colors.primaryDark,
                      fontSize: 14,
                      letterSpacing: 0.4,
                      fontWeight: '600',
                    },
                  ]}
                >
                  Send Verification Code
                </Text>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          /* Step 2: OTP Verification */
          <Animated.View
            entering={FadeIn.duration(220)}
            layout={LinearTransition.springify().damping(22).stiffness(180)}
            style={styles.formContainer}
          >
            <View style={styles.inputGroup}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: 5 }]}>
                6-DIGIT VERIFICATION CODE
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  {
                    borderColor: colors.flameAmber,
                    color: colors.ink,
                    backgroundColor: isLamp ? '#1E1B22' : colors.parchment,
                    borderRadius: radius.card,
                  },
                ]}
                placeholder="······"
                placeholderTextColor={colors.straw}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChangeText={(val) => {
                  setOtpCode(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!emailLoading}
              />
            </View>

            <Pressable
              onPress={handleVerifyOtp}
              disabled={emailLoading || otpCode.trim().length < 6}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  opacity: pressed || emailLoading || otpCode.trim().length < 6 ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
            >
              {emailLoading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text
                  style={[
                    typography.buttonLabel,
                    {
                      color: colors.primaryDark,
                      fontSize: 14,
                      letterSpacing: 0.4,
                      fontWeight: '600',
                    },
                  ]}
                >
                  Verify & Enter
                </Text>
              )}
            </Pressable>

            <View style={styles.otpActionsRow}>
              <Pressable
                onPress={() => {
                  setStep('form');
                  setOtpCode('');
                  setErrorMessage(null);
                }}
                hitSlop={8}
              >
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.fawn, textDecorationLine: 'underline', fontSize: 12 },
                  ]}
                >
                  Change email
                </Text>
              </Pressable>

              <Pressable onPress={handleSendEmailCode} hitSlop={8} disabled={emailLoading}>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.flameAmber, textDecorationLine: 'underline', fontSize: 12 },
                  ]}
                >
                  Resend code
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Skip / Continue as Guest Option */}
        {showSkipButton ? (
          <View style={styles.skipContainer}>
            <View style={[styles.skipDivider, { backgroundColor: colors.hairline }]} />
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                onSkip?.();
              }}
              style={({ pressed }) => [
                styles.skipButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: isLamp ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: radius.pill,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={skipButtonLabel}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: colors.fawn,
                    fontSize: 13,
                    textAlign: 'center',
                    fontWeight: '500',
                  },
                ]}
              >
                {skipButtonLabel}
              </Text>
            </Pressable>
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.straw, fontSize: 11, textAlign: 'center', marginTop: 4 },
              ]}
            >
              Explore books, scriptures & word lookups without an account
            </Text>
          </View>
        ) : null}

        {/* Legal Caption */}
        <Text
          style={[
            typography.metadataCaption,
            {
              color: colors.straw,
              fontSize: 10,
              textAlign: 'center',
              marginTop: spacing.md,
              lineHeight: 14,
            },
          ]}
        >
          By continuing, you agree to Lamplight's Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderWidth: 1,
  },
  headerIconRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 13,
  },
  avatarScrollRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  avatarOption: {
    padding: 2,
    borderRadius: 24,
  },
  input: {
    height: 46,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  skipContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  skipDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  skipButton: {
    width: '100%',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
});
