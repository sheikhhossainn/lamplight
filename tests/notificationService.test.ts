import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scheduleCadenceReminder,
  cancelCadenceReminder,
  scheduleSrsReminder,
  cancelSrsReminder,
  reconcileScheduledNotifications,
  handleNotificationResponse,
  MemoryNotificationAdapter,
  CADENCE_NOTIFICATION_PREFIX,
  SRS_NOTIFICATION_ID,
} from '../src/features/notifications/notificationService';
import type { ReadingGoal } from '../src/db/repositories/readingGoals';

test('RET-01: Schedules daily cadence reminder with literary copy when enabled', async () => {
  const adapter = new MemoryNotificationAdapter();

  const goal: ReadingGoal = {
    bookId: 'book-crime-and-punishment',
    targetDays: 30,
    targetCompletionDate: Date.now() + 30 * 86400000,
    dailyMinutes: 20,
    isAdaptive: true,
    preferredHour: 20,
    preferredMinute: 30,
    notificationsEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const result = await scheduleCadenceReminder(
    {
      goal,
      bookTitle: 'Crime and Punishment',
      currentChapterIndex: 5,
      totalChapters: 40,
    },
    adapter,
  );

  assert.equal(result.scheduled, true);
  const scheduled = adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-crime-and-punishment`);
  assert.ok(scheduled, 'Notification must be in scheduled map');
  assert.equal(scheduled.hour, 20);
  assert.equal(scheduled.minute, 30);
  assert.equal(scheduled.data.type, 'cadence');
  assert.equal(scheduled.data.bookId, 'book-crime-and-punishment');
  assert.equal(scheduled.data.url, '/reader/book-crime-and-punishment');
  assert.ok(scheduled.title.length > 0);
  assert.match(scheduled.body, /Crime and Punishment/);
  assert.ok(scheduled.body.length > 0);
});

test('RET-01: Disabling notifications cancels scheduled cadence reminder', async () => {
  const adapter = new MemoryNotificationAdapter();

  const goal: ReadingGoal = {
    bookId: 'book-war-and-peace',
    targetDays: 90,
    targetCompletionDate: Date.now() + 90 * 86400000,
    dailyMinutes: 30,
    isAdaptive: false,
    preferredHour: 8,
    preferredMinute: 0,
    notificationsEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await scheduleCadenceReminder(
    {
      goal,
      bookTitle: 'War and Peace',
      currentChapterIndex: 1,
      totalChapters: 365,
    },
    adapter,
  );
  assert.ok(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-war-and-peace`));

  // Disable notifications
  const disabledGoal: ReadingGoal = { ...goal, notificationsEnabled: false };
  const result = await scheduleCadenceReminder(
    {
      goal: disabledGoal,
      bookTitle: 'War and Peace',
      currentChapterIndex: 1,
      totalChapters: 365,
    },
    adapter,
  );

  assert.equal(result.scheduled, false);
  assert.equal(result.reason, 'disabled');
  assert.equal(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-war-and-peace`), undefined);
});

test('RET-01: Cancelling reminder directly removes notification', async () => {
  const adapter = new MemoryNotificationAdapter();

  const goal: ReadingGoal = {
    bookId: 'book-anna-karenina',
    targetDays: 45,
    targetCompletionDate: Date.now() + 45 * 86400000,
    dailyMinutes: 25,
    isAdaptive: true,
    preferredHour: 21,
    preferredMinute: 15,
    notificationsEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await scheduleCadenceReminder(
    {
      goal,
      bookTitle: 'Anna Karenina',
      currentChapterIndex: 10,
      totalChapters: 50,
    },
    adapter,
  );
  assert.ok(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-anna-karenina`));

  await cancelCadenceReminder('book-anna-karenina', adapter);
  assert.equal(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-anna-karenina`), undefined);
});

test('RET-01: Permission denial prevents scheduling', async () => {
  const adapter = new MemoryNotificationAdapter();
  adapter.permissionGranted = false;

  const goal: ReadingGoal = {
    bookId: 'book-odyssey',
    targetDays: 20,
    targetCompletionDate: Date.now() + 20 * 86400000,
    dailyMinutes: 15,
    isAdaptive: true,
    preferredHour: 19,
    preferredMinute: 0,
    notificationsEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const result = await scheduleCadenceReminder(
    {
      goal,
      bookTitle: 'The Odyssey',
      currentChapterIndex: 2,
      totalChapters: 24,
    },
    adapter,
  );

  assert.equal(result.scheduled, false);
  assert.equal(result.reason, 'permission_denied');
  assert.equal(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-odyssey`), undefined);
});

