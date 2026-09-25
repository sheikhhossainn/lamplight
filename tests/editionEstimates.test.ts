import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEditionInfo,
  estimateReadingTime,
  getReadingPaceContext,
} from '../src/features/discovery/editionEstimates';
import type { BookRow } from '../src/db/repositories/books';

test('LIB: getEditionInfo classifies Project Gutenberg books accurately', () => {
  const gutenbergBook: BookRow = {
    id: 'pg-1342',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    sourceLanguage: 'en',
    synopsis: 'Classic romance and social satire.',
    totalChapters: 61,
    isAvailable: true,
    textUrl: 'https://gutenberg.org/1342.txt',
    coverUrl: null,
    gutenbergId: 1342,
    chapter1Anchor: null,
    categories: ['Fiction'],
    isFavorite: false,
  };

  const info = getEditionInfo(gutenbergBook);
  assert.equal(info.edition, 'Project Gutenberg Edition');
  assert.equal(info.provenance, 'EBook #1342');
  assert.equal(info.formatLabel, 'Unabridged Public Domain');
});

test('LIB: getEditionInfo classifies native literature collections correctly', () => {
  const banglaBook: BookRow = {
    id: 'bn-chander-pahar',
    title: 'চাঁদের পাহাড়',
    author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
    sourceLanguage: 'bn',
    synopsis: 'আফ্রিকার রোমাঞ্চকর অভিযানের গল্প।',
    totalChapters: 14,
    isAvailable: true,
    textUrl: 'local',
    coverUrl: null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: ['Adventure'],
    isFavorite: false,
    source: 'bangla_api',
  };

  const infoBn = getEditionInfo(banglaBook);
  assert.equal(infoBn.edition, 'Bangla Sahitya Collection');
  assert.equal(infoBn.provenance, 'Classical Bengal Literary Archive');
  assert.equal(infoBn.formatLabel, 'Original Bengali Script');

  const japaneseBook: BookRow = {
    id: 'ja-kokoro',
    title: 'こゝろ',
    author: '夏目漱石',
    sourceLanguage: 'ja',
    synopsis: '近代日本の名作。',
    totalChapters: 30,
    isAvailable: true,
    textUrl: 'local',
    coverUrl: null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: ['Fiction'],
    isFavorite: false,
    source: 'aozora_bunko',
  };

  const infoJa = getEditionInfo(japaneseBook);
  assert.equal(infoJa.edition, 'Aozora Bunko Literary Edition');
  assert.equal(infoJa.formatLabel, 'Original Japanese Text');

  const importedBook: BookRow = {
    id: 'imported-user-file-123',
    title: 'Custom Upload',
    author: 'Unknown',
    sourceLanguage: 'en',
    synopsis: 'Imported by reader',
    totalChapters: 10,
    isAvailable: true,
    textUrl: 'file:///',
    coverUrl: null,
    gutenbergId: null,
    chapter1Anchor: null,
    categories: [],
    isFavorite: false,
  };

  const infoImported = getEditionInfo(importedBook);
  assert.equal(infoImported.edition, 'Personal Library Import');
  assert.equal(infoImported.formatLabel, 'Imported EPUB Document');
});

test('LIB: estimateReadingTime computes total and remaining time accurately', () => {
  // 10 chapters * 14 min = 140 min = 2h 20m
  const unread = estimateReadingTime(10, 0);
  assert.equal(unread.totalMinutes, 140);
  assert.equal(unread.totalLabel, '~2h 20m');
  assert.equal(unread.remainingMinutes, 140);
  assert.equal(unread.remainingLabel, '~2h 20m total');

  // Half-read book (50%)
  const halfRead = estimateReadingTime(10, 0.5);
  assert.equal(halfRead.remainingMinutes, 70);
  assert.equal(halfRead.remainingLabel, '~1h 10m remaining');

  // Fully completed book (100%)
  const completed = estimateReadingTime(10, 1.0);
  assert.equal(completed.remainingMinutes, 0);
  assert.equal(completed.remainingLabel, 'Completed');
});

test('LIB: getReadingPaceContext estimates finish date according to cadence', () => {
  // 140 min book, 20 min/day -> 7 days
  const pace = getReadingPaceContext(20, 140, 0);
  assert.equal(pace.daysToComplete, 7);
  assert.equal(pace.paceSummary, 'At 20m/day, you will finish in ~7 days.');

  // Completed book
  const donePace = getReadingPaceContext(20, 140, 1.0);
  assert.equal(donePace.paceSummary, 'You have completed this title!');
});
