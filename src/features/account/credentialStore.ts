import { deleteSetting, getSetting } from '@/db/repositories/appSettings';

export type StoredCredentials = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresAt: number;
  isAnonymous: boolean;
  email: string | null;
};

export const SECURE_KEY_ACCESS_TOKEN = 'lamplight_auth_access_token';
export const SECURE_KEY_REFRESH_TOKEN = 'lamplight_auth_refresh_token';
export const SECURE_KEY_USER_ID = 'lamplight_auth_user_id';
export const SECURE_KEY_EXPIRES_AT = 'lamplight_auth_expires_at';
export const SECURE_KEY_IS_ANONYMOUS = 'lamplight_auth_is_anonymous';
export const SECURE_KEY_USER_EMAIL = 'lamplight_auth_user_email';

export const LEGACY_SETTING_ACCESS_TOKEN = 'supabase_access_token';
export const LEGACY_SETTING_REFRESH_TOKEN = 'supabase_refresh_token';
export const LEGACY_SETTING_USER_ID = 'supabase_user_id';
export const LEGACY_SETTING_EXPIRES_AT = 'supabase_expires_at';
export const LEGACY_SETTING_IS_ANONYMOUS = 'supabase_is_anonymous';
export const LEGACY_SETTING_USER_EMAIL = 'supabase_user_email';

export interface ISecureStoreAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

// In-memory fallback / mock store for unit testing and platforms where native secure store is unavailable
export class MemorySecureStoreAdapter implements ISecureStoreAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }
}

let secureStoreModule: typeof import('expo-secure-store') | null = null;
async function getNativeSecureStore(): Promise<typeof import('expo-secure-store') | null> {
  if (secureStoreModule) return secureStoreModule;
  try {
    secureStoreModule = await import('expo-secure-store');
    return secureStoreModule;
  } catch {
    return null;
  }
}

class NativeSecureStoreAdapter implements ISecureStoreAdapter {
  private memoryFallback = new MemorySecureStoreAdapter();

