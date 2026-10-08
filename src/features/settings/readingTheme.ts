import { useSyncExternalStore } from 'react';
import { getSetting, setSetting } from '@/db/repositories/appSettings';

export type ReadingTheme = 'day' | 'lamp';

const STORAGE_KEY = 'reading_theme';

let currentTheme: ReadingTheme = 'day';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getReadingTheme(): ReadingTheme {
  return currentTheme;
}

export function setReadingTheme(theme: ReadingTheme): void {
  if (theme === currentTheme && hydrated) return;
  hydrated = true;
  currentTheme = theme;
  emit();
  void setSetting(STORAGE_KEY, theme).catch(() => {});
}

export async function hydrateReadingTheme(loader?: () => Promise<string | null>): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const saved = loader ? await loader() : await getSetting(STORAGE_KEY);
    if (saved === 'day' || saved === 'lamp') {
      currentTheme = saved;
      emit();
    }
  } catch {
    // Keep fallback 'day'
  }
}

export function subscribeToReadingTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReadingTheme(): ReadingTheme {
  return useSyncExternalStore(subscribeToReadingTheme, getReadingTheme);
}

export function _resetReadingThemeForTesting(): void {
  currentTheme = 'day';
  hydrated = false;
  listeners.clear();
}

