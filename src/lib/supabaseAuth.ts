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
const KEY_USER_EMAIL = 'supabase_user_email';
const KEY_IS_ANONYMOUS = 'supabase_is_anonymous';

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    is_anonymous?: boolean;
  };
};

async function persistSession(auth: AuthResponse): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + auth.expires_in;
  const isAnonymous = Boolean(auth.user.is_anonymous ?? !auth.user.email);
  await Promise.all([
    setSetting(KEY_ACCESS_TOKEN, auth.access_token),
    setSetting(KEY_REFRESH_TOKEN, auth.refresh_token),
    setSetting(KEY_USER_ID, auth.user.id),
    setSetting(KEY_EXPIRES_AT, String(expiresAt)),
    setSetting(KEY_IS_ANONYMOUS, String(isAnonymous)),
    setSetting(KEY_USER_EMAIL, auth.user.email ?? ''),
  ]);
}

async function signInAnonymously(): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Anonymous sign-in failed: ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshSession(refreshToken: string): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Session refresh failed: ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Checks whether the current user is authenticated with a permanent protected account (e.g. email)
 * rather than a temporary anonymous guest.
 */
export async function isAuthenticatedAccount(): Promise<boolean> {
  const [userId, isAnon, email] = await Promise.all([
    getSetting(KEY_USER_ID),
    getSetting(KEY_IS_ANONYMOUS),
    getSetting(KEY_USER_EMAIL),
  ]);
  return Boolean(userId && isAnon === 'false' && email);
}

/**
 * Returns the current authenticated account's email, or null if guest.
 */
export async function getUserEmail(): Promise<string | null> {
  const email = await getSetting(KEY_USER_EMAIL);
  return email && email.length > 0 ? email : null;
}

/**
 * Returns the stable user ID for telemetry and local indexing.
 */
export async function getUserId(): Promise<string | null> {
  return getSetting(KEY_USER_ID);
}

/**
 * Returns a still-valid access token + user id, signing in or refreshing as
 * needed. Callers treat a thrown error as "analytics unavailable this call"
 * — never worth blocking the UI over.
 */
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

/**
 * Sends a 6-digit OTP code to an email to link/protect the account or sign in.
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; message?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Supabase configuration missing.' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), create_user: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.msg || err.error_description || 'Failed to send OTP code.' };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, message: (err as Error)?.message || 'Network error sending OTP.' };
  }
}

/**
 * Verifies the 6-digit OTP code and persists the authenticated user session.
 */
export async function verifyEmailOtp(email: string, token: string): Promise<{ success: boolean; message?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Supabase configuration missing.' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email: email.trim(), token: token.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.msg || err.error_description || 'Invalid or expired code.' };
    }
    const auth = (await res.json()) as AuthResponse;
    await persistSession(auth);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, message: (err as Error)?.message || 'Network error verifying code.' };
  }
}

