import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportNotesToMarkdown,
  exportNotesToJson,
  MAX_NOTE_LENGTH,
  type ReaderNoteWithBook,
} from '../src/db/repositories/readerNotes.ts';

test('readerNotes export and formatting', async (t) => {
  const sampleNotes: ReaderNoteWithBook[] = [
    {
      id: 'note_1',
      bookId: 'pride-and-prejudice',
      bookTitle: 'Pride and Prejudice',
      chapterIndex: 0,
      pageIndex: 2,
      noteText: 'A brilliant observation on social conventions and quiet irony.',
      createdAt: 1750000000000,
      updatedAt: 1750000000000,
    },
    {
      id: 'note_2',
      bookId: 'pride-and-prejudice',
      bookTitle: 'Pride and Prejudice',
      chapterIndex: 2,
      pageIndex: 5,
      noteText: 'The dialogue here captures the tension between dignity and vulnerability.',
      createdAt: 1750010000000,
      updatedAt: 1750010000000,
    },
    {
      id: 'note_3',
      bookId: 'the-odyssey',
      bookTitle: 'The Odyssey',
      chapterIndex: 0,
      pageIndex: 0,
      noteText: 'The opening invocation sets a contemplative tone.',
      createdAt: 1750020000000,
      updatedAt: 1750020000000,
    },
  ];

  await t.test('exportNotesToMarkdown groups notes by book and formats chapter/page', () => {
    const md = exportNotesToMarkdown(sampleNotes);
    assert.equal(md.includes('# Lamplight Reading Notes'), true);
    assert.equal(md.includes('## Pride and Prejudice'), true);
    assert.equal(md.includes('## The Odyssey'), true);
    assert.equal(md.includes('Chapter 1, Page 3'), true);
    assert.equal(md.includes('Chapter 3, Page 6'), true);
    assert.equal(md.includes('A brilliant observation on social conventions'), true);
  });

  await t.test('exportNotesToJson exports valid JSON array with ISO dates', () => {
    const jsonStr = exportNotesToJson(sampleNotes);
    const parsed = JSON.parse(jsonStr);
    assert.equal(Array.isArray(parsed), true);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].id, 'note_1');
    assert.equal(parsed[0].bookTitle, 'Pride and Prejudice');
    assert.equal(typeof parsed[0].createdAt, 'string');
    assert.equal(parsed[0].createdAt.includes('T'), true);
  });

  await t.test('MAX_NOTE_LENGTH is capped at 5000 characters', () => {
    assert.equal(MAX_NOTE_LENGTH, 5000);
  });
});
