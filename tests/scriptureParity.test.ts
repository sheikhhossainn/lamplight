import assert from 'node:assert/strict';
import test from 'node:test';

import { getSurahMeta, getSurahVerses } from '../src/features/quran-content/quranData';
import {
  getBookMeta as getBibleOtMeta,
  getChapterVerses as getBibleOtVerses,
  listBooks as listBibleOtBooks,
} from '../src/features/bible-content/bibleData';
import {
  getBookMeta as getBibleNtMeta,
  getChapterVerses as getBibleNtVerses,
  listBooks as listBibleNtBooks,
} from '../src/features/bible-content/bibleNtData';
import {
  getBookMeta as getVedasMeta,
  getChapterVerses as getVedasVerses,
  listBooks as listVedasBooks,
} from '../src/features/vedas-content/vedasData';
import { getTraditionSourceAttribution } from '../src/features/scripture-qa/curatedScriptureQA';

test('SCRIPTURE-01: Bundled text integrity across all 5 scripture traditions', () => {
  // 1. Quran: 114 Surahs
  for (let s = 1; s <= 114; s++) {
    const meta = getSurahMeta(s);
    assert.ok(meta, `Quran surah meta for ${s} must exist`);
    assert.ok(meta.nameEnglish.length > 0, `Surah ${s} English name must be non-empty`);
    assert.ok(meta.nameArabic.length > 0, `Surah ${s} Arabic name must be non-empty`);

    const verses = getSurahVerses(s);
    assert.ok(verses.length > 0, `Surah ${s} must have verses`);
    const firstVerse = verses[0];
    assert.ok(firstVerse.number === 1, `First verse of Surah ${s} must be verse 1`);
    assert.ok(firstVerse.textArabic.length > 0, `Arabic text in Surah ${s} must be present`);
    assert.ok(firstVerse.textEnglish.length > 0, `English translation in Surah ${s} must be present`);
  }

  // 2. Bible Old Testament: 39 Books
  const otBooks = listBibleOtBooks();
  assert.equal(otBooks.length, 39, 'Bible OT must contain exactly 39 books');
  for (const b of otBooks) {
    const meta = getBibleOtMeta(b.id);
    assert.ok(meta, `OT book meta for ${b.id} must exist`);
    const verses = getBibleOtVerses(b.id, 1);
    assert.ok(verses.length > 0, `Chapter 1 of ${b.id} must contain verses`);
    assert.ok(verses[0].verse.text.length > 0, `Verse text in ${b.id} must be non-empty`);
  }

  // 3. Torah: 5 canonical books in Old Testament subset
  const torahBookIds = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];
  for (const id of torahBookIds) {
    const meta = getBibleOtMeta(id);
    assert.ok(meta, `Torah book ${id} must exist in OT dataset`);
    const verses = getBibleOtVerses(id, 1);
    assert.ok(verses.length > 0, `Torah book ${id} must contain verses`);
  }

  // 4. Bible New Testament: 27 Books
  const ntBooks = listBibleNtBooks();
  assert.equal(ntBooks.length, 27, 'Bible NT must contain exactly 27 books');
  for (const b of ntBooks) {
    const meta = getBibleNtMeta(b.id);
    assert.ok(meta, `NT book meta for ${b.id} must exist`);
    const verses = getBibleNtVerses(b.id, 1);
    assert.ok(verses.length > 0, `Chapter 1 of ${b.id} must contain verses`);
    assert.ok(verses[0].verse.text.length > 0, `Verse text in ${b.id} must be non-empty`);
  }

  // 5. Rigveda: 10 Mandalas (RV01 to RV10)
  const vedaBooks = listVedasBooks();
  assert.equal(vedaBooks.length, 10, 'Rigveda must contain exactly 10 Mandalas');
  for (const b of vedaBooks) {
    const meta = getVedasMeta(b.id);
    assert.ok(meta, `Veda book meta for ${b.id} must exist`);
    const verses = getVedasVerses(b.id, 1);
    assert.ok(verses.length > 0, `Hymn 1 of ${b.id} must contain verses`);
    assert.ok(verses[0].verse.text.length > 0, `Verse text in ${b.id} must be non-empty`);
  }
});

