import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateLapseState,
  type LapsePrompt,
} from '../src/features/retention/lapseRecovery';

describe('RET-05 Gentle lapse recovery', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const NOW = 1774000000000; // Fixed timestamp for reproducible math

  it('returns null if the user has no recorded reading sessions yet', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: null,
    });
    assert.equal(prompt, null);
  });

  it('returns null if the user read recently (less than 3 days ago)', () => {
    const prompt1 = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 1 * ONE_DAY_MS,
    });
    assert.equal(prompt1, null);

    const prompt2 = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 2.8 * ONE_DAY_MS,
    });
    assert.equal(prompt2, null);
  });

  it('detects a 3-day lapse and generates calm, guilt-free copy', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 3.5 * ONE_DAY_MS,
      currentBook: { id: 'book-1', title: 'The Prophet', author: 'Kahlil Gibran' },
    });

    assert.ok(prompt);
    assert.equal(prompt.stage, 'three_days');
    assert.equal(prompt.daysSinceLastRead, 3);
    assert.equal(prompt.title, 'A quiet moment awaits');
    assert.equal(prompt.subtitle, 'Books wait patiently');
    assert.ok(prompt.message.includes('The Prophet'));
    assert.equal(prompt.primaryAction.type, 'current_book');
    assert.equal(prompt.primaryAction.bookId, 'book-1');
  });

  it('detects a 7-day lapse and uses calm welcoming copy', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 8 * ONE_DAY_MS,
      currentBook: { id: 'book-2', title: 'Walden', author: 'Henry David Thoreau' },
    });

    assert.ok(prompt);
    assert.equal(prompt.stage, 'seven_days');
    assert.equal(prompt.daysSinceLastRead, 8);
    assert.equal(prompt.title, 'Welcome back');
    assert.equal(prompt.subtitle, 'Always at your own pace');
    assert.ok(prompt.message.includes('Walden'));
  });

  it('detects a 14-day lapse and treats reading as a retreat rather than obligation', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 20 * ONE_DAY_MS,
      currentBook: { id: 'book-3', title: 'Gitanjali', author: 'Rabindranath Tagore' },
    });

    assert.ok(prompt);
    assert.equal(prompt.stage, 'fourteen_days');
    assert.equal(prompt.daysSinceLastRead, 20);
    assert.equal(prompt.title, 'Reading is a retreat');
    assert.equal(prompt.subtitle, 'Not an obligation');
  });

  it('strictly avoids guilt, lost-streak warnings, or shame vocabulary', () => {
    const prohibitedWords = ['streak', 'lost', 'behind', 'hurry', 'expire', 'broken', 'shame', 'penalty', 'fail'];

    const stages = [3, 7, 14, 30];
    for (const days of stages) {
      const prompt = evaluateLapseState({
        now: NOW,
        lastSessionTimestamp: NOW - days * ONE_DAY_MS,
        currentBook: { id: 'b1', title: 'Test Book', author: 'Author' },
      });
      assert.ok(prompt);

      const combinedText = `${prompt.title} ${prompt.subtitle} ${prompt.message} ${prompt.primaryAction.label}`.toLowerCase();
      for (const word of prohibitedWords) {
        assert.equal(
          combinedText.includes(word),
          false,
          `Prompt for ${days} days contained forbidden shame word: "${word}"`,
        );
      }
    }
  });

  it('falls back to vocabulary review when due words exist and current book was removed', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 4 * ONE_DAY_MS,
      currentBook: null, // Book was deleted or removed
      dueWordCount: 7,
    });

    assert.ok(prompt);
    assert.equal(prompt.primaryAction.type, 'due_review');
    assert.equal(prompt.primaryAction.label, 'Review 7 Words');
    assert.equal(prompt.primaryAction.route, '/(tabs)/vocabulary?tab=flashcards');
    assert.ok(prompt.message.includes('7 saved words'));
  });

  it('falls back to library exploration when neither book nor words exist', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 5 * ONE_DAY_MS,
      currentBook: null,
      dueWordCount: 0,
    });

    assert.ok(prompt);
    assert.equal(prompt.primaryAction.type, 'library');
    assert.equal(prompt.primaryAction.label, 'Explore Library');
    assert.equal(prompt.primaryAction.route, '/(tabs)/library');
  });

  it('returns null if the user explicitly disabled lapse recovery', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 10 * ONE_DAY_MS,
      lapseRecoveryEnabled: false,
    });
    assert.equal(prompt, null);
  });

  it('returns null if notifications/reminders are paused', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 10 * ONE_DAY_MS,
      notificationsPaused: true,
    });
    assert.equal(prompt, null);
  });

  it('respects dismissal cooldown within 24 hours', () => {
    const prompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 5 * ONE_DAY_MS,
      lastDismissedTimestamp: NOW - 4 * 60 * 60 * 1000, // Dismissed 4 hours ago
    });
    assert.equal(prompt, null);

    // After 24 hours (e.g. 26 hours ago), dismissal cooldown expires
    const eligiblePrompt = evaluateLapseState({
      now: NOW,
      lastSessionTimestamp: NOW - 5 * ONE_DAY_MS,
      lastDismissedTimestamp: NOW - 26 * ONE_DAY_MS / 24,
    });
    assert.ok(eligiblePrompt);
  });
});
