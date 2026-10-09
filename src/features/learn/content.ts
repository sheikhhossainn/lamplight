import type {
  CourseManifest,
  CourseItem,
  CourseSentence,
  CourseStrings,
  CoursePackage,
  CourseUnit,
  CourseLesson,
} from './types';

// Bundled static assets
// TypeScript / React Native bundler resolves JSON seamlessly.
import jaCourse from '../../../assets/courses/ja/course.json';
import jaItems from '../../../assets/courses/ja/items.json';
import jaSentences from '../../../assets/courses/ja/sentences.json';
import jaStringsBn from '../../../assets/courses/ja/i18n/bn.json';

const COURSES: Record<string, { manifest: CourseManifest; items: CourseItem[]; sentences: CourseSentence[] }> = {
  ja: {
    manifest: jaCourse as CourseManifest,
    items: jaItems as CourseItem[],
    sentences: jaSentences as CourseSentence[],
  },
};

const STRINGS: Record<string, Record<string, CourseStrings>> = {
  ja: {
    bn: jaStringsBn as CourseStrings,
  },
};

/**
 * Loads a complete course package for target language and mother tongue.
 */
export function loadCoursePackage(
  targetLang: string,
  motherTongue: string = 'bn',
): CoursePackage | null {
  const course = COURSES[targetLang];
  const localizedStrings = STRINGS[targetLang]?.[motherTongue];

  if (!course || !localizedStrings) {
    return null;
  }

  return {
    manifest: course.manifest,
    items: course.items,
    sentences: course.sentences,
    strings: localizedStrings,
  };
}

export function getCourseManifest(targetLang: string): CourseManifest | null {
  return COURSES[targetLang]?.manifest ?? null;
}

export function getCourseUnit(targetLang: string, unitNumberOrId: number | string): CourseUnit | null {
  const manifest = getCourseManifest(targetLang);
  if (!manifest) return null;

  return (
    manifest.units.find(
      (u) => u.id === unitNumberOrId || u.number === unitNumberOrId,
    ) ?? null
  );
}

export function getCourseLesson(targetLang: string, lessonId: string): { lesson: CourseLesson; unit: CourseUnit } | null {
  const manifest = getCourseManifest(targetLang);
  if (!manifest) return null;

  for (const unit of manifest.units) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { lesson, unit };
    }
  }

  return null;
}

export function getCourseItemById(targetLang: string, itemId: string): CourseItem | null {
  const course = COURSES[targetLang];
  if (!course) return null;
  return course.items.find((item) => item.id === itemId) ?? null;
}

export function getCourseSentenceById(targetLang: string, sentenceId: string): CourseSentence | null {
  const course = COURSES[targetLang];
  if (!course) return null;
  return course.sentences.find((s) => s.id === sentenceId) ?? null;
}

export function getCourseStrings(targetLang: string, motherTongue: string = 'bn'): CourseStrings | null {
  return STRINGS[targetLang]?.[motherTongue] ?? null;
}
