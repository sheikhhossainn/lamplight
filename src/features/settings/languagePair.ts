import { useSyncExternalStore } from 'react';

// The bundled/source books are English, so the source side of the pair is fixed
// — only the learner's target language is a choice. Codes are ISO 639-1 (a few
// with region), passed straight to the translation endpoint's `tl` param. Each
// carries a full name (for the picker) and a short label (for the pill).
export const TARGET_LANGUAGES = [
  { code: 'es', name: 'Spanish', short: 'ES' },
  { code: 'bn', name: 'Bengali', short: 'BAN' },
  { code: 'fr', name: 'French', short: 'FR' },
  { code: 'de', name: 'German', short: 'DE' },
  { code: 'it', name: 'Italian', short: 'IT' },
  { code: 'pt', name: 'Portuguese', short: 'PT' },
  { code: 'nl', name: 'Dutch', short: 'NL' },
  { code: 'ru', name: 'Russian', short: 'RU' },
  { code: 'ar', name: 'Arabic', short: 'AR' },
  { code: 'hi', name: 'Hindi', short: 'HI' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', short: 'ZH' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', short: 'ZH-TW' },
  { code: 'ja', name: 'Japanese', short: 'JA' },
  { code: 'ko', name: 'Korean', short: 'KO' },
  { code: 'tr', name: 'Turkish', short: 'TR' },
  { code: 'pl', name: 'Polish', short: 'PL' },
  { code: 'uk', name: 'Ukrainian', short: 'UK' },
  { code: 'sv', name: 'Swedish', short: 'SV' },
  { code: 'el', name: 'Greek', short: 'EL' },
  { code: 'he', name: 'Hebrew', short: 'HE' },
  { code: 'id', name: 'Indonesian', short: 'ID' },
  { code: 'vi', name: 'Vietnamese', short: 'VI' },
  { code: 'th', name: 'Thai', short: 'TH' },
  { code: 'ur', name: 'Urdu', short: 'UR' },
  { code: 'fa', name: 'Persian', short: 'FA' },
  { code: 'ta', name: 'Tamil', short: 'TA' },
  { code: 'te', name: 'Telugu', short: 'TE' },
  { code: 'mr', name: 'Marathi', short: 'MR' },
  { code: 'pa', name: 'Punjabi', short: 'PA' },
  { code: 'gu', name: 'Gujarati', short: 'GU' },
  { code: 'ms', name: 'Malay', short: 'MS' },
  { code: 'tl', name: 'Filipino', short: 'TL' },
  { code: 'ro', name: 'Romanian', short: 'RO' },
  { code: 'cs', name: 'Czech', short: 'CS' },
  { code: 'hu', name: 'Hungarian', short: 'HU' },
  { code: 'fi', name: 'Finnish', short: 'FI' },
  { code: 'da', name: 'Danish', short: 'DA' },
  { code: 'no', name: 'Norwegian', short: 'NO' },
  { code: 'sw', name: 'Swahili', short: 'SW' },
] as const;

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number]['code'];

const BY_CODE = new Map(TARGET_LANGUAGES.map((l) => [l.code, l]));

let current: TargetLanguage = 'es';
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getTargetLanguage(): TargetLanguage {
  return current;
}

export function setTargetLanguage(lang: TargetLanguage): void {
  if (lang === current) return;
  current = lang;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTargetLanguage(): TargetLanguage {
  return useSyncExternalStore(subscribe, getTargetLanguage);
}

export function targetLanguageLabel(lang: TargetLanguage): string {
  return BY_CODE.get(lang)?.short ?? lang.toUpperCase();
}

export function targetLanguageName(lang: TargetLanguage): string {
  return BY_CODE.get(lang)?.name ?? lang;
}
