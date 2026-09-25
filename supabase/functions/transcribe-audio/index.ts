const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_DURATION_MS = 2 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

type Provider = {
  endpoint: string;
  apiKey: string;
  model: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function provider(): Provider | null {
  if (GROQ_API_KEY) {
    return {
      endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      apiKey: GROQ_API_KEY,
      model: 'whisper-large-v3',
    };
  }
  if (OPENAI_API_KEY) {
    return {
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      apiKey: OPENAI_API_KEY,
      model: 'whisper-1',
    };
  }
  return null;
}

async function requestFingerprint(authorization: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(authorization),
  );
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405);

  // Supabase's gateway validates the JWT for this function. Keep the explicit
  // check as a defense-in-depth guard when the function is invoked directly.
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return json({ code: 'unauthenticated', message: 'A signed-in account is required.' }, 401);
  }

  const fingerprint = await requestFingerprint(authorization);
  const now = Date.now();
  const bucket = requestBuckets.get(fingerprint);
  if (bucket && now - bucket.startedAt < RATE_WINDOW_MS) {
    if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
      return json({ code: 'rate_limited', message: 'Too many voice queries. Please try again later.' }, 429);
    }
    bucket.count += 1;
  } else {
    requestBuckets.set(fingerprint, { startedAt: now, count: 1 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return json({ code: 'audio_too_large', message: 'Audio must be 10 MB or smaller.' }, 413);
  }

  const configuredProvider = provider();
  if (!configuredProvider) {
    return json({ code: 'provider_unavailable', message: 'Speech transcription is not configured.' }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ code: 'invalid_multipart', message: 'The audio upload could not be read.' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return json({ code: 'missing_audio', message: 'An audio recording is required.' }, 400);
  }
  if (!file.type.startsWith('audio/')) {
    return json({ code: 'unsupported_audio_type', message: 'Only audio recordings are supported.' }, 415);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return json({ code: 'audio_too_large', message: 'Audio must be 10 MB or smaller.' }, 413);
  }

  const durationMs = Number(form.get('duration_ms') ?? 0);
  if (durationMs > MAX_DURATION_MS) {
    return json({ code: 'audio_too_long', message: 'Recordings must be 2 minutes or shorter.' }, 413);
  }

  const language = String(form.get('language') ?? 'auto').trim();
  const upstreamForm = new FormData();
  upstreamForm.append('file', file, file.name || 'recording.m4a');
  upstreamForm.append('model', configuredProvider.model);
  upstreamForm.append('temperature', '0');
  if (language && language !== 'auto') upstreamForm.append('language', language);

  try {
    const upstream = await fetch(configuredProvider.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${configuredProvider.apiKey}` },
      body: upstreamForm,
    });
    if (!upstream.ok) {
      console.warn('[transcribe-audio] Provider rejected request:', upstream.status);
      return json({ code: 'provider_error', message: 'Speech transcription failed. Please try again.' }, 502);
    }

    const data = await upstream.json() as { text?: unknown };
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    return json({ text });
  } catch (error) {
    console.warn('[transcribe-audio] Provider request failed:', error);
    return json({ code: 'provider_error', message: 'Speech transcription failed. Please try again.' }, 502);
  }
});