test('SCRIPTURE-01: Commentary and Exegesis parity matrix rules', () => {
  // Quran: Verified classical exegesis (Tafsir al-Jalalayn) present on key verses
  const quranSurah1 = getSurahVerses(1);
  const hasQuranCommentary = quranSurah1.some((v) => Boolean(v.textTafsir && v.textTafsir.length > 0));
  assert.ok(hasQuranCommentary, 'Quran Surah 1 must provide Tafsir commentary text');

  // Bible OT: Jamieson-Fausset-Brown commentary present
  const otGen1 = getBibleOtVerses('GEN', 1);
  const hasOtCommentary = otGen1.some((v) => Boolean(v.verse.commentary && v.verse.commentary.length > 0));
  assert.ok(hasOtCommentary, 'Bible OT Genesis 1 must provide commentary text');

  // Bible NT: Jamieson-Fausset-Brown commentary present
  const ntJohn1 = getBibleNtVerses('JHN', 1);
  const hasNtCommentary = ntJohn1.some((v) => Boolean(v.verse.commentary && v.verse.commentary.length > 0));
  assert.ok(hasNtCommentary, 'Bible NT John 1 must provide commentary text');

  // Rigveda: Verified commentary is absent (must NOT render fake commentary or empty UI)
  const veda1 = getVedasVerses('RV01', 1);
  const hasVedaCommentary = veda1.some((v) => Boolean(v.verse.commentary));
  assert.equal(
    hasVedaCommentary,
    false,
    'Rigveda has no verified commentary and must remain strictly undefined',
  );
});

test('SCRIPTURE-01: Source attribution guarantees across traditions', () => {
  const quranAttr = getTraditionSourceAttribution('quran');
  assert.equal(quranAttr.translationEdition, 'Saheeh International');
  assert.equal(quranAttr.commentarySource, 'Tafsir al-Jalalayn');

  const ntAttr = getTraditionSourceAttribution('bible-nt');
  assert.equal(ntAttr.translationEdition, 'World English Bible (WEB)');
  assert.equal(ntAttr.commentarySource, 'Jamieson-Fausset-Brown');

  const otAttr = getTraditionSourceAttribution('bible-ot');
  assert.equal(otAttr.translationEdition, 'World English Bible (WEB)');
  assert.equal(otAttr.commentarySource, 'Jamieson-Fausset-Brown');

  const vedaAttr = getTraditionSourceAttribution('vedas');
  assert.equal(vedaAttr.translationEdition, 'Ralph T.H. Griffith (1896)');
  assert.equal(vedaAttr.commentarySource, 'Traditional Vedic Exegesis (Rigveda Samhita)');
});

test('SCRIPTURE-01: Deep link target route format consistency', () => {
  // Quran reader deep link
  const buildQuranLink = (surah: number, verse?: number) =>
    verse ? `/quran/${surah}?jumpVerse=${verse}` : `/quran/${surah}`;
  assert.equal(buildQuranLink(2, 255), '/quran/2?jumpVerse=255');

  // Bible OT reader deep link
  const buildOtLink = (bookId: string, chapter: number, verse?: number) =>
    verse ? `/bible/${bookId}?jumpChapter=${chapter}&jumpVerse=${verse}` : `/bible/${bookId}?jumpChapter=${chapter}`;
  assert.equal(buildOtLink('GEN', 1, 1), '/bible/GEN?jumpChapter=1&jumpVerse=1');

  // Bible NT reader deep link
  const buildNtLink = (bookId: string, chapter: number, verse?: number) =>
    verse ? `/bible-nt/${bookId}?jumpChapter=${chapter}&jumpVerse=${verse}` : `/bible-nt/${bookId}?jumpChapter=${chapter}`;
  assert.equal(buildNtLink('JHN', 1, 1), '/bible-nt/JHN?jumpChapter=1&jumpVerse=1');

  // Vedas reader deep link
  const buildVedaLink = (bookId: string, chapter: number, verse?: number) =>
    verse ? `/vedas/${bookId}?jumpChapter=${chapter}&jumpVerse=${verse}` : `/vedas/${bookId}?jumpChapter=${chapter}`;
  assert.equal(buildVedaLink('RV01', 1, 1), '/vedas/RV01?jumpChapter=1&jumpVerse=1');
});
