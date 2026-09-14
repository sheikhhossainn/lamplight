import type { ScriptureInquiryResult } from './scriptureInquiryApi';
import type { TraditionKey } from './curatedScriptureQA';

export type CachedInquiryItem = {
  id: string;
  query: string;
  normalizedQuery: string;
  timestamp: number;
  traditionSummary: {
    tradition: TraditionKey;
    traditionName: string;
    verseCount: number;
  }[];
  result: ScriptureInquiryResult;
};

// In-memory hot cache for synchronous instant lookups during the active session
const memoryCache = new Map<string, CachedInquiryItem>();
let memoryCacheLoaded = false;

function getCacheFile(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoFS = require('expo-file-system');
    if (!ExpoFS?.Paths?.document) return null;
    const dir = new ExpoFS.Directory(ExpoFS.Paths.document, 'inquiry_cache');
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
    return new ExpoFS.File(dir, 'recent_inquiries.json');
  } catch {
    return null;
  }
}

export function normalizeInquiryQuery(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Loads cached inquiries from disk into memory.
 */
async function loadDiskCache(): Promise<CachedInquiryItem[]> {
  try {
    const file = getCacheFile();
    if (!file || !file.exists) {
      memoryCacheLoaded = true;
      return Array.from(memoryCache.values());
    }
    const text = await file.text();
    if (!text || !text.trim()) {
      memoryCacheLoaded = true;
      return [];
    }
    const parsed = JSON.parse(text) as CachedInquiryItem[];
    if (Array.isArray(parsed)) {
      memoryCache.clear();
      for (const item of parsed) {
        memoryCache.set(item.normalizedQuery, item);
      }
      memoryCacheLoaded = true;
      return parsed;
    }
    memoryCacheLoaded = true;
    return [];
  } catch {
    memoryCacheLoaded = true;
    return [];
  }
}

/**
 * Persists the current in-memory items to disk.
 */
async function persistDiskCache(items: CachedInquiryItem[]): Promise<void> {
  try {
    const file = getCacheFile();
    if (!file) return;
    await file.write(JSON.stringify(items));
  } catch {
    // Non-fatal disk write error
  }
}

/**
 * Retrieves a cached inquiry if the question was already answered.
 * Checks memory cache first, then disk.
 */
export async function getCachedInquiry(query: string): Promise<ScriptureInquiryResult | null> {
  const norm = normalizeInquiryQuery(query);
  if (!norm) return null;

  if (!memoryCacheLoaded) {
    await loadDiskCache();
  }

  const found = memoryCache.get(norm);
  if (found) {
    return {
      ...found.result,
      isFromCache: true,
    };
  }

  return null;
}

/**
 * Saves an inquiry result into the device's persistent cache.
 * Avoids duplicate entries by updating the existing item and moving it to the top.
 */
export async function saveInquiryToCache(
  query: string,
  result: ScriptureInquiryResult,
): Promise<void> {
  const norm = normalizeInquiryQuery(query);
  if (!norm) return;

  if (!memoryCacheLoaded) {
    await loadDiskCache();
  }

  const traditionSummary = result.traditions.map((t) => ({
    tradition: t.tradition,
    traditionName: t.traditionName,
    verseCount: t.verses.length,
  }));

  const newItem: CachedInquiryItem = {
    id: result.id || `inq-${Date.now()}`,
    query: query.trim(),
    normalizedQuery: norm,
    timestamp: Date.now(),
    traditionSummary,
    result: {
      ...result,
      isFromCache: true,
    },
  };

  // Remove existing duplicate if present
  memoryCache.delete(norm);
  memoryCache.set(norm, newItem);

  // Convert map values to array, newest first, cap at 40 items
  const items = Array.from(memoryCache.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 40);

  memoryCache.clear();
  for (const it of items) {
    memoryCache.set(it.normalizedQuery, it);
  }

  await persistDiskCache(items);
}

/**
 * Returns all recent inquiries stored on this device, ordered by newest first.
 */
export async function getRecentInquiries(): Promise<CachedInquiryItem[]> {
  if (!memoryCacheLoaded) {
    return await loadDiskCache();
  }
  return Array.from(memoryCache.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Removes a specific inquiry from device cache.
 */
export async function removeCachedInquiry(id: string): Promise<void> {
  if (!memoryCacheLoaded) {
    await loadDiskCache();
  }
  for (const [key, item] of memoryCache.entries()) {
    if (item.id === id) {
      memoryCache.delete(key);
      break;
    }
  }
  const items = Array.from(memoryCache.values()).sort((a, b) => b.timestamp - a.timestamp);
  await persistDiskCache(items);
}

/**
 * Clears all cached inquiries on device.
 */
export async function clearInquiryCache(): Promise<void> {
  memoryCache.clear();
  memoryCacheLoaded = true;
  await persistDiskCache([]);
}
