import { useSyncExternalStore } from 'react';

// Which ambience track the reader plays, and at what volume. In-memory only,
// matching the app's other settings stores (readingTheme, languagePair) —
// resets on app restart, no new persistence dependency. null = "Off" (no
// audio). Shared between the reader's ambience picker and the player hook via
// useSyncExternalStore so both stay in sync without prop-drilling.
let currentTrackId: string | null = null;
let currentVolume = 0.7;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAmbienceTrackId(): string | null {
  return currentTrackId;
}

export function setAmbienceTrackId(id: string | null): void {
  if (id === currentTrackId) return;
  currentTrackId = id;
  emit();
}

export function getAmbienceVolume(): number {
  return currentVolume;
}

export function setAmbienceVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  if (clamped === currentVolume) return;
  currentVolume = clamped;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAmbienceTrackId(): string | null {
  return useSyncExternalStore(subscribe, getAmbienceTrackId);
}

export function useAmbienceVolume(): number {
  return useSyncExternalStore(subscribe, getAmbienceVolume);
}
