import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getMotherTongue, type MotherTongueCode } from '@/features/settings/motherTongue';
import {
  getTargetReadingLanguage,
  type TargetReadingLanguageCode,
} from '@/features/settings/targetReadingLanguage';

export type LiteraryThemeCode =
  | 'classic'
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
    code: 'classic',
    title: 'Lamplight',
    subtitle: 'Warm parchment, charcoal ink, and amber flame',
    icon: '🪔',
    sampleAuthors: 'World Literature & Classics',
    paletteLabel: 'Amber & Charcoal',
    nativeTitle: 'ল্যাম্পলাইট পাঠাগার',
    nativeSubtitle: 'উষ্ণ পার্চমেন্ট, চারকোল কালি ও শান্ত পাঠসংস্করণ',
    editionLabel: 'Standard Edition',
    monogram: '🪔',
    motif: 'letterpress',
    shelfMaterial: 'walnut',
  },
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

export type ModularThemePresentation = {
  themeCode: LiteraryThemeCode;
  motherTongue: MotherTongueCode;
  title: string;
  subtitle: string;
  nativeTitle: string;
  nativeSubtitle: string;
  editionLabel: string;
  monogram: string;
  sampleAuthors: string;
  displayLanguage: MotherTongueCode;
  subtitleLanguage?: MotherTongueCode;
};

