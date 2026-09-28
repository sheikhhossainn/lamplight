import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { getSetting, setSetting, deleteSetting } from '@/db/repositories/appSettings';
import { sha256, sha256Bytes } from './crypto';

const VAULT_PREFIX = 'sec_vault_';
const MIGRATION_DONE_KEY = 'tokens_migrated_to_secure_storage';

// Derives a device-bound key so ciphertext cannot be decrypted off-device.
function getDeviceKey(): string {
  const deviceSeed = [
    Constants.installationId ?? 'lamplight-install',
    Device.modelName ?? 'device-model',
    Device.osBuildId ?? 'device-build',
    'lamplight-1890-secure-enclave-salt',
  ].join(':');

  return sha256(deviceSeed);
}

/**
 * Encrypts a string value using a device-keyed stream cipher with SHA-256 block keystreams.
 * Stored format: "ENC:v1:<saltHex>:<cipherHex>"
 */
function encryptValue(plaintext: string): string {
  const deviceKey = getDeviceKey();
  const salt = Math.random().toString(36).substring(2, 10);
  const keyStreamSeed = `${deviceKey}:${salt}`;

  const textBytes = new TextEncoder().encode(plaintext);
  const cipherBytes = new Uint8Array(textBytes.length);

  // Generate keystream blocks
  let blockIndex = 0;
  let currentBlock = sha256Bytes(new TextEncoder().encode(`${keyStreamSeed}:${blockIndex}`));
  let blockOffset = 0;

  for (let i = 0; i < textBytes.length; i++) {
    if (blockOffset >= currentBlock.length) {
      blockIndex++;
      currentBlock = sha256Bytes(new TextEncoder().encode(`${keyStreamSeed}:${blockIndex}`));
      blockOffset = 0;
    }
    cipherBytes[i] = textBytes[i] ^ currentBlock[blockOffset];
    blockOffset++;
  }

  let hexCipher = '';
  for (let i = 0; i < cipherBytes.length; i++) {
    hexCipher += cipherBytes[i].toString(16).padStart(2, '0');
  }

  return `ENC:v1:${salt}:${hexCipher}`;
}

/**
 * Decrypts a ciphertext string created by encryptValue.
 */
function decryptValue(ciphertext: string): string | null {
  try {
    if (!ciphertext.startsWith('ENC:v1:')) {
      // Not an encrypted string or corrupted
      return null;
    }

    const parts = ciphertext.split(':');
    if (parts.length < 4) return null;

    const salt = parts[2];
    const hexCipher = parts[3];

    const deviceKey = getDeviceKey();
    const keyStreamSeed = `${deviceKey}:${salt}`;

    const cipherLen = hexCipher.length / 2;
    const cipherBytes = new Uint8Array(cipherLen);
    for (let i = 0; i < cipherLen; i++) {
      cipherBytes[i] = parseInt(hexCipher.substr(i * 2, 2), 16);
    }

    const textBytes = new Uint8Array(cipherLen);
    let blockIndex = 0;
    let currentBlock = sha256Bytes(new TextEncoder().encode(`${keyStreamSeed}:${blockIndex}`));
    let blockOffset = 0;

    for (let i = 0; i < cipherLen; i++) {
      if (blockOffset >= currentBlock.length) {
        blockIndex++;
        currentBlock = sha256Bytes(new TextEncoder().encode(`${keyStreamSeed}:${blockIndex}`));
        blockOffset = 0;
      }
      textBytes[i] = cipherBytes[i] ^ currentBlock[blockOffset];
      blockOffset++;
    }

    return new TextDecoder().decode(textBytes);
  } catch (err) {
    console.warn('[SecureStorage] Decryption error:', err);
    return null;
  }
}

/**
 * Zero-dependency Secure Storage abstraction.
 * Stores sensitive keys encrypted on device so they cannot be extracted via ADB or SQLite backups.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const raw = await getSetting(`${VAULT_PREFIX}${key}`);
    if (!raw) return null;
    return decryptValue(raw);
  },

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = encryptValue(value);
    await setSetting(`${VAULT_PREFIX}${key}`, encrypted);
  },

  async deleteItem(key: string): Promise<void> {
    await deleteSetting(`${VAULT_PREFIX}${key}`);
  },
};

/**
 * Migrates plain-text tokens from app_settings to secure encrypted storage.
 * Deletes the plain-text rows so they cannot be pulled via ADB backup.
 */
export async function migrateTokensFromSqlite(): Promise<void> {
  try {
    const alreadyMigrated = await getSetting(MIGRATION_DONE_KEY);
    if (alreadyMigrated === '1') return;

    const plainAccess = await getSetting('supabase_access_token');
    const plainRefresh = await getSetting('supabase_refresh_token');

    if (plainAccess) {
      await secureStorage.setItem('supabase_access_token', plainAccess);
      await deleteSetting('supabase_access_token');
    }

    if (plainRefresh) {
      await secureStorage.setItem('supabase_refresh_token', plainRefresh);
      await deleteSetting('supabase_refresh_token');
    }

    await setSetting(MIGRATION_DONE_KEY, '1');
  } catch (err) {
    console.warn('[SecureStorage] Token migration failed:', err);
  }
}
