import { FontFamily } from '@/theme/typography';

export type PageStyleId =
  | 'classic'
  | 'modern'
  | 'manuscript'
  | 'editorial'
  | 'sage'
  | 'kraft'
  | 'oxford'
  | 'vellum'
  | 'nocturne'
  | 'zen'
  | 'dusk'
  | 'nordic';

export type PageStyleTier = 'free' | 'premium';

export type PageThemeTemplate =
  | 'antique'
  | 'newspaper'
  | 'modern'
  | 'manuscript'
  | 'sage'
  | 'kraft'
  | 'oxford'
  | 'vellum'
  | 'nocturne'
  | 'zen'
  | 'dusk'
  | 'nordic';

export type PageThemeBackground = {
  dayBackground: string;
  dayTextColor: string;
  daySpineColor: string;
  dayAccent: string;
  lampBackground: string;
  lampTextColor: string;
  lampSpineColor: string;
  lampAccent: string;
  paperTint: string;
  lampPaperTint: string;
  swatchLabel: string;
  swatchColor: string;
  textureOpacityDay: number;
  textureOpacityLamp: number;
  template: PageThemeTemplate;
  previewMasthead: string;
};

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
  // Aesthetic accents & palette
  borderAccentOpacity: number;
  background: PageThemeBackground;
};

