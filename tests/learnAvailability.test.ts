import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLearnSpaceAvailable } from '../src/features/learn/availability';

describe('Learn space availability rules (§2.2 matrix)', () => {
  it('is available for Japanese target with Bangla mother tongue and zero/some level', () => {
    assert.equal(isLearnSpaceAvailable('ja', 'bn', 'zero'), true);
    assert.equal(isLearnSpaceAvailable('ja', 'bn', 'some'), true);
  });

  it('is hidden by default for fluent learners but shown when forcedOn is true', () => {
    assert.equal(isLearnSpaceAvailable('ja', 'bn', 'fluent', false), false);
    assert.equal(isLearnSpaceAvailable('ja', 'bn', 'fluent', true), true);
  });

  it('is hidden when target language has no course (e.g. en, ko in v1)', () => {
    assert.equal(isLearnSpaceAvailable('en', 'bn', 'zero'), false);
    assert.equal(isLearnSpaceAvailable('ko', 'bn', 'zero'), false);
    assert.equal(isLearnSpaceAvailable('en', 'bn', 'some'), false);
  });

  it('is hidden when mother tongue has no course strings (e.g. ar, en, ko in v1)', () => {
    assert.equal(isLearnSpaceAvailable('ja', 'ar', 'zero'), false);
    assert.equal(isLearnSpaceAvailable('ja', 'en', 'zero'), false);
    assert.equal(isLearnSpaceAvailable('ja', 'ko', 'some'), false);
  });

  it('defaults level to some and forcedOn to false', () => {
    assert.equal(isLearnSpaceAvailable('ja', 'bn'), true);
  });
});
