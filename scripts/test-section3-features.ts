/**
 * Automated Verification Script for Section 3 Features:
 * 1. Book Lexicons Precomputation & Integrity
 * 2. Hu & Nation 98% Lexical Coverage Engine & Tiers
 * 3. High-Leverage Target Words Formula
 * 4. Multi-script Phonetic Transliteration (Japanese, Korean, Bengali, English)
 *
 * Usage: npx tsx scripts/test-section3-features.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  calculateBookCoverage,
  type BookCoverageResult,
  type BookLexiconProfileInput as BookLexiconProfile,
} from '../src/features/vocabulary/coverageMath';
import { transliterateSentence } from '../src/features/reader/engine/transliterate';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING SECTION 3: BOOK LEXICONS & COVERAGE');
  console.log('====================================================\n');

  // TEST SUITE 1: Book Lexicons JSON Artifact
  console.log('Test Suite 1: Book Lexicons JSON Artifact Integrity');
  const jsonPath = path.resolve(__dirname, '../assets/data/book_lexicons.json');
  assert(fs.existsSync(jsonPath), 'assets/data/book_lexicons.json exists');

  const rawJson = fs.readFileSync(jsonPath, 'utf-8');
  const profiles = JSON.parse(rawJson) as Record<string, BookLexiconProfile>;
  const bookCount = Object.keys(profiles).length;
  assert(bookCount >= 20, `Profiles bundled for ${bookCount} books (>= 20 catalog titles)`);

  const pride = profiles['pride-and-prejudice'];
  assert(Boolean(pride), 'Pride and Prejudice profile exists');
  assert(pride.totalRunningTokens > 0, `P&P has ${pride.totalRunningTokens} running tokens`);
  assert(pride.uniqueWordCount > 0, `P&P has ${pride.uniqueWordCount} unique words`);
  assert(
    pride.tokenFrequencies['truth'] !== undefined || pride.tokenFrequencies['the'] !== undefined,
    'P&P contains normalized word frequencies',
  );

  const kokoro = profiles['ja-kokoro'];
  assert(Boolean(kokoro), 'Japanese Kokoro profile exists');

  const nalgae = profiles['ko-nalgae'];
  assert(Boolean(nalgae), 'Korean Nalgae profile exists');

  const gora = profiles['bn-gora'];
  assert(Boolean(gora), 'Bangla Gora profile exists');

  // TEST SUITE 2: Hu & Nation 98% Token-Weighted Coverage Engine
  console.log('\nTest Suite 2: Hu & Nation Coverage Engine & Tiers');
  const testProfile: BookLexiconProfile = {
    bookId: 'test-book',
    totalRunningTokens: 100,
    uniqueWordCount: 5,
    tokenFrequencies: {
      the: 50,
      man: 30,
      walk: 15,
      castle: 3,
      hearth: 2,
    },
  };

  // Case A: User knows "the" (50) + "man" (30) = 80 tokens -> 80% (not_yet)
  const knownA = new Set(['the', 'man']);
  const resA = calculateBookCoverage(testProfile, knownA);
  assert(resA.coveragePercent === 80, `Coverage is 80% (got ${resA.coveragePercent}%)`);
  assert(resA.tier === 'not_yet', `Tier is 'not_yet' for 80% (got ${resA.tier})`);
  assert(resA.unknownTokenCount === 20, `Unknown token count is 20 (got ${resA.unknownTokenCount})`);
  assert(
    resA.highLeverageTargetWords[0] === 'walk',
    `Top target word is 'walk' with highest count 15 (got ${resA.highLeverageTargetWords[0]})`,
  );

  // Case B: User knows "the" (50) + "man" (30) + "walk" (15) = 95 tokens -> 95% (challenging)
  const knownB = new Set(['the', 'man', 'walk']);
  const resB = calculateBookCoverage(testProfile, knownB);
  assert(resB.coveragePercent === 95, `Coverage is 95% (got ${resB.coveragePercent}%)`);
  assert(resB.tier === 'challenging', `Tier is 'challenging' for 95% (got ${resB.tier})`);

  // Case C: User knows "the" (50) + "man" (30) + "walk" (15) + "castle" (3) = 98 tokens -> 98% (ready)
  const knownC = new Set(['the', 'man', 'walk', 'castle']);
  const resC = calculateBookCoverage(testProfile, knownC);
  assert(resC.coveragePercent === 98, `Coverage is 98% (got ${resC.coveragePercent}%)`);
  assert(resC.tier === 'ready', `Tier is 'ready' for 98% (got ${resC.tier})`);

  // TEST SUITE 3: Multi-Script Phonetic Transliteration (Decipher Sheet Layer 2)
  console.log('\nTest Suite 3: Multi-script Phonetic Transliteration (Layer 2)');

  // Japanese Hiragana/Katakana -> Romaji
  const jaText = 'こころ ぼっちゃん';
  const jaPhonetic = transliterateSentence(jaText, 'ja');
  assert(
    jaPhonetic.includes('kokoro'),
    `Japanese transliteration outputs Romaji: "${jaPhonetic}" contains "kokoro"`,
  );

  // Korean Hangul -> Revised Romanization
  const koText = '하늘과 바람과 별';
  const koPhonetic = transliterateSentence(koText, 'ko');
  assert(
    koPhonetic.length > 5 && !/[\uAC00-\uD7AF]/.test(koPhonetic),
    `Korean transliteration outputs Romanization: "${koPhonetic}"`,
  );

  // Bengali -> Romanization
  const bnText = 'সোনার তরী';
  const bnPhonetic = transliterateSentence(bnText, 'bn');
  assert(
    bnPhonetic.length > 5 && !/[\u0980-\u09FF]/.test(bnPhonetic),
    `Bengali transliteration outputs Latin phonetics: "${bnPhonetic}"`,
  );

  // English -> Syllable hyphenation
  const enText = 'universally acknowledged gentleman';
  const enPhonetic = transliterateSentence(enText, 'en');
  assert(
    enPhonetic.includes('-'),
    `English syllable pronunciation adds rhythm: "${enPhonetic}"`,
  );

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