export const PAGE_STYLES: Record<PageStyleId, PageStyleConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Print',
    nameBangla: 'মুদ্রণ (Classic Print)',
    tag: '1890s HARDBOUND',
    tier: 'free',
    isPremium: false,
    description: 'Timeless letterpress typography on warm antique hardcover parchment.',
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
    borderAccentOpacity: 0.12,
    background: {
      dayBackground: '#F5EAD4',
      dayTextColor: '#24170E',
      daySpineColor: 'rgba(45, 25, 12, 0.38)',
      dayAccent: '#D8C5B0',
      lampBackground: '#1B1713',
      lampTextColor: '#F2DEC5',
      lampSpineColor: 'rgba(12, 10, 8, 0.75)',
      lampAccent: '#302A24',
      paperTint: 'rgba(245, 234, 212, 0.85)',
      lampPaperTint: 'rgba(27, 23, 19, 0.90)',
      swatchLabel: 'Antique Gold',
      swatchColor: '#F5EAD4',
      textureOpacityDay: 0.22,
      textureOpacityLamp: 0.14,
      template: 'antique',
      previewMasthead: 'HARDBOUND CLASSIC · MDCCCXC',
    },
  },
  modern: {
    id: 'modern',
    name: 'Modern Clean',
    nameBangla: 'আধুনিক (Modern Clean)',
    tag: 'SWISS MINIMAL',
    tier: 'free',
    isPremium: false,
    description: 'Architectural Swiss typography on spotless serene alabaster for crisp modern focus.',
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
    borderAccentOpacity: 0.05,
    background: {
      dayBackground: '#FAF9F6',
      dayTextColor: '#0A0A0A',
      daySpineColor: 'rgba(20, 20, 20, 0.10)',
      dayAccent: '#E3E3E0',
      lampBackground: '#111113',
      lampTextColor: '#ECECEC',
      lampSpineColor: 'rgba(6, 6, 8, 0.70)',
      lampAccent: '#222226',
      paperTint: 'rgba(250, 249, 246, 0.95)',
      lampPaperTint: 'rgba(17, 17, 19, 0.96)',
      swatchLabel: 'Clean Alabaster',
      swatchColor: '#FAF9F6',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'modern',
      previewMasthead: 'STUDIO HAUS · CONTEMPORARY',
    },
  },
  manuscript: {
    id: 'manuscript',
    name: 'Manuscript',
    nameBangla: 'পাণ্ডুলিপি (Manuscript)',
    tag: 'SCRIBE VELLUM',
    tier: 'free',
    isPremium: false,
    description: 'Warm intimate handwritten script with natural cursive strokes on honey vellum.',
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
    borderAccentOpacity: 0.20,
    background: {
      dayBackground: '#F2E3C6',
      dayTextColor: '#2B1B0E',
      daySpineColor: 'rgba(65, 35, 15, 0.42)',
      dayAccent: '#DFC9A6',
      lampBackground: '#201812',
      lampTextColor: '#F4E2C7',
      lampSpineColor: 'rgba(16, 10, 6, 0.78)',
      lampAccent: '#33291F',
      paperTint: 'rgba(242, 227, 198, 0.88)',
      lampPaperTint: 'rgba(32, 24, 18, 0.92)',
      swatchLabel: 'Honey Vellum',
      swatchColor: '#F2E3C6',
      textureOpacityDay: 0.20,
      textureOpacityLamp: 0.14,
      template: 'manuscript',
      previewMasthead: 'AUTOGRAPH CODEX · SCRIBE FOLIO',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'The Daily Gazette',
    nameBangla: 'সংবাদপত্র (Daily Gazette)',
    tag: 'NEWSPRINT PRESS',
    tier: 'free',
    isPremium: false,
    description: 'Authentic 19th-century newsprint broadside with editorial masthead rules and stark typeset ink.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'পরিমার্জিত সাহিত্য পত্রিকার মার্জিত রূপ।',
    englishFont: FontFamily.loraRegular,
    englishBoldFont: FontFamily.loraSemiBoldItalic,
    banglaFont: FontFamily.atmaRegular,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 17.5,
    lineHeight: 34,
    letterSpacing: 0.2,
    banglaFontSize: 18,
    banglaLineHeight: 34,
    banglaLetterSpacing: 0.15,
    borderAccentOpacity: 0.18,
    background: {
      dayBackground: '#E8E3D7',
      dayTextColor: '#111111',
      daySpineColor: 'rgba(25, 25, 25, 0.30)',
      dayAccent: '#2C2B29',
      lampBackground: '#18191C',
      lampTextColor: '#E2E2E2',
      lampSpineColor: 'rgba(10, 10, 12, 0.70)',
      lampAccent: '#444448',
      paperTint: 'rgba(232, 227, 215, 0.90)',
      lampPaperTint: 'rgba(24, 25, 28, 0.92)',
      swatchLabel: 'Pulp Newsprint',
      swatchColor: '#E8E3D7',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'newspaper',
      previewMasthead: 'THE DAILY GAZETTE · NO. 842',
    },
  },
  sage: {
    id: 'sage',
    name: 'Sage Botanica',
    nameBangla: 'ঋষি পাতা (Sage Botanica)',
    tag: 'SOOTHING HERBAL',
    tier: 'free',
    isPremium: false,
    description: 'Calming herbal eucalyptus green designed to eliminate glare and eye fatigue during long reading.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'ইউক্যালিপটাস পাতার স্নিগ্ধতায় ক্লান্তিহীন পাঠ।',
    englishFont: FontFamily.loraRegular,
    englishBoldFont: FontFamily.loraSemiBold,
    banglaFont: FontFamily.loraRegular,
    banglaBoldFont: FontFamily.loraSemiBold,
    fontSize: 17.5,
    lineHeight: 33,
    letterSpacing: 0.1,
    banglaFontSize: 18,
    banglaLineHeight: 34,
    banglaLetterSpacing: 0.05,
    borderAccentOpacity: 0.12,
    background: {
      dayBackground: '#DCE8DA',
      dayTextColor: '#132B1C',
      daySpineColor: 'rgba(15, 40, 20, 0.28)',
      dayAccent: '#9CBF9A',
      lampBackground: '#112016',
      lampTextColor: '#CFE5D3',
      lampSpineColor: 'rgba(6, 16, 10, 0.75)',
      lampAccent: '#1F3827',
      paperTint: 'rgba(220, 232, 218, 0.92)',
      lampPaperTint: 'rgba(17, 32, 22, 0.94)',
      swatchLabel: 'Eucalyptus Tea',
      swatchColor: '#DCE8DA',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'sage',
      previewMasthead: 'BOTANICA FOLIO · EYE COMFORT',
    },
  },
  kraft: {
    id: 'kraft',
    name: 'Cafe Kraft',
    nameBangla: 'ক্যাফে ক্রাফট (Cafe Kraft)',
    tag: 'ARTISAN LEATHER',
    tier: 'free',
    isPremium: false,
    description: 'Heavy unbleached rustic craft paper with deep espresso roast ink and stitched spine binding.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'হাতে তৈরি খাঁটি ক্রাফট কাগজের উষ্ণ পরশ।',
    englishFont: FontFamily.kalamRegular,
    englishBoldFont: FontFamily.kalamBold,
    banglaFont: FontFamily.atmaRegular,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 0.2,
    banglaFontSize: 18.5,
    banglaLineHeight: 35,
    banglaLetterSpacing: 0.15,
    borderAccentOpacity: 0.22,
    background: {
      dayBackground: '#DEC19E',
      dayTextColor: '#231206',
      daySpineColor: 'rgba(60, 32, 12, 0.45)',
      dayAccent: '#966842',
      lampBackground: '#261A12',
      lampTextColor: '#EED6BF',
      lampSpineColor: 'rgba(16, 9, 5, 0.80)',
      lampAccent: '#422C1D',
      paperTint: 'rgba(222, 193, 158, 0.90)',
      lampPaperTint: 'rgba(38, 26, 18, 0.92)',
      swatchLabel: 'Toasted Kraft',
      swatchColor: '#DEC19E',
      textureOpacityDay: 0.12,
      textureOpacityLamp: 0.08,
      template: 'kraft',
      previewMasthead: 'ROASTERY HANDBOUND · KRAFT',
    },
  },
  oxford: {
    id: 'oxford',
    name: 'Oxford Clothbound',
    nameBangla: 'অক্সফোর্ড (Oxford Clothbound)',
    tag: 'ROYAL ACADEMIC',
    tier: 'premium',
    isPremium: true,
    description: 'Prestigious academic collegiate edition on heavy clothbound paper with royal navy ink and gilded gold frame.',
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
    borderAccentOpacity: 0.26,
    background: {
      dayBackground: '#EFEBE0',
      dayTextColor: '#12203A',
      daySpineColor: 'rgba(18, 32, 58, 0.40)',
      dayAccent: '#C5A059',
      lampBackground: '#121724',
      lampTextColor: '#DFE5F5',
      lampSpineColor: 'rgba(6, 10, 18, 0.82)',
      lampAccent: '#D4AF37',
      paperTint: 'rgba(239, 235, 224, 0.90)',
      lampPaperTint: 'rgba(18, 23, 36, 0.94)',
      swatchLabel: 'Royal Navy & Gold',
      swatchColor: '#EFEBE0',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'oxford',
      previewMasthead: 'OXFORD UNIVERSITY PRESS · MDCCCXC',
    },
  },
  vellum: {
    id: 'vellum',
    name: 'Gilded Vellum',
    nameBangla: 'গিল্ডেড ভেলাম (Gilded Vellum)',
    tag: 'ROYAL ARCHIVE',
    tier: 'premium',
    isPremium: true,
    description: 'Illuminated gold-leaf archive vellum with regal Renaissance script and burnished gold borders.',
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
    borderAccentOpacity: 0.32,
    background: {
      dayBackground: '#EFE0B8',
      dayTextColor: '#2D1C0B',
      daySpineColor: 'rgba(80, 48, 15, 0.48)',
      dayAccent: '#D4AF37',
      lampBackground: '#22190E',
      lampTextColor: '#F5DCB0',
      lampSpineColor: 'rgba(18, 12, 6, 0.82)',
      lampAccent: '#E5C158',
      paperTint: 'rgba(239, 224, 184, 0.88)',
      lampPaperTint: 'rgba(34, 25, 14, 0.92)',
      swatchLabel: 'Gold Leaf Vellum',
      swatchColor: '#EFE0B8',
      textureOpacityDay: 0.22,
      textureOpacityLamp: 0.15,
      template: 'vellum',
      previewMasthead: 'ILLUMINATED ARCHIVE · GOLD VELLUM',
    },
  },
  nocturne: {
    id: 'nocturne',
    name: 'Midnight Nocturne',
    nameBangla: 'মিডনাইট নক্টার্ন (Midnight Nocturne)',
    tag: 'VELVET OBSIDIAN',
    tier: 'premium',
    isPremium: true,
    description: 'Heavy deep obsidian velvet background paired with starry ice-platinum ink for late-night immersion.',
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
    borderAccentOpacity: 0.14,
    background: {
      dayBackground: '#DFE3EB',
      dayTextColor: '#10131B',
      daySpineColor: 'rgba(12, 16, 28, 0.35)',
      dayAccent: '#9EA8BA',
      lampBackground: '#08090D',
      lampTextColor: '#D5DCF0',
      lampSpineColor: 'rgba(3, 4, 6, 0.90)',
      lampAccent: '#2B324A',
      paperTint: 'rgba(223, 227, 235, 0.92)',
      lampPaperTint: 'rgba(8, 9, 13, 0.98)',
      swatchLabel: 'Velvet Obsidian',
      swatchColor: '#08090D',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'nocturne',
      previewMasthead: 'CELESTIAL ATLAS · NOCTURNE',
    },
  },
  zen: {
    id: 'zen',
    name: 'Kyoto Washi',
    nameBangla: 'কিয়োটো ওয়াশি (Kyoto Washi)',
    tag: 'BAMBOO SCROLL',
    tier: 'premium',
    isPremium: true,
    description: 'Organic handmade Japanese washi paper with deep matcha pine ink and meditative open margins.',
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
    borderAccentOpacity: 0.16,
    background: {
      dayBackground: '#ECE4D0',
      dayTextColor: '#1E281A',
      daySpineColor: 'rgba(28, 35, 25, 0.28)',
      dayAccent: '#7A8A68',
      lampBackground: '#171C14',
      lampTextColor: '#DFE6D8',
      lampSpineColor: 'rgba(8, 12, 8, 0.75)',
      lampAccent: '#293524',
      paperTint: 'rgba(236, 228, 208, 0.90)',
      lampPaperTint: 'rgba(23, 28, 20, 0.94)',
      swatchLabel: 'Bamboo Washi',
      swatchColor: '#ECE4D0',
      textureOpacityDay: 0.08,
      textureOpacityLamp: 0.05,
      template: 'zen',
      previewMasthead: 'KYOTO WASHI · WOODBLOCK PRESS',
    },
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk Rose',
    nameBangla: 'সন্ধ্যা গোলাপ (Dusk Rose)',
    tag: 'WARM BLUSH',
    tier: 'premium',
    isPremium: true,
    description: 'Soft warm terracotta blush paper with rich plum-wine ink and copper sunset serenity.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'গোধূলি আলোর শান্ত গোলাপী পাতার আভা।',
    englishFont: FontFamily.loraItalicMedium,
    englishBoldFont: FontFamily.loraSemiBoldItalic,
    banglaFont: FontFamily.atmaMedium,
    banglaBoldFont: FontFamily.atmaSemiBold,
    fontSize: 18,
    lineHeight: 34.5,
    letterSpacing: 0.25,
    banglaFontSize: 18.5,
    banglaLineHeight: 35.5,
    banglaLetterSpacing: 0.2,
    borderAccentOpacity: 0.18,
    background: {
      dayBackground: '#EED6CE',
      dayTextColor: '#32101E',
      daySpineColor: 'rgba(45, 18, 28, 0.35)',
      dayAccent: '#C99A90',
      lampBackground: '#23141A',
      lampTextColor: '#F0D5DD',
      lampSpineColor: 'rgba(14, 6, 10, 0.80)',
      lampAccent: '#3D202C',
      paperTint: 'rgba(238, 214, 206, 0.90)',
      lampPaperTint: 'rgba(35, 20, 26, 0.94)',
      swatchLabel: 'Terracotta Rose',
      swatchColor: '#EED6CE',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'dusk',
      previewMasthead: 'SUNSET SONNETS · TERRACOTTA',
    },
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost',
    nameBangla: 'নর্ডিক তুষার (Nordic Frost)',
    tag: 'GLACIAL ICE',
    tier: 'premium',
    isPremium: true,
    description: 'Crisp glacial ice-toned paper with polar fjord slate navy ink and clean Scandinavian clarity.',
    previewSample: 'The quiet glow of ink upon parchment.',
    previewSampleBangla: 'শ্বেতশুভ্র শান্ত পোরসেলিনের নির্মল পাঠ।',
    englishFont: FontFamily.manropeRegular,
    englishBoldFont: FontFamily.manropeSemiBold,
    banglaFont: FontFamily.manropeRegular,
    banglaBoldFont: FontFamily.manropeSemiBold,
    fontSize: 17,
    lineHeight: 32,
    letterSpacing: 0.2,
    banglaFontSize: 17.5,
    banglaLineHeight: 33,
    banglaLetterSpacing: 0.15,
    borderAccentOpacity: 0.12,
    background: {
      dayBackground: '#DFEBF4',
      dayTextColor: '#0B2033',
      daySpineColor: 'rgba(12, 28, 48, 0.25)',
      dayAccent: '#96B6D1',
      lampBackground: '#0B131C',
      lampTextColor: '#D7E4F2',
      lampSpineColor: 'rgba(5, 8, 14, 0.82)',
      lampAccent: '#1C2A3A',
      paperTint: 'rgba(223, 235, 244, 0.92)',
      lampPaperTint: 'rgba(11, 19, 28, 0.95)',
      swatchLabel: 'Glacial Ice',
      swatchColor: '#DFEBF4',
      textureOpacityDay: 0,
      textureOpacityLamp: 0,
      template: 'nordic',
      previewMasthead: 'ARCTIC MONOGRAPH · POLAR ICE',
    },
  },
};

export const PAGE_STYLE_LIST: PageStyleConfig[] = [
  PAGE_STYLES.classic,
  PAGE_STYLES.modern,
  PAGE_STYLES.manuscript,
  PAGE_STYLES.editorial,
  PAGE_STYLES.sage,
  PAGE_STYLES.kraft,
  PAGE_STYLES.oxford,
  PAGE_STYLES.vellum,
  PAGE_STYLES.nocturne,
  PAGE_STYLES.zen,
  PAGE_STYLES.dusk,
  PAGE_STYLES.nordic,
];

export function getPageStyleConfig(id: PageStyleId): PageStyleConfig {
  return PAGE_STYLES[id] ?? PAGE_STYLES.manuscript;
}

export function isPageStyleAvailable(id: PageStyleId, isUserPremium: boolean): boolean {
  const config = getPageStyleConfig(id);
  if (!config.isPremium) return true;
  return isUserPremium;
}
