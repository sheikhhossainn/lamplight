import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MIN_READING_FONT_SIZE_PX,
  MAX_READING_FONT_SIZE_PX,
  MIN_READING_LINE_HEIGHT_RATIO,
  MAX_READING_LINE_HEIGHT_RATIO,
  DEFAULT_READING_FONT_SIZE_PX,
  DEFAULT_READING_LINE_HEIGHT_RATIO,
  getReadingTypographyPrefs,
  setReadingTypographyPrefs,
  resetReadingTypographyPrefs,
} from '../src/features/settings/readingPrefs.ts';

test('reading typography preferences clamp within design system bounds', async (t) => {
  await t.test('enforces 17px floor when given a lower value', () => {
    setReadingTypographyPrefs({ fontSize: 12 });
    const prefs = getReadingTypographyPrefs();
    assert.equal(prefs.fontSize, MIN_READING_FONT_SIZE_PX);
    assert.equal(prefs.fontSize >= 17, true);
  });

  await t.test('enforces 24px ceiling when given a higher value', () => {
    setReadingTypographyPrefs({ fontSize: 32 });
    const prefs = getReadingTypographyPrefs();
    assert.equal(prefs.fontSize, MAX_READING_FONT_SIZE_PX);
  });

  await t.test('enforces 1.85 line-height ratio floor when given a lower value', () => {
    setReadingTypographyPrefs({ lineHeightRatio: 1.4 });
    const prefs = getReadingTypographyPrefs();
    assert.equal(prefs.lineHeightRatio, MIN_READING_LINE_HEIGHT_RATIO);
    assert.equal(prefs.lineHeightRatio >= 1.85, true);
  });

  await t.test('enforces 2.15 line-height ratio ceiling when given a higher value', () => {
    setReadingTypographyPrefs({ lineHeightRatio: 2.5 });
    const prefs = getReadingTypographyPrefs();
    assert.equal(prefs.lineHeightRatio, MAX_READING_LINE_HEIGHT_RATIO);
  });

  await t.test('reset restores default values', () => {
    setReadingTypographyPrefs({ fontSize: 22, lineHeightRatio: 2.1 });
    resetReadingTypographyPrefs();
    const prefs = getReadingTypographyPrefs();
    assert.equal(prefs.fontSize, DEFAULT_READING_FONT_SIZE_PX);
    assert.equal(prefs.lineHeightRatio, DEFAULT_READING_LINE_HEIGHT_RATIO);
  });
});
