import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';

export type LiteraryThemeCode =
  | 'bengali'
  | 'korean'
  | 'arabic'
  | 'japanese'
  | 'western'
  | 'gothic'
  | 'romance'
  | 'philosophy'
  | 'adventure';

export type LiteraryThemeOption = {
  code: LiteraryThemeCode;
  title: string;
  subtitle: string;
  icon: string;
  sampleAuthors: string;
  paletteLabel?: string;
  nativeTitle: string;
  nativeSubtitle: string;
  editionLabel: string;
  monogram: string;
  motif: 'river' | 'letterpress' | 'hanji' | 'washi' | 'geometry';
  shelfMaterial: 'bamboo' | 'walnut' | 'ash' | 'cedar' | 'brass';
};

export const LITERARY_THEMES: LiteraryThemeOption[] = [
  {
    code: 'bengali',
    title: 'Bengali',
    subtitle: 'Secular literary paper, river ink, and editorial calm',
    icon: '✒️',
    sampleAuthors: 'Tagore, Nazrul, Sarat Chandra, Bibhutibhushan',
    paletteLabel: 'Bengal Ink & Paper',
    nativeTitle: 'বাংলা পাঠাগার',
    nativeSubtitle: 'নদী, কাগজ ও কালির পাঠসংস্করণ',
    editionLabel: 'Bengali edition',
    monogram: 'অ',
    motif: 'river',
    shelfMaterial: 'bamboo',
  },
  {
    code: 'korean',
    title: 'Korean',
    subtitle: 'Clean minimal, Hanji paper, cool whites',
    icon: '📜',
    sampleAuthors: 'Yi Sang, Kim Sowol, Yun Dong-ju, Kim Yu-jeong',
    paletteLabel: 'Hanji Paper',
    nativeTitle: '한국 서재',
    nativeSubtitle: '한지와 먹으로 만든 독서판',
    editionLabel: 'Korean edition',
    monogram: '책',
    motif: 'hanji',
    shelfMaterial: 'ash',
  },
  {
    code: 'arabic',
    title: 'Arabic',
    subtitle: 'Deep navy, warm gold, RTL-aware',
    icon: '🌙',
    sampleAuthors: 'Mahfouz, Gibran, Al-Mutanabbi, Darwish',
    paletteLabel: 'Deep Navy & Gold',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: 'ورق وحبر للقراءة الهادئة',
    editionLabel: 'Arabic edition',
    monogram: 'ض',
    motif: 'geometry',
    shelfMaterial: 'brass',
  },
  {
    code: 'japanese',
    title: 'Japanese',
    subtitle: 'Washi paper, muted earth tones, generous line-height',
    icon: '🎋',
    sampleAuthors: 'Soseki, Akutagawa, Dazai, Miyazawa',
    paletteLabel: 'Washi & Earth Tones',
    nativeTitle: '日本の書斎',
    nativeSubtitle: '和紙と墨の読書版',
    editionLabel: 'Japanese edition',
    monogram: '本',
    motif: 'washi',
    shelfMaterial: 'cedar',
  },
  {
    code: 'western',
    title: 'Western',
    subtitle: 'Editorial cream, Lora serif',
    icon: '✒️',
    sampleAuthors: 'Austen, Shelley, Dickens, Tolstoy, Melville',
    paletteLabel: 'Editorial Cream & Lora',
    nativeTitle: 'The reading room',
    nativeSubtitle: 'Paper, type, and quiet margins',
    editionLabel: 'English edition',
    monogram: 'Aa',
    motif: 'letterpress',
    shelfMaterial: 'walnut',
  },
];

const VALID_THEMES = new Set<LiteraryThemeCode>([
  'bengali',
  'korean',
  'arabic',
  'japanese',
  'western',
  'gothic',
  'romance',
  'philosophy',
  'adventure',
]);

const STORAGE_KEY = 'user_literary_theme';

let currentTheme: LiteraryThemeCode = 'bengali';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSuggestedThemeForMotherTongue(motherTongue: string): LiteraryThemeCode {
  switch (motherTongue) {
    case 'ko':
      return 'korean';
    case 'ar':
      return 'arabic';
    case 'ja':
      return 'japanese';
    case 'en':
      return 'western';
    case 'bn':
    default:
      return 'bengali';
  }
}

export function isRtlLiteraryTheme(theme: LiteraryThemeCode): boolean {
  return theme === 'arabic';
}

export function getLiteraryTheme(): LiteraryThemeCode {
  return currentTheme;
}

export function getLiteraryThemeOption(code: LiteraryThemeCode = currentTheme): LiteraryThemeOption {
  return LITERARY_THEMES.find((t) => t.code === code) ?? LITERARY_THEMES[4];
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
  if (saved && VALID_THEMES.has(saved as LiteraryThemeCode)) {
    currentTheme = saved as LiteraryThemeCode;
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
