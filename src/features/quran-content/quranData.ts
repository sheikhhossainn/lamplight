import surahsData from '../../../assets/quran/surahs.json';
import versesBySurah from '../../../assets/quran/verses.json';

export type QuranSurahMeta = {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslation: string;
  revelationType: string;
  verseCount: number;
};

export type QuranVerse = {
  number: number;
  textArabic: string;
  textEnglish: string;
  textTransliteration: string;
  textTafsir: string;
};

const surahs = surahsData as QuranSurahMeta[];
const verses = versesBySurah as Record<string, QuranVerse[]>;

export function listSurahs(): QuranSurahMeta[] {
  return surahs;
}

export function getSurahMeta(surahNumber: number): QuranSurahMeta | null {
  return surahs.find((s) => s.number === surahNumber) ?? null;
}

export function getSurahVerses(surahNumber: number): QuranVerse[] {
  return verses[String(surahNumber)] ?? [];
}
