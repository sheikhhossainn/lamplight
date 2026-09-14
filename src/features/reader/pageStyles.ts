import { FontFamily } from '@/theme/typography';

export type PageStyleId = 'manuscript' | 'classic' | 'modern';

export type PageStyleConfig = {
  id: PageStyleId;
  name: string;
  nameBangla: string;
  tag: string;
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
  manuscript: {
    id: 'manuscript',
    name: 'Manuscript',
    nameBangla: 'পাণ্ডুলিপি (Manuscript)',
    tag: 'HANDWRITTEN',
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
  classic: {
    id: 'classic',
    name: 'Classic Print',
    nameBangla: 'মুদ্রণ (Classic Print)',
    tag: '1890s SERIF',
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
};

export const PAGE_STYLE_LIST: PageStyleConfig[] = [
  PAGE_STYLES.manuscript,
  PAGE_STYLES.classic,
  PAGE_STYLES.modern,
];

export function getPageStyleConfig(id: PageStyleId): PageStyleConfig {
  return PAGE_STYLES[id] ?? PAGE_STYLES.manuscript;
}
