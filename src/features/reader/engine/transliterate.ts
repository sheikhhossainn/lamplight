/**
 * Multi-script phonetic transliteration engine for Illuminated Decryption Sheet.
 * Generates Layer 2 phonetic guides for Japanese (Romaji), Korean (Revised Romanization),
 * Bengali (Romanized phonetics), and English (syllabified rhythmic reading).
 */

// Japanese Hiragana/Katakana to Romaji map
const KANA_MAP: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  // Katakana equivalents
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o',
  カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no',
  ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo',
  ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro',
  ワ: 'wa', ヲ: 'wo', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go',
  ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po',
};

// Korean Hangul decomposition tables (Revised Romanization)
const HANGUL_INITIALS = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];
const HANGUL_VOWELS = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];
const HANGUL_FINALS = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h',
];

// Bengali letter to Latin transliteration mapping
const BANGLA_MAP: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri',
  'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  'ক': 'ko', 'খ': 'kho', 'গ': 'go', 'ঘ': 'gho', 'ঙ': 'ngo',
  'চ': 'cho', 'ছ': 'chho', 'জ': 'jo', 'ঝ': 'jho', 'ঞ': 'nyo',
  'ট': 'to', 'ঠ': 'tho', 'ড': 'do', 'ঢ': 'dho', 'ণ': 'no',
  'ত': 'to', 'থ': 'tho', 'দ': 'do', 'ধ': 'dho', 'ন': 'no',
  'প': 'po', 'ফ': 'pho', 'ব': 'bo', 'ভ': 'bho', 'ম': 'mo',
  'য': 'yo', 'র': 'ro', 'ল': 'lo', 'শ': 'sho', 'ষ': 'sho', 'স': 'so', 'হ': 'ho',
  'ড়': 'ro', 'ঢ়': 'rho', 'য়': 'yo', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
  '্': '',
};

export function transliterateSentence(text: string, langHint?: string): string {
  if (!text || text.trim().length === 0) return '';

  // 1. Japanese check
  if (langHint === 'ja' || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) {
    let romaji = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (KANA_MAP[char]) {
        romaji += KANA_MAP[char];
      } else if (/[\u4E00-\u9FFF]/.test(char)) {
        // For Kanji without dictionary furigana, show syllable placeholder or tone
        romaji += `[${char}]`;
      } else {
        romaji += char;
      }
    }
    return romaji.replace(/\s+/g, ' ').trim();
  }

  // 2. Korean check
  if (langHint === 'ko' || /[\uAC00-\uD7AF]/.test(text)) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const syllableIndex = code - 0xac00;
        const initial = Math.floor(syllableIndex / 588);
        const vowel = Math.floor((syllableIndex % 588) / 28);
        const final = syllableIndex % 28;
        result += HANGUL_INITIALS[initial] + HANGUL_VOWELS[vowel] + HANGUL_FINALS[final];
      } else {
        result += text[i];
      }
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  // 3. Bengali check
  if (langHint === 'bn' || /[\u0980-\u09FF]/.test(text)) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      result += BANGLA_MAP[char] ?? char;
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  // 4. English / Latin phonetic rhythm (syllable hyphenation)
  return text
    .split(' ')
    .map((word) => {
      if (word.length <= 4) return word;
      return word.replace(/([aeiouy]{1,2})([^aeiouy\s]{1,2})([aeiouy])/gi, '$1-$2$3');
    })
    .join(' ');
}
