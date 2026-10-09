import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countScriptChars, getScriptSets, hasScriptCourse } from '../src/features/learn/scripts';

describe('script course data', () => {
  it('has the expected character counts', () => {
    assert.equal(countScriptChars('ja'), 92);
    assert.equal(countScriptChars('ko'), 24);
    assert.equal(countScriptChars('bn'), 46);
    assert.equal(countScriptChars('en'), 0);
  });

  it('has unique characters and a reading for each', () => {
    for (const lang of ['ja', 'ko', 'bn']) {
      for (const set of getScriptSets(lang)) {
        const chars = set.groups.flatMap((g) => g.items);
        assert.equal(new Set(chars.map((c) => c.char)).size, chars.length, `${set.id} has duplicates`);
        for (const c of chars) {
          assert.ok(c.roman && c.say, `${set.id} ${c.char} missing roman/say`);
        }
      }
    }
  });

  it('derives katakana from hiragana', () => {
    const [hira, kata] = getScriptSets('ja');
    assert.equal(hira.groups[0].items[0].char, 'あ');
    assert.equal(kata.groups[0].items[0].char, 'ア');
    assert.equal(kata.groups[9].items[2].char, 'ン');
  });

  it('only offers a course for scripted languages', () => {
    assert.equal(hasScriptCourse('ja'), true);
    assert.equal(hasScriptCourse('en'), false);
  });
});
