import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getRuntimeReleaseKey } from '@/features/app-update/whatsNew';

// Monotonic onboarding lifecycle settings keys (Section 9.1)
export const KEY_ONBOARDING_COMPLETED = 'onboarding.completed';
export const KEY_ONBOARDING_SCHEMA_VERSION = 'onboarding.schema_version';
export const KEY_ONBOARDING_COMPLETED_AT = 'onboarding.completed_at';
export const KEY_INSTALLATION_ID = 'installation.id';
export const KEY_FIRST_RELEASE_KEY = 'installation.first_release_key';

// Legacy key preserved for backward compatibility
const LEGACY_STORAGE_KEY = 'has_onboarded';

const CURRENT_SCHEMA_VERSION = 1;

let completed = false;
let hydrated = false;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function hydrateOnboardingStatus(): Promise<void> {
  if (hydrated) return;

  const [savedCompleted, legacySaved, installationId] = await Promise.all([
    getSetting(KEY_ONBOARDING_COMPLETED),
    getSetting(LEGACY_STORAGE_KEY),
    getSetting(KEY_INSTALLATION_ID),
  ]);

  // Monotonic completion: once completed, never resets during updates or restarts
  completed = savedCompleted === '1' || legacySaved === '1';

  // Seed installation ID and first release key on genuine fresh install
  if (!installationId) {
    const newId = generateUuid();
    const releaseKey = getRuntimeReleaseKey();
    await Promise.all([
      setSetting(KEY_INSTALLATION_ID, newId),
      setSetting(KEY_FIRST_RELEASE_KEY, releaseKey),
    ]);
  }

  // Ensure legacy migration is backfilled if needed
  if (legacySaved === '1' && savedCompleted !== '1') {
    await Promise.all([
      setSetting(KEY_ONBOARDING_COMPLETED, '1'),
      setSetting(KEY_ONBOARDING_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION)),
      setSetting(KEY_ONBOARDING_COMPLETED_AT, String(Date.now())),
    ]);
  }

  hydrated = true;
}

// Development override: strictly isolated to __DEV__ and defaults to false for ordinary developer runs
let devOverrideAlwaysShow = false;

export function setDevOnboardingOverride(alwaysShow: boolean): void {
  if (__DEV__) {
    devOverrideAlwaysShow = alwaysShow;
  }
}

export function hasCompletedOnboarding(): boolean {
  if (__DEV__ && devOverrideAlwaysShow) {
    return false;
  }
  return completed;
}

export function resetOnboardingForTesting(): void {
  completed = false;
  void Promise.all([
    setSetting(KEY_ONBOARDING_COMPLETED, '0'),
    setSetting(LEGACY_STORAGE_KEY, '0'),
    setSetting(KEY_ONBOARDING_COMPLETED_AT, '0'),
  ]);
}

export function markOnboardingComplete(): void {
  completed = true;
  const now = Date.now();
  void Promise.all([
    setSetting(KEY_ONBOARDING_COMPLETED, '1'),
    setSetting(LEGACY_STORAGE_KEY, '1'),
    setSetting(KEY_ONBOARDING_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION)),
    setSetting(KEY_ONBOARDING_COMPLETED_AT, String(now)),
  ]);
}
