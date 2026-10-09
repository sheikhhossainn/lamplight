import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';
import type { MotherTongueCode } from '@/features/settings/motherTongue';

/** Language a culture theme speaks in (classic has none: it follows the reader's mother tongue). */
export function getThemeCultureLanguage(theme: LiteraryThemeCode, fallback: MotherTongueCode): MotherTongueCode {
  switch (theme) {
    case 'bengali':
      return 'bn';
    case 'korean':
      return 'ko';
    case 'japanese':
      return 'ja';
    case 'arabic':
      return 'ar';
    case 'western':
      return 'en';
    default:
      return fallback;
  }
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const mapDigits = (n: number, digits: string[]) => String(n).replace(/\d/g, (d) => digits[Number(d)]);

// ── East Asian 24 solar terms (節気). Dates are the usual calendar day each term begins. ──
const SOLAR_TERMS: Array<[number, number, string, string]> = [
  [1, 6, '小寒', '소한'],
  [1, 20, '大寒', '대한'],
  [2, 4, '立春', '입춘'],
  [2, 19, '雨水', '우수'],
  [3, 6, '啓蟄', '경칩'],
  [3, 21, '春分', '춘분'],
  [4, 5, '清明', '청명'],
  [4, 20, '穀雨', '곡우'],
  [5, 6, '立夏', '입하'],
  [5, 21, '小満', '소만'],
  [6, 6, '芒種', '망종'],
  [6, 21, '夏至', '하지'],
  [7, 7, '小暑', '소서'],
  [7, 23, '大暑', '대서'],
  [8, 7, '立秋', '입추'],
  [8, 23, '処暑', '처서'],
  [9, 8, '白露', '백로'],
  [9, 23, '秋分', '추분'],
  [10, 8, '寒露', '한로'],
  [10, 23, '霜降', '상강'],
  [11, 7, '立冬', '입동'],
  [11, 22, '小雪', '소설'],
  [12, 7, '大雪', '대설'],
  [12, 22, '冬至', '동지'],
];

function currentSolarTerm(date: Date, index: 2 | 3): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let found = SOLAR_TERMS[SOLAR_TERMS.length - 1];
  for (const term of SOLAR_TERMS) {
    if (term[0] < m || (term[0] === m && term[1] <= d)) found = term;
  }
  return found[index];
}

// ── Bengali calendar (Bangladesh revised: new year on 14 April). ──
const BN_MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const BN_SEASONS = ['গ্রীষ্ম', 'বর্ষা', 'শরৎ', 'হেমন্ত', 'শীত', 'বসন্ত'];

function bengaliDateLine(date: Date): string {
  const gy = date.getFullYear();
  // [gregorian month, gregorian day, bangla month index] — each bangla month's first day (Bangladesh revised calendar).
  const starts: Array<[number, number, number]> = [
    [1, 15, 9],
    [2, 14, 10],
    [3, 15, 11],
    [4, 14, 0],
    [5, 15, 1],
    [6, 15, 2],
    [7, 16, 3],
    [8, 16, 4],
    [9, 16, 5],
    [10, 17, 6],
    [11, 16, 7],
    [12, 16, 8],
  ];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let start = starts[0];
  let startYear = gy;
  let hit = false;
  for (const s of starts) {
    if (s[0] < m || (s[0] === m && s[1] <= d)) {
      start = s;
      hit = true;
    }
  }
  if (!hit) {
    // 1–14 January still belongs to Poush, which began on 16 December of the previous year.
    start = [12, 16, 8];
    startYear = gy - 1;
  }
  const today = Date.UTC(gy, m - 1, d);
  const first = Date.UTC(startYear, start[0] - 1, start[1]);
  const day = Math.round((today - first) / 86400000) + 1;
  const banglaYear = m > 4 || (m === 4 && d >= 14) ? gy - 593 : gy - 594;
  const monthIndex = start[2];
  const season = BN_SEASONS[Math.floor(monthIndex / 2)];
  return `${season} · ${mapDigits(day, BN_DIGITS)} ${BN_MONTHS[monthIndex]} ${mapDigits(banglaYear, BN_DIGITS)}`;
}

// ── Hijri (tabular civil calendar; may differ from local moon sighting by a day). ──
const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

function platformHijri(date: Date): { day: number; month: number; year: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const out = { day: get('day'), month: get('month'), year: get('year') };
    // Guard against engines that ignore the calendar and return Gregorian values.
    if (out.year > 1300 && out.year < 1700 && out.month >= 1 && out.month <= 12 && out.day >= 1) return out;
  } catch {
    // fall through to the tabular calendar
  }
  return null;
}

function hijriDateLine(date: Date): string {
  const platform = platformHijri(date);
  if (platform) {
    return `${mapDigits(platform.day, AR_DIGITS)} ${HIJRI_MONTHS[platform.month - 1]} ${mapDigits(platform.year, AR_DIGITS)} هـ`;
  }
  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const dy = date.getDate();
  const a = Math.floor((14 - mo) / 12);
  const y2 = y + 4800 - a;
  const m2 = mo + 12 * a - 3;
  const jd =
    dy +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return `${mapDigits(day, AR_DIGITS)} ${HIJRI_MONTHS[month - 1]} ${mapDigits(year, AR_DIGITS)} هـ`;
}

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * One line of the culture's own calendar, in its own script, for the home header.
 * Returns null for the classic theme (no culture of its own).
 */
export function getCultureDateLine(theme: LiteraryThemeCode, date: Date = new Date()): string | null {
  switch (theme) {
    case 'bengali':
      return bengaliDateLine(date);
    case 'japanese':
      return `${currentSolarTerm(date, 2)} · ${date.getMonth() + 1}月${date.getDate()}日`;
    case 'korean':
      return `${currentSolarTerm(date, 3)} · ${date.getMonth() + 1}월 ${date.getDate()}일`;
    case 'arabic':
      return hijriDateLine(date);
    case 'western':
      return `${EN_DAYS[date.getDay()]}, ${date.getDate()} ${EN_MONTHS[date.getMonth()]}`;
    default:
      return null;
  }
}
