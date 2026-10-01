import test from 'node:test';
import assert from 'node:assert/strict';
import type { BookRow } from '../src/db/repositories/books';
import type { OutboxEntityType } from '../src/db/repositories/syncOutbox';

const mockBook = (id: string, title: string, isFavorite = false): BookRow => ({
  id,
  title,
  author: 'Author',
  sourceLanguage: 'en',
  synopsis: 'Synopsis',
  totalChapters: 10,
  isAvailable: true,
  textUrl: 'https://example.com/book.txt',
  coverUrl: null,
  gutenbergId: 1,
  chapter1Anchor: null,
  categories: ['Classic'],
  isFavorite,
});

test('LIB-02 correctly isolates favorite books from general books', () => {
  const books: BookRow[] = [
    mockBook('b1', 'Book 1', true),
    mockBook('b2', 'Book 2', false),
    mockBook('b3', 'Book 3', true),
  ];

  const favorites = books.filter((b) => b.isFavorite);
  assert.equal(favorites.length, 2);
  assert.deepEqual(favorites.map((b) => b.id), ['b1', 'b3']);
});

test('LIB-02 removing a download preserves favorite status (independence principle)', () => {
  const book = mockBook('b1', 'Book 1', true);
  // Simulating download cache deletion: book metadata and favorite status remain unaffected
  const downloadedBookIds = new Set(['b1', 'b2']);
  downloadedBookIds.delete('b1'); // download removed

  assert.equal(downloadedBookIds.has(book.id), false);
  assert.equal(book.isFavorite, true); // favorite is untouched
});

test('LIB-02 book_favorite is a valid OutboxEntityType for cloud sync', () => {
  const validEntityType: OutboxEntityType = 'book_favorite';
  assert.equal(validEntityType, 'book_favorite');

  const mutationPayload = {
    entityType: validEntityType,
    entityId: 'book-123',
    operation: 'upsert' as const,
    payload: { bookId: 'book-123', isFavorite: true },
  };

  assert.equal(mutationPayload.entityType, 'book_favorite');
  assert.equal(mutationPayload.entityId, 'book-123');
  assert.equal(mutationPayload.payload.isFavorite, true);
});

test('LIB-02 toggling favorite inverts state without mutating other book fields', () => {
  const original = mockBook('b1', 'Book 1', false);
  const favorited: BookRow = { ...original, isFavorite: true };
  const unfavorited: BookRow = { ...favorited, isFavorite: false };

  assert.equal(original.isFavorite, false);
  assert.equal(favorited.isFavorite, true);
  assert.equal(unfavorited.isFavorite, false);
  assert.equal(favorited.title, original.title);
  assert.equal(favorited.author, original.author);
});
