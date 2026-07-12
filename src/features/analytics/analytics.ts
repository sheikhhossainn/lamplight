import { getSession } from '@/lib/supabaseAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fire-and-forget event logging into public.analytics_events (see
// supabase/schema.sql section 8 — the Phase 0 beta's "see what they actually
// did" table). Never awaited by callers, never throws into the UI: a failed
// log is just a missed data point, not a broken feature.
export function logEvent(eventType: string, payload: Record<string, unknown> = {}): void {
  void (async () => {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
      const { accessToken, userId } = await getSession();
      await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ owner_id: userId, event_type: eventType, payload }),
      });
    } catch {
      // Offline, session hiccup, or RLS misconfig — silently drop; analytics
      // is never worth surfacing an error for.
    }
  })();
}
