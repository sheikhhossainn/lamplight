import {
  calculateCadencePacing,
  type ReadingGoal,
} from '@/db/repositories/readingGoals';
import { logEvent } from '@/features/analytics/analytics';
import { buildCadenceNotificationCopy } from '@/features/reading-goal/cadenceScheduler';

async function safeGetSetting(
  key: string,
  getter?: (k: string) => Promise<string | null>,
): Promise<string | null> {
  if (getter) {
    return getter(key);
  }
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    return await getSetting(key);
  } catch {
    return null;
  }
}

async function loadReadingPosition(bookId: string) {
  const repo = await import('@/db/repositories/readingPosition');
  return repo.getReadingPosition(bookId);
}

async function loadVocabularyEligibility() {
  const repo = await import('@/db/repositories/savedWords');
  return repo.getVocabularyEligibility();
}

export type ScheduledNotificationPayload = {
  id: string; // Identifier e.g. 'cadence-{bookId}' or 'srs-daily-review'
  title: string;
  body: string;
  hour: number;
  minute: number;
  data: {
    type: 'cadence' | 'srs';
    bookId?: string;
    url?: string;
  };
};

export interface INotificationAdapter {
  requestPermissions(): Promise<boolean>;
  getPermissions(): Promise<boolean>;
  scheduleDailyNotification(payload: ScheduledNotificationPayload): Promise<string>;
  cancelNotification(identifier: string): Promise<void>;
  getAllScheduledNotifications(): Promise<Array<{ identifier: string; data?: any }>>;
}

// In-memory mock adapter for deterministic unit tests and environments without native notification support
export class MemoryNotificationAdapter implements INotificationAdapter {
  private notifications = new Map<string, ScheduledNotificationPayload>();
  public permissionGranted = true;
  public permissionRequestCount = 0;

  async requestPermissions(): Promise<boolean> {
    this.permissionRequestCount += 1;
    return this.permissionGranted;
  }

  async getPermissions(): Promise<boolean> {
    return this.permissionGranted;
  }

  async scheduleDailyNotification(payload: ScheduledNotificationPayload): Promise<string> {
    this.notifications.set(payload.id, payload);
    return payload.id;
  }

  async cancelNotification(identifier: string): Promise<void> {
    this.notifications.delete(identifier);
  }

  async getAllScheduledNotifications(): Promise<Array<{ identifier: string; data?: any }>> {
    return Array.from(this.notifications.values()).map((p) => ({
      identifier: p.id,
      data: p.data,
    }));
  }

  getScheduled(identifier: string): ScheduledNotificationPayload | undefined {
    return this.notifications.get(identifier);
  }

  clear(): void {
    this.notifications.clear();
    this.permissionGranted = true;
    this.permissionRequestCount = 0;
  }
}

let expoNotificationsModule: typeof import('expo-notifications') | null = null;
async function getExpoNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (expoNotificationsModule) return expoNotificationsModule;
  try {
    expoNotificationsModule = await import('expo-notifications');
    // Configure default foreground presentation
    expoNotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return expoNotificationsModule;
  } catch {
    return null;
  }
}

class NativeNotificationAdapter implements INotificationAdapter {
  private memoryFallback = new MemoryNotificationAdapter();

  async requestPermissions(): Promise<boolean> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return this.memoryFallback.requestPermissions();
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return this.memoryFallback.requestPermissions();
    }
  }

  async getPermissions(): Promise<boolean> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return this.memoryFallback.getPermissions();
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return this.memoryFallback.getPermissions();
    }
  }

  async scheduleDailyNotification(payload: ScheduledNotificationPayload): Promise<string> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return this.memoryFallback.scheduleDailyNotification(payload);
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: payload.id,
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: payload.hour,
          minute: payload.minute,
        },
      });
      return payload.id;
    } catch (err) {
      console.warn('[NotificationService] Native schedule failed, falling back:', err);
      return this.memoryFallback.scheduleDailyNotification(payload);
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return this.memoryFallback.cancelNotification(identifier);
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      await this.memoryFallback.cancelNotification(identifier);
    }
  }

  async getAllScheduledNotifications(): Promise<Array<{ identifier: string; data?: any }>> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return this.memoryFallback.getAllScheduledNotifications();
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      return all.map((item) => ({
        identifier: item.identifier,
        data: item.content.data,
      }));
    } catch {
      return this.memoryFallback.getAllScheduledNotifications();
    }
  }
}

let activeAdapter: INotificationAdapter = new NativeNotificationAdapter();

export function setNotificationAdapter(adapter: INotificationAdapter): void {
  activeAdapter = adapter;
}

export function getNotificationAdapter(): INotificationAdapter {
  return activeAdapter;
}

export const CADENCE_NOTIFICATION_PREFIX = 'cadence-';
export const SRS_NOTIFICATION_ID = 'srs-daily-review';

