import type { CourseManifest, CourseItem, CourseSentence, CourseStrings } from './types';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

// Kanji unicode range check: CJK Unified Ideographs
const KANJI_REGEX = /[\u4E00-\u9FAF]/;

/**
 * Validates course manifest, items, sentences, and localized strings against
 * domain integrity rules.
 */
export function validateCourse(
  manifest: CourseManifest,
  items: CourseItem[],
  sentences: CourseSentence[],
  strings: CourseStrings,
): ValidationResult {
  const errors: string[] = [];

  const itemMap = new Map<string, CourseItem>();
  for (const item of items) {
    if (itemMap.has(item.id)) {
      errors.push(`Duplicate item id: ${item.id}`);
    }
    itemMap.set(item.id, item);
  }

  const sentenceMap = new Map<string, CourseSentence>();
  for (const s of sentences) {
    if (sentenceMap.has(s.id)) {
      errors.push(`Duplicate sentence id: ${s.id}`);
    }
    sentenceMap.set(s.id, s);
  }

  // Map item introduced unit
  const itemUnitMap = new Map<string, number>();

  for (const unit of manifest.units) {
    for (const lesson of unit.lessons) {
      for (const itemId of lesson.itemIds) {
        if (!itemMap.has(itemId)) {
          errors.push(`Lesson "${lesson.id}" references non-existent itemId: "${itemId}"`);
        } else if (!itemUnitMap.has(itemId)) {
          itemUnitMap.set(itemId, unit.number);
        }
      }

      if (lesson.sentenceIds) {
        for (const sId of lesson.sentenceIds) {
          if (!sentenceMap.has(sId)) {
            errors.push(`Lesson "${lesson.id}" references non-existent sentenceId: "${sId}"`);
          }
        }
      }
    }
  }

  // Rule 2: Every item has localized strings
  for (const item of items) {
    if (item.kind === 'grammar') {
      const expl = strings.explanations[item.id];
      if (!expl || expl.trim().length === 0) {
        errors.push(`Grammar item "${item.id}" missing explanation in strings`);
      }
    } else {
      const meaning = strings.meanings[item.id];
      if (!meaning || meaning.trim().length === 0) {
        errors.push(`Item "${item.id}" missing meaning in strings`);
      }
    }
  }

  // Rule 3 & 4: Sentence token validation & unit order
  for (const s of sentences) {
    for (const token of s.tokens) {
      if (token.itemId) {
        if (!itemMap.has(token.itemId)) {
          errors.push(`Sentence "${s.id}" references unknown itemId: "${token.itemId}"`);
        } else {
          const itemUnit = itemUnitMap.get(token.itemId) ?? 1;
          if (itemUnit > s.unit) {
            errors.push(
              `Sentence "${s.id}" in unit ${s.unit} uses itemId "${token.itemId}" which is introduced later in unit ${itemUnit}`,
            );
          }
        }
      }

      // Rule 5: No kanji without reading
      if (KANJI_REGEX.test(token.text)) {
        if (!token.reading || token.reading.trim().length === 0) {
          errors.push(
            `Sentence "${s.id}" token "${token.text}" contains kanji but has no reading specified`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
