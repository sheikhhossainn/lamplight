// Writing-system data for the beginner course (stage 1: script). `say` is what
// the device voice reads aloud — a bare jamo/letter is often read as its name
// or skipped, so Korean uses a sample syllable.

export type ScriptChar = { char: string; roman: string; say: string };
export type ScriptGroup = { label: string; items: ScriptChar[] };
export type ScriptSet = { id: string; title: string; groups: ScriptGroup[] };

export const SCRIPT_LANGS = ['ja', 'ko', 'bn'] as const;
export type ScriptLang = (typeof SCRIPT_LANGS)[number];

export function hasScriptCourse(lang: string): lang is ScriptLang {
  return (SCRIPT_LANGS as readonly string[]).includes(lang);
}

const KANA_ROWS: Array<{ label: string; chars: string; romans: string[] }> = [
  { label: 'a · i · u · e · o', chars: 'あいうえお', romans: ['a', 'i', 'u', 'e', 'o'] },
  { label: 'k', chars: 'かきくけこ', romans: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { label: 's', chars: 'さしすせそ', romans: ['sa', 'shi', 'su', 'se', 'so'] },
  { label: 't', chars: 'たちつてと', romans: ['ta', 'chi', 'tsu', 'te', 'to'] },
  { label: 'n', chars: 'なにぬねの', romans: ['na', 'ni', 'nu', 'ne', 'no'] },
  { label: 'h', chars: 'はひふへほ', romans: ['ha', 'hi', 'fu', 'he', 'ho'] },
  { label: 'm', chars: 'まみむめも', romans: ['ma', 'mi', 'mu', 'me', 'mo'] },
  { label: 'y', chars: 'やゆよ', romans: ['ya', 'yu', 'yo'] },
  { label: 'r', chars: 'らりるれろ', romans: ['ra', 'ri', 'ru', 're', 'ro'] },
  { label: 'w · n', chars: 'わをん', romans: ['wa', 'wo', 'n'] },
];

// Katakana sits exactly 0x60 above hiragana for all 46 basic kana.
function toKatakana(hira: string): string {
  return String.fromCharCode(hira.charCodeAt(0) + 0x60);
}

function kanaSet(id: string, title: string, katakana: boolean): ScriptSet {
  return {
    id,
    title,
    groups: KANA_ROWS.map((row) => ({
      label: row.label,
      items: Array.from(row.chars).map((c, i) => {
        const char = katakana ? toKatakana(c) : c;
        return { char, roman: row.romans[i], say: char };
      }),
    })),
  };
}

function items(spec: Array<[string, string, string?]>): ScriptChar[] {
  return spec.map(([char, roman, say]) => ({ char, roman, say: say ?? char }));
}

const HANGUL_VOWELS = items([
  ['ㅏ', 'a', '아'], ['ㅑ', 'ya', '야'], ['ㅓ', 'eo', '어'], ['ㅕ', 'yeo', '여'], ['ㅗ', 'o', '오'],
  ['ㅛ', 'yo', '요'], ['ㅜ', 'u', '우'], ['ㅠ', 'yu', '유'], ['ㅡ', 'eu', '으'], ['ㅣ', 'i', '이'],
]);

const HANGUL_CONSONANTS = items([
  ['ㄱ', 'g / k', '가'], ['ㄴ', 'n', '나'], ['ㄷ', 'd / t', '다'], ['ㄹ', 'r / l', '라'], ['ㅁ', 'm', '마'],
  ['ㅂ', 'b / p', '바'], ['ㅅ', 's', '사'], ['ㅇ', 'silent / ng', '아'], ['ㅈ', 'j', '자'], ['ㅊ', 'ch', '차'],
  ['ㅋ', 'k', '카'], ['ㅌ', 't', '타'], ['ㅍ', 'p', '파'], ['ㅎ', 'h', '하'],
]);

const BN_VOWELS = items([
  ['অ', 'o'], ['আ', 'a'], ['ই', 'i'], ['ঈ', 'i (long)'], ['উ', 'u'], ['ঊ', 'u (long)'],
  ['ঋ', 'ri'], ['এ', 'e'], ['ঐ', 'oi'], ['ও', 'o'], ['ঔ', 'ou'],
]);

const BN_CONSONANTS = items([
  ['ক', 'ko'], ['খ', 'kho'], ['গ', 'go'], ['ঘ', 'gho'], ['ঙ', 'ngo'],
  ['চ', 'cho'], ['ছ', 'chho'], ['জ', 'jo'], ['ঝ', 'jho'], ['ঞ', 'no'],
  ['ট', 'to'], ['ঠ', 'tho'], ['ড', 'do'], ['ঢ', 'dho'], ['ণ', 'no'],
  ['ত', 'to'], ['থ', 'tho'], ['দ', 'do'], ['ধ', 'dho'], ['ন', 'no'],
  ['প', 'po'], ['ফ', 'pho'], ['ব', 'bo'], ['ভ', 'bho'], ['ম', 'mo'],
  ['য', 'jo'], ['র', 'ro'], ['ল', 'lo'], ['শ', 'sho'], ['ষ', 'sho'],
  ['স', 'sho'], ['হ', 'ho'], ['ড়', 'ro'], ['ঢ়', 'rho'], ['য়', 'yo'],
]);

export function getScriptSets(lang: string): ScriptSet[] {
  switch (lang) {
    case 'ja':
      return [kanaSet('hiragana', 'Hiragana', false), kanaSet('katakana', 'Katakana', true)];
    case 'ko':
      return [
        { id: 'hangul-vowels', title: 'Vowels', groups: [{ label: '10 vowels', items: HANGUL_VOWELS }] },
        { id: 'hangul-consonants', title: 'Consonants', groups: [{ label: '14 consonants', items: HANGUL_CONSONANTS }] },
      ];
    case 'bn':
      return [
        { id: 'bn-vowels', title: 'Vowels', groups: [{ label: '11 vowels', items: BN_VOWELS }] },
        { id: 'bn-consonants', title: 'Consonants', groups: [{ label: '35 consonants', items: BN_CONSONANTS }] },
      ];
    default:
      return [];
  }
}

export function countScriptChars(lang: string): number {
  return getScriptSets(lang).reduce(
    (sum, set) => sum + set.groups.reduce((s, g) => s + g.items.length, 0),
    0,
  );
}
