import {
  CURATED_SCRIPTURE_QA,
  type CuratedScriptureQA,
  type TraditionKey,
} from './curatedScriptureQA';
import { getChapterVerses as getNtChapterVerses, getBookMeta as getNtBookMeta } from '../bible-content/bibleNtData';
import { getChapterVerses as getOtChapterVerses, getBookMeta as getOtBookMeta } from '../bible-content/bibleData';
import { getSurahVerses, getSurahMeta } from '../quran-content/quranData';
import type { ScriptureInquiryResult } from './scriptureInquiryApi';

// Normalized Bible book mapping
const NT_BOOK_MAP: Record<string, { id: string; name: string }> = {
  matthew: { id: 'MAT', name: 'Matthew' },
  matt: { id: 'MAT', name: 'Matthew' },
  mat: { id: 'MAT', name: 'Matthew' },
  mt: { id: 'MAT', name: 'Matthew' },
  mark: { id: 'MRK', name: 'Mark' },
  mrk: { id: 'MRK', name: 'Mark' },
  mk: { id: 'MRK', name: 'Mark' },
  luke: { id: 'LUK', name: 'Luke' },
  luk: { id: 'LUK', name: 'Luke' },
  lk: { id: 'LUK', name: 'Luke' },
  john: { id: 'JHN', name: 'John' },
  jhn: { id: 'JHN', name: 'John' },
  jn: { id: 'JHN', name: 'John' },
  acts: { id: 'ACT', name: 'Acts' },
  act: { id: 'ACT', name: 'Acts' },
  romans: { id: 'ROM', name: 'Romans' },
  rom: { id: 'ROM', name: 'Romans' },
  ro: { id: 'ROM', name: 'Romans' },
  '1 corinthians': { id: '1CO', name: '1 Corinthians' },
  '1 cor': { id: '1CO', name: '1 Corinthians' },
  '1co': { id: '1CO', name: '1 Corinthians' },
  '1cor': { id: '1CO', name: '1 Corinthians' },
  co1: { id: '1CO', name: '1 Corinthians' },
  '2 corinthians': { id: '2CO', name: '2 Corinthians' },
  '2 cor': { id: '2CO', name: '2 Corinthians' },
  '2co': { id: '2CO', name: '2 Corinthians' },
  '2cor': { id: '2CO', name: '2 Corinthians' },
  co2: { id: '2CO', name: '2 Corinthians' },
  galatians: { id: 'GAL', name: 'Galatians' },
  gal: { id: 'GAL', name: 'Galatians' },
  ga: { id: 'GAL', name: 'Galatians' },
  ephesians: { id: 'EPH', name: 'Ephesians' },
  eph: { id: 'EPH', name: 'Ephesians' },
  philippians: { id: 'PHP', name: 'Philippians' },
  phil: { id: 'PHP', name: 'Philippians' },
  php: { id: 'PHP', name: 'Philippians' },
  colossians: { id: 'COL', name: 'Colossians' },
  col: { id: 'COL', name: 'Colossians' },
  '1 thessalonians': { id: '1TH', name: '1 Thessalonians' },
  '1 thess': { id: '1TH', name: '1 Thessalonians' },
  '1th': { id: '1TH', name: '1 Thessalonians' },
  '2 thessalonians': { id: '2TH', name: '2 Thessalonians' },
  '2 thess': { id: '2TH', name: '2 Thessalonians' },
  '2th': { id: '2TH', name: '2 Thessalonians' },
  '1 timothy': { id: '1TI', name: '1 Timothy' },
  '1 tim': { id: '1TI', name: '1 Timothy' },
  '1ti': { id: '1TI', name: '1 Timothy' },
  '1tim': { id: '1TI', name: '1 Timothy' },
  ti1: { id: '1TI', name: '1 Timothy' },
  '2 timothy': { id: '2TI', name: '2 Timothy' },
  '2 tim': { id: '2TI', name: '2 Timothy' },
  '2ti': { id: '2TI', name: '2 Timothy' },
  '2tim': { id: '2TI', name: '2 Timothy' },
  ti2: { id: '2TI', name: '2 Timothy' },
  titus: { id: 'TIT', name: 'Titus' },
  tit: { id: 'TIT', name: 'Titus' },
  philemon: { id: 'PHM', name: 'Philemon' },
  phm: { id: 'PHM', name: 'Philemon' },
  hebrews: { id: 'HEB', name: 'Hebrews' },
  heb: { id: 'HEB', name: 'Hebrews' },
  james: { id: 'JAS', name: 'James' },
  jas: { id: 'JAS', name: 'James' },
  '1 peter': { id: '1PE', name: '1 Peter' },
  '1 pet': { id: '1PE', name: '1 Peter' },
  '1pe': { id: '1PE', name: '1 Peter' },
  pe1: { id: '1PE', name: '1 Peter' },
  '2 peter': { id: '2PE', name: '2 Peter' },
  '2 pet': { id: '2PE', name: '2 Peter' },
  '2pe': { id: '2PE', name: '2 Peter' },
  pe2: { id: '2PE', name: '2 Peter' },
  '1 john': { id: '1JN', name: '1 John' },
  '1 jn': { id: '1JN', name: '1 John' },
  '1jn': { id: '1JN', name: '1 John' },
  '2 john': { id: '2JN', name: '2 John' },
  '2 jn': { id: '2JN', name: '2 John' },
  '2jn': { id: '2JN', name: '2 John' },
  '3 john': { id: '3JN', name: '3 John' },
  '3 jn': { id: '3JN', name: '3 John' },
  '3jn': { id: '3JN', name: '3 John' },
  jude: { id: 'JUD', name: 'Jude' },
  jud: { id: 'JUD', name: 'Jude' },
  revelation: { id: 'REV', name: 'Revelation' },
  revelations: { id: 'REV', name: 'Revelation' },
  rev: { id: 'REV', name: 'Revelation' },
};

