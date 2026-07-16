import booksData from '../../../assets/vedas/books.json';
import versesByBook from '../../../assets/vedas/verses.json';

export type VedasBookMeta = {
  id: string;
  name: string;
  chapterCount: number;
  meaning: string;
};

export type VedasVerse = {
  number: number;
  text: string;
  commentary?: string;
};

type RawVedasBookMeta = Omit<VedasBookMeta, 'meaning'>;

const rawBooks = booksData as RawVedasBookMeta[];
const verses = versesByBook as Record<string, Record<string, VedasVerse[]>>;

const BOOK_MEANINGS: Record<string, string> = {
  'RV01': 'Hymns to Agni, Indra, Varuna, and other deities by various sages',
  'RV02': 'Hymns chiefly by the sage Gritsamada',
  'RV03': 'Hymns chiefly by Visvamitra, containing the Gayatri Mantra',
  'RV04': 'Hymns chiefly by Vamadeva, focusing on Agni and Indra',
  'RV05': 'Hymns chiefly by the Atri clan',
  'RV06': 'Hymns chiefly by Bharadvaja',
  'RV07': 'Hymns chiefly by Vasistha',
  'RV08': 'Hymns chiefly by the Kanva clan, with Pragatha strophes',
  'RV09': 'Hymns entirely dedicated to Soma Pavamana (the purified drink)',
  'RV10': 'Later hymns containing philosophical, cosmic, and marriage verses',
};

const books: VedasBookMeta[] = rawBooks.map((b) => ({ ...b, meaning: BOOK_MEANINGS[b.id] ?? '' }));

export function listBooks(): VedasBookMeta[] {
  return books;
}

export function getBookMeta(bookId: string): VedasBookMeta | null {
  return books.find((b) => b.id === bookId) ?? null;
}

export function getBookVerses(bookId: string): { chapter: number; verse: VedasVerse }[] {
  const chapters = verses[bookId];
  if (!chapters) return [];
  const chapterNumbers = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b);
  const flat: { chapter: number; verse: VedasVerse }[] = [];
  for (const chapter of chapterNumbers) {
    for (const verse of chapters[String(chapter)]) {
      flat.push({ chapter, verse });
    }
  }
  return flat;
}
