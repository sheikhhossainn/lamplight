import { FontFamily } from '@/theme/typography';

export type Variant =
  | 'parchment'
  | 'gradient'
  | 'foldSplit'
  | 'editorial'
  | 'midnightGold'
  | 'washi'
  | 'cyanotype'
  | 'broadside'
  | 'tanzaku';

export type TemplateCategory = 'classic' | 'premium';

export interface TemplateInfo {
  id: Variant;
  name: string;
  category: TemplateCategory;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'parchment', name: 'Parchment', category: 'classic' },
  { id: 'gradient', name: 'Amber Glow', category: 'classic' },
  { id: 'foldSplit', name: 'Fold Split', category: 'classic' },
  { id: 'editorial', name: 'Ex Libris', category: 'premium' },
  { id: 'midnightGold', name: 'Clothbound', category: 'premium' },
  { id: 'washi', name: 'Archive', category: 'premium' },
  { id: 'cyanotype', name: 'Atelier', category: 'premium' },
  { id: 'broadside', name: 'Broadside', category: 'premium' },
  { id: 'tanzaku', name: 'Tanzaku', category: 'premium' },
];

export const VARIANTS: Variant[] = TEMPLATES.map((t) => t.id);

export type ScriptType = 'bangla' | 'arabic' | 'devanagari' | 'japanese' | 'korean' | 'latin';

export function detectScript(str: string): ScriptType {
  if (!str) return 'latin';
  if (/[\u0980-\u09FF]/.test(str)) return 'bangla';
  if (/[\u0600-\u06FF]/.test(str)) return 'arabic';
  if (/[\u0900-\u097F]/.test(str)) return 'devanagari';
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(str)) return 'korean';
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)) return 'japanese';
  return 'latin';
}

export function getScriptFont(script: ScriptType, isItalic = true): string | undefined {
  switch (script) {
    case 'bangla':
      return isItalic ? FontFamily.atmaSemiBold : FontFamily.atmaMedium;
    case 'arabic':
      return isItalic ? FontFamily.amiriBold : FontFamily.amiriRegular;
    case 'devanagari':
      return isItalic ? FontFamily.kalamBold : FontFamily.kalamRegular;
    case 'japanese':
    case 'korean':
      // System CJK sans font prevents glyph clipping and font mismatch
      return undefined;
    case 'latin':
    default:
      return isItalic ? FontFamily.loraItalicMedium : FontFamily.loraRegular;
  }
}

export function getLineHeightMultiplier(script: ScriptType): number {
  switch (script) {
    case 'bangla':
    case 'devanagari':
      return 1.68;
    case 'arabic':
      return 1.76;
    case 'japanese':
    case 'korean':
      return 1.62;
    case 'latin':
    default:
      return 1.48;
  }
}

export const MAX_RECOMMENDED_QUOTE_LENGTH = 340;
export const MAX_EXCESSIVE_QUOTE_LENGTH = 550;

export interface QuoteStyleMetrics {
  quote: {
    fontSize: number;
    lineHeight: number;
    fontFamily?: string;
    isRtl: boolean;
    script: ScriptType;
  };
  translation: {
    fontSize: number;
    lineHeight: number;
    fontFamily?: string;
    isRtl: boolean;
    script: ScriptType;
  };
  hasTranslation: boolean;
  totalLength: number;
  isLongQuote: boolean;
  isExcessive: boolean;
  lengthExplanation?: string;
  condensed: boolean;
  maxQuoteLines: number;
  maxTranslationLines: number;
}