/**
 * Schedules a daily reading cadence reminder for an active goal (RET-01).
 *
 * 1. Verifies notifications are enabled and not globally paused.
 * 2. Requests OS permission only when user enables reminders.
 * 3. Builds literary copy matching the 1890s candlelit aesthetic.
 * 4. Schedules exactly one active reminder per book.
 * 5. Logs telemetry events without PII.
 */
export async function scheduleCadenceReminder(
  params: {
    goal: ReadingGoal;
    bookTitle: string;
    currentChapterIndex?: number;
    totalChapters?: number;
  },
  adapter: INotificationAdapter = activeAdapter,
  getSettingFn?: (key: string) => Promise<string | null>,
): Promise<{ scheduled: boolean; reason?: string }> {
  const { goal, bookTitle, currentChapterIndex = 0, totalChapters = 1 } = params;

  if (!goal.notificationsEnabled) {
    await cancelCadenceReminder(goal.bookId, adapter);
    return { scheduled: false, reason: 'disabled' };
  }

  // Check global pause setting
  const isPaused = (await safeGetSetting('notifications_paused', getSettingFn)) === 'true';
  if (isPaused) {
    await cancelCadenceReminder(goal.bookId, adapter);
    return { scheduled: false, reason: 'globally_paused' };
  }

  // Request or check permissions
  logEvent('reminder_permission_requested', { bookId: goal.bookId, type: 'cadence' });
  const hasPermission = await adapter.requestPermissions();
  logEvent('reminder_permission_result', { bookId: goal.bookId, granted: hasPermission });

  if (!hasPermission) {
    return { scheduled: false, reason: 'permission_denied' };
  }

  const pacing = calculateCadencePacing({
    goal,
    totalChapters: Math.max(1, totalChapters),
    currentChapterIndex,
  });

  const copy = buildCadenceNotificationCopy({
    bookTitle,
    currentChapter: currentChapterIndex,
    totalChapters,
    pacing,
    isAdaptive: goal.isAdaptive,
  });

  const notificationId = `${CADENCE_NOTIFICATION_PREFIX}${goal.bookId}`;

  // Cancel any existing notification for this book before scheduling new one
  await adapter.cancelNotification(notificationId);

  await adapter.scheduleDailyNotification({
    id: notificationId,
    title: copy.title,
    body: copy.body,
    hour: goal.preferredHour,
    minute: goal.preferredMinute,
    data: {
      type: 'cadence',
      bookId: goal.bookId,
      url: `/reader/${goal.bookId}`,
    },
  });

  logEvent('reading_reminder_scheduled', {
    bookId: goal.bookId,
    hour: goal.preferredHour,
    minute: goal.preferredMinute,
    type: 'cadence',
  });

  return { scheduled: true };
}

/**
 * Cancels a cadence reminder when a goal is deleted, disabled, or book completed (RET-01).
 */
export async function cancelCadenceReminder(
  bookId: string,
  adapter: INotificationAdapter = activeAdapter,
): Promise<void> {
  const notificationId = `${CADENCE_NOTIFICATION_PREFIX}${bookId}`;
  await adapter.cancelNotification(notificationId);
  logEvent('reading_reminder_disabled', { bookId, type: 'cadence' });
}

/**
 * Schedules a daily SRS review reminder when due vocabulary words exist (RET-02).
 * Capped to at most one learning notification per day.
 */
export async function scheduleSrsReminder(
  dueCount?: number,
  hour: number = 19, // 7:00 PM default review time
  minute: number = 0,
  adapter: INotificationAdapter = activeAdapter,
  getSettingFn?: (key: string) => Promise<string | null>,
): Promise<{ scheduled: boolean; reason?: string }> {
  const isPaused = (await safeGetSetting('notifications_paused', getSettingFn)) === 'true';
  if (isPaused) {
    await cancelSrsReminder(adapter);
    return { scheduled: false, reason: 'globally_paused' };
  }

  let count = dueCount;
  if (count === undefined) {
    const eligibility = await loadVocabularyEligibility();
    count = eligibility.dueCount;
  }

  if (count <= 0) {
    await cancelSrsReminder(adapter);
    return { scheduled: false, reason: 'no_due_words' };
  }

  const hasPermission = await adapter.getPermissions();
  if (!hasPermission) {
    return { scheduled: false, reason: 'permission_denied' };
  }

  await adapter.cancelNotification(SRS_NOTIFICATION_ID);

  await adapter.scheduleDailyNotification({
    id: SRS_NOTIFICATION_ID,
    title: 'Spaced Repetition Review',
    body: `${count} saved ${count === 1 ? 'word is' : 'words are'} ready for review tonight.`,
    hour,
    minute,
    data: {
      type: 'srs',
      url: '/(tabs)/vocabulary',
    },
  });

  logEvent('reading_reminder_scheduled', {
    type: 'srs',
    dueCount: count,
    hour,
    minute,
  });

  return { scheduled: true };
}

