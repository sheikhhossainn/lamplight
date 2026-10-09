// Pure transliteration engine for Japanese Kana (Hiragana & Katakana)
// to Bangla (target ja, mother tongue bn) and Romaji (mother tongue en).
// No React Native dependencies — compatible with tsx --test.

export type MotherTongue = 'bn' | 'en';

export const APPROXIMATE_KANA_BN = new Set([
  'つ', 'ツ', // tsu
  'ふ', 'フ', // fu
  'ざ', 'ザ', // za
  'ず', 'ズ', // zu
  'ぜ', 'ゼ', // ze
  'ぞ', 'ゾ', // zo
  'づ', 'ヅ', // dzu / zu
]);

export const APPROXIMATE_NOTE_BN = 'আনুমানিক — শুনে মিলিয়ে নিন';

type SyllableMapping = {
  roman: string;
  bn: string;
};

// Maps 2-char combinations (yoon: kya, shu, etc.)
const YOON_MAP: Record<string, SyllableMapping> = {
  // Hiragana
  きゃ: { roman: 'kya', bn: 'ক্যা' },
  きゅ: { roman: 'kyu', bn: 'কিউ' },
  きょ: { roman: 'kyo', bn: 'ক্যো' },
  しゃ: { roman: 'sha', bn: 'শা' },
  しゅ: { roman: 'shu', bn: 'শু' },
  しょ: { roman: 'sho', bn: 'শো' },
  ちゃ: { roman: 'cha', bn: 'চা' },
  ちゅ: { roman: 'chu', bn: 'চু' },
  ちょ: { roman: 'cho', bn: 'চো' },
  にゃ: { roman: 'nya', bn: 'নিয়া' },
  にゅ: { roman: 'nyu', bn: 'নিউ' },
  にょ: { roman: 'nyo', bn: 'নিয়ো' },
  ひゃ: { roman: 'hya', bn: 'হিয়া' },
  ひゅ: { roman: 'hyu', bn: 'হিউ' },
  ひょ: { roman: 'hyo', bn: 'হিয়ো' },
  みゃ: { roman: 'mya', bn: 'মিয়া' },
  みゅ: { roman: 'myu', bn: 'মিউ' },
  みょ: { roman: 'myo', bn: 'মিয়ো' },
  りゃ: { roman: 'rya', bn: 'রিয়া' },
  りゅ: { roman: 'ryu', bn: 'রিউ' },
  りょ: { roman: 'ryo', bn: 'রিয়ো' },
  ぎゃ: { roman: 'gya', bn: 'গ্যা' },
  ぎゅ: { roman: 'gyu', bn: 'গিউ' },
  ぎょ: { roman: 'gyo', bn: 'গ্যো' },
  じゃ: { roman: 'ja', bn: 'জা' },
  じゅ: { roman: 'ju', bn: 'জু' },
  じょ: { roman: 'jo', bn: 'জো' },
  びゃ: { roman: 'bya', bn: 'ব্যা' },
  びゅ: { roman: 'byu', bn: 'বিউ' },
  びょ: { roman: 'byo', bn: 'ব্যো' },
  ぴゃ: { roman: 'pya', bn: 'প্যা' },
  ぴゅ: { roman: 'pyu', bn: 'পিউ' },
  ぴょ: { roman: 'pyo', bn: 'প্যো' },

  // Katakana
  キャ: { roman: 'kya', bn: 'ক্যা' },
  キュ: { roman: 'kyu', bn: 'কিউ' },
  キョ: { roman: 'kyo', bn: 'ক্যো' },
  シャ: { roman: 'sha', bn: 'শা' },
  シュ: { roman: 'shu', bn: 'শু' },
  ショ: { roman: 'sho', bn: 'শো' },
  チャ: { roman: 'cha', bn: 'চা' },
  チュ: { roman: 'chu', bn: 'চু' },
  チョ: { roman: 'cho', bn: 'চো' },
  ニャ: { roman: 'nya', bn: 'নিয়া' },
  ニュ: { roman: 'nyu', bn: 'নিউ' },
  ニョ: { roman: 'nyo', bn: 'নিয়ো' },
  ヒャ: { roman: 'hya', bn: 'হিয়া' },
  ヒュ: { roman: 'hyu', bn: 'হিউ' },
  ヒョ: { roman: 'hyo', bn: 'হিয়ো' },
  ミャ: { roman: 'mya', bn: 'মিয়া' },
  ミュ: { roman: 'myu', bn: 'মিউ' },
  ミョ: { roman: 'myo', bn: 'মিয়ো' },
  リャ: { roman: 'rya', bn: 'রিয়া' },
  リュ: { roman: 'ryu', bn: 'রিউ' },
  リョ: { roman: 'ryo', bn: 'রিয়ো' },
  ギャ: { roman: 'gya', bn: 'গ্যা' },
  ギュ: { roman: 'gyu', bn: 'গিউ' },
  ギョ: { roman: 'gyo', bn: 'গ্যো' },
  ジャ: { roman: 'ja', bn: 'জা' },
  ジュ: { roman: 'ju', bn: 'জু' },
  ジョ: { roman: 'jo', bn: 'জো' },
  ビャ: { roman: 'bya', bn: 'ব্যা' },
  ビュ: { roman: 'byu', bn: 'বিউ' },
  ビョ: { roman: 'byo', bn: 'ব্যো' },
  ピャ: { roman: 'pya', bn: 'প্যা' },
  ピュ: { roman: 'pyu', bn: 'পিউ' },
  ピョ: { roman: 'pyo', bn: 'প্যো' },
};

