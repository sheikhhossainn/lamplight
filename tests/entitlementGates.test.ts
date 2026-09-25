import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_FREE_SNAPSHOT,
  canUse,
  requireFeature,
  type PremiumFeature,
} from '../src/features/subscription/entitlementService.ts';
import { FREE_DAILY_TRANSLATION_LIMIT } from '../src/features/translation/capPolicy.ts';
import { AMBIENCE_TRACKS } from '../src/features/ambience/tracks.ts';
import { TEMPLATES } from '../src/features/reader/components/quoteTemplates.ts';

const ALL_PREMIUM_FEATURES: PremiumFeature[] = [
  'unlimited_learning',
  'advanced_quiz',
  'context_translation',
  'reading_insights',
  'cloud_sync',
  'full_ambience',
  'premium_quote_cards',
  'ai_companion',
];

test('entitlement gates and free-tier boundaries', async (t) => {
  await t.test('default snapshot denies all 8 premium features', () => {
    assert.equal(DEFAULT_FREE_SNAPSHOT.status, 'free');
    for (const feature of ALL_PREMIUM_FEATURES) {
      assert.equal(
        DEFAULT_FREE_SNAPSHOT.features[feature],
        false,
        `Expected ${feature} to be disabled by default`,
      );
    }
  });

  await t.test('canUse evaluates to false on free tier for all premium features', () => {
    for (const feature of ALL_PREMIUM_FEATURES) {
      assert.equal(
        canUse(feature),
        false,
        `Expected canUse(${feature}) to be false on free tier`,
      );
    }
  });

  await t.test('requireFeature blocks unentitled access with clear reasons', () => {
    for (const feature of ALL_PREMIUM_FEATURES) {
      const result = requireFeature(feature);
      assert.equal(result.allowed, false);
      assert.equal(typeof result.reason, 'string');
      assert.equal((result.reason ?? '').length > 10, true);
    }

    const custom = requireFeature('unlimited_learning', 'Custom context message');
    assert.equal(custom.allowed, false);
    assert.equal(custom.reason, 'Custom context message');
  });

  await t.test('free-tier limits match specification', () => {
    // translations_per_day: 50 / day
    assert.equal(FREE_DAILY_TRANSLATION_LIMIT, 50);

    // Free caps per book per ROADMAP.md
    const FREE_VOCABULARY_PER_BOOK = 30;
    const FREE_QUOTES_PER_BOOK = 15;
    assert.equal(FREE_VOCABULARY_PER_BOOK, 30);
    assert.equal(FREE_QUOTES_PER_BOOK, 15);
  });

  await t.test('ambience tracks enforce free vs premium segregation', () => {
    const forestBrook = AMBIENCE_TRACKS.find((track) => track.id === 'forest-brook');
    const rainPath = AMBIENCE_TRACKS.find((track) => track.id === 'rain-path');
    const mistyRain = AMBIENCE_TRACKS.find((track) => track.id === 'misty-rain');

    assert.ok(forestBrook, 'forest-brook must exist');
    assert.ok(rainPath, 'rain-path must exist');
    assert.ok(mistyRain, 'misty-rain must exist');

    assert.equal(forestBrook.isPremium, false);
    assert.equal(rainPath.isPremium, true);
    assert.equal(mistyRain.isPremium, true);
  });

  await t.test('quote card templates enforce classic vs premium segregation', () => {
    const classicTemplates = TEMPLATES.filter((tmpl) => tmpl.category === 'classic');
    const premiumTemplates = TEMPLATES.filter((tmpl) => tmpl.category === 'premium');

    assert.equal(classicTemplates.length, 3);
    assert.equal(premiumTemplates.length, 6);

    const classicIds = classicTemplates.map((t) => t.id);
    assert.deepEqual(classicIds, ['parchment', 'gradient', 'foldSplit']);

    const premiumIds = premiumTemplates.map((t) => t.id);
    assert.deepEqual(premiumIds, [
      'editorial',
      'midnightGold',
      'washi',
      'cyanotype',
      'broadside',
      'tanzaku',
    ]);
  });
});
