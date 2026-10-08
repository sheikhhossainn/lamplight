/**
 * Pure extraction logic for Google Translate gtx response payloads.
 * Decoupled from React Native and SQLite for test runner compatibility.
 */

const WHO_ACRONYM_PATTERN =
  /^(who|oms|dsö|szo|воз|вооз|που|세계보건기구|世界衛生組織|سازمان بهداشت جهانی)$/i;

function isAcronymCollision(word: string, candidate: string): boolean {
  if (word === 'who' && WHO_ACRONYM_PATTERN.test(candidate.trim())) {
    return true;
  }
  return false;
}

export function extractTranslatedText(data: unknown, sourceText?: string): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected translation response shape');
  }

  const segments = data[0] as unknown[];
  const primary = segments
    .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If no sourceText was passed, return primary translation directly
  if (!sourceText) return primary;

  const normSource = sourceText.trim().toLowerCase();
  const normPrimary = primary.toLowerCase();
  const hasAcronymCollision = isAcronymCollision(normSource, primary);

  // If primary translation is distinct and not an acronym collision, use it
  if (primary && normPrimary !== normSource && !hasAcronymCollision) {
    return primary;
  }

  // 1. For pronouns / words with specific POS, check dictionary (data[1], dt=bd)
  if (Array.isArray(data[1])) {
    // If 'who', prioritize pronoun group in dictionary
    if (normSource === 'who') {
      for (const group of data[1]) {
        const pos = String(group[0] || '').toLowerCase();
        if (pos.includes('pronoun') || pos.includes('pron')) {
          if (Array.isArray(group[1])) {
            for (const candidate of group[1]) {
              if (
                typeof candidate === 'string' &&
                candidate.trim().length > 0 &&
                candidate.trim().toLowerCase() !== normSource &&
                !isAcronymCollision(normSource, candidate)
              ) {
                return candidate.trim();
              }
            }
          }
        }
      }
    }

    // General dictionary scan
    for (const group of data[1]) {
      if (Array.isArray(group) && Array.isArray(group[1])) {
        for (const candidate of group[1]) {
          if (
            typeof candidate === 'string' &&
            candidate.trim().length > 0 &&
            candidate.trim().toLowerCase() !== normSource &&
            !isAcronymCollision(normSource, candidate)
          ) {
            return candidate.trim();
          }
        }
      }
    }
  }

  // 2. Inspect alternative translations (data[5], dt=at)
  if (Array.isArray(data[5]) && Array.isArray(data[5][0]) && Array.isArray(data[5][0][2])) {
    for (const alt of data[5][0][2]) {
      const candidate = alt?.[0];
      if (
        typeof candidate === 'string' &&
        candidate.trim().length > 0 &&
        candidate.trim().toLowerCase() !== normSource &&
        !isAcronymCollision(normSource, candidate)
      ) {
        return candidate.trim();
      }
    }
  }

  return primary;
}
