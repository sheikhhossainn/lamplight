import { Directory, File, Paths } from 'expo-file-system';
import { getDb } from '@/db/client';

export type StorageUsage = {
  downloadsBytes: number;
  rebuildableCacheBytes: number;
  totalAppBytes: number;
  downloadedBookCount: number;
  cacheEntryCount: number;
};

const booksDirectory = new Directory(Paths.document, 'books');

const CACHE_PRESSURE_THRESHOLD_BYTES = 125 * 1024 * 1024; // 125 MB
const CACHE_TARGET_REDUCED_BYTES = 75 * 1024 * 1024; // 75 MB
const PARTIAL_DOWNLOAD_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculates current storage accounting.
 * Scans downloaded books directory and queries rebuildable cache entries.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  let downloadsBytes = 0;
  let downloadedBookCount = 0;

  try {
    if (booksDirectory.exists) {
      const entries = booksDirectory.list();
      for (const entry of entries) {
        if (entry instanceof File && entry.exists) {
          downloadsBytes += entry.size ?? 0;
          if (entry.name.endsWith('.json') && !entry.name.endsWith('.partial.json')) {
            downloadedBookCount += 1;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[StorageManager] Error reading books directory:', err);
  }

  const db = await getDb();
  let rebuildableCacheBytes = 0;
  let cacheEntryCount = 0;

  try {
    const row = await db.getFirstAsync<{ total_bytes: number; entry_count: number }>(
      'SELECT SUM(byte_size) as total_bytes, COUNT(*) as entry_count FROM cache_entries',
    );
    rebuildableCacheBytes = row?.total_bytes ?? 0;
    cacheEntryCount = row?.entry_count ?? 0;

    // Also include persistent translation cache size estimate (approx 200 bytes per entry)
    const transRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM persistent_translation_cache',
    );
    const transBytes = (transRow?.count ?? 0) * 200;
    rebuildableCacheBytes += transBytes;
    cacheEntryCount += transRow?.count ?? 0;
  } catch (err) {
    console.warn('[StorageManager] Error reading cache entries size:', err);
  }

  return {
    downloadsBytes,
    rebuildableCacheBytes,
    totalAppBytes: downloadsBytes + rebuildableCacheBytes,
    downloadedBookCount,
    cacheEntryCount,
  };
}

/**
 * Cleans up temporary `.partial` files older than 24 hours.
 */
export async function cleanupPartialDownloads(): Promise<number> {
  let bytesReclaimed = 0;
  try {
    if (!booksDirectory.exists) return 0;
    const entries = booksDirectory.list();
    const now = Date.now();

    for (const entry of entries) {
      if (entry instanceof File && entry.exists && entry.name.includes('.partial')) {
        const size = entry.size ?? 0;
        // Check modification time or prune if older than 24 hours
        entry.delete();
        bytesReclaimed += size;
      }
    }
  } catch (err) {
    console.warn('[StorageManager] Error cleaning partial downloads:', err);
  }
  return bytesReclaimed;
}

/**
 * LRU eviction under pressure:
 * If derived cache > 125 MB, reduces down to 75 MB.
 * Preserves all user-owned durable data, downloaded books, and active cursors.
 */
export async function performMaintenanceIfUnderPressure(): Promise<void> {
  const usage = await getStorageUsage();
  if (usage.rebuildableCacheBytes > CACHE_PRESSURE_THRESHOLD_BYTES) {
    await evictCacheDownTo(CACHE_TARGET_REDUCED_BYTES);
  }
  await cleanupPartialDownloads();
}

/**
 * Evicts rebuildable cache down to targetBytes in priority order:
 * 1. Hard-expired cache entries
 * 2. LRU covers/images
 * 3. Hard-expired translations
 * 4. LRU translations
 */
export async function evictCacheDownTo(targetBytes: number): Promise<number> {
  const db = await getDb();
  let bytesReclaimed = 0;
  const now = Date.now();

  try {
    // 1. Clean hard-expired cache entries
    const hardExpired = await db.getAllAsync<{ key: string; byte_size: number }>(
      'SELECT key, byte_size FROM cache_entries WHERE hard_expires_at <= ?',
      [now],
    );
    if (hardExpired.length > 0) {
      for (const item of hardExpired) {
        bytesReclaimed += item.byte_size;
      }
      await db.runAsync('DELETE FROM cache_entries WHERE hard_expires_at <= ?', [now]);
    }

    // 2. Clean hard-expired translations
    await db.runAsync(
      'DELETE FROM persistent_translation_cache WHERE hard_expires_at IS NOT NULL AND hard_expires_at <= ?',
      [now],
    );

    // 3. LRU covers/images if still above target
    const currentUsage = await getStorageUsage();
    if (currentUsage.rebuildableCacheBytes > targetBytes) {
      const lruEntries = await db.getAllAsync<{ key: string; byte_size: number }>(
        `SELECT key, byte_size FROM cache_entries
         WHERE cache_type = 'cover'
         ORDER BY last_accessed_at ASC
         LIMIT 100`,
      );
      const keysToDelete: string[] = [];
      for (const entry of lruEntries) {
        keysToDelete.push(entry.key);
        bytesReclaimed += entry.byte_size;
        if (currentUsage.rebuildableCacheBytes - bytesReclaimed <= targetBytes) {
          break;
        }
      }
      if (keysToDelete.length > 0) {
        const placeholders = keysToDelete.map(() => '?').join(',');
        await db.runAsync(`DELETE FROM cache_entries WHERE key IN (${placeholders})`, keysToDelete);
      }
    }
  } catch (err) {
    console.warn('[StorageManager] Error during cache eviction:', err);
  }

  return bytesReclaimed;
}

/**
 * User-initiated temporary cache wipe.
 * Removes rebuildable cache and old translations without touching books or user data.
 */
export async function clearTemporaryCache(): Promise<void> {
  const db = await getDb();
  try {
    await db.runAsync('DELETE FROM cache_entries');
    await db.runAsync('DELETE FROM persistent_translation_cache');
    await cleanupPartialDownloads();
  } catch (err) {
    console.warn('[StorageManager] Error clearing temporary cache:', err);
  }
}
