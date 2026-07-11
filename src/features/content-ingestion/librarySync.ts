import { useSyncExternalStore } from 'react';

// Tracks whether the background remote-catalog refresh is in flight, so the
// Library can show a "still loading more books" hint. The refresh
// (db/client.ts) populates most books' categories, so on a fresh launch the
// filter chips and shelves fill in a moment after the first paint — without
// this signal that gap just looks like an empty/broken shelf.
let syncing = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function beginLibrarySync(): void {
  if (syncing) return;
  syncing = true;
  emit();
}

export function endLibrarySync(): void {
  if (!syncing) return;
  syncing = false;
  emit();
}

function getSyncing(): boolean {
  return syncing;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLibrarySyncing(): boolean {
  return useSyncExternalStore(subscribe, getSyncing);
}
