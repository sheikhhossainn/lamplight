import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { getMotherTongue, type MotherTongueCode } from '@/features/settings/motherTongue';
import {
  getTargetReadingLanguage,
  type TargetReadingLanguageCode,
} from '@/features/settings/targetReadingLanguage';

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
};

export const MODULAR_THEME_PRESENTATIONS: Record<string, ModularThemePresentation> = {
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
    title: '벵골어 (Bengali)',
    subtitle: '강물의 먹, 강변 종이, 서정적인 문학 판본',
    nativeTitle: '벵골 서재',
    nativeSubtitle: '강물과 먹으로 엮은 고요한 독서판',
    editionLabel: '벵골 에디션',
    monogram: '벵',
    sampleAuthors: '타고르, 나즈룰, 샤랏 찬드라, 비부티부샨',
    displayLanguage: 'ko',
  },
  bengali_ja: {
    themeCode: 'bengali',
    motherTongue: 'ja',
    title: 'ベンガル (Bengali)',
    subtitle: '大河の墨と紙、静寂なる文学空間',
    nativeTitle: 'ベンガル書斎',
    nativeSubtitle: '河と墨と紙が紡ぐ静寂の読書版',
    editionLabel: 'ベンガル文学版',
    monogram: '孟',
    sampleAuthors: 'タゴール, ナズルル, チャンドラ, ビブティブシャン',
    displayLanguage: 'ja',
  },
  bengali_ar: {
    themeCode: 'bengali',
    motherTongue: 'ar',
    title: 'البنغالية (Bengali)',
    subtitle: 'ورق أدبي وحبر نهري وهدوء فكري',
    nativeTitle: 'المكتبة البنغالية',
    nativeSubtitle: 'حبر النهر وورق القراءة الهادئة',
    editionLabel: 'طبعة بنغالية',
    monogram: 'ب',
    sampleAuthors: 'طاغور، نذر الإسلام، شارات تشاندرا',
    displayLanguage: 'ar',
  },

  // --- Korean Theme ---
  korean_bn: {
    themeCode: 'korean',
    motherTongue: 'bn',
    title: 'কোরীয়',
    subtitle: 'হাঁজি কাগজ, শুভ্র স্নিগ্ধতা ও মিনিমাল রূপ',
    nativeTitle: 'কোরীয় পাঠাগার',
    nativeSubtitle: 'হাঁজি কাগজ ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'কোরীয় সংস্করণ',
    monogram: 'ক',
    sampleAuthors: 'ই সাং, কিম সো-ওল, ইউন দোং-জু, কিম ইয়ু-জং',
    displayLanguage: 'bn',
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
    title: '韓国 (Korean)',
    subtitle: '韓紙(ハンジ)、白の静寂、端正な佇まい',
    nativeTitle: '韓国書斎',
    nativeSubtitle: '韓紙と墨の読書版',
    editionLabel: '韓国文学版',
    monogram: '韓',
    sampleAuthors: '李箱, 金素月, 尹東柱, 金裕貞',
    displayLanguage: 'ja',
  },
  korean_ar: {
    themeCode: 'korean',
    motherTongue: 'ar',
    title: 'الكورية (Korean)',
    subtitle: 'ورق الهانجي وبياض هادئ وتصميم بسيط',
    nativeTitle: 'المكتبة الكورية',
    nativeSubtitle: 'ورق الهانجي وحبر القراءة الهادئة',
    editionLabel: 'طبعة كورية',
    monogram: 'ك',
    sampleAuthors: 'يي سانغ، كيم سو وول، يون دونغ جو',
    displayLanguage: 'ar',
  },

  // --- Japanese Theme ---
  japanese_bn: {
    themeCode: 'japanese',
    motherTongue: 'bn',
    title: 'জাপানি',
    subtitle: 'ওয়াশি কাগজ, মেটে রঙ ও প্রশান্ত পরিসর',
    nativeTitle: 'জাপানি পাঠাগার',
    nativeSubtitle: 'ওয়াশি কাগজ ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'জাপানি সংস্করণ',
    monogram: 'জ',
    sampleAuthors: 'সোসেকি, আকুতাগাওয়া, দাজাই, মিয়াজাওয়া',
    displayLanguage: 'bn',
  },
  japanese_en: {
    themeCode: 'japanese',
    motherTongue: 'en',
    title: 'Japanese',
    subtitle: 'Washi paper, muted earth tones, generous line-height',
    nativeTitle: 'Japanese Reading Room',
    nativeSubtitle: 'Washi paper and quiet sumi ink',
    editionLabel: 'Japanese edition',
    monogram: 'Ja',
    sampleAuthors: 'Soseki, Akutagawa, Dazai, Miyazawa',
    displayLanguage: 'en',
  },
  japanese_ko: {
    themeCode: 'japanese',
    motherTongue: 'ko',
    title: '일본어 (Japanese)',
    subtitle: '화지(和紙), 차분한 흙색, 여유로운 행간',
    nativeTitle: '일본 서재',
    nativeSubtitle: '화지와 먹으로 엮은 독서판',
    editionLabel: '일본 에디션',
    monogram: '일',
    sampleAuthors: '나쓰메 소세키, 아쿠타가와, 다자이 오사무, 미야자와 겐지',
    displayLanguage: 'ko',
  },
  japanese_ja: {
    themeCode: 'japanese',
    motherTongue: 'ja',
    title: '日本 (Japanese)',
    subtitle: '和紙と墨、落ち着いたアーストーン',
    nativeTitle: '日本の書斎',
    nativeSubtitle: '和紙と墨の読書版',
    editionLabel: '日本文学版',
    monogram: '本',
    sampleAuthors: '夏目漱石, 芥川龍之介, 太宰治, 宮沢賢治',
    displayLanguage: 'ja',
  },
  japanese_ar: {
    themeCode: 'japanese',
    motherTongue: 'ar',
    title: 'اليابانية (Japanese)',
    subtitle: 'ورق الواشي وتدرجات ترابية هادئة',
    nativeTitle: 'المكتبة اليابانية',
    nativeSubtitle: 'ورق الواشي وحبر القراءة الهادئة',
    editionLabel: 'طبعة يابانية',
    monogram: 'ي',
    sampleAuthors: 'سوسيكي، أكوتاغاوا، دازاي، ميازاوا',
    displayLanguage: 'ar',
  },

  // --- Arabic Theme ---
  arabic_bn: {
    themeCode: 'arabic',
    motherTongue: 'bn',
    title: 'আরবি',
    subtitle: 'গাঢ় নীল, স্বর্ণাভ আভা ও ধ্রুপদী রূপ',
    nativeTitle: 'আরবি পাঠাগার',
    nativeSubtitle: 'স্বর্ণালী আভা ও কালির শান্ত পাঠসংস্করণ',
    editionLabel: 'আরবি সংস্করণ',
    monogram: 'আ',
    sampleAuthors: 'নাগিব মাহফুজ, খলিল জিবরান, আল-মুতানাব্বি, মাহমুদ দারবিশ',
    displayLanguage: 'bn',
  },
  arabic_en: {
    themeCode: 'arabic',
    motherTongue: 'en',
    title: 'Arabic',
    subtitle: 'Deep navy, warm gold, geometric calm',
    nativeTitle: 'Arabic Reading Room',
    nativeSubtitle: 'Deep navy, warm gold, and classical script',
    editionLabel: 'Arabic edition',
    monogram: 'Ar',
    sampleAuthors: 'Mahfouz, Gibran, Al-Mutanabbi, Darwish',
    displayLanguage: 'en',
  },
  arabic_ko: {
    themeCode: 'arabic',
    motherTongue: 'ko',
    title: '아랍어 (Arabic)',
    subtitle: '깊은 남색, 온화한 황금빛, 기하학적 미',
    nativeTitle: '아랍 서재',
    nativeSubtitle: '남색과 금빛으로 엮은 독서판',
    editionLabel: '아랍 에디션',
    monogram: '아',
    sampleAuthors: '마흐푸즈, 지브란, 알무탄나비, 다르위시',
    displayLanguage: 'ko',
  },
  arabic_ja: {
    themeCode: 'arabic',
    motherTongue: 'ja',
    title: 'アラビア (Arabic)',
    subtitle: '深い群青と金、幾何学の調和',
    nativeTitle: 'アラビア書斎',
    nativeSubtitle: '群青と金の静穏な読書版',
    editionLabel: 'アラビア文学版',
    monogram: '阿',
    sampleAuthors: 'マフフーズ, ジブラーン, ムタナッビー, ダルウィーシュ',
    displayLanguage: 'ja',
  },
  arabic_ar: {
    themeCode: 'arabic',
    motherTongue: 'ar',
    title: 'العربية',
    subtitle: 'كحلي عميق وذهب دافئ وتنسيق متزن',
    nativeTitle: 'المكتبة العربية',
    nativeSubtitle: 'ورق وحبر للقراءة الهادئة',
    editionLabel: 'طبعة عربية',
    monogram: 'ض',
    sampleAuthors: 'محفوظ، جبران، المتنبي، درويش',
    displayLanguage: 'ar',
  },

  // --- Western Theme ---
  western_bn: {
    themeCode: 'western',
    motherTongue: 'bn',
    title: 'পাশ্চাত্য',
    subtitle: 'সম্পাদকীয় ক্রিম কাগজ ও লরা সেরিফ টাইপ',
    nativeTitle: 'পাশ্চাত্য পাঠাগার',
    nativeSubtitle: 'মার্জিন, কাগজ ও ধ্রুপদী হরফের পাঠসংস্করণ',
    editionLabel: 'পাশ্চাত্য সংস্করণ',
    monogram: 'পা',
    sampleAuthors: 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল',
    displayLanguage: 'bn',
  },
  western_en: {
    themeCode: 'western',
    motherTongue: 'en',
    title: 'Western',
    subtitle: 'Editorial cream, Lora serif',
    nativeTitle: 'The Reading Room',
    nativeSubtitle: 'Paper, type, and quiet margins',
    editionLabel: 'Western edition',
    monogram: 'Aa',
    sampleAuthors: 'Austen, Shelley, Dickens, Tolstoy, Melville',
    displayLanguage: 'en',
  },
  western_ko: {
    themeCode: 'western',
    motherTongue: 'ko',
    title: '서양 고전 (Western)',
    subtitle: '에디토리얼 크림, 로라(Lora) 서체',
    nativeTitle: '서양 고전 서재',
    nativeSubtitle: '활자와 여백이 주는 고요한 독서',
    editionLabel: '영문 에디션',
    monogram: '서',
    sampleAuthors: '오스틴, 셸리, 디킨스, 톨스토이, 멜빌',
    displayLanguage: 'ko',
  },
  western_ja: {
    themeCode: 'western',
    motherTongue: 'ja',
    title: '西洋古典 (Western)',
    subtitle: '上質クリーム紙、ローラ(Lora)活字',
    nativeTitle: '西洋の書斎',
    nativeSubtitle: '活字と静かな余白の読書版',
    editionLabel: '西洋文学版',
    monogram: '洋',
    sampleAuthors: 'オースティン, シェリー, ディケンズ, トルストイ',
    displayLanguage: 'ja',
  },
  western_ar: {
    themeCode: 'western',
    motherTongue: 'ar',
    title: 'الغربية (Western)',
    subtitle: 'ورق كريمي تحريري وخط لورا الأنيق',
    nativeTitle: 'غرفة القراءة الغربية',
    nativeSubtitle: 'ورق وحروف وهوامش هادئة',
    editionLabel: 'طبعة كلاسيكية',
    monogram: 'غ',
    sampleAuthors: 'أوستن، شيلي، ديكنز، تولستوي',
    displayLanguage: 'ar',
  },
};

