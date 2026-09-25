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
  reflectLabel: string;
  tableLabel: string;
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
    askLabel: 'ধর্ম সম্পর্কে জানুন ✦',
    reflectLabel: 'প্রশান্তির আয়াত ✦',
    tableLabel: 'পবিত্র টেবিল',
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
    askLabel: '聖典を知る ✦',
    reflectLabel: '心の慰め ✦',
    tableLabel: '聖典の卓',
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
    askLabel: '경전 알아보기 ✦',
    reflectLabel: '위로의 구절 ✦',
    tableLabel: '신성한 탁자',
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
    askLabel: 'استكشف الكتب المقدسة ✦',
    reflectLabel: 'آيات للسكينة ✦',
    tableLabel: 'مائدة النصوص',
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
    askLabel: 'Explore Scriptures ✦',
    reflectLabel: 'Verses for Comfort ✦',
    tableLabel: 'Sacred Table',
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

export type HomepageLabels = {
  greetingMorning: string;
  greetingMorningSub: string;
  greetingAfternoon: string;
  greetingAfternoonSub: string;
  greetingEvening: string;
  greetingEveningSub: string;
  greetingNight: string;
  greetingNightSub: string;
  currentlyReading: string;
  placeKept: string;
  continueReading: string;
  setTargetDays: string;
  cadenceStatus: (daysRemaining: number, requiredChaptersToday: number) => string;
  setGoal: string;
  adjustGoal: string;
  readyToRead: string;
  downloadedOnDevice: string;
  startReadingNow: string;
  beginJourney: string;
  exploreLibraries: string;
  dailyMemoryHabit: string;
  dailyFlameLit: string;
  reviewDueWords: string;
  openFlashcardStudio: string;
  dailySpark: string;
  nextQuote: string;
  curatorsPick: string;
  viewBook: string;
  fromReadingRhythm: string;
  library: string;
  discoverCollections: string;
  curatedForTaste: string;
  calibratedForYou: string;
  exploreLibrary: string;
  startReading: string;
};

