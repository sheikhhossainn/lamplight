import { getBookVerses as getNtVerses, listBooks as listNtBooks } from '@/features/bible-content/bibleNtData';
import { getBookVerses as getOtVerses, listBooks as listOtBooks } from '@/features/bible-content/bibleData';
import { getSurahVerses, listSurahs } from '@/features/quran-content/quranData';
import { getBookVerses as getVedasVerses, listBooks as listVedasBooks } from '@/features/vedas-content/vedasData';

export type TableTradition = 'quran' | 'bible-ot' | 'bible-nt' | 'torah' | 'vedas';

// Blind — the table deck never shows book/chapter/verse, only the text, so
// this card shape carries no citation.
export type TableVerseCard = {
  id: string;
  tradition: TableTradition;
  text: string;
};

// Mirrors TORAH_BOOK_IDS in src/app/torah/index.tsx — the Torah has no
// separate dataset, it's Genesis-Deuteronomy filtered from the Bible OT set.
const TORAH_BOOK_IDS = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomQuranVerse(): TableVerseCard {
  const surah = pick(listSurahs());
  const verse = pick(getSurahVerses(surah.number));
  return { id: `quran-${surah.number}-${verse.number}`, tradition: 'quran', text: verse.textEnglish };
}

function randomBibleOtVerse(bookIds: string[] | null, tradition: 'bible-ot' | 'torah'): TableVerseCard {
  const books = bookIds ? listOtBooks().filter((b) => bookIds.includes(b.id)) : listOtBooks();
  const book = pick(books);
  const entry = pick(getOtVerses(book.id));
  return { id: `${tradition}-${book.id}-${entry.chapter}-${entry.verse.number}`, tradition, text: entry.verse.text };
}

function randomBibleNtVerse(): TableVerseCard {
  const book = pick(listNtBooks());
  const entry = pick(getNtVerses(book.id));
  return { id: `bible-nt-${book.id}-${entry.chapter}-${entry.verse.number}`, tradition: 'bible-nt', text: entry.verse.text };
}

function randomVedasVerse(): TableVerseCard {
  const book = pick(listVedasBooks());
  const entry = pick(getVedasVerses(book.id));
  return { id: `vedas-${book.id}-${entry.chapter}-${entry.verse.number}`, tradition: 'vedas', text: entry.verse.text };
}

const PICKERS: Record<TableTradition, () => TableVerseCard> = {
  quran: randomQuranVerse,
  'bible-ot': () => randomBibleOtVerse(null, 'bible-ot'),
  'bible-nt': randomBibleNtVerse,
  torah: () => randomBibleOtVerse(TORAH_BOOK_IDS, 'torah'),
  vedas: randomVedasVerse,
};

// Fixed order the deck cycles through — one card per tradition.
export const TABLE_TRADITION_ORDER: TableTradition[] = ['quran', 'bible-ot', 'bible-nt', 'torah', 'vedas'];

export function buildVerseTable(): TableVerseCard[] {
  return TABLE_TRADITION_ORDER.map((tradition) => PICKERS[tradition]());
}