// Maps single Kana characters
const SINGLE_KANA_MAP: Record<string, SyllableMapping> = {
  // Hiragana Vowels
  あ: { roman: 'a', bn: 'আ' },
  い: { roman: 'i', bn: 'ই' },
  う: { roman: 'u', bn: 'উ' },
  え: { roman: 'e', bn: 'এ' },
  お: { roman: 'o', bn: 'ও' },

  // k
  か: { roman: 'ka', bn: 'কা' },
  き: { roman: 'ki', bn: 'কি' },
  く: { roman: 'ku', bn: 'কু' },
  け: { roman: 'ke', bn: 'কে' },
  こ: { roman: 'ko', bn: 'কো' },

  // s
  さ: { roman: 'sa', bn: 'সা' },
  し: { roman: 'shi', bn: 'শি' },
  す: { roman: 'su', bn: 'সু' },
  せ: { roman: 'se', bn: 'সে' },
  そ: { roman: 'so', bn: 'সো' },

  // t
  た: { roman: 'ta', bn: 'তা' },
  ち: { roman: 'chi', bn: 'চি' },
  つ: { roman: 'tsu', bn: 'ৎসু' },
  て: { roman: 'te', bn: 'তে' },
  と: { roman: 'to', bn: 'তো' },

  // n
  な: { roman: 'na', bn: 'না' },
  に: { roman: 'ni', bn: 'নি' },
  ぬ: { roman: 'nu', bn: 'নু' },
  ね: { roman: 'ne', bn: 'নে' },
  の: { roman: 'no', bn: 'নো' },

  // h
  は: { roman: 'ha', bn: 'হা' },
  ひ: { roman: 'hi', bn: 'হি' },
  ふ: { roman: 'fu', bn: 'ফু' },
  へ: { roman: 'he', bn: 'হে' },
  ほ: { roman: 'ho', bn: 'হো' },

  // m
  ま: { roman: 'ma', bn: 'মা' },
  み: { roman: 'mi', bn: 'মি' },
  む: { roman: 'mu', bn: 'মু' },
  め: { roman: 'me', bn: 'মে' },
  も: { roman: 'mo', bn: 'মো' },

  // y
  や: { roman: 'ya', bn: 'ইয়া' },
  ゆ: { roman: 'yu', bn: 'ইউ' },
  よ: { roman: 'yo', bn: 'ইয়ো' },

  // r
  ら: { roman: 'ra', bn: 'রা' },
  り: { roman: 'ri', bn: 'রি' },
  る: { roman: 'ru', bn: 'রু' },
  れ: { roman: 're', bn: 'রে' },
  ろ: { roman: 'ro', bn: 'রো' },

  // w / n
  わ: { roman: 'wa', bn: 'ওয়া' },
  を: { roman: 'wo', bn: 'ও' },
  ん: { roman: 'n', bn: 'ন্' },

  // Dakuten (g, z, d, b)
  が: { roman: 'ga', bn: 'গা' },
  ぎ: { roman: 'gi', bn: 'গি' },
  ぐ: { roman: 'gu', bn: 'গু' },
  げ: { roman: 'ge', bn: 'গে' },
  ご: { roman: 'go', bn: 'গো' },

  ざ: { roman: 'za', bn: 'জা' },
  じ: { roman: 'ji', bn: 'জি' },
  ず: { roman: 'zu', bn: 'জু' },
  ぜ: { roman: 'ze', bn: 'জে' },
  ぞ: { roman: 'zo', bn: 'জো' },

  だ: { roman: 'da', bn: 'দা' },
  ぢ: { roman: 'ji', bn: 'জি' },
  づ: { roman: 'zu', bn: 'জু' },
  で: { roman: 'de', bn: 'দে' },
  ど: { roman: 'do', bn: 'দো' },

  ば: { roman: 'ba', bn: 'বা' },
  び: { roman: 'bi', bn: 'বি' },
  ぶ: { roman: 'bu', bn: 'বু' },
  べ: { roman: 'be', bn: 'বে' },
  ぼ: { roman: 'bo', bn: 'বো' },

  // Handakuten (p)
  ぱ: { roman: 'pa', bn: 'পা' },
  ぴ: { roman: 'pi', bn: 'পি' },
  ぷ: { roman: 'pu', bn: 'পু' },
  ぺ: { roman: 'pe', bn: 'পে' },
  ぽ: { roman: 'po', bn: 'পো' },

  // Katakana Vowels
  ア: { roman: 'a', bn: 'আ' },
  イ: { roman: 'i', bn: 'ই' },
  ウ: { roman: 'u', bn: 'উ' },
  エ: { roman: 'e', bn: 'এ' },
  オ: { roman: 'o', bn: 'ও' },

  // k
  カ: { roman: 'ka', bn: 'কা' },
  キ: { roman: 'ki', bn: 'কি' },
  ク: { roman: 'ku', bn: 'কু' },
  ケ: { roman: 'ke', bn: 'কে' },
  コ: { roman: 'ko', bn: 'কো' },

  // s
  サ: { roman: 'sa', bn: 'সা' },
  シ: { roman: 'shi', bn: 'শি' },
  ス: { roman: 'su', bn: 'সু' },
  セ: { roman: 'se', bn: 'সে' },
  ソ: { roman: 'so', bn: 'সো' },

  // t
  タ: { roman: 'ta', bn: 'তা' },
  チ: { roman: 'chi', bn: 'চি' },
  ツ: { roman: 'tsu', bn: 'ৎসু' },
  テ: { roman: 'te', bn: 'তে' },
  ト: { roman: 'to', bn: 'তো' },

  // n
  ナ: { roman: 'na', bn: 'না' },
  ニ: { roman: 'ni', bn: 'নি' },
  ヌ: { roman: 'nu', bn: 'নু' },
  ネ: { roman: 'ne', bn: 'নে' },
  ノ: { roman: 'no', bn: 'নো' },

  // h
  ハ: { roman: 'ha', bn: 'হা' },
  ヒ: { roman: 'hi', bn: 'হি' },
  フ: { roman: 'fu', bn: 'ফু' },
  ヘ: { roman: 'he', bn: 'হে' },
  ホ: { roman: 'ho', bn: 'হো' },

  // m
  マ: { roman: 'ma', bn: 'মা' },
  ミ: { roman: 'mi', bn: 'মি' },
  ム: { roman: 'mu', bn: 'মু' },
  メ: { roman: 'me', bn: 'মে' },
  モ: { roman: 'mo', bn: 'মো' },

  // y
  ヤ: { roman: 'ya', bn: 'ইয়া' },
  ユ: { roman: 'yu', bn: 'ইউ' },
  ヨ: { roman: 'yo', bn: 'ইয়ো' },

  // r
  ラ: { roman: 'ra', bn: 'রা' },
  リ: { roman: 'ri', bn: 'রি' },
  ル: { roman: 'ru', bn: 'রু' },
  レ: { roman: 're', bn: 'রে' },
  ロ: { roman: 'ro', bn: 'রো' },

  // w / n
  ワ: { roman: 'wa', bn: 'ওয়া' },
  ヲ: { roman: 'wo', bn: 'ও' },
  ン: { roman: 'n', bn: 'ন্' },

  // Dakuten
  ガ: { roman: 'ga', bn: 'গা' },
  ギ: { roman: 'gi', bn: 'গি' },
  グ: { roman: 'gu', bn: 'গু' },
  ゲ: { roman: 'ge', bn: 'গে' },
  ゴ: { roman: 'go', bn: 'গো' },

  ザ: { roman: 'za', bn: 'জা' },
  ジ: { roman: 'ji', bn: 'জি' },
  ズ: { roman: 'zu', bn: 'জু' },
  ゼ: { roman: 'ze', bn: 'জে' },
  ゾ: { roman: 'zo', bn: 'জো' },

  ダ: { roman: 'da', bn: 'দা' },
  ヂ: { roman: 'ji', bn: 'জি' },
  ヅ: { roman: 'zu', bn: 'জু' },
  デ: { roman: 'de', bn: 'দে' },
  ド: { roman: 'do', bn: 'দো' },

  バ: { roman: 'ba', bn: 'বা' },
  ビ: { roman: 'bi', bn: 'বি' },
  ブ: { roman: 'bu', bn: 'বু' },
  ベ: { roman: 'be', bn: 'বে' },
  ボ: { roman: 'bo', bn: 'বো' },

  // Handakuten
  パ: { roman: 'pa', bn: 'পা' },
  ピ: { roman: 'pi', bn: 'পি' },
  プ: { roman: 'pu', bn: 'পু' },
  ペ: { roman: 'pe', bn: 'পে' },
  ポ: { roman: 'po', bn: 'পো' },
};