const HOMEPAGE_LABELS: Record<MotherTongueCode, HomepageLabels> = {
  bn: {
    greetingMorning: 'শুভ সকাল',
    greetingMorningSub: 'প্রশান্তির একটি পাতা দিয়ে দিন শুরু করুন',
    greetingAfternoon: 'শুভ অপরাহ্ন',
    greetingAfternoonSub: 'দিনের ব্যস্ততায় এক মুহূর্তের প্রশান্তি',
    greetingEvening: 'শুভ সন্ধ্যা',
    greetingEveningSub: 'প্রদীপের আলো স্নিগ্ধ ও প্রস্তুত',
    greetingNight: 'রাত্রিকালীন পাঠ',
    greetingNightSub: 'রাত একটি পাতা, আর প্রদীপ তার একমাত্র আলো',
    currentlyReading: 'পড়া চলছে',
    placeKept: 'আপনার স্থান সংরক্ষিত',
    continueReading: 'পড়া চালিয়ে যান',
    setTargetDays: 'লক্ষ্য দিন ও দৈনিক গতি নির্ধারণ',
    cadenceStatus: (days, ch) => `পাঠ ছন্দ: ${days} দিন বাকি · ${ch} অধ্যায়/দিন`,
    setGoal: 'লক্ষ্য নির্ধারণ →',
    adjustGoal: 'পরিবর্তন →',
    readyToRead: 'পড়ার জন্য প্রস্তুত',
    downloadedOnDevice: 'ডিভাইসে সংরক্ষিত',
    startReadingNow: 'এখনই পড়া শুরু করুন',
    beginJourney: 'যাত্রা শুরু করুন',
    exploreLibraries: 'গ্রন্থাগার দেখুন',
    dailyMemoryHabit: 'দৈনিক স্মৃতি অভ্যাস',
    dailyFlameLit: 'দৈনিক শিখা প্রজ্বলিত',
    reviewDueWords: 'পঠিত শব্দ অনুশীলন করুন',
    openFlashcardStudio: 'ফ্ল্যাশকার্ড স্টুডিও খুলুন',
    dailySpark: 'দৈনিক উদ্দীপনা',
    nextQuote: '✦ পরবর্তী উদ্ধৃতি',
    curatorsPick: 'বাছাই করা পাঠ',
    viewBook: 'বইটি দেখুন',
    fromReadingRhythm: 'আপনার পাঠ ছন্দ থেকে',
    library: 'গ্রন্থাগার →',
    discoverCollections: 'বাছাইকৃত সংকলনসমূহ',
    curatedForTaste: 'আপনার পছন্দের জন্য বাছাইকৃত',
    calibratedForYou: 'আপনার জন্য পরিমাপকৃত',
    exploreLibrary: 'গ্রন্থাগার দেখুন',
    startReading: 'পড়া শুরু করুন',
  },
  en: {
    greetingMorning: 'Good morning',
    greetingMorningSub: 'Start your day with a page of calm',
    greetingAfternoon: 'Good afternoon',
    greetingAfternoonSub: 'A quiet pause in your day',
    greetingEvening: 'Good evening',
    greetingEveningSub: 'The lamp is trimmed and glowing',
    greetingNight: 'Night reading',
    greetingNightSub: 'The night is a page, and the lamp its only light',
    currentlyReading: 'Currently Reading',
    placeKept: 'Your place is kept',
    continueReading: 'Continue Reading',
    setTargetDays: 'Set target days & daily reading pace',
    cadenceStatus: (days, ch) => `Cadence: ${days} days left · ${ch} ch/day`,
    setGoal: 'Set Goal →',
    adjustGoal: 'Adjust →',
    readyToRead: 'Ready to Read',
    downloadedOnDevice: 'Downloaded on device',
    startReadingNow: 'Start Reading Now',
    beginJourney: 'Begin Your Journey',
    exploreLibraries: 'Explore Libraries',
    dailyMemoryHabit: 'DAILY MEMORY HABIT',
    dailyFlameLit: 'DAILY FLAME LIT',
    reviewDueWords: 'Review Due Words Now',
    openFlashcardStudio: 'Open Flashcard Studio',
    dailySpark: 'DAILY SPARK',
    nextQuote: '✦ Next Quote',
    curatorsPick: "CURATOR'S PICK",
    viewBook: 'View Book',
    fromReadingRhythm: 'FROM YOUR READING RHYTHM',
    library: 'Library →',
    discoverCollections: 'Discover Curated Collections',
    curatedForTaste: 'CURATED FOR YOUR TASTE',
    calibratedForYou: 'CALIBRATED FOR YOU',
    exploreLibrary: 'Explore Library',
    startReading: 'Start Reading',
  },
  ja: {
    greetingMorning: 'おはようございます',
    greetingMorningSub: '静かな1ページから一日を始めましょう',
    greetingAfternoon: 'こんにちは',
    greetingAfternoonSub: '一日の穏やかなひととき',
    greetingEvening: 'こんばんは',
    greetingEveningSub: '灯火が静かにともっています',
    greetingNight: '夜の読書',
    greetingNightSub: '夜は1つの頁、ランプはその唯一の光',
    currentlyReading: '読書中',
    placeKept: 'しおりを挟んでいます',
    continueReading: '続きを読む',
    setTargetDays: '目標日数と日々のペースを設定',
    cadenceStatus: (days, ch) => `ペース: 残り${days}日 · 1日${ch}章`,
    setGoal: '目標を設定 →',
    adjustGoal: '変更 →',
    readyToRead: '読書可能',
    downloadedOnDevice: '端末に保存済み',
    startReadingNow: '今すぐ読み始める',
    beginJourney: '読書の旅を始める',
    exploreLibraries: '図書館を見る',
    dailyMemoryHabit: '日々の記憶習慣',
    dailyFlameLit: '灯火が灯りました',
    reviewDueWords: '単語を復習する',
    openFlashcardStudio: '単語帳を開く',
    dailySpark: '今日の一言',
    nextQuote: '✦ 次の名言',
    curatorsPick: '厳選された作品',
    viewBook: '本を見る',
    fromReadingRhythm: 'あなたの読書リズムから',
    library: '書棚 →',
    discoverCollections: 'おすすめの選集',
    curatedForTaste: 'あなたにおすすめの作品',
    calibratedForYou: 'あなたへのおすすめ',
    exploreLibrary: '書棚を見る',
    startReading: '読み始める',
  },
  ko: {
    greetingMorning: '좋은 아침입니다',
    greetingMorningSub: '차분한 한 페이지로 하루를 시작하세요',
    greetingAfternoon: '좋은 오후입니다',
    greetingAfternoonSub: '하루 속 고요한 휴식',
    greetingEvening: '좋은 저녁입니다',
    greetingEveningSub: '등불이 따뜻하게 켜졌습니다',
    greetingNight: '밤의 독서',
    greetingNightSub: '밤은 한 페이지, 등불은 유일한 빛',
    currentlyReading: '읽는 중',
    placeKept: '읽던 곳이 보관되어 있습니다',
    continueReading: '계속 읽기',
    setTargetDays: '목표 일수 및 일일 독서량 설정',
    cadenceStatus: (days, ch) => `페이스: ${days}일 남음 · 하루 ${ch}장`,
    setGoal: '목표 설정 →',
    adjustGoal: '수정 →',
    readyToRead: '읽을 준비 완료',
    downloadedOnDevice: '기기에 저장됨',
    startReadingNow: '지금 읽기 시작',
    beginJourney: '여정을 시작하세요',
    exploreLibraries: '서재 둘러보기',
    dailyMemoryHabit: '일일 기억 습관',
    dailyFlameLit: '오늘의 불꽃이 켜졌습니다',
    reviewDueWords: '복습 단어 확인하기',
    openFlashcardStudio: '플래시카드 열기',
    dailySpark: '오늘의 문장',
    nextQuote: '✦ 다음 문장',
    curatorsPick: '추천 작품',
    viewBook: '책 보기',
    fromReadingRhythm: '나의 독서 리듬에서',
    library: '서재 →',
    discoverCollections: '엄선된 컬렉션',
    curatedForTaste: '취향 맞춤 도서',
    calibratedForYou: '맞춤 추천',
    exploreLibrary: '서재 둘러보기',
    startReading: '읽기 시작',
  },
  ar: {
    greetingMorning: 'صباح الخير',
    greetingMorningSub: 'ابدأ يومك بصفحة من الهدوء',
    greetingAfternoon: 'مساء الخير',
    greetingAfternoonSub: 'لحظة هدوء في يومك',
    greetingEvening: 'مساء النور',
    greetingEveningSub: 'المصباح جاهز ومضيء',
    greetingNight: 'قراءة ليلية',
    greetingNightSub: 'الليل صفحة، والمصباح نوره الوحيد',
    currentlyReading: 'قيد القراءة',
    placeKept: 'مكانك محفوظ',
    continueReading: 'تابع القراءة',
    setTargetDays: 'حدد الأيام ومعدل القراءة اليومي',
    cadenceStatus: (days, ch) => `المعدل: بقي ${days} أيام · ${ch} فصول/يوم`,
    setGoal: 'حدد الهدف ←',
    adjustGoal: 'تعديل ←',
    readyToRead: 'جاهز للقراءة',
    downloadedOnDevice: 'محمل على الجهاز',
    startReadingNow: 'ابدأ القراءة الآن',
    beginJourney: 'ابدأ رحلتك',
    exploreLibraries: 'استكشف المكتبات',
    dailyMemoryHabit: 'عادة الذاكرة اليومية',
    dailyFlameLit: 'أُضيء المصباح اليومي',
    reviewDueWords: 'راجع الكلمات المستحقة',
    openFlashcardStudio: 'افتح البطاقات التعليمية',
    dailySpark: 'قبس اليوم',
    nextQuote: '✦ الاقتباس التالي',
    curatorsPick: 'مختارات الأدب',
    viewBook: 'عرض الكتاب',
    fromReadingRhythm: 'من وتيرة قراءتك',
    library: 'المكتبة ←',
    discoverCollections: 'اكتشف المجموعات المختارة',
    curatedForTaste: 'مختارات تناسب ذوقك',
    calibratedForYou: 'مخصص لك',
    exploreLibrary: 'استكشف المكتبة',
    startReading: 'ابدأ القراءة',
  },
};

export function getHomepageLabels(code: MotherTongueCode = currentMotherTongue): HomepageLabels {
  return HOMEPAGE_LABELS[code] ?? HOMEPAGE_LABELS.en;
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
