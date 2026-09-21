import { AppState, type AppStateStatus } from 'react-native';
import { generateId } from '@/lib/id';
import { insertReadingSession, updateReadingSession } from '@/db/repositories/readingSessions';
import { enqueueMutation } from '@/db/repositories/syncOutbox';
import { getDb } from '@/db/client';

type ActiveSession = {
  id: string;
  bookId: string;
  chapterIndex: number;
  startedAt: number;
  lastInteractionAt: number;
  lastTickAt: number;
  accumulatedSeconds: number;
  pagesRead: number;
};

let currentSession: ActiveSession | null = null;
let heartbeatInterval: any = null;
const IDLE_TIMEOUT_SECONDS = 300; // 5 minutes of inactivity pauses tracking

export function startReadingSession(bookId: string, chapterIndex: number = 0): void {
  // If there's an existing session for a different book, end it first
  if (currentSession && currentSession.bookId !== bookId) {
    endReadingSession();
  }

  if (currentSession && currentSession.bookId === bookId) {
    // Already tracking this book
    return;
  }

  const now = Date.now();
  const sessionId = generateId();

  currentSession = {
    id: sessionId,
    bookId,
    chapterIndex,
    startedAt: now,
    lastInteractionAt: now,
    lastTickAt: now,
    accumulatedSeconds: 0,
    pagesRead: 0,
  };

  // Persist initial session record to SQLite
  void insertReadingSession({
    id: sessionId,
    bookId,
    startedAt: now,
    endedAt: null,
    durationSeconds: 0,
    pagesRead: 0,
    chapterIndex,
  }).catch((err) => console.warn('[readingTracker] Failed to record start:', err));

  startHeartbeat();
}

export function recordInteraction(): void {
  if (!currentSession) return;
  const now = Date.now();
  const elapsedSinceLastTick = Math.max(0, Math.floor((now - currentSession.lastTickAt) / 1000));
  const idleSeconds = Math.floor((now - currentSession.lastInteractionAt) / 1000);

  if (idleSeconds < IDLE_TIMEOUT_SECONDS && elapsedSinceLastTick > 0) {
    currentSession.accumulatedSeconds += Math.min(elapsedSinceLastTick, IDLE_TIMEOUT_SECONDS);
  }
  currentSession.lastInteractionAt = now;
  currentSession.lastTickAt = now;
}

export function recordPageTurn(bookId?: string, _pageIndex?: number): void {
  if (!currentSession) return;
  if (bookId && currentSession.bookId !== bookId) return;

  const now = Date.now();
  const elapsedSinceLastTick = Math.max(0, Math.floor((now - currentSession.lastTickAt) / 1000));
  const idleSeconds = Math.floor((now - currentSession.lastInteractionAt) / 1000);

  if (idleSeconds < IDLE_TIMEOUT_SECONDS && elapsedSinceLastTick > 0) {
    currentSession.accumulatedSeconds += Math.min(elapsedSinceLastTick, IDLE_TIMEOUT_SECONDS);
  }

  currentSession.pagesRead += 1;
  currentSession.lastInteractionAt = now;
  currentSession.lastTickAt = now;
}

export function endReadingSession(): void {
  if (!currentSession) return;

  stopHeartbeat();

  const now = Date.now();
  const idleSeconds = Math.floor((now - currentSession.lastInteractionAt) / 1000);
  const elapsedSinceLastTick = Math.max(0, Math.floor((now - currentSession.lastTickAt) / 1000));

  if (idleSeconds < IDLE_TIMEOUT_SECONDS && elapsedSinceLastTick > 0) {
    currentSession.accumulatedSeconds += Math.min(elapsedSinceLastTick, IDLE_TIMEOUT_SECONDS);
  }

  const totalDuration = Math.max(1, currentSession.accumulatedSeconds);
  const sessionId = currentSession.id;
  const bookId = currentSession.bookId;
  const pages = currentSession.pagesRead;
  const startedAt = currentSession.startedAt;
  const chapterIndex = currentSession.chapterIndex;

  currentSession = null;

  // Finalize local record
  void (async () => {
    try {
      await updateReadingSession(sessionId, {
        endedAt: now,
        durationSeconds: totalDuration,
        pagesRead: pages,
      });

      // Enqueue to sync outbox for cloud sync when online
      const db = await getDb();
      await enqueueMutation(
        {
          entityType: 'reading_session',
          entityId: sessionId,
          operation: 'upsert',
          payload: {
            id: sessionId,
            bookId,
            startedAt,
            endedAt: now,
            durationSeconds: totalDuration,
            pagesRead: pages,
            chapterIndex,
          },
        },
        db,
      );
    } catch (err) {
      console.warn('[readingTracker] Failed to finalize session:', err);
    }
  })();
}

function tickHeartbeat(): void {
  if (!currentSession) return;

  const now = Date.now();
  const idleSeconds = Math.floor((now - currentSession.lastInteractionAt) / 1000);

  if (idleSeconds < IDLE_TIMEOUT_SECONDS) {
    const elapsedSinceLastTick = Math.max(0, Math.floor((now - currentSession.lastTickAt) / 1000));
    currentSession.accumulatedSeconds += elapsedSinceLastTick;
    currentSession.lastTickAt = now;

    // Periodically update local duration every heartbeat
    void updateReadingSession(currentSession.id, {
      durationSeconds: currentSession.accumulatedSeconds,
      pagesRead: currentSession.pagesRead,
    });
  } else {
    currentSession.lastTickAt = now;
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(tickHeartbeat, 10000);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Automatically handle app backgrounding
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    endReadingSession();
  }
});
