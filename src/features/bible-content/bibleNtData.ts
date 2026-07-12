import booksData from '../../../assets/bible-nt/books.json';
import versesByBook from '../../../assets/bible-nt/verses.json';

export type BibleNtBookMeta = {
  id: string;
  name: string;
  chapterCount: number;
  meaning: string;
};

export type BibleNtVerse = {
  number: number;
  text: string;
  commentary?: string;
};

type RawBibleBookMeta = Omit<BibleNtBookMeta, 'meaning'>;

const rawBooks = booksData as RawBibleBookMeta[];
const verses = versesByBook as Record<string, Record<string, BibleNtVerse[]>>;

// Short one-line synopsis per book, shown as list-row context — same role as
// the Quran surah list's nameTranslation and the Old Testament list's
// BOOK_MEANINGS. Not sourced from any commentary (those run to full
// paragraphs); hand-written to stay a single short phrase.
const BOOK_MEANINGS: Record<string, string> = {
  MAT: "Jesus as Israel's promised Messiah and King",
  MRK: "Jesus' ministry told through his actions",
  LUK: "A careful account of Jesus' life for the nations",
  JHN: 'Jesus as the eternal Son of God',
  ACT: "The early church's growth from Jerusalem to Rome",
  ROM: 'Salvation by faith, explained systematically',
  '1CO': 'Correcting division and disorder in the Corinthian church',
  '2CO': "Paul defends his ministry and calls for reconciliation",
  GAL: 'Freedom in Christ against a return to the law',
  EPH: "The church as Christ's body, united and equipped",
  PHP: 'Joy and contentment from prison',
  COL: "Christ's supremacy over every rival teaching",
  '1TH': "Encouragement for a young church awaiting Christ's return",
  '2TH': 'Clarifying confusion about the Day of the Lord',
  '1TI': 'Instructions for church order and leadership',
  '2TI': "Paul's final charge to remain faithful",
  TIT: 'Guidance for organizing a new church in Crete',
  PHM: 'An appeal for forgiveness toward a runaway slave',
  HEB: "Christ's superiority over the old covenant system",
  JAS: 'Practical faith proven by works',
  '1PE': 'Hope and endurance through suffering',
  '2PE': "Warning against false teachers, awaiting Christ's return",
  '1JN': 'Assurance of genuine faith and love',
  '2JN': 'A brief warning to walk in truth and love',
  '3JN': 'Commending hospitality, warning against pride',
  JUD: 'A call to contend for the faith against false teachers',
  REV: "Visions of Christ's ultimate victory and a new creation",
};

const books: BibleNtBookMeta[] = rawBooks.map((b) => ({ ...b, meaning: BOOK_MEANINGS[b.id] ?? '' }));

export function listBooks(): BibleNtBookMeta[] {
  return books;
}

export function getBookMeta(bookId: string): BibleNtBookMeta | null {
  return books.find((b) => b.id === bookId) ?? null;
}

// Every verse in the book, in reading order, each tagged with its chapter —
// the verse reader renders this as one continuous scroll with a chapter
// header wherever the chapter number changes, same shape as the Old
// Testament and a Quran surah's flat verse list.
export function getBookVerses(bookId: string): { chapter: number; verse: BibleNtVerse }[] {
  const chapters = verses[bookId];
  if (!chapters) return [];
  const chapterNumbers = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b);
  const flat: { chapter: number; verse: BibleNtVerse }[] = [];
  for (const chapter of chapterNumbers) {
    for (const verse of chapters[String(chapter)]) {
      flat.push({ chapter, verse });
    }
  }
  return flat;
}
