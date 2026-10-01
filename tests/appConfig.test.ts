import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_CONFIG,
  parseRemoteAppConfig,
  deserializeAppConfig,
  serializeAppConfig,
  coerceBoolean,
  type AppFeatureFlags,
} from '../src/features/config/appConfigEngine';

test('REL-02 DEFAULT_APP_CONFIG contains typed defaults for all feature flags', () => {
  assert.equal(DEFAULT_APP_CONFIG.premium_visibility_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.ai_companion_enabled, false);
  assert.equal(DEFAULT_APP_CONFIG.literary_ai_translation_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.voice_transcription_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.scripture_inquiry_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.mood_deck_entry_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.ambient_sounds_enabled, true);
  assert.equal(DEFAULT_APP_CONFIG.weekly_quiz_enabled, true);
});

test('REL-02 coerceBoolean handles booleans, strings, numbers and malformed values', () => {
  assert.equal(coerceBoolean(true, false), true);
  assert.equal(coerceBoolean(false, true), false);
  assert.equal(coerceBoolean('true', false), true);
  assert.equal(coerceBoolean('false', true), false);
  assert.equal(coerceBoolean('TRUE', false), true);
  assert.equal(coerceBoolean('FALSE', true), false);
  assert.equal(coerceBoolean('1', false), true);
  assert.equal(coerceBoolean('0', true), false);
  assert.equal(coerceBoolean(1, false), true);
  assert.equal(coerceBoolean(0, true), false);

  // Fallbacks for invalid inputs
  assert.equal(coerceBoolean('unrecognized_string', true), true);
  assert.equal(coerceBoolean('unrecognized_string', false), false);
  assert.equal(coerceBoolean(null, true), true);
  assert.equal(coerceBoolean(undefined, false), false);
  assert.equal(coerceBoolean({ random: 'object' }, true), true);
});

test('REL-02 parseRemoteAppConfig correctly parses Supabase public.app_config rows', () => {
  const mockRemoteRows = [
    { key: 'ambient_sounds_enabled', value: 'false' },
    { key: 'weekly_quiz_enabled', value: true },
    { key: 'premium_visibility_enabled', value: 0 },
    { key: 'ai_companion_enabled', value: 'true' },
    { key: 'unknown_future_flag', value: 'yes' },
  ];

  const parsed = parseRemoteAppConfig(mockRemoteRows);

  assert.equal(parsed.ambient_sounds_enabled, false);
  assert.equal(parsed.weekly_quiz_enabled, true);
  assert.equal(parsed.premium_visibility_enabled, false);
  assert.equal(parsed.ai_companion_enabled, true);
  // Unmentioned flags preserve conservative defaults
  assert.equal(parsed.literary_ai_translation_enabled, true);
  assert.equal(parsed.scripture_inquiry_enabled, true);
});

test('REL-02 parseRemoteAppConfig safely handles empty, null, or malformed input without throwing', () => {
  assert.deepEqual(parseRemoteAppConfig([]), DEFAULT_APP_CONFIG);
  assert.deepEqual(parseRemoteAppConfig(null), DEFAULT_APP_CONFIG);
  assert.deepEqual(parseRemoteAppConfig(undefined), DEFAULT_APP_CONFIG);
  assert.deepEqual(parseRemoteAppConfig('not_an_array'), DEFAULT_APP_CONFIG);
  assert.deepEqual(parseRemoteAppConfig([{ not_a_key: 123 }]), DEFAULT_APP_CONFIG);
});

test('REL-02 serialize and deserialize app config correctly preserves cache with corrupt data recovery', () => {
  const customConfig: AppFeatureFlags = {
    ...DEFAULT_APP_CONFIG,
    ambient_sounds_enabled: false,
    ai_companion_enabled: true,
  };

  const serialized = serializeAppConfig(customConfig);
  const deserialized = deserializeAppConfig(serialized);

  assert.equal(deserialized.ambient_sounds_enabled, false);
  assert.equal(deserialized.ai_companion_enabled, true);
  assert.equal(deserialized.premium_visibility_enabled, true);

  // Corrupt cache string recovery
  assert.deepEqual(deserializeAppConfig('invalid_json_string{'), DEFAULT_APP_CONFIG);
  assert.deepEqual(deserializeAppConfig(null), DEFAULT_APP_CONFIG);
  assert.deepEqual(deserializeAppConfig('""'), DEFAULT_APP_CONFIG);
});