export const MODULAR_THEME_PRESENTATIONS: Record<string, ModularThemePresentation> = {
  // --- Classic Lamplight Theme (Canonical Default) ---
  classic_bn: {
    themeCode: 'classic',
    motherTongue: 'bn',
    title: 'ল্যাম্পলাইট',
    subtitle: 'উষ্ণ পার্চমেন্ট, চারকোল কালি ও অ্যাম্বার আলো',
    nativeTitle: 'ল্যাম্পলাইট পাঠাগার',
    nativeSubtitle: 'উষ্ণ পার্চমেন্ট, চারকোল কালি ও শান্ত পাঠসংস্করণ',
    editionLabel: 'ধ্রুপদী সংস্করণ',
    monogram: '🪔',
    sampleAuthors: 'বিশ্ব ধ্রুপদী সাহিত্য',
    displayLanguage: 'bn',
    subtitleLanguage: 'bn',
  },
  classic_en: {
    themeCode: 'classic',
    motherTongue: 'en',
    title: 'Lamplight',
    subtitle: 'Warm parchment, charcoal ink, and amber flame',
    nativeTitle: 'Lamplight Reading Room',
    nativeSubtitle: 'Warm parchment, charcoal ink, and serene reading',
    editionLabel: 'Standard Edition',
    monogram: '🪔',
    sampleAuthors: 'World Literature & Classics',
    displayLanguage: 'en',
    subtitleLanguage: 'en',
  },
  classic_ko: {
    themeCode: 'classic',
    motherTongue: 'ko',
    title: '램프라이트',
    subtitle: '따뜻한 양피지, 숯빛 먹, 은은한 호박색 불빛',
    nativeTitle: '램프라이트 서재',
    nativeSubtitle: '따뜻한 종이와 먹으로 만나는 고전 독서판',
    editionLabel: 'STANDARD EDITION',
    monogram: '🪔',
    sampleAuthors: '세계 고전 문학',
    displayLanguage: 'ko',
    subtitleLanguage: 'ko',
  },
  classic_ja: {
    themeCode: 'classic',
    motherTongue: 'ja',
    title: 'ランプライト',
    subtitle: '温かな羊皮紙、木炭の墨、琥珀の光',
    nativeTitle: 'ランプライト書斎',
    nativeSubtitle: '温かな紙と墨で紡ぐ静寂の古典読書版',
    editionLabel: 'STANDARD EDITION',
    monogram: '🪔',
    sampleAuthors: '世界古典文学',
    displayLanguage: 'ja',
    subtitleLanguage: 'ja',
  },
  classic_ar: {
    themeCode: 'classic',
    motherTongue: 'ar',
    title: 'ضوء المصباح',
    subtitle: 'ورق دافئ، حبر فاحم، وقبس عنبري',
    nativeTitle: 'مكتبة ضوء المصباح',
    nativeSubtitle: 'ورق دافئ وحبر أصيل لقراءة كلاسيكية هادئة',
    editionLabel: 'الإصدار الكلاسيكي',
    monogram: '🪔',
    sampleAuthors: 'الأدب الكلاسيكي العالمي',
    displayLanguage: 'ar',
    subtitleLanguage: 'ar',
  },

  // --- Bengali Theme ---
  bengali_bn: {
    themeCode: 'bengali',
    motherTongue: 'bn',
    title: 'বাংলা',
    subtitle: 'নদীমাতৃক সাহিত্য, কাগজ ও কালির শান্ত প্রকাশ',
    nativeTitle: 'বাংলা পাঠাগার',
    nativeSubtitle: 'নদী, কাগজ ও কালির পাঠসংস্করণ',
    editionLabel: 'বাংলা সংস্করণ',
    monogram: 'অ',
    sampleAuthors: 'রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র, বিভূতিভূষণ',
    displayLanguage: 'bn',
  },
  bengali_en: {
    themeCode: 'bengali',
    motherTongue: 'en',
    title: 'Bengali',
    subtitle: 'Secular literary paper, river ink, and editorial calm',
    nativeTitle: 'Bengal Reading Room',
    nativeSubtitle: 'River ink, quiet paper, and editorial calm',
    editionLabel: 'Bengali edition',
    monogram: 'Bn',
    sampleAuthors: 'Tagore, Nazrul, Sarat Chandra, Bibhutibhushan',
    displayLanguage: 'en',
  },
  bengali_ko: {
    themeCode: 'bengali',
    motherTongue: 'ko',
    title: '벵골어',
    subtitle: '강물의 먹, 강변 종이, 서정적인 문학 판본',
    nativeTitle: 'বাংলা পাঠাগার',
    nativeSubtitle: '강물과 먹으로 엮은 고요한 독서판',
    editionLabel: 'BENGALI CULTURE EDITION',
    monogram: 'অ',
    sampleAuthors: '타고르, 나즈룰, 샤랏 찬드라, 비부티부샨',
    displayLanguage: 'bn',
    subtitleLanguage: 'ko',
  },
  bengali_ja: {
    themeCode: 'bengali',
    motherTongue: 'ja',
    title: 'ベンガル',
    subtitle: '大河の墨と紙、静寂なる文学空間',
    nativeTitle: 'বাংলা পাঠাগার',
    nativeSubtitle: '河と墨と紙が紡ぐ静寂の読書版',
    editionLabel: 'BENGALI CULTURE EDITION',
    monogram: 'অ',
    sampleAuthors: 'タゴール, ナズルル, チャンドラ, ビブティブシャン',
    displayLanguage: 'bn',
    subtitleLanguage: 'ja',
  },
  bengali_ar: {
    themeCode: 'bengali',
    motherTongue: 'ar',
    title: 'البنغالية',
    subtitle: 'ورق أدبي وحبر نهري وهدوء فكري',
    nativeTitle: 'বাংলা পাঠাগার',
    nativeSubtitle: 'حبر النهر وورق القراءة الهادئة',
    editionLabel: 'BENGALI CULTURE EDITION',
    monogram: 'অ',
    sampleAuthors: 'طاغور، نذر الإسلام، شارات تشاندرا',
    displayLanguage: 'bn',
    subtitleLanguage: 'ar',
  },

  // --- Korean Theme ---
  korean_bn: {
    themeCode: 'korean',
    motherTongue: 'bn',
    title: 'কোরীয়',
    subtitle: 'হাঁজি কাগজ, শুভ্র স্নিগ্ধতা ও মিনিমাল রূপ',
    nativeTitle: '한국 서재',
    nativeSubtitle: 'হাঁজি কাগজ ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'KOREAN CULTURE EDITION',
    monogram: '책',
    sampleAuthors: 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল',
    displayLanguage: 'ko',
    subtitleLanguage: 'bn',
  },
  korean_en: {
    themeCode: 'korean',
    motherTongue: 'en',
    title: 'Korean',
    subtitle: 'Clean minimal, Hanji paper, cool whites',
    nativeTitle: 'Korean Reading Room',
    nativeSubtitle: 'Hanji paper, cool whites, and ink',
    editionLabel: 'Korean edition',
    monogram: 'Ko',
    sampleAuthors: 'Yi Sang, Kim Sowol, Yun Dong-ju, Kim Yu-jeong',
    displayLanguage: 'en',
  },
  korean_ko: {
    themeCode: 'korean',
    motherTongue: 'ko',
    title: '한국어',
    subtitle: '한지 종이, 맑은 백색, 절제된 미학',
    nativeTitle: '한국 서재',
    nativeSubtitle: '한지와 먹으로 만든 독서판',
    editionLabel: '한국 에디션',
    monogram: '책',
    sampleAuthors: '이상, 김소월, 윤동주, 김유정',
    displayLanguage: 'ko',
  },
  korean_ja: {
    themeCode: 'korean',
    motherTongue: 'ja',
    title: '韓国',
    subtitle: '韓紙(ハンジ)、白の静寂、端正な佇まい',
    nativeTitle: '한국 서재',
    nativeSubtitle: '韓紙と墨の読書版',
    editionLabel: 'KOREAN CULTURE EDITION',
    monogram: '책',
    sampleAuthors: '李箱, 金素月, 尹東柱, 金裕貞',
    displayLanguage: 'ko',
    subtitleLanguage: 'ja',
  },
  korean_ar: {
    themeCode: 'korean',
    motherTongue: 'ar',
    title: 'الكورية',
    subtitle: 'ورق الهانجي وبياض هادئ وتصميم بسيط',
    nativeTitle: '한국 서재',
    nativeSubtitle: 'ورق الهانجي وحبر القراءة الهادئة',
    editionLabel: 'KOREAN CULTURE EDITION',
    monogram: '책',
    sampleAuthors: 'يي سانغ، كيم سو وول، يون دونغ جو',
    displayLanguage: 'ko',
    subtitleLanguage: 'ar',
  },

  // --- Japanese Theme ---
  japanese_bn: {
    themeCode: 'japanese',
    motherTongue: 'bn',
    title: 'জাপানি',
    subtitle: 'ওয়াশি কাগজ, মেটে রঙ ও প্রশান্ত পরিসর',
    nativeTitle: '日本の書斎',
    nativeSubtitle: 'ওয়াশি কাগজ ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'JAPANESE CULTURE EDITION',
    monogram: '日',
    sampleAuthors: 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল',
    displayLanguage: 'ja',
    subtitleLanguage: 'bn',
  },
  japanese_en: {
    themeCode: 'japanese',
    motherTongue: 'en',
    title: 'Japanese',
    subtitle: 'Washi paper, muted earth tones, generous line-height',
    nativeTitle: '日本の書斎',
    nativeSubtitle: 'Washi paper and quiet sumi ink',
    editionLabel: 'JAPANESE CULTURE EDITION',
    monogram: '日',
    sampleAuthors: 'Austen, Shelley, Dickens, Tolstoy, Melville',
    displayLanguage: 'ja',
    subtitleLanguage: 'en',
  },
  japanese_ko: {
    themeCode: 'japanese',
    motherTongue: 'ko',
    title: '일본어',
    subtitle: '화지(和紙), 차분한 흙색, 여유로운 행간',
    nativeTitle: '日本の書斎',
    nativeSubtitle: '화지와 먹으로 엮은 독서판',
    editionLabel: 'JAPANESE CULTURE EDITION',
    monogram: '日',
    sampleAuthors: '오스틴, 셸리, 디킨스, 톨스토이, 멜빌',
    displayLanguage: 'ja',
    subtitleLanguage: 'ko',
  },
  japanese_ja: {
    themeCode: 'japanese',
    motherTongue: 'ja',
    title: '日本',
    subtitle: '和紙と墨、落ち着いたアーストーン',
    nativeTitle: '日本の書斎',
    nativeSubtitle: '和紙と墨の読書版',
    editionLabel: 'JAPANESE CULTURE EDITION',
    monogram: '日',
    sampleAuthors: '夏目漱石, 芥川龍之介, 太宰治, 宮沢賢治',
    displayLanguage: 'ja',
    subtitleLanguage: 'ja',
  },
  japanese_ar: {
    themeCode: 'japanese',
    motherTongue: 'ar',
    title: 'اليابانية',
    subtitle: 'ورق الواشي وتدرجات ترابية هادئة',
    nativeTitle: '日本の書斎',
    nativeSubtitle: 'ورق الواشي وحبر القراءة الهادئة',
    editionLabel: 'JAPANESE CULTURE EDITION',
    monogram: '日',
    sampleAuthors: 'أوستن، شيلي، ديكنز، تولستوي، ميلفيل',
    displayLanguage: 'ja',
    subtitleLanguage: 'ar',
  },

  // --- Arabic Theme ---
  arabic_bn: {
    themeCode: 'arabic',
    motherTongue: 'bn',
    title: 'আরবি',
    subtitle: 'গাঢ় নীল, স্বর্ণাভ আভা ও ধ্রুপদী রূপ',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: 'স্বর্ণালী আভা ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'ARABIC CULTURE EDITION',
    monogram: 'ض',
    sampleAuthors: 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল',
    displayLanguage: 'ar',
    subtitleLanguage: 'bn',
  },
  arabic_en: {
    themeCode: 'arabic',
    motherTongue: 'en',
    title: 'Arabic',
    subtitle: 'Deep navy, warm gold, geometric calm',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: 'Deep navy, warm gold, and classical script',
    editionLabel: 'ARABIC CULTURE EDITION',
    monogram: 'ض',
    sampleAuthors: 'Austen, Shelley, Dickens, Tolstoy, Melville',
    displayLanguage: 'ar',
    subtitleLanguage: 'en',
  },
  arabic_ko: {
    themeCode: 'arabic',
    motherTongue: 'ko',
    title: '아랍어',
    subtitle: '깊은 남색, 온화한 황금빛, 기하학적 미',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: '남색과 금빛으로 엮은 독서판',
    editionLabel: 'ARABIC CULTURE EDITION',
    monogram: 'ض',
    sampleAuthors: '오스틴, 셸리, 디킨스, 톨스토이, 멜빌',
    displayLanguage: 'ar',
    subtitleLanguage: 'ko',
  },
  arabic_ja: {
    themeCode: 'arabic',
    motherTongue: 'ja',
    title: 'アラビア',
    subtitle: '深い群青と金、幾何学の調和',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: '群青と金の静穏な読書版',
    editionLabel: 'ARABIC CULTURE EDITION',
    monogram: 'ض',
    sampleAuthors: 'オースティン, シェリー, ディケンズ, トルストイ, メルヴィル',
    displayLanguage: 'ar',
    subtitleLanguage: 'ja',
  },
  arabic_ar: {
    themeCode: 'arabic',
    motherTongue: 'ar',
    title: 'العربية',
    subtitle: 'كحلي عميق وذهب دافئ وتنسيق متزن',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: 'ورق وحبر للقراءة الهادئة',
    editionLabel: 'ARABIC CULTURE EDITION',
    monogram: 'ض',
    sampleAuthors: 'نجيب محفوظ، جبران خليل جبران، المتنبي، محمود درويش',
    displayLanguage: 'ar',
    subtitleLanguage: 'ar',
  },

  // --- Western Theme ---
  western_bn: {
    themeCode: 'western',
    motherTongue: 'bn',
    title: 'পাশ্চাত্য',
    subtitle: 'সম্পাদকীয় ক্রিম কাগজ ও লরা সেরিফ টাইপ',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: 'মার্জিন ও ধ্রুপদী হরফে ইংরেজি সাহিত্য পাঠ',
    editionLabel: 'WESTERN CULTURE EDITION',
    monogram: 'Aa',
    sampleAuthors: 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল',
    displayLanguage: 'en',
    subtitleLanguage: 'bn',
  },
  western_en: {
    themeCode: 'western',
    motherTongue: 'en',
    title: 'Western',
    subtitle: 'Editorial cream, Lora serif',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: 'Paper, type, and quiet margins',
    editionLabel: 'WESTERN CULTURE EDITION',
    monogram: 'Aa',
    sampleAuthors: 'Austen, Shelley, Dickens, Tolstoy, Melville',
    displayLanguage: 'en',
    subtitleLanguage: 'en',
  },
  western_ko: {
    themeCode: 'western',
    motherTongue: 'ko',
    title: '서양 고전',
    subtitle: '에디토리얼 크림, 로라(Lora) 서체',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: '활자와 여백이 주는 고요한 독서',
    editionLabel: 'WESTERN CULTURE EDITION',
    monogram: 'Aa',
    sampleAuthors: '오스틴, 셸리, 디킨스, 톨스토이, 멜빌',
    displayLanguage: 'en',
    subtitleLanguage: 'ko',
  },
  western_ja: {
    themeCode: 'western',
    motherTongue: 'ja',
    title: '西洋古典',
    subtitle: '上質クリーム紙、ローラ(Lora)活字',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: '活字と静かな余白の読書版',
    editionLabel: 'WESTERN CULTURE EDITION',
    monogram: 'Aa',
    sampleAuthors: 'オースティン, シェリー, ディケンズ, トルストイ, メルヴィル',
    displayLanguage: 'en',
    subtitleLanguage: 'ja',
  },
  western_ar: {
    themeCode: 'western',
    motherTongue: 'ar',
    title: 'الغربية',
    subtitle: 'ورق كريمي تحريري وخط لورا الأنيق',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: 'ورق وحروف وهوامش هادئة',
    editionLabel: 'WESTERN CULTURE EDITION',
    monogram: 'Aa',
    sampleAuthors: 'أوستن، شيلي، ديكنز، تولستوي، ميلفيل',
    displayLanguage: 'en',
    subtitleLanguage: 'ar',
  },
};

