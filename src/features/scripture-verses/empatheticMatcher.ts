import { CURATED_COMFORT_VERSES, type CuratedComfortVerse } from './curatedComfortVerses';
import type { ScriptureVerseCard } from './moods';

// Emotional clusters mapping human words and feelings to comfort dimensions
const EMOTIONAL_SIGNALS: Record<string, string[]> = {
  anxiety: [
    'anxious', 'anxiety', 'worried', 'worry', 'worries', 'panic', 'panicking',
    'scared', 'afraid', 'fear', 'fears', 'terrified', 'overwhelmed', 'stress',
    'stressed', 'stressful', 'nervous', 'racing', 'overthinking', 'dread',
    'freaking', 'shaking', 'uneasy', 'restless', 'uncertainty', 'future',
  ],
  burnout: [
    'burnout', 'burnt', 'exhausted', 'exhaustion', 'tired', 'weary', 'drained',
    'empty', 'fatigue', 'heavy', 'burden', 'breaking point', 'too much',
    'cannot take it', "can't take it", 'struggling', 'labor', 'overworked',
  ],
  inadequacy: [
    'failure', 'failing', 'failed', 'not enough', 'falling behind', 'disappointed',
    'disappointing', 'impostor', 'loser', 'incapable', 'weak', 'flawed',
    'worthless', 'insecure', 'everyone else', 'comparison', 'useless',
  ],
  grief: [
    'grief', 'grieving', 'mourn', 'mourning', 'loss', 'lost', 'crying', 'tears',
    'sad', 'sadness', 'sorrow', 'heartbroken', 'heartbreak', 'broken', 'death',
    'died', 'passed away', 'bereaved', 'ache', 'miss them', 'miss him', 'miss her',
  ],
  loneliness: [
    'lonely', 'alone', 'isolated', 'isolation', 'nobody', 'abandoned',
    'forgotten', 'rejected', 'unloved', 'left out', 'distant', 'stranger',
  ],
  guilt: [
    'guilt', 'guilty', 'shame', 'ashamed', 'regret', 'regretting', 'mistake',
    'sinned', 'sin', 'remorse', 'messed up', 'unforgivable', 'bad person',
    'forgive me', 'forgiveness', 'ruined', 'blame',
  ],
  confusion: [
    'lost', 'confused', 'confusion', 'direction', 'crossroads', 'decision',
    'decisions', 'what to do', 'path', 'stuck', 'doubt', 'doubts', 'doubting',
    'why', 'questioning', 'blind', 'wandering', 'meaningless',
  ],
  gratitude: [
    'grateful', 'gratitude', 'thankful', 'thanks', 'blessed', 'blessing',
    'appreciation', 'sweet', 'alive', 'morning',
  ],
  happiness: [
    'happy', 'happiness', 'joy', 'joyful', 'excited', 'excitement', 'thrilled',
    'ecstatic', 'celebrate', 'celebration', 'celebrating', 'delighted', 'delight',
    'glad', 'cheerful', 'rejoice', 'rejoicing', 'smile', 'smiling', 'laughter',
    'laugh', 'good news', 'great day', 'feeling great', 'wonderful', 'bliss',
  ],
  peace: [
    'peace', 'peaceful', 'calm', 'serene', 'serenity', 'tranquil', 'tranquility',
    'stillness', 'quiet', 'relaxed', 'soothing', 'relief', 'relieved', 'content',
  ],
  love: [
    'love', 'loved', 'loving', 'cherished', 'romance', 'in love', 'adoration',
    'devotion', 'affection', 'caring', 'family', 'togetherness', 'friendship',
  ],
  hope: [
    'hope', 'hopeful', 'optimistic', 'optimism', 'looking forward', 'promise',
    'new beginning', 'dawn', 'renewal', 'believe', 'brighter',
  ],
  anger: [
    'angry', 'anger', 'mad', 'furious', 'frustrated', 'frustration', 'irritated',
    'resentful', 'resentment', 'bitter', 'rage', 'betrayed',
  ],
};

// Maps signals to target comfort dimensions
const SIGNAL_DIMENSIONS: Record<string, string[]> = {
  anxiety: ['peace', 'reassurance', 'courage'],
  burnout: ['rest', 'strength', 'patience'],
  inadequacy: ['reassurance', 'strength', 'hope'],
  grief: ['peace', 'hope', 'reassurance', 'patience'],
  loneliness: ['reassurance', 'peace'],
  guilt: ['forgiveness', 'reassurance'],
  confusion: ['guidance', 'light', 'peace'],
  gratitude: ['gratitude', 'peace', 'light', 'joy'],
  happiness: ['joy', 'gratitude', 'light', 'peace'],
  peace: ['peace', 'light', 'gratitude'],
  love: ['peace', 'strength', 'joy'],
  hope: ['hope', 'light', 'strength'],
  anger: ['peace', 'patience', 'forgiveness'],
};

/**
 * Fisher-Yates array shuffle for organic, non-deterministic deck distribution.
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Parses user free text to score verses by emotional resonance.
 */