const OT_BOOK_MAP: Record<string, { id: string; name: string }> = {
  genesis: { id: 'GEN', name: 'Genesis' },
  gen: { id: 'GEN', name: 'Genesis' },
  exodus: { id: 'EXO', name: 'Exodus' },
  exo: { id: 'EXO', name: 'Exodus' },
  ex: { id: 'EXO', name: 'Exodus' },
  leviticus: { id: 'LEV', name: 'Leviticus' },
  lev: { id: 'LEV', name: 'Leviticus' },
  numbers: { id: 'NUM', name: 'Numbers' },
  num: { id: 'NUM', name: 'Numbers' },
  deuteronomy: { id: 'DEU', name: 'Deuteronomy' },
  deut: { id: 'DEU', name: 'Deuteronomy' },
  deu: { id: 'DEU', name: 'Deuteronomy' },
  dt: { id: 'DEU', name: 'Deuteronomy' },
  joshua: { id: 'JOS', name: 'Joshua' },
  jos: { id: 'JOS', name: 'Joshua' },
  judges: { id: 'JDG', name: 'Judges' },
  jdg: { id: 'JDG', name: 'Judges' },
  ruth: { id: 'RUT', name: 'Ruth' },
  rut: { id: 'RUT', name: 'Ruth' },
  '1 samuel': { id: '1SA', name: '1 Samuel' },
  '1 sam': { id: '1SA', name: '1 Samuel' },
  '1sa': { id: '1SA', name: '1 Samuel' },
  '2 samuel': { id: '2SA', name: '2 Samuel' },
  '2 sam': { id: '2SA', name: '2 Samuel' },
  '2sa': { id: '2SA', name: '2 Samuel' },
  '1 kings': { id: '1KI', name: '1 Kings' },
  '1ki': { id: '1KI', name: '1 Kings' },
  '2 kings': { id: '2KI', name: '2 Kings' },
  '2ki': { id: '2KI', name: '2 Kings' },
  psalms: { id: 'PSA', name: 'Psalms' },
  psalm: { id: 'PSA', name: 'Psalms' },
  psa: { id: 'PSA', name: 'Psalms' },
  ps: { id: 'PSA', name: 'Psalms' },
  proverbs: { id: 'PRO', name: 'Proverbs' },
  prov: { id: 'PRO', name: 'Proverbs' },
  pro: { id: 'PRO', name: 'Proverbs' },
  ecclesiastes: { id: 'ECC', name: 'Ecclesiastes' },
  ecc: { id: 'ECC', name: 'Ecclesiastes' },
  isaiah: { id: 'ISA', name: 'Isaiah' },
  isa: { id: 'ISA', name: 'Isaiah' },
  jeremiah: { id: 'JER', name: 'Jeremiah' },
  jer: { id: 'JER', name: 'Jeremiah' },
  daniel: { id: 'DAN', name: 'Daniel' },
  dan: { id: 'DAN', name: 'Daniel' },
  malachi: { id: 'MAL', name: 'Malachi' },
  mal: { id: 'MAL', name: 'Malachi' },
};

