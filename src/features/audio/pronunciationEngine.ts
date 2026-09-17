import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Speech from 'expo-speech';

export type SpeechRate = 'normal' | 'slow';

const RATE_VALUES: Record<SpeechRate, number> = {
  normal: 0.95,
  slow: 0.72,
};

const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  bn: 'bn-BD',
  cs: 'cs-CZ',
  da: 'da-DK',
  de: 'de-DE',
  el: 'el-GR',
  es: 'es-ES',
  fa: 'fa-IR',
  fi: 'fi-FI',
  fr: 'fr-FR',
  gu: 'gu-IN',
  he: 'he-IL',
  hi: 'hi-IN',
  hu: 'hu-HU',
  id: 'id-ID',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ms: 'ms-MY',
  mr: 'mr-IN',
  nl: 'nl-NL',
  no: 'nb-NO',
  pa: 'pa-IN',
  pl: 'pl-PL',
  pt: 'pt-BR',
  ro: 'ro-RO',
  ru: 'ru-RU',
  sv: 'sv-SE',
  sw: 'sw-KE',
  ta: 'ta-IN',
  te: 'te-IN',
  th: 'th-TH',
  tl: 'fil-PH',
  tr: 'tr-TR',
  uk: 'uk-UA',
  ur: 'ur-PK',
  vi: 'vi-VN',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  zh: 'zh-CN',
};

let currentSpeechId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function notifySpeechListeners(id: string | null) {
  currentSpeechId = id;
  for (const listener of listeners) {
    try {
      listener(id);
    } catch {
      // Ignore listener error
    }
  }
}

/**
 * Hook to observe the ID of the currently playing audio.
 */
export function useCurrentSpeechId(): string | null {
  const [speakingId, setSpeakingId] = useState<string | null>(currentSpeechId);

  useEffect(() => {
    setSpeakingId(currentSpeechId);
    const listener = (id: string | null) => setSpeakingId(id);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return speakingId;
}

/**
 * Warms up the native TTS engine in background so the first tap speaks instantly.
 */
export function warmUpSpeechEngine(): void {
  try {
    void Speech.isSpeakingAsync();
  } catch {
    // Ignore warmup errors
  }
}

// Pre-warm the native TTS engine immediately when audio module loads
warmUpSpeechEngine();

/**
 * Resolves every configured reading language to a voice locale. expo-speech
 * accepts BCP 47 on iOS, while its Android module constructs `Locale(language)`
 * and therefore needs the primary language code.
 */
export function getSpeechLocale(langCode?: string | null): string {
  const normalized = (langCode || 'en').toLowerCase().trim().replace(/_/g, '-');
  const primary = normalized.split('-')[0] || 'en';
  const locale = SPEECH_LOCALES[normalized] ?? SPEECH_LOCALES[primary] ?? SPEECH_LOCALES.en;

  return Platform.OS === 'android' ? locale.split('-')[0] : locale;
}

/**
 * Returns null when the platform cannot provide its installed-voice list, so
 * callers never mistake an unavailable API for a missing language pack.
 */
export async function hasSpeechVoiceForLanguage(langCode: string): Promise<boolean | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (voices.length === 0) return null;

    const normalized = langCode.toLowerCase().trim().replace(/_/g, '-');
    const requestedPrimary = normalized.split('-')[0];
    const localePrimary = getSpeechLocale(langCode).split('-')[0].toLowerCase();

    return voices.some((voice) => {
      const voicePrimary = voice.language.toLowerCase().split(/[-_]/)[0];
      return voicePrimary === requestedPrimary || voicePrimary === localePrimary;
    });
  } catch {
    return null;
  }
}

/**
 * Offers, but never starts, a system voice download after the learner chooses
 * a language without an installed TTS voice.
 */
export async function offerSpeechVoiceSetup(langCode: string, languageName: string): Promise<void> {
  if (Platform.OS === 'web' || (await hasSpeechVoiceForLanguage(langCode)) !== false) return;

  if (Platform.OS === 'android') {
    Alert.alert(
      `Download ${languageName} voice?`,
      'Pronunciation uses your device’s text-to-speech voice. Android will show its own download screen, where you can choose whether to install it.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open download',
          onPress: () => {
            void Linking.sendIntent('android.speech.tts.engine.INSTALL_TTS_DATA').catch(() => {
              Alert.alert(
                'Open text-to-speech settings',
                'Your device did not provide a voice-download screen. Open Settings > System > Language & input > Text-to-speech output to install a voice.',
                [{ text: 'Got it' }],
              );
            });
          },
        },
      ],
    );
    return;
  }

  Alert.alert(
    `Download ${languageName} voice`,
    'To enable pronunciation, download this voice in Settings > Accessibility > Spoken Content > Voices, then return to Lamplight.',
    [{ text: 'Got it' }],
  );
}

/**
 * Toggles speech for a specific ID. If currently speaking this ID, stops it.
 * Otherwise, stops any active speech and starts speaking the new text.
 */
export async function toggleSpeech(
  id: string,
  text: string,
  langCode: string = 'en',
  rate: SpeechRate = 'normal',
): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  try {
    if (currentSpeechId === id) {
      await stopSpeech();
      return;
    }

    void Speech.stop();
    notifySpeechListeners(id);

    const locale = getSpeechLocale(langCode);
    Speech.speak(clean, {
      language: locale,
      pitch: 1.0,
      rate: RATE_VALUES[rate],
      onDone: () => notifySpeechListeners(null),
      onStopped: () => notifySpeechListeners(null),
      onError: () => notifySpeechListeners(null),
    });
  } catch (err) {
    console.warn('[PronunciationEngine] Failed to toggle speech:', err);
    notifySpeechListeners(null);
  }
}

/**
 * Pronounces a word or short phrase using on-device native speech synthesis.
 */
export async function speakWord(
  text: string,
  langCode: string = 'en',
  rate: SpeechRate = 'normal',
): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  try {
    // Non-blocking fire-and-forget stop so speech isn't delayed by async bridge latency
    void Speech.stop();
    notifySpeechListeners(`word_${clean.toLowerCase()}`);

    const locale = getSpeechLocale(langCode);
    Speech.speak(clean, {
      language: locale,
      pitch: 1.0,
      rate: RATE_VALUES[rate],
      onDone: () => notifySpeechListeners(null),
      onStopped: () => notifySpeechListeners(null),
      onError: () => notifySpeechListeners(null),
    });
  } catch (err) {
    console.warn('[PronunciationEngine] Failed to speak word:', err);
    notifySpeechListeners(null);
  }
}

/**
 * Stops any active speech.
 */
export async function stopSpeech(): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
  } catch {
    // Ignore cleanup error
  } finally {
    notifySpeechListeners(null);
  }
}
