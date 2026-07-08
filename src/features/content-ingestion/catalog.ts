export type BookSourceFormat = 'gutenberg-json' | 'unavailable';

export type BookCatalogEntry = {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  isBundled: boolean;
  sourceFormat: BookSourceFormat;
};

export type BookPage = string[]; // ordered paragraphs

export type BookChapter = {
  index: number;
  title: string;
  pages: BookPage[];
};

export type IngestedBook = {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  isBundled: boolean;
  chapters: BookChapter[];
};

// Metro requires static require() paths, so bundled book text is mapped
// explicitly rather than loaded by dynamic id. Add an entry here whenever
// scripts/ingest-books.mjs (fetching from the public Gutendex API) produces a
// new book JSON. This is the single source of truth — the shelf catalog below
// is derived from it, not hand-maintained separately.
const BUNDLED_BOOK_TEXT: Record<string, IngestedBook> = {
  'pride-and-prejudice': require('../../../assets/books/pride-and-prejudice.json'),
  'don-quixote': require('../../../assets/books/don-quixote.json'),
  'the-odyssey': require('../../../assets/books/the-odyssey.json'),
  'anna-karenina': require('../../../assets/books/anna-karenina.json'),
  'crime-and-punishment': require('../../../assets/books/crime-and-punishment.json'),
};

export function getBundledBookText(bookId: string): IngestedBook | null {
  return BUNDLED_BOOK_TEXT[bookId] ?? null;
}

export const BOOK_CATALOG: BookCatalogEntry[] = Object.values(BUNDLED_BOOK_TEXT).map((book) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  sourceLanguage: book.sourceLanguage,
  synopsis: book.synopsis,
  totalChapters: book.totalChapters,
  isBundled: book.isBundled,
  sourceFormat: 'gutenberg-json',
}));