/**
 * Standardize scripture citation string.
 * Replaces en-dashes/em-dashes, trims letter suffixes (33b -> 33), removes extra spaces.
 */
export function normalizeCitationQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-') // Normalize em-dash/en-dash to hyphen
    .replace(/([0-9]+)[a-z]\b/gi, '$1') // e.g. 33b -> 33
    .replace(/\s*([:.-])\s*/g, '$1') // e.g. 14 : 33 -> 14:33
    .replace(/\s+/g, ' ');
}

export type ParsedCitation = {
  type: 'bible-nt' | 'bible-ot' | 'quran' | 'vedas';
  bookId?: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  rawReference: string;
};

export function parseCitation(query: string): ParsedCitation | null {
  const norm = normalizeCitationQuery(query);

  // 1. Quran match: e.g. "surah 4:34", "quran 4:34", "4:34"
  const quranMatch = norm.match(/^(?:surah|quran)?\s*(\d{1,3})[:.](\d{1,3})(?:-(\d{1,3}))?$/i);
  if (quranMatch) {
    const surahNum = parseInt(quranMatch[1], 10);
    const startVerse = parseInt(quranMatch[2], 10);
    const endVerse = quranMatch[3] ? parseInt(quranMatch[3], 10) : undefined;
    if (surahNum >= 1 && surahNum <= 114) {
      const meta = getSurahMeta(surahNum);
      return {
        type: 'quran',
        bookName: meta ? meta.nameEnglish : `Surah ${surahNum}`,
        chapter: surahNum,
        startVerse,
        endVerse,
        rawReference: `Surah ${surahNum}:${startVerse}${endVerse ? `-${endVerse}` : ''}`,
      };
    }
  }

  // 2. Vedas match: e.g. "rv 10.85", "rigveda 10.39.1", "rigveda 8.33.17"
  const vedasMatch = norm.match(/^(?:rigveda|rig veda|rv)\s*(\d{1,2})[.:](\d{1,3})(?:[.:](\d{1,3}))?$/i);
  if (vedasMatch) {
    const mandala = parseInt(vedasMatch[1], 10);
    const hymn = parseInt(vedasMatch[2], 10);
    const verse = vedasMatch[3] ? parseInt(vedasMatch[3], 10) : 1;
    return {
      type: 'vedas',
      bookId: `RV${mandala.toString().padStart(2, '0')}`,
      bookName: `Rigveda Book ${mandala}`,
      chapter: hymn,
      startVerse: verse,
      rawReference: `Rigveda ${mandala}.${hymn}${verse > 1 ? `.${verse}` : ''}`,
    };
  }

  // 3. Bible match: e.g. "1 timothy 2:12", "1 corinthians 14:33-35", "ephesians 5:22", "1 peter 3:7"
  const bibleMatch = norm.match(/^((?:\d\s*)?[a-z\s]+?)\s*(\d{1,3})[:.](\d{1,3})(?:-(\d{1,3}))?$/i);
  if (bibleMatch) {
    const rawBook = bibleMatch[1].trim();
    const chapter = parseInt(bibleMatch[2], 10);
    const startVerse = parseInt(bibleMatch[3], 10);
    const endVerse = bibleMatch[4] ? parseInt(bibleMatch[4], 10) : undefined;

    // Check NT
    const ntEntry = NT_BOOK_MAP[rawBook];
    if (ntEntry) {
      return {
        type: 'bible-nt',
        bookId: ntEntry.id,
        bookName: ntEntry.name,
        chapter,
        startVerse,
        endVerse,
        rawReference: `${ntEntry.name} ${chapter}:${startVerse}${endVerse ? `-${endVerse}` : ''}`,
      };
    }

    // Check OT
    const otEntry = OT_BOOK_MAP[rawBook];
    if (otEntry) {
      return {
        type: 'bible-ot',
        bookId: otEntry.id,
        bookName: otEntry.name,
        chapter,
        startVerse,
        endVerse,
        rawReference: `${otEntry.name} ${chapter}:${startVerse}${endVerse ? `-${endVerse}` : ''}`,
      };
    }
  }

  return null;
}

