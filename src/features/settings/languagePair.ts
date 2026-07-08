import { useSyncExternalStore } from 'react';

// The bundled books are all English (see BUNDLED_BOOK_LOADERS), so the source
// side of the pair is fixed — only the learner's target language is a choice.
export type TargetLanguage = 'es' | 'bn';

const LANGUAGE_LABELS: Record<TargetLanguage, string> = { es: 'ES', bn: 'BAN' };

let current: TargetLanguage = 'es';
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getTargetLanguage(): TargetLanguage {
  return current;
}

export function setTargetLanguage(lang: TargetLanguage): void {
  if (lang === current) return;
  current = lang;
  emit();
}

export function cycleTargetLanguage(): void {
  setTargetLanguage(current === 'es' ? 'bn' : 'es');
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTargetLanguage(): TargetLanguage {
  return useSyncExternalStore(subscribe, getTargetLanguage);
}

export function targetLanguageLabel(lang: TargetLanguage): string {
  return LANGUAGE_LABELS[lang];
}