/**
 * Cancels the daily SRS reminder when all cards have been reviewed (RET-02).
 */
export async function cancelSrsReminder(
  adapter: INotificationAdapter = activeAdapter,
): Promise<void> {
  await adapter.cancelNotification(SRS_NOTIFICATION_ID);
  logEvent('reading_reminder_disabled', { type: 'srs' });
}

/**
 * On app launch, reconciles all scheduled local notifications against current database state (RET-01 / RET-02).
 * - Cancels reminders for deleted or completed books.
 * - Re-schedules reminders for active goals.
 * - Updates SRS reminder counts based on actual due queue.
 */
export async function reconcileScheduledNotifications(
  deps?: {
    adapter?: INotificationAdapter;
    getGoals?: () => Promise<ReadingGoal[]>;
    getPosition?: (bookId: string) => Promise<{ percentComplete: number } | null>;
    getDueCount?: () => Promise<number>;
  },
): Promise<{ cadenceCount: number; srsScheduled: boolean; purgedCount: number }> {
  const adapter = deps?.adapter ?? activeAdapter;
  const getGoals =
    deps?.getGoals ??
    (async () => (await import('@/db/repositories/readingGoals')).listAllReadingGoals());
  const getPosition = deps?.getPosition ?? loadReadingPosition;
  const getDueCount = deps?.getDueCount ?? (async () => (await loadVocabularyEligibility()).dueCount);

  const [goals, scheduledList, dueCount] = await Promise.all([
    getGoals(),
    adapter.getAllScheduledNotifications(),
    getDueCount(),
  ]);

  const activeGoalMap = new Map<string, ReadingGoal>();
  for (const g of goals) {
    activeGoalMap.set(g.bookId, g);
  }

  let purgedCount = 0;
  let cadenceCount = 0;

  // 1. Reconcile cadence notifications
  for (const item of scheduledList) {
    if (item.identifier.startsWith(CADENCE_NOTIFICATION_PREFIX)) {
      const bookId = item.identifier.slice(CADENCE_NOTIFICATION_PREFIX.length);
      const goal = activeGoalMap.get(bookId);

      if (!goal || !goal.notificationsEnabled) {
        // Goal was deleted or disabled
        await adapter.cancelNotification(item.identifier);
        purgedCount += 1;
        continue;
      }

      // Check if book is already completed
      const pos = await getPosition(bookId);
      if (pos && pos.percentComplete >= 1.0) {
        await adapter.cancelNotification(item.identifier);
        purgedCount += 1;
        continue;
      }

      cadenceCount += 1;
    }
  }

  // 2. Reconcile SRS reminder
  let srsScheduled = false;
  if (dueCount > 0) {
    const srsRes = await scheduleSrsReminder(dueCount, 19, 0, adapter);
    srsScheduled = srsRes.scheduled;
  } else {
    await cancelSrsReminder(adapter);
  }

  return { cadenceCount, srsScheduled, purgedCount };
}

/**
 * Handles incoming notification response when reader taps a notification.
 */
export function handleNotificationResponse(response: any): {
  type: 'cadence' | 'srs' | 'unknown';
  bookId?: string;
  url?: string;
} {
  const data = response?.notification?.request?.content?.data;
  if (!data) return { type: 'unknown' };

  if (data.type === 'cadence') {
    logEvent('reading_reminder_opened', { bookId: data.bookId, type: 'cadence' });
    return {
      type: 'cadence',
      bookId: data.bookId,
      url: data.url || `/reader/${data.bookId}`,
    };
  }

  if (data.type === 'srs') {
    logEvent('reading_reminder_opened', { type: 'srs' });
    return {
      type: 'srs',
      url: data.url || '/(tabs)/vocabulary',
    };
  }

  return { type: 'unknown' };
}

/**
 * Sets up listeners for notification taps (both while running and on cold launch).
 * Returns an unmount cleanup function.
 */
export function setupNotificationResponseListener(
  onNavigate: (url: string) => void,
): (() => void) {
  let active = true;
  let subscription: { remove: () => void } | null = null;

  void getExpoNotifications().then((Notifications) => {
    if (!Notifications || !active) return;

    try {
      void Notifications.getLastNotificationResponseAsync()
        .then((response: any) => {
          if (!active || !response) return;
          const result = handleNotificationResponse(response);
          if (result.url) {
            onNavigate(result.url);
          }
        })
        .catch(() => {});

      subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        if (!active) return;
        const result = handleNotificationResponse(response);
        if (result.url) {
          onNavigate(result.url);
        }
      });
    } catch {
      // Ignore if listeners not supported in current environment
    }
  });

  return () => {
    active = false;
    subscription?.remove();
  };
}
