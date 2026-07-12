import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';

export type Shelf = {
  id: string;
  name: string;
  createdAt: number;
};

export type ShelfItem = {
  shelfId: string;
  bookId: string;
};

type ShelfSqlRow = { id: string; name: string; created_at: number };
type ShelfItemSqlRow = { shelf_id: string; book_id: string };

export async function listShelves(): Promise<Shelf[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ShelfSqlRow>('SELECT * FROM shelves ORDER BY created_at ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

// Every shelf<->book pairing, for grouping books per shelf in one pass.
export async function listShelfItems(): Promise<ShelfItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ShelfItemSqlRow>('SELECT shelf_id, book_id FROM shelf_items');
  return rows.map((r) => ({ shelfId: r.shelf_id, bookId: r.book_id }));
}

export async function createShelf(name: string, bookIds: string[]): Promise<Shelf> {
  const db = await getDb();
  const shelf: Shelf = { id: generateId(), name: name.trim(), createdAt: Date.now() };
  await db.runAsync('INSERT INTO shelves (id, name, created_at) VALUES (?, ?, ?)', [
    shelf.id,
    shelf.name,
    shelf.createdAt,
  ]);
  await setShelfBooks(shelf.id, bookIds);
  return shelf;
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE shelves SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteShelf(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shelf_items WHERE shelf_id = ?', [id]);
  await db.runAsync('DELETE FROM shelves WHERE id = ?', [id]);
}

export async function addBookToShelf(shelfId: string, bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO shelf_items (shelf_id, book_id, added_at) VALUES (?, ?, ?)', [
    shelfId,
    bookId,
    Date.now(),
  ]);
}

export async function removeBookFromShelf(shelfId: string, bookId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shelf_items WHERE shelf_id = ? AND book_id = ?', [shelfId, bookId]);
}

// Replace a shelf's membership with exactly `bookIds`.
export async function setShelfBooks(shelfId: string, bookIds: string[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync('DELETE FROM shelf_items WHERE shelf_id = ?', [shelfId]);
  for (const bookId of bookIds) {
    await db.runAsync('INSERT OR IGNORE INTO shelf_items (shelf_id, book_id, added_at) VALUES (?, ?, ?)', [
      shelfId,
      bookId,
      now,
    ]);
  }
}
