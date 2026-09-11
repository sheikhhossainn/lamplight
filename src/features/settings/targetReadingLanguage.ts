import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';

export type TargetReadingLanguageCode = 'en' | 'ja' | 'bn' | 'ko';

export type TargetReadingLanguageOption = {
  code: TargetReadingLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  sourceName: string;
  sampleAuthors: string;
  shelfTitle: string;
};

export const TARGET_READING_LANGUAGES: TargetReadingLanguageOption[] = [
  {
    code: 'en',
    name: 'English Classics',
    nativeName: 'English Literature',
    flag: '🇬🇧',
    sourceName: 'Project Gutenberg',
    sampleAuthors: 'Austen, Dickens, Shelley, Melville, Tolstoy',
    shelfTitle: 'Victorian & World Classics',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本文学',
    flag: '🇯🇵',
    sourceName: '青空文庫 (Aozora Bunko)',
    sampleAuthors: '夏目漱石, 芥川龍之介, 太宰治, 宮沢賢治',
    shelfTitle: '日本文学 (青空文庫)',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা সাহিত্য',
    flag: '🇧🇩',
    sourceName: 'বাংলা সাহিত্য',
    sampleAuthors: 'রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র, বিভূতিভূষণ',
    shelfTitle: 'বাংলা সাহিত্য',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국 문학',
    flag: '🇰🇷',
    sourceName: '공유마당 (Gongu Madang)',
    sampleAuthors: '이상, 김소월, 윤동주, 현진건, 김유정',
    shelfTitle: '한국 문학 (공유마당)',
  },
];

const STORAGE_KEY = 'target_reading_language';

let currentTargetReadingLanguage: TargetReadingLanguageCode = 'en';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getTargetReadingLanguage(): TargetReadingLanguageCode {
  return currentTargetReadingLanguage;
}

export function getTargetReadingLanguageOption(
  code: TargetReadingLanguageCode = currentTargetReadingLanguage,
): TargetReadingLanguageOption {
  return (
    TARGET_READING_LANGUAGES.find((item) => item.code === code) ??
    TARGET_READING_LANGUAGES[0]
  );
}

export function setTargetReadingLanguage(lang: TargetReadingLanguageCode): void {
  if (lang === currentTargetReadingLanguage && hydrated) return;
  currentTargetReadingLanguage = lang;
  emit();
  void setSetting(STORAGE_KEY, lang);
}

export async function hydrateTargetReadingLanguage(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await getSetting(STORAGE_KEY);
  if (saved && (saved === 'en' || saved === 'ja' || saved === 'bn' || saved === 'ko')) {
    currentTargetReadingLanguage = saved;
    emit();
  }
}

export function useTargetReadingLanguage(): TargetReadingLanguageCode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTargetReadingLanguage,
  );
}
