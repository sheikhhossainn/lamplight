import booksData from '../../../assets/bible/books.json';
import versesByBook from '../../../assets/bible/verses.json';

export type BibleBookMeta = {
  id: string;
  name: string;
  chapterCount: number;
  meaning: string;
};

export type BibleVerse = {
  number: number;
  text: string;
  commentary?: string;
};

type RawBibleBookMeta = Omit<BibleBookMeta, 'meaning'>;

const rawBooks = booksData as RawBibleBookMeta[];
const verses = versesByBook as Record<string, Record<string, BibleVerse[]>>;

// Short one-line synopsis per book, shown as list-row context — same role as
// the Quran surah list's nameTranslation. Not sourced from any commentary
// (those run to full paragraphs); hand-written to stay a single short phrase.
const BOOK_MEANINGS: Record<string, string> = {
  GEN: 'Creation, the fall, and the patriarchs',
  EXO: "Israel's exodus from Egypt and the giving of the Law",
  LEV: 'Priestly law and instructions for holy living',
  NUM: "Israel's wilderness census and forty years of wandering",
  DEU: "Moses' farewell sermons renewing the covenant",
  JOS: 'Conquest and division of the Promised Land',
  JDG: 'Cycles of sin, oppression, and deliverance under the judges',
  RUT: "A Moabite widow's loyalty and redemption",
  '1SA': 'Samuel, Saul, and the rise of King David',
  '2SA': "David's reign over a united Israel",
  '1KI': "Solomon's kingdom and the divided monarchy begins",
  '2KI': 'The decline and fall of Israel and Judah',
  '1CH': "Genealogies and David's reign, retold for postexilic Israel",
  '2CH': "Solomon's temple and the kings of Judah",
  EZR: 'Return from exile and rebuilding the temple',
  NEH: "Rebuilding Jerusalem's walls under Nehemiah",
  EST: 'A Jewish queen saves her people in Persia',
  JOB: "A righteous man's suffering and God's sovereignty",
  PSA: "Israel's songs and prayers of worship",
  PRO: 'Wisdom sayings for a godly life',
  ECC: "The search for meaning 'under the sun'",
  SNG: 'A love song between bride and bridegroom',
  ISA: 'Judgment, comfort, and the promised Messiah',
  JER: 'Warnings of judgment on Judah before the exile',
  LAM: "Mourning over Jerusalem's destruction",
  EZK: 'Visions of judgment and restoration in exile',
  DAN: 'Faithfulness in exile and visions of the end times',
  HOS: "God's faithful love for unfaithful Israel",
  JOL: 'A locust plague and the coming Day of the Lord',
  AMO: "A call for justice against Israel's sin",
  OBA: "Judgment on Edom for its pride",
  JON: 'A reluctant prophet sent to Nineveh',
  MIC: 'Judgment on Israel and hope of a coming ruler',
  NAM: 'Judgment pronounced on Nineveh',
  HAB: 'A prophet questions God amid injustice',
  ZEP: 'Warning of the Day of the Lord and future restoration',
  HAG: 'A call to rebuild the temple',
  ZEC: 'Visions of restoration and the coming Messiah',
  MAL: 'A final call to covenant faithfulness before the Messiah',
};

const books: BibleBookMeta[] = rawBooks.map((b) => ({ ...b, meaning: BOOK_MEANINGS[b.id] ?? '' }));

export function listBooks(): BibleBookMeta[] {
  return books;
}

export function getBookMeta(bookId: string): BibleBookMeta | null {
  return books.find((b) => b.id === bookId) ?? null;
}

// Every verse in the book, in reading order, each tagged with its chapter —
// the verse reader renders this as one continuous scroll with a chapter
// header wherever the chapter number changes, same shape as a Quran surah's
// flat verse list.
export function getBookVerses(bookId: string): { chapter: number; verse: BibleVerse }[] {
  const chapters = verses[bookId];
  if (!chapters) return [];
  const chapterNumbers = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b);
  const flat: { chapter: number; verse: BibleVerse }[] = [];
  for (const chapter of chapterNumbers) {
    for (const verse of chapters[String(chapter)]) {
      flat.push({ chapter, verse });
    }
  }
  return flat;
}