function getModularAuthors(
  targetLanguage: TargetReadingLanguageCode,
  motherTongue: MotherTongueCode,
): string {
  if (targetLanguage === 'bn') {
    switch (motherTongue) {
      case 'bn': return 'রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র, বিভূতিভূষণ';
      case 'ko': return '타고르, 나즈룰, 샤랏 찬드라, 비부티부샨';
      case 'ja': return 'タゴール, ナズルル, チャンドラ, ビブティブシャン';
      case 'ar': return 'طاغور، نذر الإسلام، شارات تشاندرا، بيبوتيبهوشان';
      default: return 'Tagore, Nazrul, Sarat Chandra, Bibhutibhushan';
    }
  }
  if (targetLanguage === 'ja') {
    switch (motherTongue) {
      case 'bn': return 'সোসেকি, আকুতাগাওয়া, দাজাই, মিয়াজাওয়া';
      case 'ko': return '나쓰메 소세키, 아쿠타가와, 다자이 오사무, 미야자와 겐지';
      case 'ja': return '夏目漱石, 芥川龍之介, 太宰治, 宮沢賢治';
      case 'ar': return 'سوسيكي، أكوتاغاوا، دازاي، ميازاوا';
      default: return 'Soseki, Akutagawa, Dazai, Miyazawa';
    }
  }
  if (targetLanguage === 'ko') {
    switch (motherTongue) {
      case 'bn': return 'ই সাং, কিম সো-ওল, ইউন দোং-জু, কিম ইয়ু-জং';
      case 'ko': return '이상, 김소월, 윤동주, 김유정';
      case 'ja': return '李箱, 金素月, 尹東柱, 金裕貞';
      case 'ar': return 'يي سانغ، كيم سو وول، يون دونغ جو، كيم يو جونغ';
      default: return 'Yi Sang, Kim Sowol, Yun Dong-ju, Kim Yu-jeong';
    }
  }
  // Default: English classics
  switch (motherTongue) {
    case 'bn': return 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল';
    case 'ko': return '오스틴, 셸리, 디킨스, 톨스토이, 멜빌';
    case 'ja': return 'オースティン, シェリー, ディケンズ, トルストイ, メルヴィル';
    case 'ar': return 'أوستن، شيلي، ديكنز، تولستوي، ميلفيل';
    default: return 'Austen, Shelley, Dickens, Tolstoy, Melville';
  }
}

