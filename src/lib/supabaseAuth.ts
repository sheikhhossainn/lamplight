import { getSetting, setSetting } from '@/db/repositories/appSettings';

// Anonymous Supabase Auth session, kept alive across app restarts — plain
// fetch against the Auth REST API, matching remoteCatalog.ts's convention of
// never bundling @supabase/supabase-js on-device. Gives every analytics_events
// row a stable auth.uid() (RLS requires it) without a signup screen.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const KEY_ACCESS_TOKEN = 'supabase_access_token';
const KEY_REFRESH_TOKEN = 'supabase_refresh_token';
const KEY_USER_ID = 'supabase_user_id';
const KEY_EXPIRES_AT = 'supabase_expires_at';

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string };
};

async function persistSession(auth: AuthResponse): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + auth.expires_in;
  await Promise.all([
    setSetting(KEY_ACCESS_TOKEN, auth.access_token),
    setSetting(KEY_REFRESH_TOKEN, auth.refresh_token),
    setSetting(KEY_USER_ID, auth.user.id),
    setSetting(KEY_EXPIRES_AT, String(expiresAt)),
  ]);
}

async function signInAnonymously(): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) throw new Error(`Anonymous sign-in failed: ${response.status}`);
  return response.json();
}

async function refreshSession(refreshToken: string): Promise<AuthResponse> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error(`Session refresh failed: ${response.status}`);
  return response.json();
}

// Returns a still-valid access token + user id, signing in or refreshing as
// needed. Callers treat a thrown error as "analytics unavailable this call"
// — never worth blocking the UI over.
export async function getSession(): Promise<{ accessToken: string; userId: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.');
  }

  const [accessToken, refreshToken, userId, expiresAt] = await Promise.all([
    getSetting(KEY_ACCESS_TOKEN),
    getSetting(KEY_REFRESH_TOKEN),
    getSetting(KEY_USER_ID),
    getSetting(KEY_EXPIRES_AT),
  ]);

  const stillValid = accessToken && userId && expiresAt && Number(expiresAt) - 60 > Date.now() / 1000;
  if (stillValid) {
    return { accessToken: accessToken!, userId: userId! };
  }

  const auth = refreshToken ? await refreshSession(refreshToken) : await signInAnonymously();
  await persistSession(auth);
  return { accessToken: auth.access_token, userId: auth.user.id };
}
