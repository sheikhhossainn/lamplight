import { getSetting, setSetting } from '@/db/repositories/appSettings';

const PREFIX_ATTEMPTS = 'ratelimit_attempts_';
const PREFIX_LOCKED_UNTIL = 'ratelimit_locked_until_';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_DURATION_MS = 30 * 1000; // 30 seconds

type LockState = {
  locked: boolean;
  remainingSeconds: number;
  attempts: number;
};

// Memory cache for responsive UI rendering and local countdowns
const memoryState: Record<string, { attempts: number; lockedUntil: number }> = {};

/**
 * Initializes/hydrates the rate limit state for an action key from persistent storage.
 */
export async function hydrateRateLimit(actionKey: string): Promise<LockState> {
  try {
    const [storedAttempts, storedLockedUntil] = await Promise.all([
      getSetting(`${PREFIX_ATTEMPTS}${actionKey}`),
      getSetting(`${PREFIX_LOCKED_UNTIL}${actionKey}`),
    ]);

    const attempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
    const lockedUntil = storedLockedUntil ? parseInt(storedLockedUntil, 10) : 0;

    memoryState[actionKey] = { attempts, lockedUntil };
    return getRateLimitState(actionKey);
  } catch {
    return { locked: false, remainingSeconds: 0, attempts: 0 };
  }
}

/**
 * Returns current lock status for an actionKey.
 */
export function getRateLimitState(actionKey: string): LockState {
  const current = memoryState[actionKey];
  if (!current) {
    return { locked: false, remainingSeconds: 0, attempts: 0 };
  }

  const now = Date.now();
  if (current.lockedUntil > now) {
    const remainingSeconds = Math.ceil((current.lockedUntil - now) / 1000);
    return {
      locked: true,
      remainingSeconds,
      attempts: current.attempts,
    };
  }

  // Lock has expired
  return {
    locked: false,
    remainingSeconds: 0,
    attempts: current.attempts,
  };
}

/**
 * Records a failed attempt for an actionKey.
 * If consecutive attempts reach maxAttempts (default 5), locks the action for lockDurationMs (default 30s).
 */
export async function recordFailedAttempt(
  actionKey: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockDurationMs = DEFAULT_LOCK_DURATION_MS,
): Promise<LockState> {
  const current = memoryState[actionKey] ?? { attempts: 0, lockedUntil: 0 };
  const now = Date.now();

  // If already locked, keep current lock
  if (current.lockedUntil > now) {
    return getRateLimitState(actionKey);
  }

  const newAttempts = current.attempts + 1;
  let newLockedUntil = 0;

  if (newAttempts >= maxAttempts) {
    newLockedUntil = now + lockDurationMs;
  }

  memoryState[actionKey] = {
    attempts: newAttempts,
    lockedUntil: newLockedUntil,
  };

  await Promise.all([
    setSetting(`${PREFIX_ATTEMPTS}${actionKey}`, String(newAttempts)),
    setSetting(`${PREFIX_LOCKED_UNTIL}${actionKey}`, String(newLockedUntil)),
  ]);

  return getRateLimitState(actionKey);
}

/**
 * Resets the failed attempts and clears any lock upon successful verification.
 */
export async function resetRateLimit(actionKey: string): Promise<void> {
  memoryState[actionKey] = {
    attempts: 0,
    lockedUntil: 0,
  };

  await Promise.all([
    setSetting(`${PREFIX_ATTEMPTS}${actionKey}`, '0'),
    setSetting(`${PREFIX_LOCKED_UNTIL}${actionKey}`, '0'),
  ]);
}
