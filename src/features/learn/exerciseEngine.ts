// Pure exercise generation engine for Lamplight Learn Course.
// Transforms lesson item/sentence IDs and course data into an exercise queue.
// Pure logic: no React Native imports, fully testable in Node.

import type {
  CourseItem,
  CourseSentence,
  CourseStrings,
  CourseLesson,
  CourseUnit,
  LetterItem,
  WordItem,
} from './types';
import { transliterate } from './transliterate';

export type ExerciseType =
  | 'letter_read'
  | 'letter_listen'
  | 'match_pairs'
  | 'word_meaning'
  | 'listen_pick'
  | 'fill_blank'
  | 'build_sentence'
  | 'translate_back'
  | 'spot_word';

export type ExerciseOption = {
  id: string;
  text: string;
  reading?: string;
  isCorrect: boolean;
};

export type MatchPair = {
  leftId: string;
  leftText: string;
  rightId: string;
  rightText: string;
};

export type ExerciseItem = {
  id: string;
  type: ExerciseType;
  prompt: string;
  subPrompt?: string;
  audioText?: string;
  sourceItemId?: string;
  sourceSentenceId?: string;
  options?: ExerciseOption[];
  pairs?: MatchPair[];
  tiles?: string[];
  correctSequence?: string[];
  explanation?: string;
};

