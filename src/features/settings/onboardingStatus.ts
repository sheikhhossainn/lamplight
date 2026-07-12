import { getSetting, setSetting } from '@/db/repositories/appSettings';

const STORAGE_KEY = 'has_onboarded';

// Whether the user has already completed the Splash -> Onboarding first-run
// flow, persisted so a cold JS start (app fully killed, not just resumed)
// doesn't show it again. Root layout awaits hydrate() before mounting the
// Stack, so by the time the splash route renders this is already resolved.
let completed = false;
let hydrated = false;

export async function hydrateOnboardingStatus(): Promise<void> {
  if (hydrated) return;
  const saved = await getSetting(STORAGE_KEY);
  completed = saved === '1';
  hydrated = true;
}

export function hasCompletedOnboarding(): boolean {
  return completed;
}

export function markOnboardingComplete(): void {
  completed = true;
  void setSetting(STORAGE_KEY, '1');
}
