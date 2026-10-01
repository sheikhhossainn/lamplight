import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalRecommendations,
  type LocalRecommendation,
} from '../src/features/discovery/localRecommendations';
import type { BookRow } from '../src/db/repositories/books';
import type { ReadingPosition } from '../src/db/repositories/readingPosition';

const mockBook = (overrides: Partial<BookRow>): BookRow => ({
  id: 'book-1',
  title: 'Test Book',
  author: 'Author A',
  sourceLanguage: 'en',
  synopsis: 'Synopsis',
  totalChapters: 20,
  isAvailable: true,
  textUrl: 'https://example.com/book.txt',
  coverUrl: null,
  gutenbergId: 100,
  chapter1Anchor: null,
  categories: ['Classic', 'Fiction'],
  isFavorite: false,
  ...overrides,
});

test('LIB-04 returns empty array when given no books', () => {
  const recs = getLocalRecommendations([], []);
  assert.deepEqual(recs, []);
});

test('LIB-04 excludes unavailable books and already completed books', () => {
  const books: BookRow[] = [
    mockBook({ id: 'b1', title: 'Finished Book', totalChapters: 10, isAvailable: true }),
    mockBook({ id: 'b2', title: 'Unavailable Book', totalChapters: 10, isAvailable: false }),
    mockBook({ id: 'b3', title: 'Available Candidate', totalChapters: 10, isAvailable: true }),
  ];
  const positions: ReadingPosition[] = [
    { bookId: 'b1', chapterIndex: 9, pageIndex: 0, percentComplete: 1.0, updatedAt: 1000 },
  ];

  const recs = getLocalRecommendations(books, positions);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].book.id, 'b3');
});

test('LIB-04 generates "Because you finished..." when candidate matches completed book category', () => {
  const books: BookRow[] = [
    mockBook({
      id: 'b1',
      title: 'Great Expectations',
      author: 'Charles Dickens',
      categories: ['Victorian', 'Drama'],
      isAvailable: true,
    }),
    mockBook({
      id: 'b2',
      title: 'Bleak House',
      author: 'Other Author',
      categories: ['Victorian'],
      isAvailable: true,
    }),
  ];
  const positions: ReadingPosition[] = [
    { bookId: 'b1', chapterIndex: 20, pageIndex: 0, percentComplete: 0.99, updatedAt: 2000 },
  ];

  const recs = getLocalRecommendations(books, positions);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].book.id, 'b2');
  assert.match(recs[0].reason, /Because you finished Great Expectations/);
});

test('LIB-04 generates "Continue this author" when candidate shares author with finished/familiar book', () => {
  const books: BookRow[] = [
    mockBook({
      id: 'b1',
      title: 'Metamorphosis',
      author: 'Franz Kafka',
      categories: ['Philosophy'],
      isAvailable: true,
    }),
    mockBook({
      id: 'b2',
      title: 'The Trial',
      author: 'Franz Kafka',
      categories: ['Philosophy', 'Fiction'],
      isAvailable: true,
    }),
  ];
  const positions: ReadingPosition[] = [
    { bookId: 'b1', chapterIndex: 5, pageIndex: 0, percentComplete: 0.99, updatedAt: 2000 },
  ];

  const recs = getLocalRecommendations(books, positions);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].book.id, 'b2');
  assert.match(recs[0].reason, /Continue this author/);
});

test('LIB-04 generates "A shorter read for tonight" when reader has short average sessions and book is compact', () => {
  const books: BookRow[] = [
    mockBook({
      id: 'b1',
      title: 'Long Book',
      categories: ['Fiction'],
      totalChapters: 40,
      isAvailable: true,
    }),
    mockBook({
      id: 'b2',
      title: 'Short Tale',
      author: 'Author B',
      categories: ['Fiction'],
      totalChapters: 4,
      isAvailable: true,
    }),
  ];
  const positions: ReadingPosition[] = [
    { bookId: 'b1', chapterIndex: 2, pageIndex: 0, percentComplete: 0.05, updatedAt: 1000 },
  ];

  // Average session of 15 minutes (900 seconds)
  const recentSessions = [
    { durationSeconds: 900, startedAt: 1000, bookId: 'b1' },
    { durationSeconds: 600, startedAt: 2000, bookId: 'b1' },
  ];

  const recs = getLocalRecommendations(books, positions, { recentSessions });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].book.id, 'b2');
  assert.equal(recs[0].reason, 'A shorter read for tonight');
});

test('LIB-04 generates "Practice-friendly books at your level" for matching target language with concise chapters', () => {
  const books: BookRow[] = [
    mockBook({
      id: 'b1',
      title: 'English Book',
      sourceLanguage: 'en',
      totalChapters: 30,
      isAvailable: true,
    }),
    mockBook({
      id: 'b2',
      title: 'Gitanjali',
      sourceLanguage: 'bn',
      categories: ['Poetry'],
      totalChapters: 8,
      isAvailable: true,
    }),
  ];

  const recs = getLocalRecommendations(books, [], {
    targetLanguage: 'bn',
  });

  assert.equal(recs.length >= 1, true);
  const bengaliRec = recs.find((r) => r.book.id === 'b2');
  assert.ok(bengaliRec);
  assert.equal(bengaliRec.reason, 'Practice-friendly books at your level');
});

test('LIB-04 excludes dismissed books from recommendation list', () => {
  const books: BookRow[] = [
    mockBook({ id: 'b1', title: 'Book 1', isAvailable: true }),
    mockBook({ id: 'b2', title: 'Book 2', isAvailable: true }),
  ];

  const recs = getLocalRecommendations(books, [], {
    dismissedBookIds: new Set(['b1']),
  });

  assert.equal(recs.some((r) => r.book.id === 'b1'), false);
  assert.equal(recs.some((r) => r.book.id === 'b2'), true);
});
