import { generateId } from '@/lib/id';

async function getDatabase() {
  const { getDb } = await import('@/db/client');
  return getDb();
}

export type ReaderNote = {
  id: string;
  bookId: string;
  chapterIndex: number;
  pageIndex: number;
  noteText: string;
  createdAt: number;
  updatedAt: number;
};

type ReaderNoteSqlRow = {
  id: string;
  book_id: string;
  chapter_index: number;
  page_index: number;
  note_text: string;
  created_at: number;
  updated_at: number;
};

function fromSqlRow(row: ReaderNoteSqlRow): ReaderNote {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterIndex: row.chapter_index,
    pageIndex: row.page_index,
    noteText: row.note_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const MAX_NOTE_LENGTH = 5000;

export type ReaderNoteWithBook = ReaderNote & {
  bookTitle?: string;
  bookAuthor?: string;
  coverImage?: string;
};

export async function listReaderNotesForBook(bookId: string): Promise<ReaderNote[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReaderNoteSqlRow>(
    'SELECT * FROM reader_notes WHERE book_id = ? ORDER BY updated_at DESC',
    [bookId],
  );
  return rows.map(fromSqlRow);
}

export async function listAllReaderNotes(): Promise<ReaderNoteWithBook[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReaderNoteSqlRow & { book_title?: string; book_author?: string; cover_image?: string }>(
    `SELECT n.*, b.title AS book_title, b.author AS book_author, b.cover_image
     FROM reader_notes n
     LEFT JOIN books b ON b.id = n.book_id
     ORDER BY n.updated_at DESC`,
  );
  return rows.map((row) => ({
    ...fromSqlRow(row),
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    coverImage: row.cover_image,
  }));
}

export async function createReaderNote(input: Omit<ReaderNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReaderNote> {
  const db = await getDatabase();
  const id = generateId();
  const now = Date.now();
  const trimmedText = input.noteText.trim().slice(0, MAX_NOTE_LENGTH);
  await db.runAsync(
    `INSERT INTO reader_notes (id, book_id, chapter_index, page_index, note_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.bookId, input.chapterIndex, input.pageIndex, trimmedText, now, now],
  );
  const note: ReaderNote = { ...input, noteText: trimmedText, id, createdAt: now, updatedAt: now };
  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation({ entityType: 'reader_note', entityId: id, operation: 'upsert', payload: note }, db);
  } catch { /* sync enqueue non-fatal */ }
  return note;
}

export async function deleteReaderNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reader_notes WHERE id = ?', [id]);
  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation({ entityType: 'reader_note', entityId: id, operation: 'delete', payload: { id } }, db);
  } catch { /* sync enqueue non-fatal */ }
}

export async function updateReaderNote(id: string, noteText: string): Promise<ReaderNote | null> {
  const trimmed = noteText.trim().slice(0, MAX_NOTE_LENGTH);
  if (!trimmed) return null;
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync('UPDATE reader_notes SET note_text = ?, updated_at = ? WHERE id = ?', [trimmed, now, id]);
  const row = await db.getFirstAsync<ReaderNoteSqlRow>('SELECT * FROM reader_notes WHERE id = ?', [id]);
  if (!row) return null;
  const note = fromSqlRow(row);
  try {
    const { enqueueMutation } = await import('./syncOutbox');
    await enqueueMutation({ entityType: 'reader_note', entityId: id, operation: 'upsert', payload: note }, db);
  } catch { /* sync enqueue non-fatal */ }
  return note;
}

export function exportNotesToMarkdown(notes: ReaderNoteWithBook[]): string {
  let md = '# Lamplight Reading Notes\n\n';
  const grouped: Record<string, ReaderNoteWithBook[]> = {};
  for (const note of notes) {
    const title = note.bookTitle || note.bookId;
    (grouped[title] ??= []).push(note);
  }
  for (const [title, bookNotes] of Object.entries(grouped)) {
    md += `## ${title}\n\n`;
    for (const note of bookNotes) {
      const date = new Date(note.updatedAt).toLocaleDateString();
      md += `### Chapter ${note.chapterIndex + 1}, Page ${note.pageIndex + 1} (${date})\n\n`;
      md += `${note.noteText}\n\n`;
    }
  }
  return md;
}

export function exportNotesToJson(notes: ReaderNoteWithBook[]): string {
  return JSON.stringify(
    notes.map((n) => ({
      id: n.id,
      bookId: n.bookId,
      bookTitle: n.bookTitle,
      chapterIndex: n.chapterIndex,
      pageIndex: n.pageIndex,
      noteText: n.noteText,
      createdAt: new Date(n.createdAt).toISOString(),
      updatedAt: new Date(n.updatedAt).toISOString(),
    })),
    null,
    2,
  );
}
