import { FontFamily } from '@/theme/typography';

export type PageStyleId =
  | 'classic'
  | 'modern'
  | 'manuscript'
  | 'editorial'
  | 'oxford'
  | 'vellum'
  | 'nocturne'
  | 'zen';

export type PageStyleTier = 'free' | 'premium';

export type PageStyleConfig = {
  id: PageStyleId;
  name: string;
  nameBangla: string;
  tag: string;
  tier: PageStyleTier;
  isPremium: boolean;
  description: string;
  previewSample: string;
  previewSampleBangla: string;
  // Font families
  englishFont: string;
  englishBoldFont: string;
  banglaFont: string;
  banglaBoldFont: string;
  // Typography metrics
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  banglaFontSize: number;
  banglaLineHeight: number;
  banglaLetterSpacing: number;
  // Aesthetic accents
  borderAccentOpacity: number;
};

export const PAGE_STYLES: Record<PageStyleId, PageStyleConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Print',
    nameBangla: 'মুদ্রণ (Classic Print)',
    tag: '1890s SERIF',
    tier: 'free',
    isPremium: false,
    description: 'Timeless letterpress typography modeled after 1890s hardcovers.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'ধীর আলোয় মুদ্রিত পাতার শান্তি।',
    englishFont: FontFamily.loraRegular,
    englishBoldFont: FontFamily.loraSemiBold,
    banglaFont: FontFamily.loraRegular,
    banglaBoldFont: FontFamily.loraSemiBold,
    fontSize: 17.5,
    lineHeight: 33,
    letterSpacing: 0,
    banglaFontSize: 18,
    banglaLineHeight: 34,
    banglaLetterSpacing: 0,
    borderAccentOpacity: 0.08,
  },
  modern: {
    id: 'modern',
    name: 'Modern Clean',
    nameBangla: 'আধুনিক (Modern Clean)',
    tag: 'SANCTUARY SANS',
    tier: 'free',
    isPremium: false,
    description: 'Minimalist contemporary typography for clear, distraction-free focus.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'স্বচ্ছ ও শান্ত আধুনিক পাঠের অভিজ্ঞতা।',
    englishFont: FontFamily.manropeRegular,
    englishBoldFont: FontFamily.manropeSemiBold,
    banglaFont: FontFamily.manropeRegular,
    banglaBoldFont: FontFamily.manropeSemiBold,
    fontSize: 17,
    lineHeight: 32,
    letterSpacing: 0.15,
    banglaFontSize: 17.5,
    banglaLineHeight: 33,
    banglaLetterSpacing: 0.1,
    borderAccentOpacity: 0.04,
  },
  manuscript: {
    id: 'manuscript',
    name: 'Manuscript',
    nameBangla: 'পাণ্ডুলিপি (Manuscript)',
    tag: 'HANDWRITTEN',
    tier: 'free',
    isPremium: false,
    description: 'Warm, intimate handwritten ink with natural cursive curves.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'ধীর আলোয় হাতে লেখা পাতার শান্তি।',
    englishFont: FontFamily.kalamRegular,
    englishBoldFont: FontFamily.kalamBold,
    banglaFont: FontFamily.atmaMedium,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 0.25,
    banglaFontSize: 18.5,
    banglaLineHeight: 35,
    banglaLetterSpacing: 0.2,
    borderAccentOpacity: 0.18,
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial Folio',
    nameBangla: 'সম্পাদকীয় (Editorial Folio)',
    tag: 'LITERARY JOURNAL',
    tier: 'free',
    isPremium: false,
    description: 'Refined literary journal layout with generous leading and delicate balance.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'পরিমার্জিত সাহিত্য পত্রিকার মার্জিত রূপ।',
    englishFont: FontFamily.loraRegular,
    englishBoldFont: FontFamily.loraSemiBoldItalic,
    banglaFont: FontFamily.atmaRegular,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 17.5,
    lineHeight: 35,
    letterSpacing: 0.3,
    banglaFontSize: 18,
    banglaLineHeight: 35,
    banglaLetterSpacing: 0.25,
    borderAccentOpacity: 0.12,
  },
  oxford: {
    id: 'oxford',
    name: 'Oxford Clothbound',
    nameBangla: 'অক্সফোর্ড (Oxford Clothbound)',
    tag: 'SCHOLARLY SERIF',
    tier: 'premium',
    isPremium: true,
    description: 'Prestigious academic edition with authoritative serif weight and distinguished cadence.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'গবেষণামূলক ও ধ্রুপদী প্রকাশনার গম্ভীর ছন্দ।',
    englishFont: FontFamily.loraSemiBold,
    englishBoldFont: FontFamily.loraSemiBoldItalic,
    banglaFont: FontFamily.loraSemiBold,
    banglaBoldFont: FontFamily.loraSemiBoldItalic,
    fontSize: 18,
    lineHeight: 36,
    letterSpacing: 0.2,
    banglaFontSize: 18.5,
    banglaLineHeight: 36,
    banglaLetterSpacing: 0.15,
    borderAccentOpacity: 0.22,
  },
  vellum: {
    id: 'vellum',
    name: 'Gilded Vellum',
    nameBangla: 'গিল্ডেড ভেলাম (Gilded Vellum)',
    tag: 'ANTIQUE ARCHIVE',
    tier: 'premium',
    isPremium: true,
    description: 'Illuminated archive typography with warm historic ink and breathing room.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'স্বর্ণখচিত প্রাচীন পাণ্ডুলিপির মায়াবী ছোঁয়া।',
    englishFont: FontFamily.loraItalicMedium,
    englishBoldFont: FontFamily.loraSemiBoldItalic,
    banglaFont: FontFamily.atmaMedium,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 18.5,
    lineHeight: 36,
    letterSpacing: 0.35,
    banglaFontSize: 19,
    banglaLineHeight: 37,
    banglaLetterSpacing: 0.3,
    borderAccentOpacity: 0.28,
  },
  nocturne: {
    id: 'nocturne',
    name: 'Midnight Nocturne',
    nameBangla: 'মিডনাইট নক্টার্ন (Midnight Nocturne)',
    tag: 'DEEP FOCUS',
    tier: 'premium',
    isPremium: true,
    description: 'Velvet low-light typography designed specifically for prolonged late-night contemplation.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'নিস্তব্ধ রাতের গভীর মনোযোগে পাঠের প্রশান্তি।',
    englishFont: FontFamily.manropeRegular,
    englishBoldFont: FontFamily.manropeBold,
    banglaFont: FontFamily.manropeRegular,
    banglaBoldFont: FontFamily.manropeBold,
    fontSize: 17.5,
    lineHeight: 34,
    letterSpacing: 0.4,
    banglaFontSize: 18,
    banglaLineHeight: 34,
    banglaLetterSpacing: 0.35,
    borderAccentOpacity: 0.1,
  },
  zen: {
    id: 'zen',
    name: 'Kyoto Washi',
    nameBangla: 'কিয়োটো ওয়াশি (Kyoto Washi)',
    tag: 'MEDITATIVE',
    tier: 'premium',
    isPremium: true,
    description: 'Spacious, rhythmic typography inspired by East Asian woodblock prints and handmade paper.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'জাপানি ওয়াশি কাগজের মতো ধীর ও ধ্যানমগ্ন বিন্যাস।',
    englishFont: FontFamily.loraRegular,
    englishBoldFont: FontFamily.loraSemiBold,
    banglaFont: FontFamily.atmaRegular,
    banglaBoldFont: FontFamily.atmaMedium,
    fontSize: 19,
    lineHeight: 38,
    letterSpacing: 0.5,
    banglaFontSize: 19.5,
    banglaLineHeight: 39,
    banglaLetterSpacing: 0.45,
    borderAccentOpacity: 0.15,
  },
};

export const PAGE_STYLE_LIST: PageStyleConfig[] = [
  PAGE_STYLES.classic,
  PAGE_STYLES.modern,
  PAGE_STYLES.manuscript,
  PAGE_STYLES.editorial,
  PAGE_STYLES.oxford,
  PAGE_STYLES.vellum,
  PAGE_STYLES.nocturne,
  PAGE_STYLES.zen,
];

export function getPageStyleConfig(id: PageStyleId): PageStyleConfig {
  return PAGE_STYLES[id] ?? PAGE_STYLES.manuscript;
}

export function isPageStyleAvailable(id: PageStyleId, isUserPremium: boolean): boolean {
  const config = getPageStyleConfig(id);
  if (!config.isPremium) return true;
  return isUserPremium;
}