/**
 * Checks if a citation directly maps to a curated comparative topic.
 * Returns the CuratedScriptureQA along with the recommended initial tradition to display.
 */
export function matchCitationToCuratedQA(
  query: string
): { qa: CuratedScriptureQA; initialTradition: TraditionKey } | null {
  const parsed = parseCitation(query);
  if (!parsed) return null;

  // 1. Women in Leadership / Public Ministry
  // 1 Timothy 2:11-15, 1 Corinthians 14:33-35, Romans 16:1, Romans 16:7, Galatians 3:28, Judges 4:4, Rigveda 10.39, 10.125
  if (
    (parsed.bookId === '1TI' && parsed.chapter === 2 && parsed.startVerse >= 11 && parsed.startVerse <= 15) ||
    (parsed.bookId === '1CO' && parsed.chapter === 14 && parsed.startVerse >= 33 && parsed.startVerse <= 35) ||
    (parsed.bookId === 'ROM' && parsed.chapter === 16) ||
    (parsed.bookId === 'GAL' && parsed.chapter === 3 && parsed.startVerse === 28)
  ) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-women-leadership');
    if (qa) return { qa, initialTradition: 'bible-nt' };
  }

  if (parsed.bookId === 'JDG' && parsed.chapter === 4) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-women-leadership');
    if (qa) return { qa, initialTradition: 'torah' };
  }

  if (parsed.type === 'quran' && parsed.chapter === 27 && parsed.startVerse >= 23 && parsed.startVerse <= 44) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-women-leadership');
    if (qa) return { qa, initialTradition: 'quran' };
  }

  // 2. Marital Conduct & Household Roles
  // Ephesians 5:22, Colossians 3:18-19, 1 Peter 3:7, Quran 4:34, Exodus 21:10, Deuteronomy 22:28, Proverbs 31:10, Rigveda 10.85
  if (
    (parsed.bookId === 'EPH' && parsed.chapter === 5 && parsed.startVerse >= 21 && parsed.startVerse <= 33) ||
    (parsed.bookId === 'COL' && parsed.chapter === 3 && parsed.startVerse >= 18 && parsed.startVerse <= 19) ||
    (parsed.bookId === '1PE' && parsed.chapter === 3 && parsed.startVerse >= 1 && parsed.startVerse <= 7)
  ) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-marital-conduct');
    if (qa) return { qa, initialTradition: 'bible-nt' };
  }

  if (parsed.type === 'quran' && parsed.chapter === 4 && parsed.startVerse === 34) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-marital-conduct');
    if (qa) return { qa, initialTradition: 'quran' };
  }

  if (parsed.bookId === 'EXO' && parsed.chapter === 21 && parsed.startVerse === 10) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-marital-conduct');
    if (qa) return { qa, initialTradition: 'torah' };
  }

  // 3. Sexual Assault & 4 Witnesses
  // Deuteronomy 22:28, Quran 24:4
  if (parsed.bookId === 'DEU' && parsed.chapter === 22 && parsed.startVerse >= 25 && parsed.startVerse <= 29) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-rape-and-witnesses');
    if (qa) return { qa, initialTradition: 'torah' };
  }

  if (parsed.type === 'quran' && parsed.chapter === 24 && parsed.startVerse >= 4 && parsed.startVerse <= 13) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-rape-and-witnesses');
    if (qa) return { qa, initialTradition: 'quran' };
  }

  // 4. Warfare & Peace
  // Quran 9:5, Matthew 5:39, Exodus 21:24
  if (parsed.type === 'quran' && parsed.chapter === 9 && parsed.startVerse === 5) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-warfare-peace');
    if (qa) return { qa, initialTradition: 'quran' };
  }

  if (parsed.bookId === 'MAT' && parsed.chapter === 5 && parsed.startVerse >= 38 && parsed.startVerse <= 44) {
    const qa = CURATED_SCRIPTURE_QA.find((q) => q.id === 'qa-warfare-peace');
    if (qa) return { qa, initialTradition: 'bible-nt' };
  }

  return null;
}

