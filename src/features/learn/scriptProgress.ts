import { getSetting, setSetting } from '@/db/repositories/appSettings';

const KEY_PREFIX = 'script_learned:';

// Learned characters per language, stored as a JSON array in app_settings.
export async function getLearnedChars(lang: string): Promise<Set<string>> {
  try {
    const raw = await getSetting(`${KEY_PREFIX}${lang}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function setLearnedChars(lang: string, chars: Set<string>): Promise<void> {
  await setSetting(`${KEY_PREFIX}${lang}`, JSON.stringify(Array.from(chars)));
}
