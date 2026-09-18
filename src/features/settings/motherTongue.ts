import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { setTargetLanguage, type TargetLanguage } from '@/features/settings/languagePair';

export type MotherTongueCode = 'bn' | 'ja' | 'ko' | 'ar' | 'en';

export type MotherTongueOption = {
  code: MotherTongueCode;
  name: string;
  nativeName: string;
  flag: string;
  sourceName: string;
  sampleAuthors: string;
  shelfTitle: string;
  allBooksLabel: string;
  libraryLabel: string;
};

export type ScriptureLabels = {
  sectionTitle: string;
  askLabel: string;
  comparativeTitle: string;
  comparativeSubtitle: string;
  comparativeBody: string;
  sacredTitle: string;
  quran: string;
  oldTestament: string;
  newTestament: string;
  torah: string;
  vedas: string;
  verse: string;
};

const SCRIPTURE_LABELS: Record<MotherTongueCode, ScriptureLabels> = {
  bn: {
    sectionTitle: 'ধর্মগ্রন্থ',
    askLabel: 'ধর্মগ্রন্থ জিজ্ঞাসা করুন ✦',
    comparativeTitle: 'তুলনামূলক ধর্মগ্রন্থ',
    comparativeSubtitle: 'বিভিন্ন ধর্মের মূল পাঠ জানুন',
    comparativeBody: 'কুরআন, বাইবেল, তাওরাত ও বেদের প্রামাণ্য মূল পাঠ ও ব্যাখ্যা অন্বেষণ করুন।',
    sacredTitle: 'পবিত্র ধর্মগ্রন্থ',
    quran: 'কুরআন',
    oldTestament: 'পুরাতন নিয়ম',
    newTestament: 'নতুন নিয়ম',
    torah: 'তাওরাত',
    vedas: 'বেদ',
    verse: 'আয়াত',
  },
  ja: {
    sectionTitle: '聖典',
    askLabel: '聖典にたずねる ✦',
    comparativeTitle: '聖典を読み比べる',
    comparativeSubtitle: '宗教の原典に触れる',
    comparativeBody: 'クルアーン、聖書、トーラー、ヴェーダの原典と信頼できる解説を読みます。',
    sacredTitle: '聖典コレクション',
    quran: 'クルアーン',
    oldTestament: '旧約聖書',
    newTestament: '新約聖書',
    torah: 'トーラー',
    vedas: 'ヴェーダ',
    verse: '節',
  },
  ko: {
    sectionTitle: '경전',
    askLabel: '경전에 묻기 ✦',
    comparativeTitle: '경전을 함께 읽기',
    comparativeSubtitle: '여러 전통의 원문을 만나다',
    comparativeBody: '꾸란, 성경, 토라, 베다의 원문과 검증된 해설을 살펴봅니다.',
    sacredTitle: '경전 모음',
    quran: '꾸란',
    oldTestament: '구약 성경',
    newTestament: '신약 성경',
    torah: '토라',
    vedas: '베다',
    verse: '구절',
  },
  ar: {
    sectionTitle: 'الكتب المقدسة',
    askLabel: 'اسأل الكتب المقدسة ✦',
    comparativeTitle: 'قراءة مقارنة للنصوص',
    comparativeSubtitle: 'تعرّف إلى النصوص الأصلية',
    comparativeBody: 'استكشف النصوص الأصلية والشروح الموثوقة للقرآن والكتاب المقدس والتوراة والفيدا.',
    sacredTitle: 'مكتبة النصوص المقدسة',
    quran: 'القرآن',
    oldTestament: 'العهد القديم',
    newTestament: 'العهد الجديد',
    torah: 'التوراة',
    vedas: 'الفيدا',
    verse: 'آية',
  },
  en: {
    sectionTitle: 'Scriptures',
    askLabel: 'Ask Scriptures ✦',
    comparativeTitle: 'Comparative Scriptures',
    comparativeSubtitle: 'Learn across major traditions',
    comparativeBody: 'Explore primary verses and trusted commentary across the Quran, Bible, Torah, and Vedas.',
    sacredTitle: 'Sacred Scriptures',
    quran: 'Quran',
    oldTestament: 'Old Testament',
    newTestament: 'New Testament',
    torah: 'Torah',
    vedas: 'Vedas',
    verse: 'Verse',
  },
};

export function getScriptureLabels(code: MotherTongueCode = currentMotherTongue): ScriptureLabels {
  return SCRIPTURE_LABELS[code];
}

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
    libraryLabel: 'বইঘর',
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
    libraryLabel: '書棚',
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
    libraryLabel: '서재',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    sourceName: 'الأدب العربي والقرآن',
    sampleAuthors: 'نجيب محفوظ, جبران خليل جبران, المتنبي, محمود درويش',
    shelfTitle: 'الأدب العربي والقرآن',
    allBooksLabel: 'عرض الكل ←',
    libraryLabel: 'المكتبة',
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
    libraryLabel: 'Browse',
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
  if (lang === 'bn' || lang === 'ja' || lang === 'ko' || lang === 'ar') {
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
  if (saved && (saved === 'bn' || saved === 'ja' || saved === 'ko' || saved === 'ar' || saved === 'en')) {
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