/**
 * Resolves ANY arbitrary scripture citation directly from bundled offline assets
 * (Bible NT, Bible OT, or Quran) with original text, translation, and classical commentary.
 * Completely offline, instant, zero API token consumption.
 */
export function resolveDirectScriptureVerse(query: string): ScriptureInquiryResult | null {
  const parsed = parseCitation(query);
  if (!parsed) return null;

  // New Testament
  if (parsed.type === 'bible-nt' && parsed.bookId) {
    const verses = getNtChapterVerses(parsed.bookId, parsed.chapter);
    const matched = verses.filter(
      (v) =>
        v.verse.number >= parsed.startVerse &&
        (parsed.endVerse ? v.verse.number <= parsed.endVerse : v.verse.number === parsed.startVerse)
    );
    if (matched.length > 0) {
      const bookMeta = getNtBookMeta(parsed.bookId);
      const combinedText = matched.map((m) => m.verse.text).join(' ');
      const combinedCommentary = matched
        .map((m) => m.verse.commentary)
        .filter(Boolean)
        .join('\n\n');

      return {
        id: `lookup-nt-${parsed.bookId}-${parsed.chapter}-${parsed.startVerse}`,
        question: parsed.rawReference,
        shortTitle: parsed.rawReference,
        topicBackground: `Primary scripture lookup for ${parsed.rawReference} from the New Testament (${bookMeta?.name ?? parsed.bookName}), accompanied by historical Jamieson-Fausset-Brown commentary.`,
        isCurated: false,
        initialTradition: 'bible-nt',
        traditions: [
          {
            tradition: 'bible-nt',
            traditionName: 'New Testament',
            subtitle: `${bookMeta?.name ?? parsed.bookName} Chapter ${parsed.chapter}`,
            verses: [
              {
                id: `nt-${parsed.bookId}-${parsed.chapter}-${parsed.startVerse}`,
                tradition: 'bible-nt',
                book: bookMeta?.name ?? parsed.bookName,
                bookId: parsed.bookId,
                chapter: parsed.chapter,
                verseNumber: parsed.startVerse,
                translation: combinedText,
                historicalContext: `Addressed in the epistle of ${bookMeta?.name ?? parsed.bookName}, chapter ${parsed.chapter}.`,
                classicalCommentary: combinedCommentary
                  ? `Jamieson-Fausset-Brown: ${combinedCommentary}`
                  : undefined,
              },
            ],
          },
        ],
      };
    }
  }

  // Old Testament / Hebrew Bible
  if (parsed.type === 'bible-ot' && parsed.bookId) {
    const verses = getOtChapterVerses(parsed.bookId, parsed.chapter);
    const matched = verses.filter(
      (v) =>
        v.verse.number >= parsed.startVerse &&
        (parsed.endVerse ? v.verse.number <= parsed.endVerse : v.verse.number === parsed.startVerse)
    );
    if (matched.length > 0) {
      const bookMeta = getOtBookMeta(parsed.bookId);
      const combinedText = matched.map((m) => m.verse.text).join(' ');
      const combinedCommentary = matched
        .map((m) => m.verse.commentary)
        .filter(Boolean)
        .join('\n\n');

      return {
        id: `lookup-ot-${parsed.bookId}-${parsed.chapter}-${parsed.startVerse}`,
        question: parsed.rawReference,
        shortTitle: parsed.rawReference,
        topicBackground: `Primary scripture lookup for ${parsed.rawReference} from the Hebrew Bible / Old Testament (${bookMeta?.name ?? parsed.bookName}), accompanied by classical Jamieson-Fausset-Brown commentary.`,
        isCurated: false,
        initialTradition: 'torah',
        traditions: [
          {
            tradition: 'torah',
            traditionName: 'Torah & Old Testament',
            subtitle: `${bookMeta?.name ?? parsed.bookName} Chapter ${parsed.chapter}`,
            verses: [
              {
                id: `ot-${parsed.bookId}-${parsed.chapter}-${parsed.startVerse}`,
                tradition: 'torah',
                book: bookMeta?.name ?? parsed.bookName,
                bookId: parsed.bookId,
                chapter: parsed.chapter,
                verseNumber: parsed.startVerse,
                translation: combinedText,
                historicalContext: `Covenantal and historical text from the Book of ${bookMeta?.name ?? parsed.bookName}, chapter ${parsed.chapter}.`,
                classicalCommentary: combinedCommentary
                  ? `Jamieson-Fausset-Brown: ${combinedCommentary}`
                  : undefined,
              },
            ],
          },
        ],
      };
    }
  }

  // Holy Quran
  if (parsed.type === 'quran') {
    const verses = getSurahVerses(parsed.chapter);
    const matched = verses.filter(
      (v) =>
        v.number >= parsed.startVerse &&
        (parsed.endVerse ? v.number <= parsed.endVerse : v.number === parsed.startVerse)
    );
    if (matched.length > 0) {
      const surahMeta = getSurahMeta(parsed.chapter);
      const combinedArabic = matched.map((m) => m.textArabic).join(' ۝ ');
      const combinedEnglish = matched.map((m) => m.textEnglish).join(' ');
      const combinedTafsir = matched
        .map((m) => m.textTafsir)
        .filter(Boolean)
        .join('\n\n');

      return {
        id: `lookup-quran-${parsed.chapter}-${parsed.startVerse}`,
        question: parsed.rawReference,
        shortTitle: parsed.rawReference,
        topicBackground: `Primary scripture lookup for ${parsed.rawReference} (Surah ${surahMeta?.nameEnglish ?? parsed.chapter}: ${surahMeta?.nameTranslation ?? ''}) from the Holy Quran, accompanied by classical Tafsir al-Jalalayn.`,
        isCurated: false,
        initialTradition: 'quran',
        traditions: [
          {
            tradition: 'quran',
            traditionName: 'The Holy Quran',
            subtitle: `Surah ${surahMeta?.nameEnglish ?? parsed.chapter} (${surahMeta?.nameTranslation ?? ''})`,
            verses: [
              {
                id: `quran-${parsed.chapter}-${parsed.startVerse}`,
                tradition: 'quran',
                book: surahMeta?.nameEnglish ?? `Surah ${parsed.chapter}`,
                chapter: parsed.chapter,
                verseNumber: parsed.startVerse,
                originalText: combinedArabic,
                translation: combinedEnglish,
                historicalContext: `Revealed in the period of Surah ${surahMeta?.nameEnglish ?? parsed.chapter} (${surahMeta?.revelationType ?? 'Meccan'}).`,
                classicalCommentary: combinedTafsir
                  ? `Tafsir al-Jalalayn: ${combinedTafsir}`
                  : undefined,
              },
            ],
          },
        ],
      };
    }
  }

  return null;
}
