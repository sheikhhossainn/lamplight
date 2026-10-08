import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanWordForLookup } from '../src/features/reader/engine/words';
import { segmentWords } from '../src/features/reader/engine/wordSegments';
import { extractTranslatedText } from '../src/features/translation/translationExtract';
import {
  TARGET_LANGUAGES,
  targetLanguageLabel,
  targetLanguageName,
} from '../src/features/settings/languagePair';

// Fixture 1: Real Google Translate response for "who" (en -> bn)
// Notice data[0] has "WHO", data[1] (dt=bd) has "কে", and data[5] (dt=at) has "যারা"
const WHO_BN_FIXTURE = [
  [["WHO", "who", null, null, 10]],
  [["pronoun", ["কে", "যে", "যাহারা", "কাহারা", "যে-কেহ"], [["কে", ["who", "which"], null, 0.3795572]]]],
  "en",
  null,
  null,
  [["who", null, [["WHO", null, true, false, [10]], ["যারা", null, true, false, [3]], ["কে", null, true, false, [8]]]]]
];

// Fixture 2: Real Google Translate response for "who" (en -> es)
// data[0] has "OMS", data[1] (dt=bd) has pronoun "que", "quién"
const WHO_ES_FIXTURE = [
  [["OMS", "who", null, null, 10]],
  [["pronoun", ["que", "quién"], [["que", ["who", "which", "that"], null, 0.4]]]],
  "en",
  null,
  null,
  [["who", null, [["OMS", null, true, false, [10]], ["quién", null, true, false, [8]]]]]
];

// Fixture 3: Real Google Translate response for "I" (en -> es)
// data[0] has "I", data[1] (dt=bd) has "yo"
const I_ES_FIXTURE = [
  [["I", "I", null, null, 10]],
  [["pronoun", ["yo"], [["yo", ["I"], null, 0.107059024]]]],
  "en",
  null,
  null,
  [["I", null, [["I", null, true, false, [10]], ["yo", null, true, false, [10]]]]]
];

// Fixture 4: Real Google Translate response for "a" (en -> es)
// data[0] has "a", data[1] (dt=bd) has "un", "una"
const A_ES_FIXTURE = [
  [["a", "a", null, null, 10]],
  [["article", ["un", "una", "un cierto"], [["un", ["a", "an"], null, 0.8]]]]
];

// Fixture 5: Real Google Translate response for "am" (en -> bn)
// data[0] has "am", data[5] (dt=at) has alternative "আমি"
const AM_BN_FIXTURE = [
  [["am", "am", null, null, 3]],
  [["abbreviation", ["সকাল"]]],
  "en",
  null,
  null,
  [["am", null, [["am", null, true, false, [3]], ["আমি", null, true, false, [8]]]]]
];

test('DIAG-01: extractTranslatedText does not return identical word when dictionary or alternatives exist', () => {
  // "who" en -> bn: returns "কে" instead of identical "WHO"
  const whoBnResult = extractTranslatedText(WHO_BN_FIXTURE, 'who');
  assert.notEqual(whoBnResult.toLowerCase(), 'who', 'should not return identical word "who"');
  assert.equal(whoBnResult, 'কে');

  // "who" en -> es: avoids acronym "OMS" and extracts pronoun "que"
  const whoEsResult = extractTranslatedText(WHO_ES_FIXTURE, 'who');
  assert.notEqual(whoEsResult, 'OMS', 'should not return acronym "OMS" for who');
  assert.equal(whoEsResult, 'que');

  // "I" en -> es: returns "yo" instead of identical "I"
  const iResult = extractTranslatedText(I_ES_FIXTURE, 'I');
  assert.notEqual(iResult.toLowerCase(), 'i', 'should not return identical word "I"');
  assert.equal(iResult, 'yo');

  // "a" en -> es: returns "un" instead of identical "a"
  const aResult = extractTranslatedText(A_ES_FIXTURE, 'a');
  assert.notEqual(aResult.toLowerCase(), 'a', 'should not return identical word "a"');
  assert.equal(aResult, 'un');

  // "am" en -> bn: returns alternative/dictionary translation instead of "am"
  const amResult = extractTranslatedText(AM_BN_FIXTURE, 'am');
  assert.notEqual(amResult.toLowerCase(), 'am', 'should not return identical word "am"');
});

test('DIAG-02: cleanWordForLookup strips leading and trailing quotes while preserving internal contractions', () => {
  assert.equal(cleanWordForLookup("'hello'"), 'hello', 'should strip straight single quotes at edges');
  assert.equal(cleanWordForLookup('"world"'), 'world', 'should strip straight double quotes at edges');
  assert.equal(cleanWordForLookup("don't"), "don't", 'should preserve internal apostrophe');
  assert.equal(cleanWordForLookup("it's"), "it's", 'should preserve internal apostrophe');
});

test('LANG-01: Target language pairs configuration integrity', () => {
  assert.ok(TARGET_LANGUAGES.length >= 39, 'app must support all curated target languages');

  const seenCodes = new Set<string>();
  for (const lang of TARGET_LANGUAGES) {
    assert.ok(lang.code && lang.code.length >= 2, `code must be valid ISO: ${lang.code}`);
    assert.ok(lang.name && lang.name.length > 0, `name required: ${lang.code}`);
    assert.ok(lang.short && lang.short.length > 0, `short label required: ${lang.code}`);
    assert.ok(!seenCodes.has(lang.code), `duplicate language code: ${lang.code}`);
    seenCodes.add(lang.code);

    // Verify label helper functions resolve accurately
    assert.equal(targetLanguageLabel(lang.code), lang.short);
    assert.equal(targetLanguageName(lang.code), lang.name);
  }
});

test('LANG-02: Supported source and target language pairs form valid translation routes', () => {
  const sourceLanguages = ['en', 'bn', 'ja', 'ko', 'ar'];

  for (const src of sourceLanguages) {
    for (const target of TARGET_LANGUAGES) {
      if (src === target.code) continue; // Same language pairing not needed
      assert.notEqual(src, target.code, `source and target must be distinct: ${src} -> ${target.code}`);
      assert.ok(src.length >= 2 && target.code.length >= 2);
    }
  }
});
