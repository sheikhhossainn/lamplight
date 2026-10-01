// Curated, neutral scriptural knowledge base for major world religions:
// Islam (The Holy Quran), Christianity (New Testament), Judaism & Hebrew Bible
// (Torah & Tanakh), and Vedic Hinduism (Rigveda).
//
// Core Design Principle: NO VERDICTS. Provide primary texts, factual historical
// settings, occasions of revelation (asbab al-nuzul), and classical exegesis
// (Tafsir al-Jalalayn, Jamieson-Fausset-Brown, Sanskrit glosses).
// Let the reader examine the evidence and decide for themselves.

export type TraditionKey = 'quran' | 'bible-nt' | 'bible-ot' | 'torah' | 'vedas';

export type ScriptureQAVerse = {
  id: string;
  tradition: TraditionKey;
  book: string;
  bookId?: string; // For Bible OT/NT, Torah, Vedas reader routes
  chapter: number;
  verseNumber: number;
  originalText?: string; // Arabic script for Quran, Sanskrit/Hebrew if available
  translation: string;
  historicalContext: string; // Who was addressed, factual occasion of revelation / setting
  classicalCommentary?: string; // Tafsir al-Jalalayn, Jamieson-Fausset-Brown commentary
  translationEdition?: string; // e.g. Saheeh International, World English Bible (WEB)
  commentarySource?: string; // e.g. Tafsir al-Jalalayn, Jamieson-Fausset-Brown
  isAiAssistedContext?: boolean; // Whether the historical context was generated with AI assistance
};

/**
 * Returns canonical source edition and commentary attribution for a given tradition.
 */
export function getTraditionSourceAttribution(tradition: TraditionKey): {
  translationEdition: string;
  commentarySource: string;
} {
  switch (tradition) {
    case 'quran':
      return {
        translationEdition: 'Saheeh International',
        commentarySource: 'Tafsir al-Jalalayn',
      };
    case 'bible-nt':
      return {
        translationEdition: 'World English Bible (WEB)',
        commentarySource: 'Jamieson-Fausset-Brown',
      };
    case 'bible-ot':
    case 'torah':
      return {
        translationEdition: 'World English Bible (WEB)',
        commentarySource: 'Jamieson-Fausset-Brown',
      };
    case 'vedas':
      return {
        translationEdition: 'Ralph T.H. Griffith (1896)',
        commentarySource: 'Traditional Vedic Exegesis (Rigveda Samhita)',
      };
  }
}

export type TraditionGroup = {
  tradition: TraditionKey;
  traditionName: string;
  subtitle: string;
  verses: ScriptureQAVerse[];
};

export type CuratedScriptureQA = {
  id: string;
  slug: string;
  question: string;
  shortTitle: string;
  category: 'women' | 'justice' | 'warfare' | 'ethics' | 'spirituality' | 'debated';
  categoryLabel?: string;
  dilemmaTag?: string;
  searchKeywords: string[];
  topicBackground: string; // Neutral, objective framing of the topic without taking sides
  controversyDossier?: {
    criticPosition: string;
    scholarlyDefense: string;
    contextBadge: string;
  };
  traditions: TraditionGroup[];
  primaryTraditions?: TraditionKey[];
};

import { CONTROVERSIAL_QUESTIONS, type ControversialQuestion } from './controversialQuestions';

export { CONTROVERSIAL_QUESTIONS, type ControversialQuestion };

export const CURATED_SCRIPTURE_QA: CuratedScriptureQA[] = CONTROVERSIAL_QUESTIONS;
