import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { handleOAuthCallbackUrl, isAuthenticatedAccount } from '@/lib/supabaseAuth';
import { useTheme } from '@/theme/ThemeProvider';

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const { colors, typography, spacing } = useTheme();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialUrl = Linking.useURL();

  useEffect(() => {
    let isMounted = true;

    async function processAuth() {
      try {
        // 1. If already authenticated with a real account, proceed to home
        const isAuth = await isAuthenticatedAccount().catch(() => false);
        if (isAuth) {
          if (isMounted) {
            router.replace('/(tabs)/homescreen');
          }
          return;
        }

        // 2. Extract deep link callback URL
        const incomingUrl = initialUrl || (await Linking.getInitialURL());

        if (incomingUrl && (incomingUrl.includes('#') || incomingUrl.includes('?'))) {
          const res = await handleOAuthCallbackUrl(incomingUrl);
          if (res.success) {
            try {
              const { refreshUserAvatar } = await import('@/features/account/userAvatar');
              await refreshUserAvatar();
            } catch {}
            if (isMounted) {
              router.replace('/(tabs)/homescreen');
            }
            return;
          } else if (res.message) {
            if (isMounted) {
              setErrorMessage(res.message);
            }
            return;
          }
        }

        // 3. Fallback poll in case session was persisted by openAuthSessionAsync
        const retryAuth = await isAuthenticatedAccount().catch(() => false);
        if (retryAuth) {
          if (isMounted) {
            router.replace('/(tabs)/homescreen');
          }
        } else {
          // If no credentials detected after 2 seconds, redirect to login
          const timer = setTimeout(() => {
            if (isMounted) {
              router.replace('/login');
            }
          }, 2000);
          return () => clearTimeout(timer);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage((err as Error)?.message || 'Authentication could not be completed.');
        }
      }
    }

    void processAuth();

    return () => {
      isMounted = false;
    };
  }, [initialUrl]);

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
      <ActivityIndicator size="large" color={colors.flameAmber} />
      <Text style={[typography.uiRowTitle, { color: colors.ink, marginTop: spacing.md }]}>
        {errorMessage ? 'Sign-in Failed' : 'Completing sign-in…'}
      </Text>
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.highlight.clay, textAlign: 'center', marginHorizontal: spacing.lg },
            ]}
          >
            {errorMessage}
          </Text>
          <Text
            onPress={() => router.replace('/login')}
            style={[
              typography.uiRowTitle,
              { color: colors.flameAmber, marginTop: spacing.lg, textDecorationLine: 'underline' },
            ]}
          >
            Return to Login
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
});
