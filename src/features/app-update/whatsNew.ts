import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { getSetting, setSetting } from '@/db/repositories/appSettings';

// Runtime release-keyed What's New settings keys (Section 9.4)
export const KEY_INSTALL_RELEASE_KEY = 'whats_new.install_release_key';
export const KEY_LAST_OBSERVED_RELEASE_KEY = 'whats_new.last_observed_release_key';
export const KEY_LAST_SEEN_ANNOUNCEMENT_ID = 'whats_new.last_seen_announcement_id';
export const KEY_PENDING_ANNOUNCEMENT_ID = 'whats_new.pending_announcement_id';

// Legacy key for migration
const LEGACY_STORAGE_KEY = 'last_seen_whats_new';

export type ChangelogEntry = {
  // Developer-authored announcement ID (e.g. '1', '2026-09-identity')
  version: string;
  headline: string;
  changes: string[];
};

// Newest first. Only the top entry is ever shown — someone who skipped two
// updates in a row sees one card for the latest, not a backlog.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1',
    headline: "What's new",
    changes: [
      'Added Torah and Vedas readers',
      'Added mood-based verse recommendations',
      'Added flashcard deck review nudges',
    ],
  },
];

let lastSeenAnnouncementId: string | null = null;
let pendingAnnouncementId: string | null = null;
let hydrated = false;

/**
 * Computes the runtime release key for the running app.
 * Prefers applied OTA updateId, falls back to native version + build.
 */
export function getRuntimeReleaseKey(): string {
  if (Updates.updateId) {
    return `ota-${Updates.updateId}`;
  }
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.expoConfig?.android?.versionCode ??
    Constants.expoConfig?.ios?.buildNumber ??
    '1';
  return `v${version}+${build}`;
}

export async function hydrateWhatsNewStatus(): Promise<void> {
  if (hydrated) return;

  const currentReleaseKey = getRuntimeReleaseKey();
  const [
    storedInstallKey,
    storedLastObservedKey,
    storedLastSeenId,
    storedPendingId,
    legacyLastSeen,
    onboardingCompleted,
    legacyOnboarded,
  ] = await Promise.all([
    getSetting(KEY_INSTALL_RELEASE_KEY),
    getSetting(KEY_LAST_OBSERVED_RELEASE_KEY),
    getSetting(KEY_LAST_SEEN_ANNOUNCEMENT_ID),
    getSetting(KEY_PENDING_ANNOUNCEMENT_ID),
    getSetting(LEGACY_STORAGE_KEY),
    getSetting('onboarding.completed'),
    getSetting('has_onboarded'),
  ]);

  const isOnboarded = onboardingCompleted === '1' || legacyOnboarded === '1';
  const latestAnnouncement = CHANGELOG[0];
  const effectiveLastSeen = storedLastSeenId ?? legacyLastSeen;

  if (!storedInstallKey && !isOnboarded) {
    // 1. Fresh install: seed current release as install and current announcement as seen.
    // What's New must never impersonate onboarding (Section 9.4.1).
    const latestVersion = latestAnnouncement?.version ?? '';
    lastSeenAnnouncementId = latestVersion;
    pendingAnnouncementId = null;

    await Promise.all([
      setSetting(KEY_INSTALL_RELEASE_KEY, currentReleaseKey),
      setSetting(KEY_LAST_OBSERVED_RELEASE_KEY, currentReleaseKey),
      setSetting(KEY_LAST_SEEN_ANNOUNCEMENT_ID, latestVersion),
      setSetting(KEY_PENDING_ANNOUNCEMENT_ID, ''),
    ]);
  } else {
    // 2. Existing install
    lastSeenAnnouncementId = effectiveLastSeen;

    if (storedPendingId && storedPendingId.length > 0) {
      // Pending announcement waiting for dismissal
      pendingAnnouncementId = storedPendingId;
    } else if (storedLastObservedKey && storedLastObservedKey !== currentReleaseKey) {
      // New release key applied
      if (latestAnnouncement && latestAnnouncement.version !== effectiveLastSeen) {
        pendingAnnouncementId = latestAnnouncement.version;
        await setSetting(KEY_PENDING_ANNOUNCEMENT_ID, latestAnnouncement.version);
      }
      await setSetting(KEY_LAST_OBSERVED_RELEASE_KEY, currentReleaseKey);
    } else if (!storedLastObservedKey) {
      // First migration on an existing installed build
      await Promise.all([
        setSetting(KEY_INSTALL_RELEASE_KEY, currentReleaseKey),
        setSetting(KEY_LAST_OBSERVED_RELEASE_KEY, currentReleaseKey),
      ]);
    }
  }

  hydrated = true;
}

export function getPendingWhatsNew(): ChangelogEntry | null {
  if (!pendingAnnouncementId) return null;
  const latest = CHANGELOG[0];
  if (!latest || latest.version !== pendingAnnouncementId) return null;
  return latest;
}

export function markWhatsNewSeen(version: string): void {
  lastSeenAnnouncementId = version;
  pendingAnnouncementId = null;
  void Promise.all([
    setSetting(KEY_LAST_SEEN_ANNOUNCEMENT_ID, version),
    setSetting(KEY_PENDING_ANNOUNCEMENT_ID, ''),
    setSetting(LEGACY_STORAGE_KEY, version),
  ]);
}

export function resetWhatsNewForTesting(): void {
  pendingAnnouncementId = CHANGELOG[0]?.version ?? null;
  lastSeenAnnouncementId = null;
  void Promise.all([
    setSetting(KEY_LAST_SEEN_ANNOUNCEMENT_ID, ''),
    setSetting(KEY_PENDING_ANNOUNCEMENT_ID, pendingAnnouncementId ?? ''),
  ]);
}