  async getItem(key: string): Promise<string | null> {
    try {
      const SecureStore = await getNativeSecureStore();
      if (!SecureStore) return this.memoryFallback.getItem(key);
      const isAvail = await SecureStore.isAvailableAsync().catch(() => false);
      if (!isAvail) return this.memoryFallback.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return this.memoryFallback.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const SecureStore = await getNativeSecureStore();
      if (!SecureStore) {
        await this.memoryFallback.setItem(key, value);
        return;
      }
      const isAvail = await SecureStore.isAvailableAsync().catch(() => false);
      if (!isAvail) {
        await this.memoryFallback.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('[CredentialStore] Failed to write secure key:', key, err);
      await this.memoryFallback.setItem(key, value);
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      const SecureStore = await getNativeSecureStore();
      if (!SecureStore) {
        await this.memoryFallback.deleteItem(key);
        return;
      }
      const isAvail = await SecureStore.isAvailableAsync().catch(() => false);
      if (!isAvail) {
        await this.memoryFallback.deleteItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('[CredentialStore] Failed to delete secure key:', key, err);
      await this.memoryFallback.deleteItem(key);
    }
  }
}

let activeAdapter: ISecureStoreAdapter = new NativeSecureStoreAdapter();

export function setSecureStoreAdapter(adapter: ISecureStoreAdapter): void {
  activeAdapter = adapter;
}

export function getSecureStoreAdapter(): ISecureStoreAdapter {
  return activeAdapter;
}

/**
 * Retrieves persisted authentication credentials from secure storage (AUTH-01).
 */
export async function getCredentials(
  adapter: ISecureStoreAdapter = activeAdapter,
): Promise<StoredCredentials | null> {
  const [accessToken, refreshToken, userId, expiresAtStr, isAnonymousStr, email] =
    await Promise.all([
      adapter.getItem(SECURE_KEY_ACCESS_TOKEN),
      adapter.getItem(SECURE_KEY_REFRESH_TOKEN),
      adapter.getItem(SECURE_KEY_USER_ID),
      adapter.getItem(SECURE_KEY_EXPIRES_AT),
      adapter.getItem(SECURE_KEY_IS_ANONYMOUS),
      adapter.getItem(SECURE_KEY_USER_EMAIL),
    ]);

  if (!userId) return null;

  return {
    accessToken: accessToken ?? '',
    refreshToken: refreshToken ?? '',
    userId,
    expiresAt: expiresAtStr ? Number(expiresAtStr) : 0,
    isAnonymous: isAnonymousStr === 'true',
    email: email && email.length > 0 ? email : null,
  };
}

/**
 * Persists full authentication credentials into secure storage (AUTH-01).
 */
export async function saveCredentials(
  creds: StoredCredentials,
  adapter: ISecureStoreAdapter = activeAdapter,
): Promise<void> {
  await Promise.all([
    adapter.setItem(SECURE_KEY_ACCESS_TOKEN, creds.accessToken),
    adapter.setItem(SECURE_KEY_REFRESH_TOKEN, creds.refreshToken),
    adapter.setItem(SECURE_KEY_USER_ID, creds.userId),
    adapter.setItem(SECURE_KEY_EXPIRES_AT, String(creds.expiresAt)),
    adapter.setItem(SECURE_KEY_IS_ANONYMOUS, String(creds.isAnonymous)),
    adapter.setItem(SECURE_KEY_USER_EMAIL, creds.email ?? ''),
  ]);
}

/**
 * Clears all authentication credentials from secure storage (AUTH-01).
 */
export async function clearCredentials(
  adapter: ISecureStoreAdapter = activeAdapter,
): Promise<void> {
  await Promise.all([
    adapter.deleteItem(SECURE_KEY_ACCESS_TOKEN),
    adapter.deleteItem(SECURE_KEY_REFRESH_TOKEN),
    adapter.deleteItem(SECURE_KEY_USER_ID),
    adapter.deleteItem(SECURE_KEY_EXPIRES_AT),
    adapter.deleteItem(SECURE_KEY_IS_ANONYMOUS),
    adapter.deleteItem(SECURE_KEY_USER_EMAIL),
  ]);
}

export type MigrationDependencies = {
  getLegacySetting: (key: string) => Promise<string | null>;
  deleteLegacySetting: (key: string) => Promise<void>;
  adapter: ISecureStoreAdapter;
};

/**
 * Idempotent, interruption-safe migration of credentials from SQLite app_settings to secure storage (AUTH-01).
 * Deletes legacy tokens from SQLite only after all secure writes succeed.
 */
export async function migrateLegacyCredentials(
  deps?: Partial<MigrationDependencies>,
): Promise<{ migrated: boolean; error?: string }> {
  const getLegacy = deps?.getLegacySetting ?? getSetting;
  const deleteLegacy = deps?.deleteLegacySetting ?? deleteSetting;
  const adapter = deps?.adapter ?? activeAdapter;

  try {
    // 1. Check if secure storage already has credentials
    const existingUserId = await adapter.getItem(SECURE_KEY_USER_ID);
    if (existingUserId) {
      // Already migrated or initialized in secure storage
      return { migrated: false };
    }

    // 2. Check if legacy SQLite settings has a user ID
    const legacyUserId = await getLegacy(LEGACY_SETTING_USER_ID);
    if (!legacyUserId) {
      // Nothing to migrate
      return { migrated: false };
    }

    // Read all legacy fields
    const [legacyAccessToken, legacyRefreshToken, legacyExpiresAt, legacyIsAnon, legacyEmail] =
      await Promise.all([
        getLegacy(LEGACY_SETTING_ACCESS_TOKEN),
        getLegacy(LEGACY_SETTING_REFRESH_TOKEN),
        getLegacy(LEGACY_SETTING_EXPIRES_AT),
        getLegacy(LEGACY_SETTING_IS_ANONYMOUS),
        getLegacy(LEGACY_SETTING_USER_EMAIL),
      ]);

    // 3. Write all values into secure storage FIRST
    await Promise.all([
      adapter.setItem(SECURE_KEY_USER_ID, legacyUserId),
      adapter.setItem(SECURE_KEY_ACCESS_TOKEN, legacyAccessToken ?? ''),
      adapter.setItem(SECURE_KEY_REFRESH_TOKEN, legacyRefreshToken ?? ''),
      adapter.setItem(SECURE_KEY_EXPIRES_AT, legacyExpiresAt ?? '0'),
      adapter.setItem(SECURE_KEY_IS_ANONYMOUS, legacyIsAnon ?? 'true'),
      adapter.setItem(SECURE_KEY_USER_EMAIL, legacyEmail ?? ''),
    ]);

    // 4. ONLY AFTER all secure writes succeed, purge sensitive tokens from SQLite app_settings
    await Promise.all([
      deleteLegacy(LEGACY_SETTING_ACCESS_TOKEN),
      deleteLegacy(LEGACY_SETTING_REFRESH_TOKEN),
      deleteLegacy(LEGACY_SETTING_USER_ID),
      deleteLegacy(LEGACY_SETTING_EXPIRES_AT),
      deleteLegacy(LEGACY_SETTING_IS_ANONYMOUS),
      deleteLegacy(LEGACY_SETTING_USER_EMAIL),
    ]);

    return { migrated: true };
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || 'Migration failed';
    console.warn('[CredentialStore] Migration error:', errorMsg);
    return { migrated: false, error: errorMsg };
  }
}
