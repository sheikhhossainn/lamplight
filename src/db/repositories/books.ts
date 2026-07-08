import { getDb } from '@/db/client';

export type BookRow = {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  synopsis: string;
  totalChapters: number;
  isBundled: boolean;
};

type BookSqlRow = {
  id: string;
  title: string;
  author: string;
  source_language: string;
  synopsis: string;
  total_chapters: number;
  is_bundled: number;
};

function fromSqlRow(row: BookSqlRow): BookRow {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    sourceLanguage: row.source_language,
    synopsis: row.synopsis,
    totalChapters: row.total_chapters,
    isBundled: row.is_bundled === 1,
  };
}

export async function listBooks(): Promise<BookRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookSqlRow>('SELECT * FROM books ORDER BY rowid ASC');
  return rows.map(fromSqlRow);
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BookSqlRow>('SELECT * FROM books WHERE id = ?', [bookId]);
  return row ? fromSqlRow(row) : null;
}
