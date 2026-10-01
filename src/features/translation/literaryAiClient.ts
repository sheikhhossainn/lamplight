import { getSession } from '@/lib/supabaseAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Calls the authenticated Supabase literary-ai Edge Function.
 * Returns null if unconfigured, network fails, or server returns an error.
 */
export async function callLiteraryAi<T>(
  action: string,
  payload: Record<string, unknown>,
  timeoutMs: number = 12000,
): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const session = await getSession();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/literary-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[literaryAiClient] Action "${action}" failed:`, err);
    return null;
  }
}
