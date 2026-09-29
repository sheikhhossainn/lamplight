import { router, useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AuthBackgroundAnimation } from '@/components/AuthBackgroundAnimation';
import { AuthCard } from '@/components/AuthCard';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isProtectMode = mode === 'protect';

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

        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 13 }]}>
            {isProtectMode ? 'Cancel' : 'Continue as Guest'}
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
              paddingHorizontal: spacing.xl,
              paddingBottom: insets.bottom + 30,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthCard
            initialMode="signup"
            title={isProtectMode ? 'Protect Your Library' : 'Create an Account'}
            subtitle={
              isProtectMode
                ? 'Back up your saved words, highlights, and reading streaks with Google or Email.'
                : 'Save reading progress, access 50 daily translations & sync across devices.'
            }
            onSuccess={() => {
              if (isProtectMode) {
                router.back();
              } else {
                router.replace('/(tabs)/homescreen');
              }
            }}
            onSkip={() => {
              if (isProtectMode) {
                router.back();
              } else {
                router.replace('/(tabs)/homescreen');
              }
            }}
            showSkipButton={false}
          />
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
    justifyContent: 'center',
    paddingTop: 16,
    flexGrow: 1,
  },
});
