import { useSyncExternalStore } from 'react';
import { router } from 'expo-router';

import { getSetting, setSetting } from '@/db/repositories/appSettings';

export type AppMode = 'read' | 'learn';

const STORAGE_KEY = 'app_mode';

let currentAppMode: AppMode = 'read';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAppMode(): AppMode {
  return currentAppMode;
}

export function setAppMode(mode: AppMode): void {
  if (mode === currentAppMode && hydrated) return;
  currentAppMode = mode;
  emit();
  void setSetting(STORAGE_KEY, mode).catch(() => {});
}

export async function hydrateAppMode(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await getSetting(STORAGE_KEY);
  if (saved === 'read' || saved === 'learn') {
    currentAppMode = saved;
    emit();
  }
}

export function useAppMode(): AppMode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAppMode,
  );
}

/**
 * Transitions to Learn space. Read stays mounted underneath.
 * Protected against double pushes.
 */
export function switchToLearn(): void {
  if (currentAppMode === 'learn') {
    return;
  }
  setAppMode('learn');
  try {
    router.push('/(learn)/path' as any);
  } catch {
    // router might be mounting
  }
}

/**
 * Transitions to Read space. Pops Learn stack if possible, or replaces to homescreen.
 */
export function switchToRead(): void {
  setAppMode('read');
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/homescreen');
    }
  } catch {
    router.replace('/(tabs)/homescreen');
  }
}
