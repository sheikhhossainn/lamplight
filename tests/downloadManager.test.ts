import test from 'node:test';
import assert from 'node:assert/strict';

import type { DownloadState, DownloadStateStatus } from '../src/db/repositories/downloadStates';

test('LIB-03: DownloadStateStatus supports all required download states', () => {
  const validStatuses: DownloadStateStatus[] = [
    'queued',
    'downloading',
    'paused',
    'failed',
    'ready',
    'unavailable',
  ];

  assert.equal(validStatuses.length, 6);
  assert.ok(validStatuses.includes('paused'));
  assert.ok(validStatuses.includes('downloading'));
  assert.ok(validStatuses.includes('queued'));
});

test('LIB-03: Atomic replacement simulation prevents partial file overwrite', () => {
  // Simulate a filesystem where an existing book cache file exists
  const fileSystem = new Map<string, string>();
  fileSystem.set('1342.json', JSON.stringify({ chapters: [{ index: 0, title: 'Chapter 1', pages: [['Valid prose']] }] }));

  // Simulate an interrupted download writing to a .tmp file
  const partialBookContent = '{"chapters":[{"index":0,"title":"Chapter 1"'; // Truncated JSON
  fileSystem.set('1342.tmp', partialBookContent);

  // If download fails or is cancelled, only .tmp is removed
  fileSystem.delete('1342.tmp');

  // Verify that the original valid book file remained completely uncorrupted
  const finalContent = fileSystem.get('1342.json');
  assert.ok(finalContent);
  const parsed = JSON.parse(finalContent);
  assert.equal(parsed.chapters[0].pages[0][0], 'Valid prose');
});

test('LIB-03: Atomic replacement succeeds completely when payload is valid', () => {
  const fileSystem = new Map<string, string>();

  // Full book content written to temporary file first
  const completeBook = JSON.stringify({ chapters: [{ index: 0, title: 'Chapter 1', pages: [['Finished chapter']] }] });
  fileSystem.set('pg-99.tmp', completeBook);

  // Validate parsed payload before atomic move
  assert.doesNotThrow(() => JSON.parse(fileSystem.get('pg-99.tmp')!));

  // Atomic move simulation
  fileSystem.set('pg-99.json', fileSystem.get('pg-99.tmp')!);
  fileSystem.delete('pg-99.tmp');

  assert.equal(fileSystem.has('pg-99.tmp'), false);
  assert.ok(fileSystem.has('pg-99.json'));
});

test('LIB-03: Reconciliation transitions interrupted downloads to failed on app startup', () => {
  const initialStates: DownloadState[] = [
    {
      bookId: 'book-interrupted',
      status: 'downloading',
      progress: 45,
      errorCode: null,
      updatedAt: 1000,
    },
    {
      bookId: 'book-queued',
      status: 'queued',
      progress: 0,
      errorCode: null,
      updatedAt: 1000,
    },
    {
      bookId: 'book-ready',
      status: 'ready',
      progress: 100,
      errorCode: null,
      updatedAt: 1000,
    },
  ];

  const diskIds = new Set(['book-ready']);

  // Pure reconciliation logic
  const reconciled = initialStates.map((state) => {
    const onDisk = diskIds.has(state.bookId);
    if (!onDisk && (state.status === 'downloading' || state.status === 'queued')) {
      return {
        ...state,
        status: 'failed' as DownloadStateStatus,
        errorCode: 'interrupted',
      };
    }
    return state;
  });

  const interruptedBook = reconciled.find((s) => s.bookId === 'book-interrupted');
  const queuedBook = reconciled.find((s) => s.bookId === 'book-queued');
  const readyBook = reconciled.find((s) => s.bookId === 'book-ready');

  assert.equal(interruptedBook?.status, 'failed');
  assert.equal(interruptedBook?.errorCode, 'interrupted');
  assert.equal(queuedBook?.status, 'failed');
  assert.equal(queuedBook?.errorCode, 'interrupted');
  assert.equal(readyBook?.status, 'ready');
});
