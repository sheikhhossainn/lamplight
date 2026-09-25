/**
 * Remote App Configuration & Feature Flags Engine (REL-02 / FULLAPP §7.3).
 *
 * Provides typed feature flags, safe defaults, malformed input protection,
 * and emergency kill-switch controls without overriding entitlement authority.
 */

export type AppFeatureFlags = {
  /** Visibility of subscription paywalls, marketing promos, and upgrade badges. */
  premium_visibility_enabled: boolean;
  /** Kill switch for conversational AI companion / interactive tutor. */
  ai_companion_enabled: boolean;
  /** Kill switch for server-side literary AI translations and context analysis. */
  literary_ai_translation_enabled: boolean;
  /** Kill switch for voice audio transcription Edge Function. */
  voice_transcription_enabled: boolean;
  /** Kill switch for comparative scripture inquiry. */
  scripture_inquiry_enabled: boolean;
  /** Kill switch for scripture mood deck entry cards. */
  mood_deck_entry_enabled: boolean;
  /** Emergency kill switch for ambient sound playback. */
  ambient_sounds_enabled: boolean;
  /** Emergency kill switch for weekly vocabulary quiz. */
  weekly_quiz_enabled: boolean;
};

export const DEFAULT_APP_CONFIG: Readonly<AppFeatureFlags> = {
  premium_visibility_enabled: true,
  ai_companion_enabled: false, // Default false until safety and companions are officially enabled
  literary_ai_translation_enabled: true,
  voice_transcription_enabled: true,
  scripture_inquiry_enabled: true,
  mood_deck_entry_enabled: true,
  ambient_sounds_enabled: true,
  weekly_quiz_enabled: true,
};

export type RemoteConfigRow = {
  key: string;
  value: unknown;
  description?: string | null;
};

/**
 * Coerces unknown / JSON remote values into safe booleans.
 * Handles boolean literals, strings ("true", "false", "1", "0"), numbers (1, 0).
 */
export function coerceBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1' || trimmed === '"true"') return true;
    if (trimmed === 'false' || trimmed === '0' || trimmed === '"false"') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return defaultValue;
}

/**
 * Parses and validates an array of remote rows (from public.app_config) into typed AppFeatureFlags.
 * Unknown keys are safely ignored.
 * Missing or malformed keys gracefully fall back to DEFAULT_APP_CONFIG.
 */
export function parseRemoteAppConfig(
  rows: unknown,
  baseConfig: AppFeatureFlags = DEFAULT_APP_CONFIG,
): AppFeatureFlags {
  if (!Array.isArray(rows)) {
    return { ...baseConfig };
  }

  const result: AppFeatureFlags = { ...baseConfig };

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { key, value } = row as { key?: unknown; value?: unknown };
    if (typeof key !== 'string' || !(key in DEFAULT_APP_CONFIG)) {
      continue;
    }

    const typedKey = key as keyof AppFeatureFlags;
    const defaultVal = DEFAULT_APP_CONFIG[typedKey];
    result[typedKey] = coerceBoolean(value, defaultVal);
  }

  return result;
}

/**
 * Serializes local cached config to JSON.
 */
export function serializeAppConfig(config: AppFeatureFlags): string {
  return JSON.stringify(config);
}

/**
 * Deserializes cached config from JSON, falling back to safe defaults for any missing or corrupt fields.
 */
export function deserializeAppConfig(raw: string | null): AppFeatureFlags {
  if (!raw) return { ...DEFAULT_APP_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_APP_CONFIG };
    const result = { ...DEFAULT_APP_CONFIG };
    for (const key of Object.keys(DEFAULT_APP_CONFIG) as Array<keyof AppFeatureFlags>) {
      if (key in parsed) {
        result[key] = coerceBoolean(parsed[key], DEFAULT_APP_CONFIG[key]);
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_APP_CONFIG };
  }
}
