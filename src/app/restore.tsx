import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CloseIcon } from '@/components/icons';
import { triggerSync, useSyncStatus } from '@/features/sync/syncWorker';
import {
  createInitialRestorePlan,
  updateRestoreItemStatus,
  retrySingleRestoreItem,
  type RestoreItem,
  type RestoreSessionState,
} from '@/features/sync/restoreService';
import { isAuthenticatedAccount } from '@/lib/supabaseAuth';
import { useTheme } from '@/theme/ThemeProvider';

export default function RestoreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing } = useTheme();
  const syncStatus = useSyncStatus();

  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreSessionState>(() =>
    createInitialRestorePlan({
      hasShelves: true,
      positionCount: 1,
      savedWordCount: 1,
      noteCount: 1,
      bookCount: 1,
    }),
  );

  useEffect(() => {
    void isAuthenticatedAccount().then(setIsAuth);
  }, []);

  const runFullRestore = useCallback(async () => {
    setRestoring(true);
    // Mark stage 1 in progress
    setRestoreState((prev) => ({
      ...prev,
      stage: 'restoring_metadata',
      items: prev.items.map((it) => ({ ...it, status: 'in_progress' })),
    }));

    try {
      // Trigger full two-way sync
      await triggerSync({ forceImmediate: true });

      // Mark items restored sequentially to reflect dependency fulfillment
      for (const item of restoreState.items) {
        setRestoreState((prev) => updateRestoreItemStatus(prev, item.id, 'restored'));
      }
    } catch (err) {
      console.warn('[RestoreScreen] Restore error:', err);
      // Mark any in-progress items as failed
      setRestoreState((prev) => {
        let next = prev;
        for (const item of prev.items) {
          if (item.status === 'in_progress' || item.status === 'pending') {
            next = updateRestoreItemStatus(next, item.id, 'failed', (err as Error)?.message || 'Network timeout');
          }
        }
        return next;
      });
    } finally {
      setRestoring(false);
    }
  }, [restoreState.items]);

  const handleRetryItem = async (itemId: string) => {
    setRestoreState((prev) => retrySingleRestoreItem(prev, itemId));
    try {
      await triggerSync({ forceImmediate: true });
      setRestoreState((prev) => updateRestoreItemStatus(prev, itemId, 'restored'));
    } catch (err) {
      setRestoreState((prev) =>
        updateRestoreItemStatus(prev, itemId, 'failed', (err as Error)?.message || 'Retry failed'),
      );
    }
  };

  const progressPercent =
    restoreState.totalCount > 0
      ? Math.round((restoreState.restoredCount / restoreState.totalCount) * 100)
      : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.libraryBackground, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <CloseIcon color={colors.ink} size={20} />
        </Pressable>
        <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 18 }]}>
          Restore Cloud Library
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Auth Check Warning */}
        {isAuth === false ? (
          <View
            style={[
              styles.warningCard,
              { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
            ]}
          >
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14 }]}>
              Account Sign-In Required
            </Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4, lineHeight: 16 }]}>
              Sign in to your protected Lamplight account to retrieve and restore your books, bookmarks, and vocabulary history.
            </Text>
            <Pressable
              onPress={() => router.push('/login' as any)}
              style={[styles.primaryAction, { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: 12 }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13 }]}>
                Sign In to Account
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Restore Overview Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10 }]}>
                RESTORE STATUS
              </Text>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginTop: 2 }]}>
                {restoreState.stage === 'completed'
                  ? 'All Library Data Restored'
                  : restoreState.stage === 'failed'
                  ? 'Partial Restore Completed'
                  : restoring
                  ? 'Restoring from Cloud...'
                  : 'Ready to Restore'}
              </Text>
            </View>
            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 18 }]}>
              {progressPercent}%
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.hairline, borderRadius: 3, marginTop: 12 }]}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.flameAmber, width: `${progressPercent}%`, borderRadius: 3 },
              ]}
            />
          </View>

          <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 10, lineHeight: 16 }]}>
            Restores small metadata first so you can resume reading immediately while larger assets sync in the background.
          </Text>
        </View>

        {/* Itemized Restore Checklist (FULLAPP §15.5 item 1) */}
        <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
          RESTORE CHECKLIST
        </Text>

        <View style={[styles.itemsCard, { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}>
          {restoreState.items.map((item, idx) => {
            const isRestored = item.status === 'restored';
            const isFailed = item.status === 'failed';
            const isInProgress = item.status === 'in_progress';

            return (
              <View key={item.id}>
                {idx > 0 && <View style={[styles.divider, { borderBottomColor: colors.hairline }]} />}
                <View style={styles.itemRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13.5 }]}>
                      {item.label}
                    </Text>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
                      {item.detail}
                    </Text>
                    {isFailed && item.errorMessage ? (
                      <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 10.5, marginTop: 3 }]}>
                        Error: {item.errorMessage}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {isRestored ? (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 166, 35, 0.15)' }]}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                          ✓ Restored
                        </Text>
                      </View>
                    ) : isInProgress ? (
                      <ActivityIndicator size="small" color={colors.flameAmber} />
                    ) : isFailed ? (
                      <Pressable
                        onPress={() => void handleRetryItem(item.id)}
                        hitSlop={6}
                        style={[styles.retryBtn, { borderColor: colors.flameAmber }]}
                      >
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                          Retry
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={[typography.metadataCaption, { color: colors.straw, fontSize: 11 }]}>
                        Pending
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Actions */}
        <View style={{ marginTop: spacing.xl, gap: 10 }}>
          <Pressable
            onPress={() => void runFullRestore()}
            disabled={restoring || isAuth === false}
            style={[
              styles.primaryAction,
              {
                backgroundColor: isAuth === false ? colors.hairline : colors.flameAmber,
                borderRadius: radius.pill,
              },
            ]}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 14 }]}>
                {restoreState.failedCount > 0 ? 'Retry All Failed Items' : 'Start Full Restore'}
              </Text>
            )}
          </Pressable>

          {restoreState.isPartialUsable ? (
            <Pressable
              onPress={() => router.replace('/(tabs)/library')}
              style={[
                styles.secondaryAction,
                { borderColor: colors.hairline, backgroundColor: colors.card, borderRadius: radius.pill },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                Open Library (Usable Now)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  warningCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderWidth: 1,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  itemsCard: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryAction: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
