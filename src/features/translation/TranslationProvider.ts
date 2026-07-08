export type LanguageCode = 'en' | 'es';

export type TranslationResult = {
  sourceText: string;
  translatedText: string;
};

// The seam that makes swapping in on-device translation (Milestone 8) a plug-in,
// not a rewrite — nothing outside this feature folder should know which
// implementation is active.
export type TranslationProvider = {
  translateWord(word: string, from: LanguageCode, to: LanguageCode): Promise<TranslationResult>;
  translateSelection(text: string, from: LanguageCode, to: LanguageCode): Promise<TranslationResult>;
};
