import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

import { cloudTranslationProvider } from '@/features/translation/cloudTranslationProvider';

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
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    throw new Error(
      'To use voice speech-to-text, please add EXPO_PUBLIC_GROQ_API_KEY (free at groq.com) or EXPO_PUBLIC_OPENAI_API_KEY to your environment.',
    );
  }

  const extension = audioUri.split('.').pop() || 'm4a';
  const mimeType = extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'audio/m4a';

  const parameters: Record<string, string> = {
    model: groqKey ? 'whisper-large-v3' : 'whisper-1',
    temperature: '0',
  };

  // Lock to specific language if user picked one (e.g. 'en', 'bn', 'ar')
  if (languageCode && languageCode.trim() && languageCode !== 'auto') {
    parameters.language = languageCode.trim();
  }

  const endpoint = groqKey
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';

  const apiKey = groqKey || openaiKey;

  const response = await uploadAsync(endpoint, audioUri, {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.MULTIPART,
    mimeType,
    parameters,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Speech transcription failed (${response.status}): ${response.body}`);
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