function getModularSubtitle(
  theme: LiteraryThemeCode,
  motherTongue: MotherTongueCode,
  targetLanguage: TargetReadingLanguageCode,
): string {
  if (motherTongue === 'bn') {
    if (targetLanguage === 'en') {
      if (theme === 'japanese') return 'ওয়াশি কাগজ ও কালির শান্ততায় ইংরেজি ধ্রুপদী সাহিত্য';
      if (theme === 'korean') return 'হাঁজি কাগজ ও কালির শান্ততায় ইংরেজি ধ্রুপদী সাহিত্য';
      if (theme === 'bengali') return 'নদী ও কালির স্নিগ্ধতায় ইংরেজি ধ্রুপদী সাহিত্য';
      if (theme === 'arabic') return 'আরবি নকশা ও স্বর্ণাভ আভার শান্ততায় ইংরেজি ধ্রুপদী সাহিত্য';
      if (theme === 'classic') return 'উষ্ণ পার্চমেন্ট, চারকোল কালি ও শান্ত পাঠসংস্করণ';
      return 'মার্জিন ও ধ্রুপদী হরফে ইংরেজি সাহিত্য পাঠ';
    }
    if (targetLanguage === 'bn') {
      if (theme === 'japanese') return 'ওয়াশি কাগজের শান্ততায় বাংলা সাহিত্য পাঠ';
      if (theme === 'korean') return 'হাঁজি কাগজের স্নিগ্ধতায় বাংলা সাহিত্যের রূপ';
      if (theme === 'bengali') return 'নদী, কাগজ ও কালির পাঠসংস্করণ';
      if (theme === 'classic') return 'উষ্ণ পার্চমেন্ট, চারকোল কালি ও শান্ত পাঠসংস্করণ';
      return 'শান্ত মার্জিন ও কালির পাঠসংস্করণ';
    }
    if (targetLanguage === 'ja') return 'শান্ত কাগজ ও কালির আবহে জাপানি সাহিত্য পাঠ';
    if (targetLanguage === 'ko') return 'শান্ত কাগজ ও কালির আবহে কোরীয় সাহিত্য পাঠ';
    return 'কালি ও শান্ত কাগজের আবহে সাহিত্য পাঠ';
  }

  if (motherTongue === 'ko') {
    if (targetLanguage === 'en') {
      if (theme === 'japanese') return '화지와 먹의 고요함 속에 담긴 영미 고전';
      if (theme === 'korean') return '한지와 먹의 단아함 속에 담긴 영미 고전';
      if (theme === 'arabic') return '깊은 남색과 황금빛 여백 속에 담긴 영미 고전';
      if (theme === 'bengali') return '대하의 먹과 종이 결 속에 담긴 영미 고전';
      if (theme === 'classic') return '따뜻한 종이와 숯빛 먹으로 만나는 고요한 독서판';
      return '여백과 활자로 만나는 영미 고전 독서';
    }
    if (targetLanguage === 'ko') {
      if (theme === 'korean') return '한지와 먹으로 만든 고요한 독서판';
      if (theme === 'japanese') return '화지와 먹의 고요 속에 담긴 한국 문학';
      if (theme === 'classic') return '따뜻한 양피지와 숯빛 먹으로 만나는 독서판';
      return '활자와 여백으로 만나는 한국 문학';
    }
    if (targetLanguage === 'ja') return '화지와 먹의 고요 속에 만나는 일본 문학';
    if (targetLanguage === 'bn') return '강물과 먹으로 엮은 고요한 벵골 문학 독서';
    return '종이 결 위에 펼쳐지는 고요한 독서판';
  }

  if (motherTongue === 'ja') {
    if (targetLanguage === 'en') {
      if (theme === 'japanese') return '和紙と墨の静けさで味わう英語古典文学';
      if (theme === 'korean') return '韓紙の白と端正な余白で読む英語古典文学';
      if (theme === 'arabic') return '深い藍と金の静寂に広がる英語古典文学';
      if (theme === 'bengali') return '大河の墨と紙が包む英語古典文学';
      if (theme === 'classic') return '温かな羊皮紙と木炭の墨で紡ぐ静寂の読書空間';
      return '活字と静かな余白で愉しむ英語古典文学';
    }
    if (targetLanguage === 'ja') {
      if (theme === 'japanese') return '和紙と墨の読書版';
      if (theme === 'classic') return '温かな紙と墨で紡ぐ静寂の古典読書版';
      return '静寂なる活字と紙の文学空間';
    }
    if (targetLanguage === 'ko') return '韓紙の白と端正な余白で味わう韓国文学';
    if (targetLanguage === 'bn') return '大河の墨と紙が紡ぐベンガル文学';
    return '紙と墨が紡ぐ静寂の読書空間';
  }

  if (motherTongue === 'ar') {
    if (targetLanguage === 'en') {
      if (theme === 'japanese') return 'الأدب الإنجليزي الكلاسيكي في رحاب ورق الواشي وحبر السومي';
      if (theme === 'korean') return 'الأدب الإنجليزي الكلاسيكي بنقاء ورق الهانجي وبياضه الهادئ';
      if (theme === 'arabic') return 'الأدب الإنجليزي الكلاسيكي في رحاب القراءة الهادئة والنغم الهندسي';
      if (theme === 'bengali') return 'الأدب الإنجليزي الكلاسيكي بفيض حبر النهر والورق الأدبي';
      if (theme === 'classic') return 'ورق دافئ وحبر أصيل لقراءة كلاسيكية هادئة';
      return 'الأدب الإنجليزي الكلاسيكي بين هوامش الورق والطباعة الراقية';
    }
    if (targetLanguage === 'ja') return 'الأدب الياباني الكلاسيكي بصفاء ورق الواشي والحبر';
    if (targetLanguage === 'ko') return 'الأدب الكوري الكلاسيكي بروعة ورق الهانجي وبياضه';
    if (targetLanguage === 'bn') return 'الأدب البنغالي في حبر النهر وورق القراءة الهادئة';
    return 'رحاب الورق والحبر للقراءة الهادئة';
  }

  // Default: English mother tongue
  if (targetLanguage === 'en') {
    if (theme === 'japanese') return 'English classics framed in quiet washi paper & sumi ink';
    if (theme === 'korean') return 'English classics in the calm serenity of Hanji paper & cool whites';
    if (theme === 'arabic') return 'English classics in deep navy, warm gold, and geometric calm';
    if (theme === 'bengali') return 'English classics in secular paper, river ink, and editorial calm';
    if (theme === 'classic') return 'Warm parchment, charcoal ink, and serene reading';
    return 'Paper, type, and quiet margins for English classics';
  }
  if (targetLanguage === 'ja') return 'Japanese literature in quiet washi paper & sumi ink';
  if (targetLanguage === 'ko') return 'Korean literature in quiet Hanji paper & cool whites';
  if (targetLanguage === 'bn') return 'Bengali literature in quiet river ink & secular paper';
  return 'Paper, ink, and quiet margins for classic literature';
}

