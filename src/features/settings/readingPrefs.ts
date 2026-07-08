import { useSyncExternalStore } from 'react';

export type ReadingPrefs = {
  fontSize: number; // 0-1 slider value
  lineSpacing: number; // 0-1 slider value
};

// In-memory only for now — resets on app restart, same tradeoff as
// readingTheme.ts. Shared between Settings (where the sliders live) and the
// Reader (which the sliders would otherwise have no effect on).
let current: ReadingPrefs = { fontSize: 0.55, lineSpacing: 0.65 };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getReadingPrefs(): ReadingPrefs {
  return current;
}

export function setFontSize(fontSize: number): void {
  current = { ...current, fontSize };
  emit();
}

export function setLineSpacing(lineSpacing: number): void {
  current = { ...current, lineSpacing };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReadingPrefs(): ReadingPrefs {
  return useSyncExternalStore(subscribe, getReadingPrefs);
}

// Centralized here (not duplicated in Settings and the Reader separately) so
// the two screens can never disagree about what a given slider value means.
export function fontSizePxFromPref(fontSize: number): number {
  return Math.round(14 + fontSize * 8);
}

export function lineHeightMultiplierFromPref(lineSpacing: number): number {
  return 1.5 + lineSpacing * 0.7;
}
