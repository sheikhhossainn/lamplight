import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { setTargetLanguage, type TargetLanguage } from '@/features/settings/languagePair';

export type MotherTongueCode = 'bn' | 'ja' | 'ko' | 'en';

export type MotherTongueOption = {
  code: MotherTongueCode;
  name: string;
  nativeName: string;
  flag: string;
  sourceName: string;
  sampleAuthors: string;
  shelfTitle: string;
  allBooksLabel: string;
};

export const MOTHER_TONGUES: MotherTongueOption[] = [
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    sourceName: 'বাংলা সাহিত্য',
    sampleAuthors: 'রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র, বিভূতিভূষণ',
    shelfTitle: 'বাংলা সাহিত্য',
    allBooksLabel: 'সবগুলো দেখুন →',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    sourceName: '青空文庫 (Aozora Bunko)',
    sampleAuthors: '夏目漱石, 芥川龍之介, 太宰治, 宮沢賢治',
    shelfTitle: '日本文学 (青空文庫)',
    allBooksLabel: 'すべて見る →',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    sourceName: '공유마당 (Gongu Madang)',
    sampleAuthors: '이상, 김소월, 윤동주, 현진건, 김유정',
    shelfTitle: '한국 문학 (공유마당)',
    allBooksLabel: '전체보기 →',
  },
  {
    code: 'en',
    name: 'English / Other',
    nativeName: 'English',
    flag: '🌐',
    sourceName: 'Project Gutenberg',
    sampleAuthors: 'Austen, Dickens, Tolstoy, Brontë, Melville',
    shelfTitle: 'Timeless Classics',
    allBooksLabel: 'View all →',
  },
];

const STORAGE_KEY = 'mother_tongue';

let currentMotherTongue: MotherTongueCode = 'bn';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getMotherTongue(): MotherTongueCode {
  return currentMotherTongue;
}

export function getMotherTongueOption(code: MotherTongueCode = currentMotherTongue): MotherTongueOption {
  return MOTHER_TONGUES.find((item) => item.code === code) ?? MOTHER_TONGUES[0];
}

export function setMotherTongue(lang: MotherTongueCode): void {
  if (lang === currentMotherTongue && hydrated) return;
  currentMotherTongue = lang;
  emit();
  void setSetting(STORAGE_KEY, lang);

  // Automatically sync bilingual word translation target language to native tongue
  if (lang === 'bn' || lang === 'ja' || lang === 'ko') {
    setTargetLanguage(lang as TargetLanguage);
  } else if (lang === 'en') {
    // If English native, default learning language to Spanish
    setTargetLanguage('es');
  }
}

export async function hydrateMotherTongue(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await getSetting(STORAGE_KEY);
  if (saved && (saved === 'bn' || saved === 'ja' || saved === 'ko' || saved === 'en')) {
    currentMotherTongue = saved;
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMotherTongue(): MotherTongueCode {
  return useSyncExternalStore(subscribe, getMotherTongue);
}