export function getModularThemePresentation(
  theme: LiteraryThemeCode,
  motherTongue: MotherTongueCode = getMotherTongue(),
  targetReadingLanguage: TargetReadingLanguageCode = getTargetReadingLanguage(),
): ModularThemePresentation {
  const key = `${theme}_${motherTongue}`;
  const base = MODULAR_THEME_PRESENTATIONS[key] ?? {
    themeCode: theme,
    motherTongue,
    title: getLiteraryThemeOption(theme).title,
    subtitle: getLiteraryThemeOption(theme).subtitle,
    nativeTitle: getLiteraryThemeOption(theme).nativeTitle,
    nativeSubtitle: getLiteraryThemeOption(theme).nativeSubtitle,
    editionLabel: getLiteraryThemeOption(theme).editionLabel,
    monogram: getLiteraryThemeOption(theme).monogram,
    sampleAuthors: getLiteraryThemeOption(theme).sampleAuthors,
    displayLanguage: motherTongue,
  };

  // Modularize presentation: Decouple visual atmosphere from mother tongue & target reading language
  let monogram = base.monogram;
  let nativeTitle = base.nativeTitle;
  let nativeSubtitle = base.nativeSubtitle;
  let editionLabel = base.editionLabel;
  let sampleAuthors = base.sampleAuthors;

  if (motherTongue === 'bn') {
    monogram = 'অ';
    nativeTitle = 'বাংলা পাঠাগার';

    if (targetReadingLanguage === 'en') {
      editionLabel = 'ইংরেজি ধ্রুপদী সংস্করণ';
      sampleAuthors = 'অস্টেন, শেলি, ডিকেন্স, তলস্তয়, মেলভিল';
      if (theme === 'korean') {
        nativeSubtitle = 'হাঁজি কাগজ ও কালির স্নিগ্ধতায় ইংরেজি ধ্রুপদী সাহিত্য';
      } else if (theme === 'bengali') {
        nativeSubtitle = 'নদী ও কালির স্নিগ্ধতায় ইংরেজি ধ্রুপদী সাহিত্য';
      } else if (theme === 'japanese') {
        nativeSubtitle = 'ওয়াশি কাগজের শান্ততায় ইংরেজি ধ্রুপদী সাহিত্য';
      } else if (theme === 'arabic') {
        nativeSubtitle = 'গাঢ় নীল ও স্বর্ণালী আভায় ইংরেজি ধ্রুপদী সাহিত্য';
      } else if (theme === 'western') {
        nativeSubtitle = 'মার্জিন ও ধ্রুপদী হরফে ইংরেজি সাহিত্য পাঠ';
      } else {
        nativeSubtitle = 'কালি ও শান্ত কাগজের আবহে ইংরেজি সাহিত্য';
      }
    } else if (targetReadingLanguage === 'bn') {
      editionLabel = 'বাংলা সাহিত্য সংস্করণ';
      sampleAuthors = 'রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র, বিভূতিভূষণ';
      if (theme === 'korean') {
        nativeSubtitle = 'হাঁজি কাগজের স্নিগ্ধতায় বাংলা সাহিত্যের রূপ';
      } else if (theme === 'japanese') {
        nativeSubtitle = 'ওয়াশি কাগজের শান্ততায় বাংলা সাহিত্য পাঠ';
      } else {
        nativeSubtitle = 'নদী, কাগজ ও কালির পাঠসংস্করণ';
      }
    } else if (targetReadingLanguage === 'ja') {
      editionLabel = 'জাপানি সাহিত্য সংস্করণ';
      sampleAuthors = 'সোসেকি, আকুতাগাওয়া, দাজাই, মিয়াজাওয়া';
      nativeSubtitle = 'শান্ত কাগজ ও কালির আবহে জাপানি সাহিত্য পাঠ';
    } else if (targetReadingLanguage === 'ko') {
      editionLabel = 'কোরীয় সাহিত্য সংস্করণ';
      sampleAuthors = 'ই সাং, কিম সো-ওল, ইউন দোং-জু, কিম ইয়ু-জং';
      nativeSubtitle = 'শান্ত কাগজ ও কালির আবহে কোরীয় সাহিত্য পাঠ';
    }
  } else if (motherTongue === 'en') {
    monogram = 'Aa';
    nativeTitle = 'The Reading Room';

    if (targetReadingLanguage === 'en') {
      editionLabel = 'English Classics Edition';
      sampleAuthors = 'Austen, Shelley, Dickens, Tolstoy, Melville';
      if (theme === 'korean') {
        nativeSubtitle = 'English classics in the calm serenity of Hanji paper & ink';
      } else if (theme === 'japanese') {
        nativeSubtitle = 'English classics framed in quiet washi paper & sumi ink';
      } else if (theme === 'bengali') {
        nativeSubtitle = 'English classics in secular paper, river ink, and editorial calm';
      } else if (theme === 'arabic') {
        nativeSubtitle = 'English classics in deep navy, warm gold, and geometric calm';
      } else {
        nativeSubtitle = 'Paper, type, and quiet margins';
      }
    } else if (targetReadingLanguage === 'bn') {
      editionLabel = 'Bengali Literature Edition';
      sampleAuthors = 'Tagore, Nazrul, Sarat Chandra, Bibhutibhushan';
      nativeSubtitle = 'Bengali literature in original text and calm margins';
    } else if (targetReadingLanguage === 'ja') {
      editionLabel = 'Japanese Literature Edition';
      sampleAuthors = 'Soseki, Akutagawa, Dazai, Miyazawa';
      nativeSubtitle = 'Japanese literature in original text and sumi ink';
    } else if (targetReadingLanguage === 'ko') {
      editionLabel = 'Korean Literature Edition';
      sampleAuthors = 'Yi Sang, Kim Sowol, Yun Dong-ju, Kim Yu-jeong';
      nativeSubtitle = 'Korean literature in original text and quiet serenity';
    }
  } else if (motherTongue === 'ko') {
    monogram = '책';
    nativeTitle = '한국 서재';
    if (targetReadingLanguage === 'en') {
      editionLabel = '영미 고전 에디션';
      sampleAuthors = '오스틴, 셸리, 디킨스, 톨스토이, 멜빌';
      if (theme === 'korean') {
        nativeSubtitle = '한지와 먹의 단아함 속에 담긴 영미 고전';
      } else {
        nativeSubtitle = '여백과 활자로 만나는 영미 고전 독서';
      }
    }
  } else if (motherTongue === 'ja') {
    monogram = '本';
    nativeTitle = '日本の書斎';
    if (targetReadingLanguage === 'en') {
      editionLabel = '英語古典文学版';
      sampleAuthors = 'オースティン, シェリー, ディケンズ, トルストイ';
      if (theme === 'korean') {
        nativeSubtitle = '韓紙の静寂で読む英語古典文学';
      } else {
        nativeSubtitle = '活字と静かな余白で愉しむ英語古典文学';
      }
    }
  } else if (motherTongue === 'ar') {
    monogram = 'ض';
    nativeTitle = 'المكتبة الهادئة';
    if (targetReadingLanguage === 'en') {
      editionLabel = 'طبعة الأدب الإنجليزي';
      sampleAuthors = 'أوستن، شيلي، ديكنز، تولستوي';
      nativeSubtitle = 'الأدب الإنجليزي الكلاسيكي في رحاب القراءة الهادئة';
    }
  }

  return {
    ...base,
    monogram,
    nativeTitle,
    nativeSubtitle,
    editionLabel,
    sampleAuthors,
  };
}

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