export function getModularThemePresentation(
  theme: LiteraryThemeCode,
  motherTongue: MotherTongueCode = getMotherTongue(),
  targetReadingLanguage: TargetReadingLanguageCode = getTargetReadingLanguage(),
): ModularThemePresentation {
  const key = `${theme}_${motherTongue}`;
  const base = MODULAR_THEME_PRESENTATIONS[key] ??
    MODULAR_THEME_PRESENTATIONS[`${theme}_en`] ??
    MODULAR_THEME_PRESENTATIONS[`classic_${motherTongue}`] ??
    MODULAR_THEME_PRESENTATIONS['classic_en'];

  // 1. Monogram & Native Title:
  // Preserved from the theme's cultural aesthetic
  let monogram = base.monogram;
  let nativeTitle = base.nativeTitle;
  let displayLanguage = base.displayLanguage;
  let editionLabel = base.editionLabel;

  if (theme === 'classic') {
    monogram = '🪔';
    nativeTitle = motherTongue === 'bn' ? 'ল্যাম্পলাইট পাঠাগার' : 'Lamplight Reading Room';
    displayLanguage = motherTongue;
    editionLabel = motherTongue === 'bn' ? 'ধ্রুপদী সংস্করণ' : 'Standard Edition';
  } else if (theme === 'japanese') {
    monogram = '日';
    nativeTitle = '日本の書斎';
    displayLanguage = 'ja';
    editionLabel = 'JAPANESE CULTURE EDITION';
  } else if (theme === 'korean') {
    monogram = '책';
    nativeTitle = '한국 서재';
    displayLanguage = 'ko';
    editionLabel = 'KOREAN CULTURE EDITION';
  } else if (theme === 'arabic') {
    monogram = 'ض';
    nativeTitle = 'المكتبة العربية';
    displayLanguage = 'ar';
    editionLabel = 'ARABIC CULTURE EDITION';
  } else if (theme === 'western') {
    monogram = 'Aa';
    nativeTitle = 'The Reading Room';
    displayLanguage = 'en';
    editionLabel = 'WESTERN CULTURE EDITION';
  } else if (theme === 'bengali') {
    monogram = 'অ';
    nativeTitle = 'বাংলা পাঠাগার';
    displayLanguage = 'bn';
    editionLabel = 'BENGALI CULTURE EDITION';
  } else {
    const opt = getLiteraryThemeOption(theme);
    monogram = opt.monogram;
    nativeTitle = opt.nativeTitle;
    displayLanguage = 'en';
    editionLabel = opt.editionLabel;
  }

  // 2. Subtitle Language is ALWAYS the user's Mother Tongue for comprehension
  const subtitleLanguage: MotherTongueCode = motherTongue;

  // 3. Authors: based on targetReadingLanguage, written in motherTongue
  const sampleAuthors = getModularAuthors(targetReadingLanguage, motherTongue);

  // 4. Subtitle: explains the theme's aesthetic atmosphere in user's motherTongue
  const nativeSubtitle = getModularSubtitle(theme, motherTongue, targetReadingLanguage);

  return {
    ...base,
    monogram,
    nativeTitle,
    nativeSubtitle,
    editionLabel,
    sampleAuthors,
    displayLanguage,
    subtitleLanguage,
  };
}

const VALID_THEMES = new Set<LiteraryThemeCode>([
  'classic',
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

let currentTheme: LiteraryThemeCode = 'classic';
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSuggestedThemeForMotherTongue(_motherTongue: string): LiteraryThemeCode {
  return 'classic';
}

export function isRtlLiteraryTheme(theme: LiteraryThemeCode): boolean {
  return theme === 'arabic';
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
