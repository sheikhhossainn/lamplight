import { getSession } from '@/lib/supabaseAuth';

import type { AIResponseSchema } from './aiScriptureEngine';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export class ScriptureInquiryRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('The scripture inquiry limit has been reached.');
    this.name = 'ScriptureInquiryRateLimitError';
  }
}

export async function requestScriptureInquiry(
  question: string,
  signal?: AbortSignal,
): Promise<AIResponseSchema | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const { accessToken } = await getSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/scripture-inquiry`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (response.status === 429) {
    const body = (await response.json().catch(() => null)) as { retryAfterSeconds?: unknown } | null;
    throw new ScriptureInquiryRateLimitError(
      typeof body?.retryAfterSeconds === 'number' ? body.retryAfterSeconds : 180,
    );
  }
  if (!response.ok) return null;

  const body = (await response.json()) as unknown;
  if (!body || typeof body !== 'object') return null;
  const result = body as AIResponseSchema;
  return Array.isArray(result.traditions) ? result : null;
}
