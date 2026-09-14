import { useEffect, useState } from 'react';
import * as Speech from 'expo-speech';

export type SpeechRate = 'normal' | 'slow';

const RATE_VALUES: Record<SpeechRate, number> = {
  normal: 0.95,
  slow: 0.72,
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
 * Normalizes language codes for expo-speech.
 * e.g., 'en' -> 'en-US', 'bn' -> 'bn-BD', 'ja' -> 'ja-JP', 'ko' -> 'ko-KR'
 */
export function getSpeechLocale(langCode: string): string {
  const code = langCode.toLowerCase().trim();
  switch (code) {
    case 'en':
      return 'en-US';
    case 'bn':
      return 'bn-BD';
    case 'ja':
      return 'ja-JP';
    case 'ko':
      return 'ko-KR';
    case 'ar':
      return 'ar-SA';
    case 'es':
      return 'es-ES';
    case 'fr':
      return 'fr-FR';
    case 'de':
      return 'de-DE';
    default:
      return code.includes('-') ? code : `${code}-${code.toUpperCase()}`;
  }
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

    await stopSpeech();
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
    await stopSpeech();
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
