import { useEffect, useState } from 'react';

import { useTargetReadingLanguage } from '@/features/settings/targetReadingLanguage';
import { useMotherTongue } from '@/features/settings/motherTongue';
import { getLearnerLevel, type LearnerLevel } from '@/features/settings/learnerLevel';
import { getSetting, setSetting } from '@/db/repositories/appSettings';

export const KEY_LEARN_SPACE_FORCED_ON = 'learn_space_forced_on';

/**
 * Pure evaluation helper determining if the Learn space is available.
 * Rule: target === 'ja' && motherTongue === 'bn' && (level !== 'fluent' || forcedOn)
 */
export function isLearnSpaceAvailable(
  targetLang: string,
  motherTongue: string,
  level: LearnerLevel | string = 'some',
  forcedOn: boolean = false,
): boolean {
  if (targetLang !== 'ja' || motherTongue !== 'bn') {
    return false;
  }
  if (level === 'fluent' && !forcedOn) {
    return false;
  }
  return true;
}

export async function isLearnSpaceForcedOn(): Promise<boolean> {
  const saved = await getSetting(KEY_LEARN_SPACE_FORCED_ON);
  return saved === '1';
}

export async function setLearnSpaceForcedOn(forced: boolean): Promise<void> {
  await setSetting(KEY_LEARN_SPACE_FORCED_ON, forced ? '1' : '0');
}

/**
 * Hook to reactively check Learn space availability based on current language settings.
 */
export function useLearnSpaceAvailable(): boolean {
  const targetLang = useTargetReadingLanguage();
  const motherTongue = useMotherTongue();
  const [level, setLevel] = useState<LearnerLevel>('some');
  const [forcedOn, setForcedOn] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getLearnerLevel(targetLang),
      isLearnSpaceForcedOn(),
    ])
      .then(([lvl, forced]) => {
        if (mounted) {
          setLevel(lvl);
          setForcedOn(forced);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [targetLang, motherTongue]);

  return isLearnSpaceAvailable(targetLang, motherTongue, level, forcedOn);
}
