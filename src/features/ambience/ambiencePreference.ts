import { useSyncExternalStore } from 'react';

// Which ambience track the reader plays, and at what volume. In-memory only,
// matching the app's other settings stores (readingTheme, languagePair) —
// resets on app restart, no new persistence dependency. null = "Off" (no
// audio). Shared between the reader's ambience picker and the player hook via
// useSyncExternalStore so both stay in sync without prop-drilling.
let currentTrackId: string | null = null;
let currentVolume = 0.7;
let previewTrackId: string | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

export type SleepTimerMinutes = 15 | 30 | 45 | 60 | null;
let sleepTimerMinutes: SleepTimerMinutes = null;
let sleepTimerEndMs: number | null = null;
let sleepTimerTimeout: ReturnType<typeof setTimeout> | null = null;

let stopOnReaderClose = true;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAmbienceTrackId(): string | null {
  return currentTrackId;
}

export function setAmbienceTrackId(id: string | null): void {
  // If a preview was active and user selects a different track or Off, cancel the preview
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
    previewTrackId = null;
  }
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

/**
 * Starts a temporary 30-second preview of a Premium track (FULLAPP §14.1 item 3).
 */
export function startAmbiencePreview(id: string, durationSeconds = 30): void {
  if (previewTimer) {
    clearTimeout(previewTimer);
  }
  previewTrackId = id;
  currentTrackId = id;
  previewTimer = setTimeout(() => {
    if (currentTrackId === id) {
      currentTrackId = null;
    }
    previewTrackId = null;
    previewTimer = null;
    emit();
  }, durationSeconds * 1000);
  emit();
}

export function cancelAmbiencePreview(): void {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (previewTrackId && currentTrackId === previewTrackId) {
    currentTrackId = null;
  }
  previewTrackId = null;
  emit();
}

export function getAmbiencePreviewTrackId(): string | null {
  return previewTrackId;
}

/**
 * Configures a sleep timer in minutes (15, 30, 45, 60, or null for off).
 */
export function setAmbienceSleepTimer(minutes: SleepTimerMinutes): void {
  if (sleepTimerTimeout) {
    clearTimeout(sleepTimerTimeout);
    sleepTimerTimeout = null;
  }
  sleepTimerMinutes = minutes;
  if (!minutes) {
    sleepTimerEndMs = null;
    emit();
    return;
  }
  sleepTimerEndMs = Date.now() + minutes * 60 * 1000;
  sleepTimerTimeout = setTimeout(() => {
    currentTrackId = null;
    sleepTimerMinutes = null;
    sleepTimerEndMs = null;
    sleepTimerTimeout = null;
    emit();
  }, minutes * 60 * 1000);
  emit();
}

export function getAmbienceSleepTimer(): SleepTimerMinutes {
  return sleepTimerMinutes;
}

export function getStopOnReaderClose(): boolean {
  return stopOnReaderClose;
}

export function setStopOnReaderClose(stop: boolean): void {
  if (stop === stopOnReaderClose) return;
  stopOnReaderClose = stop;
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

export function useAmbiencePreviewTrackId(): string | null {
  return useSyncExternalStore(subscribe, getAmbiencePreviewTrackId);
}

export function useAmbienceSleepTimer(): SleepTimerMinutes {
  return useSyncExternalStore(subscribe, getAmbienceSleepTimer);
}

export function useStopOnReaderClose(): boolean {
  return useSyncExternalStore(subscribe, getStopOnReaderClose);
}