test('RET-02: Daily SRS review reminder schedules when due cards exist', async () => {
  const adapter = new MemoryNotificationAdapter();

  const result = await scheduleSrsReminder(5, 19, 0, adapter);
  assert.equal(result.scheduled, true);

  const scheduled = adapter.getScheduled(SRS_NOTIFICATION_ID);
  assert.ok(scheduled, 'SRS notification must be scheduled');
  assert.equal(scheduled.hour, 19);
  assert.equal(scheduled.minute, 0);
  assert.match(scheduled.body, /5 saved words/);
  assert.equal(scheduled.data.type, 'srs');
  assert.equal(scheduled.data.url, '/(tabs)/vocabulary');
});

test('RET-02: Daily SRS reminder cancels when queue is empty', async () => {
  const adapter = new MemoryNotificationAdapter();

  // Schedule first
  await scheduleSrsReminder(3, 19, 0, adapter);
  assert.ok(adapter.getScheduled(SRS_NOTIFICATION_ID));

  // When cards are reviewed (0 due), it cancels
  const result = await scheduleSrsReminder(0, 19, 0, adapter);
  assert.equal(result.scheduled, false);
  assert.equal(result.reason, 'no_due_words');
  assert.equal(adapter.getScheduled(SRS_NOTIFICATION_ID), undefined);
});

test('RET-01 & RET-02: Reconcile on launch purges deleted/completed books and aligns SRS', async () => {
  const adapter = new MemoryNotificationAdapter();

  // Pre-populate scheduled notifications:
  // 1. book-active (active goal, reading at 40%) -> keep
  // 2. book-completed (active goal, reading at 100%) -> cancel
  // 3. book-deleted (no goal in db) -> cancel
  await adapter.scheduleDailyNotification({
    id: `${CADENCE_NOTIFICATION_PREFIX}book-active`,
    title: 'Active Book',
    body: 'Time to read',
    hour: 20,
    minute: 0,
    data: { type: 'cadence', bookId: 'book-active' },
  });
  await adapter.scheduleDailyNotification({
    id: `${CADENCE_NOTIFICATION_PREFIX}book-completed`,
    title: 'Completed Book',
    body: 'Time to read',
    hour: 20,
    minute: 0,
    data: { type: 'cadence', bookId: 'book-completed' },
  });
  await adapter.scheduleDailyNotification({
    id: `${CADENCE_NOTIFICATION_PREFIX}book-deleted`,
    title: 'Deleted Book',
    body: 'Time to read',
    hour: 20,
    minute: 0,
    data: { type: 'cadence', bookId: 'book-deleted' },
  });

  const goals: ReadingGoal[] = [
    {
      bookId: 'book-active',
      targetDays: 30,
      targetCompletionDate: Date.now() + 30 * 86400000,
      dailyMinutes: 20,
      isAdaptive: true,
      preferredHour: 20,
      preferredMinute: 0,
      notificationsEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      bookId: 'book-completed',
      targetDays: 14,
      targetCompletionDate: Date.now() - 86400000,
      dailyMinutes: 20,
      isAdaptive: true,
      preferredHour: 20,
      preferredMinute: 0,
      notificationsEnabled: true,
      createdAt: Date.now() - 15 * 86400000,
      updatedAt: Date.now(),
    },
  ];

  const positions: Record<string, { percentComplete: number }> = {
    'book-active': { percentComplete: 0.4 },
    'book-completed': { percentComplete: 1.0 },
  };

  const reconcileRes = await reconcileScheduledNotifications({
    adapter,
    getGoals: async () => goals,
    getPosition: async (bookId) => positions[bookId] ?? null,
    getDueCount: async () => 4,
  });

  assert.equal(reconcileRes.purgedCount, 2, 'Should purge completed and deleted book notifications');
  assert.equal(reconcileRes.cadenceCount, 1, 'Should keep active book notification');
  assert.equal(reconcileRes.srsScheduled, true, 'Should schedule SRS reminder for 4 due words');

  assert.ok(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-active`));
  assert.equal(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-completed`), undefined);
  assert.equal(adapter.getScheduled(`${CADENCE_NOTIFICATION_PREFIX}book-deleted`), undefined);
  assert.ok(adapter.getScheduled(SRS_NOTIFICATION_ID));
});

test('RET-01 & RET-02: Notification response router correctly decodes payloads', () => {
  const cadenceResponse = {
    notification: {
      request: {
        content: {
          data: {
            type: 'cadence',
            bookId: 'book-moby-dick',
            url: '/reader/book-moby-dick',
          },
        },
      },
    },
  };

  const parsedCadence = handleNotificationResponse(cadenceResponse);
  assert.equal(parsedCadence.type, 'cadence');
  assert.equal(parsedCadence.bookId, 'book-moby-dick');
  assert.equal(parsedCadence.url, '/reader/book-moby-dick');

  const srsResponse = {
    notification: {
      request: {
        content: {
          data: {
            type: 'srs',
            url: '/(tabs)/vocabulary',
          },
        },
      },
    },
  };

  const parsedSrs = handleNotificationResponse(srsResponse);
  assert.equal(parsedSrs.type, 'srs');
  assert.equal(parsedSrs.url, '/(tabs)/vocabulary');
});
