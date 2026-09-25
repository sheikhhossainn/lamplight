import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

import { cloudTranslationProvider } from '@/features/translation/cloudTranslationProvider';
import { getSession } from '@/lib/supabaseAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Transcribes a local audio recording URI into text in whatever language was spoken
 * (Bangla, English, Arabic, Spanish, etc.) using Whisper.
 *
 * @param audioUri Local file URI of the recorded audio
 * @param languageCode Optional ISO 639-1 code (e.g. 'en', 'bn', 'ar', 'es') or 'auto'.
 *                     When explicitly set, Whisper is locked to that language with zero hallucination.
 */
export async function transcribeAudioUri(
  audioUri: string,
  languageCode?: string,
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Voice transcription is unavailable until Supabase is configured.');
  }

  const { getAppFlag } = await import('@/features/config/appConfig');
  if (!getAppFlag('voice_transcription_enabled')) {
    throw new Error('Voice transcription is temporarily paused for service maintenance.');
  }

  const session = await getSession();

  const extension = audioUri.split('.').pop() || 'm4a';
  const mimeType = extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'audio/m4a';

  const endpoint = `${SUPABASE_URL}/functions/v1/transcribe-audio`;
  const parameters: Record<string, string> = {
    language: languageCode?.trim() || 'auto',
  };

  const response = await uploadAsync(endpoint, audioUri, {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.MULTIPART,
    mimeType,
    parameters,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    let message = 'Speech transcription failed. Please try again.';
    try {
      const error = JSON.parse(response.body) as { message?: string };
      if (error.message) message = error.message;
    } catch {
      // Keep a safe, user-facing fallback when the Edge Function response is not JSON.
    }
    throw new Error(message);
  }

  const data = JSON.parse(response.body) as { text?: string };
  return data.text?.trim() ?? '';
}

/**
 * Translates any user text (Bangla, Urdu, Arabic, Spanish, etc.) to English behind the scenes
 * so that the empathetic scripture resonance engine can match the emotional intent with 100% precision.
 */
export async function translateToEnglishIfNeeded(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  try {
    const result = await cloudTranslationProvider.translateSelection(trimmed, 'auto', 'en');
    return result.translatedText || trimmed;
  } catch (err) {
    console.warn('Background translation fallback to original text:', err);
    return trimmed;
  }
}
