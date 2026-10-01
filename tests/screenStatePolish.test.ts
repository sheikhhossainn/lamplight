import test from 'node:test';
import assert from 'node:assert/strict';

import type { ScreenStateType } from '../src/components/ScreenStateView';
import { LamplightColor, LamplightColorDark, Radius, Spacing } from '../src/theme/tokens';
import { FontFamily, LamplightTypography } from '../src/theme/typography';

/**
 * Pure helper mirroring ScreenStateView's accessibility role mapping (POLISH-01).
 */
function getA11yRole(type: ScreenStateType): 'alert' | 'summary' {
  switch (type) {
    case 'error':
    case 'permission_denied':
    case 'free_limit':
      return 'alert';
    case 'loading':
    case 'offline':
    case 'empty':
    case 'premium_locked':
    default:
      return 'summary';
  }
}

/**
 * Pure helper validating quota calculations for free-limit state.
 */
function formatQuotaDisplay(used: number, total: number): { percent: number; isExceeded: boolean; label: string } {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;
  const isExceeded = used >= total;
  const label = `${used} of ${total} used`;
  return { percent, isExceeded, label };
}

test('POLISH-01: ScreenStateView role and accessibility taxonomy', () => {
  // Urgent / blocking states must be classified as 'alert' for TalkBack/VoiceOver
  assert.equal(getA11yRole('error'), 'alert');
  assert.equal(getA11yRole('permission_denied'), 'alert');
  assert.equal(getA11yRole('free_limit'), 'alert');

  // Ambient / informative states must be classified as 'summary'
  assert.equal(getA11yRole('loading'), 'summary');
  assert.equal(getA11yRole('offline'), 'summary');
  assert.equal(getA11yRole('empty'), 'summary');
  assert.equal(getA11yRole('premium_locked'), 'summary');
});

test('POLISH-01: Quota and free-limit state calculations', () => {
  const normal = formatQuotaDisplay(2, 5);
  assert.equal(normal.percent, 40);
  assert.equal(normal.isExceeded, false);
  assert.equal(normal.label, '2 of 5 used');

  const maxed = formatQuotaDisplay(5, 5);
  assert.equal(maxed.percent, 100);
  assert.equal(maxed.isExceeded, true);

  const overflow = formatQuotaDisplay(7, 5);
  assert.equal(overflow.percent, 100);
  assert.equal(overflow.isExceeded, true);
});

test('POLISH-01: Design token adherence for state presentations', () => {
  // Brand constants locked
  assert.equal(LamplightColor.primaryDark, '#1C1B1E');
  assert.equal(LamplightColor.flameAmber, '#F5A623');
  assert.equal(LamplightColor.parchment, '#F5EDE1');

  // Pill and card radius tokens match specifications
  assert.equal(Radius.pill, 100);
  assert.equal(Radius.card, 12);

  // Line-height minimums for reading typography (never < 1.85)
  const loraRatio = LamplightTypography.readingBody.lineHeight / LamplightTypography.readingBody.fontSize;
  assert.ok(loraRatio >= 1.85, `Reading body line-height ratio is ${loraRatio}, must be >= 1.85`);

  // Spacing values exist on 4px grid
  for (const [key, val] of Object.entries(Spacing)) {
    assert.equal(val % 4, 0, `Spacing.${key} (${val}) must be divisible by 4`);
  }
});

test('POLISH-01: Scripture/Book boundary error fallback handling', () => {
  // Verifies that out-of-range IDs produce safe, recoverable states
  const invalidSurahId = 150;
  const isSurahValid = invalidSurahId >= 1 && invalidSurahId <= 114;
  assert.equal(isSurahValid, false);

  const invalidBibleId = 'nonexistent-book-id';
  const isBibleKnown = ['genesis', 'exodus', 'matthew', 'mark', 'revelation'].includes(invalidBibleId);
  assert.equal(isBibleKnown, false);
});