/**
 * Returns true if the sound is an approximation in Bangla.
 */
export function isApproximateSound(char: string): boolean {
  return APPROXIMATE_KANA_BN.has(char);
}

/**
 * Returns the note for approximate sounds in Bangla, or null.
 */
export function getTransliterationNote(char: string, motherTongue: MotherTongue = 'bn'): string | null {
  if (motherTongue === 'bn' && isApproximateSound(char)) {
    return APPROXIMATE_NOTE_BN;
  }
  return null;
}

/**
 * Pure transliterator from Japanese Kana to Bangla or Romaji.
 */
export function transliterate(kana: string, motherTongue: MotherTongue = 'bn'): string {
  if (!kana) return '';

  let i = 0;
  const out: string[] = [];

  while (i < kana.length) {
    const char = kana[i];
    const nextChar = kana[i + 1] || '';

    // 1. Check Yoon (2-character combination: kya, etc.)
    const twoChars = char + nextChar;
    if (YOON_MAP[twoChars]) {
      const mapped = YOON_MAP[twoChars];
      out.push(motherTongue === 'bn' ? mapped.bn : mapped.roman);
      i += 2;
      continue;
    }

    // 2. Small Tsu (っ / ッ) — gemination / consonant doubling
    if (char === 'っ' || char === 'ッ') {
      if (nextChar) {
        // Peek next syllable
        const peekTwo = nextChar + (kana[i + 2] || '');
        const nextMapped = YOON_MAP[peekTwo] || SINGLE_KANA_MAP[nextChar];
        if (nextMapped) {
          if (motherTongue === 'en') {
            const firstLetter = nextMapped.roman.charAt(0);
            out.push(firstLetter);
          } else {
            // In Bangla, prepend hasanta consonant
            const firstLetter = nextMapped.roman.charAt(0);
            if (firstLetter === 'k' || firstLetter === 'g') out.push('ক্');
            else if (firstLetter === 's') out.push('স্');
            else if (firstLetter === 't' || firstLetter === 'c' || firstLetter === 'd') out.push('ৎ');
            else if (firstLetter === 'p' || firstLetter === 'b') out.push('প্');
            else out.push('ত্');
          }
          i += 1;
          continue;
        }
      }
      // If trailing alone:
      out.push(motherTongue === 'en' ? "'" : 'ৎ');
      i += 1;
      continue;
    }

    // 3. Chōonpu (ー) — long vowel mark
    if (char === 'ー') {
      // In Romaji, macron or repeat previous vowel
      if (motherTongue === 'en') {
        const last = out[out.length - 1] || '';
        const lastChar = last.slice(-1);
        if (['a', 'i', 'u', 'e', 'o'].includes(lastChar)) {
          out.push(lastChar);
        } else {
          out.push('-');
        }
      } else {
        // In Bangla, vowel lengthening / separator
        out.push('');
      }
      i += 1;
      continue;
    }

    // 4. Syllabic 'n' (ん / ン) before b/m/p is pronounced 'm'
    if (char === 'ん' || char === 'ン') {
      const peekNext = kana[i + 1] || '';
      const peekTwo = peekNext + (kana[i + 2] || '');
      const nextMapped = YOON_MAP[peekTwo] || SINGLE_KANA_MAP[peekNext];
      const isBmp = nextMapped && ['b', 'm', 'p'].includes(nextMapped.roman.charAt(0));

      if (isBmp) {
        out.push(motherTongue === 'en' ? 'm' : 'ম্');
      } else {
        out.push(motherTongue === 'en' ? 'n' : 'ন্');
      }
      i += 1;
      continue;
    }

    // 5. Standard single character lookup
    const single = SINGLE_KANA_MAP[char];
    if (single) {
      out.push(motherTongue === 'bn' ? single.bn : single.roman);
      i += 1;
      continue;
    }

    // 6. Unknown / punctuation / space: preserve
    out.push(char);
    i += 1;
  }

  return out.join('');
}