export function calculateQuoteStyles(
  text: string,
  translation?: string,
  condensed = false,
): QuoteStyleMetrics {
  const quoteScript = detectScript(text);
  const quoteMult = getLineHeightMultiplier(quoteScript);
  const quoteFont = getScriptFont(quoteScript, true);

  const hasTranslation = Boolean(translation && translation.trim().length > 0);
  const totalLength = (text?.length ?? 0) + (hasTranslation ? (translation?.length ?? 0) : 0);

  const isLongQuote = totalLength > MAX_RECOMMENDED_QUOTE_LENGTH;
  const isExcessive = totalLength > MAX_EXCESSIVE_QUOTE_LENGTH;

  let lengthExplanation: string | undefined;
  if (isExcessive) {
    lengthExplanation = `Excerpt is ${totalLength} characters. Condensed layout applied to preserve legibility without clipping. For optimal quote cards, 1-3 sentences (<350 chars) are recommended.`;
  } else if (isLongQuote) {
    lengthExplanation = `Long passage (${totalLength} characters). Condensed layout fits complete text comfortably.`;
  }

  let quoteSize: number;
  let transSize: number;

  if (condensed) {
    if (!hasTranslation) {
      if (totalLength <= 100) quoteSize = 17;
      else if (totalLength <= 200) quoteSize = 15;
      else if (totalLength <= 340) quoteSize = 13.5;
      else if (totalLength <= 480) quoteSize = 12;
      else quoteSize = 11;
      transSize = 10.5;
    } else {
      if (totalLength <= 140) {
        quoteSize = 14;
        transSize = 11.5;
      } else if (totalLength <= 280) {
        quoteSize = 12.5;
        transSize = 10.5;
      } else {
        quoteSize = 11;
        transSize = 9.5;
      }
    }
  } else {
    if (!hasTranslation) {
      if (totalLength <= 60) quoteSize = 22;
      else if (totalLength <= 120) quoteSize = 19.5;
      else if (totalLength <= 200) quoteSize = 17.5;
      else if (totalLength <= 300) quoteSize = 15.5;
      else if (totalLength <= 420) quoteSize = 14;
      else quoteSize = 12.5;
      transSize = 12;
    } else {
      if (totalLength <= 100) {
        quoteSize = 18;
        transSize = 13.5;
      } else if (totalLength <= 180) {
        quoteSize = 16;
        transSize = 12.5;
      } else if (totalLength <= 280) {
        quoteSize = 14.5;
        transSize = 11.5;
      } else {
        quoteSize = 13;
        transSize = 10.5;
      }
    }
  }

  const transScript = hasTranslation ? detectScript(translation ?? '') : 'latin';
  const transMult = getLineHeightMultiplier(transScript);
  const transFont = getScriptFont(transScript, false);

  const maxQuoteLines = condensed
    ? hasTranslation
      ? 10
      : 16
    : hasTranslation
      ? 7
      : 12;
  const maxTranslationLines = condensed ? 6 : 5;

  return {
    quote: {
      fontSize: quoteSize,
      lineHeight: Math.round(quoteSize * quoteMult),
      fontFamily: quoteFont,
      isRtl: quoteScript === 'arabic',
      script: quoteScript,
    },
    translation: {
      fontSize: transSize,
      lineHeight: Math.round(transSize * transMult),
      fontFamily: transFont,
      isRtl: transScript === 'arabic',
      script: transScript,
    },
    hasTranslation,
    totalLength,
    isLongQuote,
    isExcessive,
    lengthExplanation,
    condensed,
    maxQuoteLines,
    maxTranslationLines,
  };
}

export interface QuoteCardExportResolution {
  width: number;
  height: number;
  quality: number;
  isHighResolution: boolean;
}

export function getQuoteCardExportResolution(
  isPremium: boolean,
  cardWidth: number,
  cardHeight: number,
): QuoteCardExportResolution {
  const targetWidth = isPremium ? 1080 : 720;
  const targetHeight = Math.round(targetWidth * (cardHeight / Math.max(cardWidth, 1)));
  return {
    width: targetWidth,
    height: targetHeight,
    quality: isPremium ? 1.0 : 0.85,
    isHighResolution: isPremium,
  };
}

export function buildQuoteCardDeepLink(bookId?: string): string | undefined {
  if (!bookId) return undefined;
  return `lamplight://book/${bookId}`;
}
