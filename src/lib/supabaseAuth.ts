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

/**
 * Initiates linking an email address to the current anonymous guest session.
 * If the email is already registered to an existing account, returns `requiresMerge: true`.
 */
export async function linkEmailToGuest(
  email: string,
): Promise<{ success: boolean; requiresMerge?: boolean; message?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Supabase configuration missing.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const session = await getSession();

    // In Supabase, linking an email to the current authenticated user is done via PUT /auth/v1/user
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = (
        err.msg ||
        err.message ||
        err.error_description ||
        ''
      ).toLowerCase();

      // Check if email already belongs to an existing account
      if (
        res.status === 422 ||
        res.status === 400 ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('already registered') ||
        errorMsg.includes('identity') ||
        errorMsg.includes('conflict')
      ) {
        return {
          success: false,
          requiresMerge: true,
          message: 'This email belongs to an existing account.',
        };
      }

      return {
        success: false,
        message: err.msg || err.error_description || 'Failed to send verification code.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || 'Network error linking email.',
    };
  }
}

/**
 * Verifies the OTP code for linking an email to the current guest account,
 * upgrading the session to protected without losing the existing Supabase user ID.
 */
export async function verifyGuestEmailLink(
  email: string,
  token: string,
): Promise<{ success: boolean; message?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Supabase configuration missing.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  try {
    const session = await getSession();

    // 1. Try email_change verification with the active user bearer token
    const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email_change',
        email: normalizedEmail,
        token: trimmedToken,
      }),
    });

    if (res.ok) {
      const auth = (await res.json()) as AuthResponse;
      auth.user.is_anonymous = false;
      auth.user.email = normalizedEmail;
      await persistSession(auth);
      return { success: true };
    }

    // 2. Fallback to standard email OTP verify if email_change was not used
    const fallbackRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        email: normalizedEmail,
        token: trimmedToken,
      }),
    });

    if (!fallbackRes.ok) {
      const err = await fallbackRes.json().catch(() => ({}));
      return {
        success: false,
        message: err.msg || err.error_description || 'Invalid or expired verification code.',
      };
    }

    const auth = (await fallbackRes.json()) as AuthResponse;
    auth.user.is_anonymous = false;
    auth.user.email = normalizedEmail;
    await persistSession(auth);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || 'Network error verifying email link.',
    };
  }
}

/**
 * Signs out the current account, prompting whether to keep or remove local reading data.
 */
export async function signOutUser(keepLocalData: boolean = true): Promise<void> {
  // 1. Clear session tokens
  await Promise.all([
    setSetting(KEY_ACCESS_TOKEN, ''),
    setSetting(KEY_REFRESH_TOKEN, ''),
    setSetting(KEY_USER_ID, ''),
    setSetting(KEY_EXPIRES_AT, ''),
    setSetting(KEY_IS_ANONYMOUS, 'true'),
    setSetting(KEY_USER_EMAIL, ''),
  ]);

  // 2. If user chooses to remove local data from this device, wipe user-owned tables
  if (!keepLocalData) {
    const { getDb } = await import('@/db/client');
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM saved_words');
      await db.runAsync('DELETE FROM highlights');
      await db.runAsync('DELETE FROM reading_positions');
      await db.runAsync('DELETE FROM shelves');
      await db.runAsync('DELETE FROM shelf_items');
      await db.runAsync('DELETE FROM review_events');
      await db.runAsync('DELETE FROM quiz_attempts');
      await db.runAsync('DELETE FROM sync_outbox');
      await db.runAsync('DELETE FROM sync_cursor');
      await db.runAsync('DELETE FROM pending_word_lookups');
      await db.runAsync('DELETE FROM reading_sessions');
      await db.runAsync('DELETE FROM sync_merge_journal');
    });
  }

  // 3. Immediately re-initialize a fresh anonymous guest session
  try {
    const newAuth = await signInAnonymously();
    await persistSession(newAuth);
  } catch (err) {
    console.warn('[Auth] Failed to initialize new guest session on sign-out:', err);
  }
}

const KEY_USER_DISPLAY_NAME = 'user_display_name';

/**
 * Returns cached or cloud profile information for the current user.
 */
export async function getUserProfile(): Promise<{
  displayName: string;
  email: string | null;
  isProtected: boolean;
  createdAt: string | null;
}> {
  const [email, isProtected, localName] = await Promise.all([
    getUserEmail(),
    isAuthenticatedAccount(),
    getSetting(KEY_USER_DISPLAY_NAME),
  ]);

  let displayName = localName || (email ? email.split('@')[0] : 'Guest Reader');
  let createdAt: string | null = null;

  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const session = await getSession();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.userId}&select=display_name,created_at`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ display_name?: string; created_at?: string }>;
        if (rows && rows[0]) {
          if (rows[0].display_name) {
            displayName = rows[0].display_name;
            await setSetting(KEY_USER_DISPLAY_NAME, displayName);
          }
          if (rows[0].created_at) {
            createdAt = rows[0].created_at;
          }
        }
      }
    }
  } catch {
    // Offline or guest
  }

  return {
    displayName,
    email,
    isProtected,
    createdAt,
  };
}

/**
 * Updates the user's display name with server and local persistence.
 */
export async function updateUserProfile(
  newName: string,
): Promise<{ success: boolean; message?: string }> {
  const sanitized = newName.trim().slice(0, 50);
  if (!sanitized) {
    return { success: false, message: 'Display name cannot be empty.' };
  }

  // Update local setting first
  await setSetting(KEY_USER_DISPLAY_NAME, sanitized);

  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const session = await getSession();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.userId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ display_name: sanitized }),
      });

      if (!res.ok) {
        return { success: false, message: 'Failed to update remote profile.' };
      }
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, message: (err as Error)?.message || 'Network error updating profile.' };
  }
}

/**
 * Permanently deletes the user's account and cloud data via security definer RPC.
 */
export async function deleteAccount(
  wipeLocalData: boolean = true,
): Promise<{ success: boolean; message?: string }> {
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const session = await getSession();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_user_account`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: err.message || 'Failed to delete account on server. Please try again.',
        };
      }
    }

    // Sign out and clear tokens / data
    await signOutUser(!wipeLocalData);
    await setSetting(KEY_USER_DISPLAY_NAME, '');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, message: (err as Error)?.message || 'Network error deleting account.' };
  }
}

/**
 * Lightweight network connectivity check.
 */
export async function isOnline(): Promise<boolean> {
  if (!SUPABASE_URL) return false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok || res.status === 404 || res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

