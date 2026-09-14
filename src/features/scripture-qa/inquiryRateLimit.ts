/**
 * Client-side rate limiter for novel AI scripture inquiries.
 * Prevents API quota exhaustion and guides users to explore existing/cached questions.
 *
 * Rules:
 * - Curated topics & cached questions are ALWAYS unlimited (0 API calls).
 * - Novel AI queries: max 3 requests within a rolling 3-minute window.
 */

const MAX_REQUESTS = 3;
const WINDOW_MS = 3 * 60 * 1000; // 3 minutes

const requestTimestamps: number[] = [];

export type RateLimitStatus = {
  allowed: boolean;
  remainingSeconds: number;
  adviceMessage: string;
};

export function checkAIRateLimit(): RateLimitStatus {
  const now = Date.now();

  // Filter timestamps within the rolling window
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > WINDOW_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS) {
    const oldest = requestTimestamps[0];
    const remainingMs = oldest + WINDOW_MS - now;
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

    return {
      allowed: false,
      remainingSeconds,
      adviceMessage: `AI query cooldown active (${remainingSeconds}s remaining). While the AI rests, explore our 4 curated topics or revisit your saved offline questions below.`,
    };
  }

  return {
    allowed: true,
    remainingSeconds: 0,
    adviceMessage: '',
  };
}

export function recordAIRequest(): void {
  requestTimestamps.push(Date.now());
}