export type BuildExerciseQueueParams = {
  lesson: CourseLesson;
  unit: CourseUnit;
  allItems: CourseItem[];
  allSentences: CourseSentence[];
  strings: CourseStrings;
  dueItemIds?: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds a sequential queue of exercises for a given lesson.
 */
export function buildExerciseQueue(params: {
  lesson: CourseLesson;
  unit: CourseUnit;
  allItems: CourseItem[];
  allSentences: CourseSentence[];
  strings: CourseStrings;
  dueItemIds?: string[];
}): ExerciseItem[] {
  const { lesson, allItems, allSentences, strings } = params;
  const itemMap = new Map<string, CourseItem>(allItems.map((i) => [i.id, i]));
  const sentenceMap = new Map<string, CourseSentence>(allSentences.map((s) => [s.id, s]));

  const lessonItems = lesson.itemIds
    .map((id) => itemMap.get(id))
    .filter((item): item is CourseItem => Boolean(item));

  const queue: ExerciseItem[] = [];

  // 1. Script / Letter lessons
  if (lesson.type === 'letter') {
    const letterItems = lessonItems.filter((i) => i.kind === 'letter');

    // Generate letter_read exercises
    for (const item of letterItems) {
      const correctSound = strings.meanings[item.id] || transliterate(item.char, 'bn');

      // Distractors from other letters
      const otherLetters = allItems
        .filter((other): other is LetterItem => other.kind === 'letter' && other.id !== item.id)
        .map((other) => strings.meanings[other.id] || transliterate(other.char, 'bn'))
        .filter((val, idx, arr) => arr.indexOf(val) === idx && val !== correctSound);

      const chosenDistractors = shuffle(otherLetters).slice(0, 3);
      const options: ExerciseOption[] = shuffle([
        { id: `opt-correct-${item.id}`, text: correctSound, isCorrect: true },
        ...chosenDistractors.map((dist, idx) => ({
          id: `opt-dist-${item.id}-${idx}`,
          text: dist,
          isCorrect: false,
        })),
      ]);

      queue.push({
        id: `ex-read-${item.id}`,
        type: 'letter_read',
        prompt: item.char,
        audioText: item.say,
        sourceItemId: item.id,
        options,
      });
    }

    // Generate letter_listen exercises
    for (const item of letterItems) {
      const correctChar = item.char;
      const otherChars = allItems
        .filter((other): other is LetterItem => other.kind === 'letter' && other.id !== item.id)
        .map((other) => other.char)
        .filter((c) => c !== correctChar);

      const chosenDistractors = shuffle(otherChars).slice(0, 3);
      const options: ExerciseOption[] = shuffle([
        { id: `opt-listen-correct-${item.id}`, text: correctChar, isCorrect: true },
        ...chosenDistractors.map((c, idx) => ({
          id: `opt-listen-dist-${item.id}-${idx}`,
          text: c,
          isCorrect: false,
        })),
      ]);

      queue.push({
        id: `ex-listen-${item.id}`,
        type: 'letter_listen',
        prompt: strings.ui.listen_prompt || 'শুনে সঠিকটি বেছে নিন:',
        audioText: item.say,
        sourceItemId: item.id,
        options,
      });
    }

    // Generate match_pairs if >= 4 items
    if (letterItems.length >= 4) {
      const picked = letterItems.slice(0, 5);
      const pairs: MatchPair[] = picked.map((item) => ({
        leftId: item.id,
        leftText: item.char,
        rightId: item.id,
        rightText: strings.meanings[item.id] || transliterate(item.char, 'bn'),
      }));

      queue.push({
        id: `ex-match-${lesson.id}`,
        type: 'match_pairs',
        prompt: strings.ui.tap_pairs_prompt || 'জোড়া মেলান:',
        pairs,
      });
    }
  }

  // 2. Vocabulary & Grammar lessons
  if (lesson.type === 'vocab' || lesson.type === 'grammar' || lesson.type === 'review') {
    const wordItems = lessonItems.filter((i) => i.kind === 'word');

    // For word items: word_meaning exercises
    for (const item of wordItems) {
      const meaning = strings.meanings[item.id];
      if (!meaning) continue;

      const otherMeanings = allItems
        .filter((other) => other.kind === 'word' && other.id !== item.id)
        .map((other) => strings.meanings[other.id])
        .filter((m): m is string => Boolean(m) && m !== meaning);

      const chosenDistractors = shuffle(otherMeanings).slice(0, 3);
      const options: ExerciseOption[] = shuffle([
        { id: `opt-word-${item.id}`, text: meaning, isCorrect: true },
        ...chosenDistractors.map((dist, idx) => ({
          id: `opt-word-dist-${item.id}-${idx}`,
          text: dist,
          isCorrect: false,
        })),
      ]);

      queue.push({
        id: `ex-meaning-${item.id}`,
        type: 'word_meaning',
        prompt: item.text,
        subPrompt: item.reading !== item.text ? item.reading : undefined,
        audioText: item.reading,
        sourceItemId: item.id,
        options,
      });
    }

    // Sentences: build_sentence exercises
    const sentenceIds = lesson.sentenceIds || [];
    for (const sId of sentenceIds) {
      const sentence = sentenceMap.get(sId);
      if (!sentence) continue;

      const promptInBn = strings.sentences?.[sId] || '';
      const correctTokens = sentence.tokens.map((t) => t.text);

      // Collect distractor tiles from other words in the lesson/unit
      const otherWords = allItems
        .filter((item): item is import('./types').WordItem => item.kind === 'word' && !correctTokens.includes(item.text))
        .map((item) => item.text);

      const distractorTiles = shuffle(otherWords).slice(0, 2);
      const allTiles = shuffle([...correctTokens, ...distractorTiles]);

      queue.push({
        id: `ex-build-${sId}`,
        type: 'build_sentence',
        prompt: promptInBn || strings.ui.build_sentence_prompt || 'এই বাক্যটি জাপানিতে সাজান:',
        tiles: allTiles,
        correctSequence: correctTokens,
        sourceSentenceId: sId,
        audioText: sentence.tokens.map((t) => t.reading || t.text).join(''),
      });
    }
  }

  return queue;
}

/**
 * Checks a tile answer against accepted sequence(s).
 */
export function verifySentenceAnswer(
  candidate: string[],
  sentence: CourseSentence,
): boolean {
  const candidateStr = candidate.join(' ').trim();
  const primaryStr = sentence.tokens.map((t) => t.text).join(' ').trim();

  if (candidateStr === primaryStr) return true;

  if (sentence.accepted) {
    for (const alt of sentence.accepted) {
      if (candidateStr === alt.join(' ').trim()) {
        return true;
      }
    }
  }

  return false;
}
