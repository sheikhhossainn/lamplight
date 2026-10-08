import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getReadingTheme,
  setReadingTheme,
  subscribeToReadingTheme,
  hydrateReadingTheme,
  _resetReadingThemeForTesting,
} from '../src/features/settings/readingTheme.ts';

test('reading theme state management and notifications', async (t) => {
  t.beforeEach(() => {
    _resetReadingThemeForTesting();
  });

  await t.test('defaults to day mode', () => {
    assert.equal(getReadingTheme(), 'day');
  });

  await t.test('setReadingTheme changes theme to lamp and notifies subscribers', () => {
    let callCount = 0;
    const unsubscribe = subscribeToReadingTheme(() => {
      callCount += 1;
    });

    setReadingTheme('lamp');
    assert.equal(getReadingTheme(), 'lamp');
    assert.equal(callCount, 1);

    unsubscribe();
  });

  await t.test('setReadingTheme is a no-op if theme is already active', () => {
    setReadingTheme('lamp');
    let callCount = 0;
    const unsubscribe = subscribeToReadingTheme(() => {
      callCount += 1;
    });

    setReadingTheme('lamp');
    assert.equal(callCount, 0);

    unsubscribe();
  });

  await t.test('unsubscribing removes listener from subsequent changes', () => {
    let callCount = 0;
    const unsubscribe = subscribeToReadingTheme(() => {
      callCount += 1;
    });

    unsubscribe();
    setReadingTheme('lamp');
    assert.equal(callCount, 0);
  });

  await t.test('hydrateReadingTheme restores saved lamp mode and notifies subscribers', async () => {
    let notified = false;
    subscribeToReadingTheme(() => {
      notified = true;
    });

    await hydrateReadingTheme(async () => 'lamp');
    assert.equal(getReadingTheme(), 'lamp');
    assert.equal(notified, true);
  });

  await t.test('hydrateReadingTheme falls back to day for invalid or missing settings', async () => {
    let notified = false;
    subscribeToReadingTheme(() => {
      notified = true;
    });

    await hydrateReadingTheme(async () => 'invalid_theme');
    assert.equal(getReadingTheme(), 'day');
    assert.equal(notified, false);
  });

  await t.test('hydrateReadingTheme is idempotent and does not run twice', async () => {
    let callCount = 0;
    subscribeToReadingTheme(() => {
      callCount += 1;
    });

    await hydrateReadingTheme(async () => 'lamp');
    assert.equal(getReadingTheme(), 'lamp');
    assert.equal(callCount, 1);

    await hydrateReadingTheme(async () => 'day');
    assert.equal(getReadingTheme(), 'lamp');
    assert.equal(callCount, 1);
  });

  await t.test('setReadingTheme prior to hydration prevents stale hydration override', async () => {
    setReadingTheme('day');
    await hydrateReadingTheme(async () => 'lamp');
    assert.equal(getReadingTheme(), 'day');
  });
});
