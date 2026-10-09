import { getSetting, setSetting } from '@/db/repositories/appSettings';

// How much of the target reading language the learner already knows. 'zero'
// means they cannot read the script yet — real books are not a sensible start.
export type LearnerLevel = 'zero' | 'some' | 'fluent';

const KEY_PREFIX = 'learner_level:';

export async function getLearnerLevel(lang: string): Promise<LearnerLevel> {
  const saved = await getSetting(`${KEY_PREFIX}${lang}`);
  return saved === 'zero' || saved === 'fluent' ? saved : 'some';
}

export async function setLearnerLevel(lang: string, level: LearnerLevel): Promise<void> {
  await setSetting(`${KEY_PREFIX}${lang}`, level);
}
