import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearCredentials,
  getCredentials,
  MemorySecureStoreAdapter,
  migrateLegacyCredentials,
  saveCredentials,
  SECURE_KEY_ACCESS_TOKEN,
  SECURE_KEY_REFRESH_TOKEN,
  SECURE_KEY_USER_ID,
  LEGACY_SETTING_ACCESS_TOKEN,
  LEGACY_SETTING_REFRESH_TOKEN,
  LEGACY_SETTING_USER_ID,
  LEGACY_SETTING_EXPIRES_AT,
  LEGACY_SETTING_IS_ANONYMOUS,
  LEGACY_SETTING_USER_EMAIL,
  type StoredCredentials,
} from '../src/features/account/credentialStore';

test('AUTH-01: Fresh anonymous session saves and retrieves credentials securely', async () => {
  const adapter = new MemorySecureStoreAdapter();

  const creds: StoredCredentials = {
    accessToken: 'test-jwt-access-token-123',
    refreshToken: 'test-refresh-token-456',
    userId: 'user-uuid-abc-789',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    isAnonymous: true,
    email: null,
  };

  await saveCredentials(creds, adapter);

  const restored = await getCredentials(adapter);
  assert.ok(restored, 'Restored credentials must exist');
  assert.equal(restored.accessToken, 'test-jwt-access-token-123');
  assert.equal(restored.refreshToken, 'test-refresh-token-456');
  assert.equal(restored.userId, 'user-uuid-abc-789');
  assert.equal(restored.isAnonymous, true);
  assert.equal(restored.email, null);
  assert.equal(restored.expiresAt, creds.expiresAt);
});

test('AUTH-01: Protected email session persists user email accurately', async () => {
  const adapter = new MemorySecureStoreAdapter();

  const creds: StoredCredentials = {
    accessToken: 'protected-token-999',
    refreshToken: 'protected-refresh-888',
    userId: 'user-protected-uuid',
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
    isAnonymous: false,
    email: 'reader@example.com',
  };

  await saveCredentials(creds, adapter);

  const restored = await getCredentials(adapter);
  assert.ok(restored);
  assert.equal(restored.userId, 'user-protected-uuid');
  assert.equal(restored.isAnonymous, false);
  assert.equal(restored.email, 'reader@example.com');
});

test('AUTH-01: Migration from existing SQLite credentials into secure storage', async () => {
  const adapter = new MemorySecureStoreAdapter();
  const legacySqliteDb: Record<string, string> = {
    [LEGACY_SETTING_ACCESS_TOKEN]: 'legacy-token-secret-111',
    [LEGACY_SETTING_REFRESH_TOKEN]: 'legacy-refresh-secret-222',
    [LEGACY_SETTING_USER_ID]: 'user-migrated-uuid-555',
    [LEGACY_SETTING_EXPIRES_AT]: '1800000000',
    [LEGACY_SETTING_IS_ANONYMOUS]: 'false',
    [LEGACY_SETTING_USER_EMAIL]: 'legacy-reader@lamplight.test',
  };

  const getLegacySetting = async (key: string) => legacySqliteDb[key] ?? null;
  const deleteLegacySetting = async (key: string) => {
    delete legacySqliteDb[key];
  };

  const result = await migrateLegacyCredentials({
    adapter,
    getLegacySetting,
    deleteLegacySetting,
  });

  assert.equal(result.migrated, true);

  // 1. Invariant: Secure storage now contains the credentials
  const secureCreds = await getCredentials(adapter);
  assert.ok(secureCreds);
  assert.equal(secureCreds.userId, 'user-migrated-uuid-555');
  assert.equal(secureCreds.accessToken, 'legacy-token-secret-111');
  assert.equal(secureCreds.refreshToken, 'legacy-refresh-secret-222');
  assert.equal(secureCreds.isAnonymous, false);
  assert.equal(secureCreds.email, 'legacy-reader@lamplight.test');

  // 2. Invariant: Sensitive keys were deleted from SQLite app_settings
  assert.equal(legacySqliteDb[LEGACY_SETTING_ACCESS_TOKEN], undefined);
  assert.equal(legacySqliteDb[LEGACY_SETTING_REFRESH_TOKEN], undefined);
  assert.equal(legacySqliteDb[LEGACY_SETTING_USER_ID], undefined);
  assert.equal(legacySqliteDb[LEGACY_SETTING_EXPIRES_AT], undefined);
});

test('AUTH-01: Migration is idempotent and never overwrites existing secure credentials', async () => {
  const adapter = new MemorySecureStoreAdapter();

  // Already active credentials in secure storage
  await adapter.setItem(SECURE_KEY_USER_ID, 'active-user-999');
  await adapter.setItem(SECURE_KEY_ACCESS_TOKEN, 'active-token-999');

  const legacySqliteDb: Record<string, string> = {
    [LEGACY_SETTING_USER_ID]: 'old-stale-user-000',
    [LEGACY_SETTING_ACCESS_TOKEN]: 'old-stale-token-000',
  };

  const result = await migrateLegacyCredentials({
    adapter,
    getLegacySetting: async (k) => legacySqliteDb[k] ?? null,
    deleteLegacySetting: async (k) => {
      delete legacySqliteDb[k];
    },
  });

  assert.equal(result.migrated, false);
  const creds = await getCredentials(adapter);
  assert.equal(creds?.userId, 'active-user-999');
});

test('AUTH-01: Interrupted or failed migration preserves SQLite credentials safely', async () => {
  const failingAdapter = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error('OS Keychain lock error');
    },
    deleteItem: async () => {},
  };

  const legacySqliteDb: Record<string, string> = {
    [LEGACY_SETTING_USER_ID]: 'user-safe-uuid-777',
    [LEGACY_SETTING_ACCESS_TOKEN]: 'safe-token-777',
  };

  const deleteCalls: string[] = [];

  const result = await migrateLegacyCredentials({
    adapter: failingAdapter,
    getLegacySetting: async (k) => legacySqliteDb[k] ?? null,
    deleteLegacySetting: async (k) => {
      deleteCalls.push(k);
    },
  });

  assert.equal(result.migrated, false);
  assert.ok(result.error);
  // Crucial safety guarantee: legacy tokens were NOT deleted because secure writes failed!
  assert.equal(deleteCalls.length, 0);
  assert.equal(legacySqliteDb[LEGACY_SETTING_USER_ID], 'user-safe-uuid-777');
});

test('AUTH-01: Clear credentials purges all tokens from secure storage on sign-out', async () => {
  const adapter = new MemorySecureStoreAdapter();

  await saveCredentials(
    {
      accessToken: 'temp-access',
      refreshToken: 'temp-refresh',
      userId: 'user-to-sign-out',
      expiresAt: 9999999,
      isAnonymous: false,
      email: 'signedout@lamplight.test',
    },
    adapter,
  );

  assert.ok(await getCredentials(adapter));

  await clearCredentials(adapter);

  const afterSignOut = await getCredentials(adapter);
  assert.equal(afterSignOut, null);
  assert.equal(await adapter.getItem(SECURE_KEY_ACCESS_TOKEN), null);
  assert.equal(await adapter.getItem(SECURE_KEY_REFRESH_TOKEN), null);
  assert.equal(await adapter.getItem(SECURE_KEY_USER_ID), null);
});
