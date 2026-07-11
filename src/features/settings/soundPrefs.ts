import { useSyncExternalStore } from 'react';

// Whether the soft page-turn sound plays on each page swipe. In-memory only,
// matching the app's other settings stores (readingTheme, languagePair) —
// resets on app restart. Shared between the Settings toggle and the Reader
// via useSyncExternalStore.
let pageTurnSoundEnabled = true;
const listeners = new Set<() => void>();

export function getPageTurnSoundEnabled(): boolean {
  return pageTurnSoundEnabled;
}

export function setPageTurnSoundEnabled(enabled: boolean): void {
  if (enabled === pageTurnSoundEnabled) return;
  pageTurnSoundEnabled = enabled;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePageTurnSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, getPageTurnSoundEnabled);
}
