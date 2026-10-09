import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  transliterate,
  isApproximateSound,
  getTransliterationNote,
  APPROXIMATE_NOTE_BN,
} from '../src/features/learn/transliterate';

describe('Japanese to Bangla & Romaji transliteration', () => {
  it('transliterates basic hiragana vowels to Bangla script', () => {
    assert.equal(transliterate('あ', 'bn'), 'আ');
    assert.equal(transliterate('い', 'bn'), 'ই');
    assert.equal(transliterate('う', 'bn'), 'উ');
    assert.equal(transliterate('え', 'bn'), 'এ');
    assert.equal(transliterate('お', 'bn'), 'ও');
  });

  it('transliterates consonant rows accurately', () => {
    assert.equal(transliterate('か', 'bn'), 'কা');
    assert.equal(transliterate('き', 'bn'), 'কি');
    assert.equal(transliterate('く', 'bn'), 'কু');
    assert.equal(transliterate('け', 'bn'), 'কে');
    assert.equal(transliterate('こ', 'bn'), 'কো');

    assert.equal(transliterate('さ', 'bn'), 'সা');
    assert.equal(transliterate('し', 'bn'), 'শি');
    assert.equal(transliterate('す', 'bn'), 'সু');

    assert.equal(transliterate('た', 'bn'), 'তা');
    assert.equal(transliterate('ち', 'bn'), 'চি');
    assert.equal(transliterate('て', 'bn'), 'তে');
    assert.equal(transliterate('と', 'bn'), 'তো');
  });

  it('transliterates katakana matching hiragana readings', () => {
    assert.equal(transliterate('ア', 'bn'), 'আ');
    assert.equal(transliterate('カ', 'bn'), 'কা');
    assert.equal(transliterate('シ', 'bn'), 'শি');
    assert.equal(transliterate('タ', 'bn'), 'তা');
  });

  it('transliterates dakuten and handakuten', () => {
    assert.equal(transliterate('が', 'bn'), 'গা');
    assert.equal(transliterate('ぎ', 'bn'), 'গি');
    assert.equal(transliterate('ぱ', 'bn'), 'পা');
    assert.equal(transliterate('ぴ', 'bn'), 'পি');
    assert.equal(transliterate('ば', 'bn'), 'বা');
  });

  it('transliterates yoon combinations (small ya/yu/yo)', () => {
    assert.equal(transliterate('きゃ', 'bn'), 'ক্যা');
    assert.equal(transliterate('しゃ', 'bn'), 'শা');
    assert.equal(transliterate('ちゃ', 'bn'), 'চা');
    assert.equal(transliterate('キャ', 'bn'), 'ক্যা');
    assert.equal(transliterate('シャ', 'bn'), 'শা');
  });

  it('handles small tsu doubling', () => {
    const romaji = transliterate('かって', 'en');
    assert.equal(romaji, 'katte');

    const bn = transliterate('かって', 'bn');
    assert.ok(bn.includes('ৎ') || bn.includes('ত্'));
  });

  it('handles syllabic n before bmp consonants', () => {
    assert.equal(transliterate('さんぽ', 'en'), 'sampo');
    assert.equal(transliterate('せんせい', 'en'), 'sensei');
  });

  it('identifies approximate sounds and provides the honest Bangla note', () => {
    assert.equal(isApproximateSound('つ'), true);
    assert.equal(isApproximateSound('ふ'), true);
    assert.equal(isApproximateSound('ざ'), true);
    assert.equal(isApproximateSound('か'), false);

    assert.equal(getTransliterationNote('つ', 'bn'), APPROXIMATE_NOTE_BN);
    assert.equal(getTransliterationNote('か', 'bn'), null);
    assert.equal(getTransliterationNote('つ', 'en'), null);
  });

  it('transliterates full words in Japanese', () => {
    assert.equal(transliterate('ねこ', 'bn'), 'নেকো');
    assert.equal(transliterate('いぬ', 'bn'), 'ইনু');
    assert.equal(transliterate('くるま', 'bn'), 'কুরুমা');
  });
});
