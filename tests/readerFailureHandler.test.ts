import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyReaderError,
  type ReaderFailureDetails,
} from '../src/features/reader/readerFailureHandler';

test('READER-06: classifies unsupported format errors with library & report issue actions', () => {
  const err = new Error('BookFormatError: Unsupported format or not a Gutenberg text');
  err.name = 'BookFormatError';

  const details = classifyReaderError(err, { bookId: 'book-1', hasTextUrl: true });
  assert.equal(details.code, 'unsupported_format');
  assert.equal(details.title, 'Book Edition Unavailable');
  assert.equal(details.primaryAction.type, 'library');
  assert.equal(details.secondaryAction.type, 'report_issue');
  assert.deepEqual(details.reportContext, {
    code: 'unsupported_format',
    bookId: 'book-1',
    isCustomEpub: false,
  });
});

test('READER-06: classifies missing download / ENOENT cache errors with download action', () => {
  const err = new Error('ENOENT: no such file or directory, open books/1342.json');

  const details = classifyReaderError(err, { bookId: '1342', hasTextUrl: true });
  assert.equal(details.code, 'missing_download');
  assert.equal(details.title, 'Book Not Downloaded');
  assert.equal(details.primaryAction.type, 'redownload');
  assert.equal(details.primaryAction.label, 'Download Book');
  assert.equal(details.secondaryAction.type, 'library');
});

test('READER-06: classifies network timeouts and connection drops with retry action', () => {
  const err = new Error('Network request failed: connection timed out');

  const details = classifyReaderError(err, { bookId: '1342', hasTextUrl: true });
  assert.equal(details.code, 'network_failure');
  assert.equal(details.title, 'Connection Error');
  assert.equal(details.primaryAction.type, 'retry');
  assert.equal(details.secondaryAction.type, 'library');
});

test('READER-06: classifies malformed catalog EPUB with re-download recovery', () => {
  const err = new Error('Zip archive corrupt: invalid spine manifest');

  const details = classifyReaderError(err, { bookId: 'pg-1234', hasTextUrl: true, isCustomEpub: false });
  assert.equal(details.code, 'malformed_epub');
  assert.equal(details.primaryAction.type, 'redownload');
  assert.equal(details.primaryAction.label, 'Re-download Book');
  assert.equal(details.secondaryAction.type, 'report_issue');
});

test('READER-06: classifies malformed user-imported EPUB with file picker recovery', () => {
  const err = new Error('corrupt epub zip headers');

  const details = classifyReaderError(err, { bookId: 'custom-epub-99', isCustomEpub: true });
  assert.equal(details.code, 'malformed_epub');
  assert.equal(details.title, 'Corrupted EPUB File');
  assert.equal(details.primaryAction.type, 'choose_file');
  assert.equal(details.primaryAction.label, 'Choose File Again');
  assert.equal(details.secondaryAction.type, 'report_issue');
  assert.equal(details.reportContext?.isCustomEpub, true);
});

test('READER-06: classifies empty chapters with re-download and report actions', () => {
  const err = new Error('Book loaded with zero chapters or empty chapter list');

  const details = classifyReaderError(err, { bookId: 'bn-empty', hasTextUrl: true });
  assert.equal(details.code, 'empty_chapters');
  assert.equal(details.title, 'No Readable Content');
  assert.equal(details.primaryAction.type, 'redownload');
  assert.equal(details.secondaryAction.type, 'report_issue');
});

test('READER-06: classifies pagination failures with reset typography action', () => {
  const err = new Error('Failed to paginate book layout: zero height content column');

  const details = classifyReaderError(err, { bookId: 'book-complex', hasTextUrl: true });
  assert.equal(details.code, 'pagination_failure');
  assert.equal(details.title, 'Page Layout Error');
  assert.equal(details.primaryAction.type, 'reset_typography');
  assert.equal(details.primaryAction.label, 'Reset Typography');
  assert.equal(details.secondaryAction.type, 'library');
});

test('READER-06: classifies translation failures with retry and read in original actions', () => {
  const err = new Error('Translation worker failed to translate sentence block');

  const details = classifyReaderError(err, { bookId: 'book-trans', hasTextUrl: true });
  assert.equal(details.code, 'translation_failure');
  assert.equal(details.title, 'Translation Unavailable');
  assert.equal(details.primaryAction.type, 'retry');
  assert.equal(details.secondaryAction.type, 'library');
  assert.equal(details.secondaryAction.label, 'Read in Original');
});

test('READER-06: isolates safe telemetry context and does not leak raw book prose', () => {
  const secretProse = 'Chapter 1: It is a truth universally acknowledged that a single man...';
  const err = new Error(`Network failure while streaming: ${secretProse}`);

  const details = classifyReaderError(err, { bookId: 'pride-prejudice', hasTextUrl: true });
  assert.equal(details.code, 'network_failure');
  // Report context only preserves code, bookId, and custom flag
  assert.equal(details.reportContext?.code, 'network_failure');
  assert.equal(details.reportContext?.bookId, 'pride-prejudice');
  assert.equal((details.reportContext as Record<string, unknown>).prose, undefined);
  assert.equal(details.title.includes('truth universally'), false);
  assert.equal(details.message.includes('truth universally'), false);
});
