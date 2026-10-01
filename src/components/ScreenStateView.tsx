import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, CloseIcon, LibraryIcon, ReloadIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

export type ScreenStateType =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'permission_denied'
  | 'free_limit'
  | 'premium_locked';

export type ScreenStateViewProps = {
  type: ScreenStateType;
  title: string;
  message?: string;
  fullScreen?: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  customIcon?: React.ReactNode;
  quota?: {
    used: number;
    total: number;
    resetsAt?: string;
  };
  style?: ViewStyle;
};

/**
 * Standardized, accessible, token-adherent state view for Lamplight screens.
 * Covers loading, empty, error, offline, permission, free-limit, and premium-locked states (POLISH-01).
 */
export function ScreenStateView({
  type,
  title,
  message,
  fullScreen = false,
  canGoBack = false,
  onBack,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  customIcon,
  quota,
  style,
}: ScreenStateViewProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = onBack ?? (() => router.back());

  const getA11yRole = (): 'alert' | 'summary' => {
    switch (type) {
      case 'error':
      case 'permission_denied':
      case 'free_limit':
        return 'alert';
      case 'loading':
      case 'offline':
      case 'empty':
      case 'premium_locked':
      default:
        return 'summary';
    }
  };

  const renderIcon = () => {
    if (customIcon) return customIcon;

    switch (type) {
      case 'loading':
        return <ActivityIndicator size="large" color={colors.flameAmber} />;
      case 'empty':
        return <LibraryIcon color={colors.fawn} size={32} />;
      case 'error':
        return (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(201, 126, 126, 0.15)', borderColor: colors.highlight.clay },
            ]}
          >
            <CloseIcon color={colors.highlight.clay} size={20} />
          </View>
        );
      case 'offline':
        return (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(143, 166, 201, 0.15)', borderColor: colors.highlight.dusk },
            ]}
          >
            <Text style={{ fontSize: 18, color: colors.highlight.dusk }}>☁</Text>
          </View>
        );
      case 'permission_denied':
        return (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(245, 166, 35, 0.15)', borderColor: colors.flameAmber },
            ]}
          >
            <Text style={{ fontSize: 18, color: colors.flameAmber }}>!</Text>
          </View>
        );
      case 'free_limit':
      case 'premium_locked':
        return (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(245, 166, 35, 0.15)', borderColor: colors.flameAmber },
            ]}
          >
            <Text style={{ fontSize: 18, color: colors.flameAmber }}>✦</Text>
          </View>
        );
    }
  };

  const content = (
    <View
      accessible
      accessibilityRole={getA11yRole()}
      accessibilityLabel={`${title}. ${message ?? ''}`}
      style={[
        styles.innerContainer,
        !fullScreen && {
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          borderRadius: radius.card,
          padding: spacing.xl,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.iconWrapper}>{renderIcon()}</View>

      <Text
        accessibilityRole="header"
        style={[
          fullScreen ? typography.screenTitle : typography.uiRowTitle,
          { color: colors.ink, textAlign: 'center', marginTop: spacing.md },
        ]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.umber, textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {quota ? (
        <View
          style={[
            styles.quotaBox,
            { backgroundColor: colors.segmentedTrack, borderRadius: radius.card, marginTop: spacing.md },
          ]}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
            DAILY LIMIT: {quota.used} OF {quota.total} USED
          </Text>
          {quota.resetsAt ? (
            <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
              Resets {quota.resetsAt}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={[styles.actionRow, { marginTop: spacing.lg }]}>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
            ]}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}

        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
            onPress={onSecondaryAction}
            style={[
              styles.secondaryBtn,
              {
                borderColor: colors.hairline,
                backgroundColor: colors.card,
                borderRadius: radius.pill,
                marginTop: actionLabel ? spacing.sm : 0,
              },
            ]}
          >
            <Text style={[typography.buttonLabel, { color: colors.ink }]}>
              {secondaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (!fullScreen) {
    return <View style={[styles.inlineWrapper, style]}>{content}</View>;
  }

  return (
    <View
      style={[
        styles.fullScreenRoot,
        {
          backgroundColor: colors.libraryBackground,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20,
        },
        style,
      ]}
    >
      {canGoBack ? (
        <View style={[styles.topBar, { borderBottomColor: colors.hairline }]}>
          <Pressable
            hitSlop={12}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <ChevronLeftIcon color={colors.ink} size={20} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.fullScreenCenter}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
  },
  inlineWrapper: {
    width: '100%',
  },
  topBar: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionRow: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    borderWidth: 1,
  },
});
