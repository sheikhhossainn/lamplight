import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';

export type LiteraryThemeCode = 'gothic' | 'romance' | 'philosophy' | 'adventure';

export type LiteraryThemeOption = {
  code: LiteraryThemeCode;
  title: string;
  subtitle: string;
  icon: string;
  sampleAuthors: string;
};

export const LITERARY_THEMES: LiteraryThemeOption[] = [
  {
    code: 'gothic',
    title: 'Gothic & Mystery',
    subtitle: 'Shadowed corridors, psychological suspense, and eerie discoveries',
    icon: '🕯️',
    sampleAuthors: 'Shelley, Poe, Stoker, Conan Doyle',
  },
  {
    code: 'romance',
    title: 'Romance & Social Wit',
    subtitle: 'Keen observations of human manners, courtship, and society',
    icon: '🕊️',
    sampleAuthors: 'Austen, Brontë, Tagore, Wharton',
  },
  {
    code: 'philosophy',
    title: 'Philosophy & Human Soul',
    subtitle: 'Deep existential inquiries, conscience, and moral transformation',
    icon: '📜',
    sampleAuthors: 'Dostoevsky, Tolstoy, Soseki, Hesse',
  },
  {
    code: 'adventure',
    title: 'Adventure & Epic Myth',
    subtitle: 'Grand odysseys, sea voyages, and chivalric quests',
    icon: '🧭',
    sampleAuthors: 'Homer, Cervantes, Melville, Bibhutibhushan',
  },
];

const STORAGE_KEY = 'user_literary_theme';

let currentTheme: LiteraryThemeCode = 'romance';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getLiteraryTheme(): LiteraryThemeCode {
  return currentTheme;
}

export function getLiteraryThemeOption(code: LiteraryThemeCode = currentTheme): LiteraryThemeOption {
  return LITERARY_THEMES.find((t) => t.code === code) ?? LITERARY_THEMES[0];
}

export function setLiteraryTheme(theme: LiteraryThemeCode): void {
  if (theme === currentTheme && hydrated) return;
  currentTheme = theme;
  emit();
  void setSetting(STORAGE_KEY, theme);
}

export async function hydrateLiteraryTheme(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await getSetting(STORAGE_KEY);
  if (saved && (saved === 'gothic' || saved === 'romance' || saved === 'philosophy' || saved === 'adventure')) {
    currentTheme = saved;
    emit();
  }
}

export function useLiteraryTheme(): LiteraryThemeCode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLiteraryTheme,
  );
}
