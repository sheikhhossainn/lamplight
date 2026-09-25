import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateQuizGateSync,
  getQuizWeekKey,
  getWeeklySampleStorageKey,
  type QuizMode,
} from '../src/features/vocabulary/quizGateService.ts';

test('LEARN-01 normal mode is always allowed and free for all users', () => {
  // Free user, offline, service disabled
  const result = evaluateQuizGateSync('normal', {
    isPremium: false,
    isServiceEnabled: false,
    isOnline: false,
    hasCachedData: false,
    hasUsedSample: true,
  });

  assert.equal(result.status, 'allowed');
  assert.equal(result.allowed, true);
  assert.equal(result.source, 'free_mode');
});

test('LEARN-01 premium users receive unrestricted advanced quiz sessions without hitting sample key', () => {
  const modes: QuizMode[] = ['fresh', 'synonyms'];
  for (const mode of modes) {
    const result = evaluateQuizGateSync(mode, {
      isPremium: true,
      isServiceEnabled: true,
      isOnline: true,
      hasUsedSample: true, // Even if sample key was set, premium never checks it
    });

    assert.equal(result.status, 'allowed');
    assert.equal(result.allowed, true);
    assert.equal(result.source, 'premium');
  }
});

test('LEARN-01 free users receive one weekly advanced sample', () => {
  const result = evaluateQuizGateSync('synonyms', {
    isPremium: false,
    isServiceEnabled: true,
    isOnline: true,
    hasUsedSample: false, // Not used yet
  });

  assert.equal(result.status, 'allowed');
  assert.equal(result.allowed, true);
  assert.equal(result.source, 'weekly_sample');
});

test('LEARN-01 free users who already used their sample receive subscription_required with mode payload', () => {
  const result = evaluateQuizGateSync('fresh', {
    isPremium: false,
    isServiceEnabled: true,
    isOnline: true,
    hasUsedSample: true, // Already consumed
  });

  assert.equal(result.status, 'subscription_required');
  assert.equal(result.allowed, false);
  assert.equal(result.trigger, 'advanced_quiz_sample_used');
  assert.equal(result.mode, 'fresh');
  assert.match(result.reason ?? '', /used your free advanced quiz/i);
});

test('LEARN-01 offline state without cached challenge data returns offline_unavailable', () => {
  const result = evaluateQuizGateSync('synonyms', {
    isPremium: true,
    isServiceEnabled: true,
    isOnline: false,
    hasCachedData: false,
  });

  assert.equal(result.status, 'offline_unavailable');
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? '', /requires an internet connection/i);
});

test('LEARN-01 offline state WITH cached challenge data remains usable for premium users', () => {
  const result = evaluateQuizGateSync('synonyms', {
    isPremium: true,
    isServiceEnabled: true,
    isOnline: false,
    hasCachedData: true, // Cached data exists
  });

  assert.equal(result.status, 'allowed');
  assert.equal(result.allowed, true);
  assert.equal(result.source, 'premium');
});

test('LEARN-01 emergency kill switch returns service_disabled for advanced modes', () => {
  const result = evaluateQuizGateSync('synonyms', {
    isPremium: true,
    isServiceEnabled: false, // Kill switch active
  });

  assert.equal(result.status, 'service_disabled');
  assert.equal(result.allowed, false);
});

test('LEARN-01 weekly sample key is deterministic across week boundaries', () => {
  // Wednesday 2026-09-23 -> Monday 2026-09-21
  const wedDate = new Date('2026-09-23T12:00:00Z').getTime();
  const weekKeyWed = getQuizWeekKey(wedDate);
  assert.equal(weekKeyWed, '2026-09-21');

  // Sunday 2026-09-27 12:00 UTC (Sunday afternoon/evening in all locales) -> Monday 2026-09-21
  const sunDate = new Date('2026-09-27T12:00:00Z').getTime();
  const weekKeySun = getQuizWeekKey(sunDate);
  assert.equal(weekKeySun, '2026-09-21');

  // Monday 2026-09-28 -> Monday 2026-09-28
  const nextMonDate = new Date('2026-09-28T00:00:01Z').getTime();
  const weekKeyNextMon = getQuizWeekKey(nextMonDate);
  assert.equal(weekKeyNextMon, '2026-09-28');

  assert.equal(getWeeklySampleStorageKey(wedDate), 'vocabulary.advanced_quiz_sample.2026-09-21');
});