function scoreVerse(verse: CuratedComfortVerse, normalizedText: string, detectedSignals: Set<string>): number {
  let score = 1.0; // Baseline score for all comfort verses

  // 1. Situation keyword matches in user's prompt
  for (const sit of verse.situations) {
    if (normalizedText.includes(sit.toLowerCase())) {
      score += 3.5;
    }
  }

  // 2. Detected emotional signal dimension resonance
  for (const signal of detectedSignals) {
    const desiredDimensions = SIGNAL_DIMENSIONS[signal] ?? [];
    if (desiredDimensions.includes(verse.comfortDimension)) {
      score += 3.0;
    }
    // Boost if any verse situation word is part of the signal cluster
    const clusterWords = EMOTIONAL_SIGNALS[signal] ?? [];
    for (const word of clusterWords) {
      if (verse.situations.includes(word)) {
        score += 2.0;
      }
    }
  }

  // 3. Subtle word overlap with the translation or reflection hint
  const words = normalizedText.split(/\s+/).filter((w) => w.length > 3);
  const verseContent = `${verse.translation ?? verse.originalText} ${verse.reflectionHint}`.toLowerCase();
  for (const word of words) {
    if (verseContent.includes(word)) {
      score += 1.5;
    }
  }

  // Small random jitter (0.0 to 0.5) so cards with tied relevance don't always rank in identical order
  score += Math.random() * 0.5;

  return score;
}

/**
 * Draws a comforting "Wild Card" deck from the user's natural heartpour.
 * - No rigid commands required.
 * - No predictable sequence (Quran -> Bible -> etc.).
 * - Returns 5 to 7 high-resonance, serendipitously shuffled cards.
 */
export function drawEmpatheticDeck(userText: string, deckSize = 6): ScriptureVerseCard[] {
  const normalized = (userText || '').toLowerCase().trim();

  // Detect active emotional signals
  const detectedSignals = new Set<string>();
  for (const [signalKey, keywords] of Object.entries(EMOTIONAL_SIGNALS)) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        detectedSignals.add(signalKey);
        break;
      }
    }
  }

  // Score all curated comfort verses
  const scored = CURATED_COMFORT_VERSES.map((verse) => ({
    verse,
    score: scoreVerse(verse, normalized, detectedSignals),
  }));

  // Sort descending by resonance score
  scored.sort((a, b) => b.score - a.score);

  // Take a top pool of high-resonance candidates (approx 2x to 3x deck size)
  const poolSize = Math.max(deckSize * 2, 14);
  const candidatePool = scored.slice(0, poolSize).map((s) => s.verse);

  // Group by tradition to ensure rich interfaith diversity without forcing rigid quotas
  const byTradition: Record<string, CuratedComfortVerse[]> = {};
  for (const v of candidatePool) {
    if (!byTradition[v.tradition]) byTradition[v.tradition] = [];
    byTradition[v.tradition].push(v);
  }

  const selected: CuratedComfortVerse[] = [];
  const traditions = shuffle(Object.keys(byTradition));

  // Round 1: Pick the top verse from each available tradition in the candidate pool
  for (const trad of traditions) {
    if (selected.length < deckSize && byTradition[trad].length > 0) {
      selected.push(byTradition[trad].shift()!);
    }
  }

  // Round 2: Fill the remaining slots with the highest remaining candidates regardless of tradition
  const remaining = Object.values(byTradition)
    .flat()
    .sort((a, b) => {
      const scoreA = scored.find((s) => s.verse.id === a.id)?.score ?? 0;
      const scoreB = scored.find((s) => s.verse.id === b.id)?.score ?? 0;
      return scoreB - scoreA;
    });

  while (selected.length < deckSize && remaining.length > 0) {
    selected.push(remaining.shift()!);
  }

  // Final organic Wild Card shuffle: break any tradition order completely!
  const wildCardDeck = shuffle(selected);

  // Map to standard ScriptureVerseCard
  return wildCardDeck.map((v) => ({
    id: v.id,
    tradition: v.tradition,
    book: v.book,
    bookId: v.bookId,
    chapter: v.chapter,
    verseNumber: v.verseNumber,
    originalText: v.originalText,
    translation: v.translation,
    reflectionHint: v.reflectionHint,
  }));
}

export const TABLE_TRADITIONS = ['quran', 'torah', 'bible-ot', 'bible-nt', 'vedas'] as const;
export type TableTraditionKey = (typeof TABLE_TRADITIONS)[number];

/**
 * Draws exactly 5 cards for the Sacred Table—one from each tradition:
 * [Quran, Torah, Old Testament, New Testament, Vedas], each matched precisely
 * to the user's emotional state.
 */
export function drawTableDeck(userText: string): ScriptureVerseCard[] {
  const normalized = (userText || '').toLowerCase().trim();

  // Detect active emotional signals
  const detectedSignals = new Set<string>();
  for (const [signalKey, keywords] of Object.entries(EMOTIONAL_SIGNALS)) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        detectedSignals.add(signalKey);
        break;
      }
    }
  }

  // If no signals were explicitly detected, default to peace/hope
  if (detectedSignals.size === 0) {
    detectedSignals.add('peace');
  }

  // Score all curated comfort verses
  const scored = CURATED_COMFORT_VERSES.map((verse) => ({
    verse,
    score: scoreVerse(verse, normalized, detectedSignals),
  }));

  // For each tradition in TABLE_TRADITIONS, select the single highest-scoring verse
  const tableCards: ScriptureVerseCard[] = [];

  for (const tradition of TABLE_TRADITIONS) {
    const candidates = scored.filter((s) => s.verse.tradition === tradition);
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0]?.verse;
    if (best) {
      tableCards.push({
        id: best.id,
        tradition: best.tradition,
        book: best.book,
        bookId: best.bookId,
        chapter: best.chapter,
        verseNumber: best.verseNumber,
        originalText: best.originalText,
        translation: best.translation,
        reflectionHint: best.reflectionHint,
      });
    }
  }

  return tableCards;
}

