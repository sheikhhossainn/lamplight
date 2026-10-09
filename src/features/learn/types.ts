// Core domain types for the Learn Course system

export type CourseItemKind = 'letter' | 'word' | 'grammar';

export type LetterItem = {
  id: string;
  kind: 'letter';
  char: string;
  roman: string;
  say: string;
  scriptSetId?: string; // 'hiragana' | 'katakana' etc.
};

export type WordItem = {
  id: string;
  kind: 'word';
  text: string;
  reading: string; // Kana reading (e.g. ねこ, ほん)
  roman: string;
  pos: string; // 'noun' | 'verb' | 'adj' | 'particle' | 'pronoun'
};

export type GrammarItem = {
  id: string;
  kind: 'grammar';
  pattern: string;
  exampleIds: string[]; // references sentence IDs
};

export type CourseItem = LetterItem | WordItem | GrammarItem;

export type SentenceToken = {
  text: string;
  reading?: string;
  itemId?: string;
};

export type CourseSentence = {
  id: string;
  unit: number;
  tokens: SentenceToken[];
  accepted?: string[][]; // Alternative acceptable token text sequences
};

export type CourseStrings = {
  meanings: Record<string, string>;
  explanations: Record<string, string>;
  ui: Record<string, string>;
  sentences?: Record<string, string>; // prompt translations in mother tongue
};

export type LessonType = 'letter' | 'vocab' | 'grammar' | 'review' | 'reading';

export type CourseLesson = {
  id: string;
  title: string;
  type: LessonType;
  itemIds: string[];
  sentenceIds?: string[];
};

export type CourseUnit = {
  id: string;
  number: number;
  title: string;
  grammarTheme?: string;
  lessons: CourseLesson[];
};

export type CourseManifest = {
  targetLang: string;
  title: string;
  units: CourseUnit[];
};

export type CoursePackage = {
  manifest: CourseManifest;
  items: CourseItem[];
  sentences: CourseSentence[];
  strings: CourseStrings;
};
