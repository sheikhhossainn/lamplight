import { useSyncExternalStore } from 'react';

export type ReadingTheme = 'day' | 'lamp';

// In-memory only for now — resets on app restart. Shared between Settings
// (where the user picks a theme) and the Reader (which the Settings toggle
// would otherwise have no effect on) via useSyncExternalStore so both stay
// in sync without prop-drilling or a new state-management dependency.
let currentTheme: ReadingTheme = 'day';
const listeners = new Set<() => void>();

export function getReadingTheme(): ReadingTheme {
  return currentTheme;
}

export function setReadingTheme(theme: ReadingTheme): void {
  if (theme === currentTheme) return;
  currentTheme = theme;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReadingTheme(): ReadingTheme {
  return useSyncExternalStore(subscribe, getReadingTheme);
}
