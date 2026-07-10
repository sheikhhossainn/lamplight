// 'en' source plus any ISO target code (see TARGET_LANGUAGES) — passed straight
// to the translation endpoint, so it's kept as a plain string rather than a
// closed union that would need widening every time a language is added.
export type LanguageCode = string;

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
