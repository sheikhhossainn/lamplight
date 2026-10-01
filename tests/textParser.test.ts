import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBookText, BookFormatError } from '../src/features/content-ingestion/textParser.ts';

test('textParser Project Gutenberg ingestion', async (t) => {
  const sampleGutenbergText = `
The Project Gutenberg eBook of Sample Book, by Author Name

This eBook is for the use of anyone anywhere...

*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE BOOK ***

CHAPTER I

It is a truth universally acknowledged that a reader in search of peace must find a quiet room.
The afternoon light slanted through the window, amber and soft across the worn wooden desk.

The words rested on the page waiting to be read.

CHAPTER II

The following morning came with rain against the glass.
Every shadow in the room felt deep and still, inviting further contemplation.

CHAPTER III

By the third day, the entire story had taken root in the mind.
Silence was no longer empty; it was filled with thoughts and reflections.

*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE BOOK ***

A note from Project Gutenberg...
`;

  await t.test('strips Gutenberg header/footer and extracts chapters', () => {
    const book = parseBookText(sampleGutenbergText, { title: 'Sample Book' });
    assert.equal(book.chapters.length, 3);
    assert.equal(book.chapters[0].title, 'Chapter 1');
    assert.equal(book.chapters[1].title, 'Chapter 2');
    assert.equal(book.chapters[2].title, 'Chapter 3');
    assert.equal(book.chapters[0].pages.length > 0, true);
    assert.equal(book.chapters[0].pages[0].length > 0, true);
    assert.equal(book.usedFallbackSplit, false);
  });

  await t.test('throws BookFormatError on empty or invalid text', () => {
    assert.throws(
      () => parseBookText('', { title: 'Empty Book' }),
      (err: unknown) => err instanceof BookFormatError,
    );
    assert.throws(
      () => parseBookText('   \n\n\t  ', { title: 'Whitespace Book' }),
      (err: unknown) => err instanceof BookFormatError,
    );
  });

  await t.test('fallback when no standard chapter headings match creates a single chapter', () => {
    const rawNoChapters = `
*** START OF THE PROJECT GUTENBERG EBOOK ESSAY ***

This is a single long philosophical essay without formal chapter headings.
It continues for several paragraphs discussing art, memory, and literature.

Another paragraph elaborating on the themes of solitude and reflection.

*** END OF THE PROJECT GUTENBERG EBOOK ESSAY ***
`;
    const book = parseBookText(rawNoChapters, { title: 'Essay' });
    assert.equal(book.chapters.length, 1);
    assert.equal(book.chapters[0].title, 'Part 1');
    assert.equal(book.usedFallbackSplit, true);
    assert.equal(book.chapters[0].pages.length, 1);
  });
});
