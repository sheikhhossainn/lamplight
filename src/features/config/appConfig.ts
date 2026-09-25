import { useSyncExternalStore } from 'react';
import {
  DEFAULT_APP_CONFIG,
  parseRemoteAppConfig,
  deserializeAppConfig,
  serializeAppConfig,
  type AppFeatureFlags,
} from './appConfigEngine';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const CONFIG_CACHE_KEY = 'remote_app_config_cache';

let currentConfig: AppFeatureFlags = { ...DEFAULT_APP_CONFIG };
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors
    }
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hydrates app configuration from local SQLite storage (schema v7 app_settings).
 * Safe to call on cold start before network access is established.
 */
export async function hydrateAppConfig(): Promise<AppFeatureFlags> {
  try {
    const { getSetting } = await import('@/db/repositories/appSettings');
    const cached = await getSetting(CONFIG_CACHE_KEY);
    if (cached) {
      currentConfig = deserializeAppConfig(cached);
      notify();
    }
  } catch {
    // Non-fatal if offline or DB not ready
  }
  return currentConfig;
}

/**
 * Fetches latest public app_config rows from Supabase, updates local SQLite cache,
 * and notifies active UI subscribers.
 */
export async function fetchRemoteAppConfig(): Promise<AppFeatureFlags> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return currentConfig;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_config?select=key,value,description`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return currentConfig;
    }

    const rows = await response.json();
    currentConfig = parseRemoteAppConfig(rows, currentConfig);
    notify();

    // Persist to local cache asynchronously
    void (async () => {
      try {
        const { setSetting } = await import('@/db/repositories/appSettings');
        await setSetting(CONFIG_CACHE_KEY, serializeAppConfig(currentConfig));
      } catch {
        // Non-critical cache write error
      }
    })();
  } catch {
    // Network offline or timeout — preserve current cache / defaults
  }

  return currentConfig;
}

/**
 * Synchronous snapshot getter for current configuration.
 */
export function getAppConfig(): AppFeatureFlags {
  return currentConfig;
}

/**
 * Synchronous individual flag getter.
 */
export function getAppFlag(key: keyof AppFeatureFlags): boolean {
  return currentConfig[key];
}

/**
 * React hook to observe the full feature flag configuration.
 */
export function useAppConfig(): AppFeatureFlags {
  return useSyncExternalStore(subscribe, getAppConfig);
}

/**
 * React hook to observe a single feature flag reactively.
 */
export function useAppFlag(key: keyof AppFeatureFlags): boolean {
  const config = useAppConfig();
  return config[key];
}
