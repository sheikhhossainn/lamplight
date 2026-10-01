import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY');
const REVENUECAT_WEBHOOK_AUTH_TOKEN = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN');
const REVENUECAT_WEBHOOK_HMAC_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_HMAC_SECRET');
const REVENUECAT_APP_IDS = new Set(
  (Deno.env.get('REVENUECAT_APP_IDS') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
);
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
  environment?: string;
  event_timestamp_ms?: number;
};

type RevenueCatPayload = {
  api_version?: string;
  event?: RevenueCatEvent;
};

type SubscriberEntitlement = {
  expires_date?: string | null;
  purchase_date?: string | null;
  product_identifier?: string | null;
  store?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
};

type SubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, SubscriberEntitlement>;
  };
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyHmac(
  rawBody: string,
  header: string | null,
  timestampHeader?: string | null,
  secret?: string | null,
): Promise<boolean> {
  const hmacSecret = secret ?? Deno.env.get('REVENUECAT_WEBHOOK_HMAC_SECRET');
  if (!hmacSecret) return true;
  if (!header) return false;

  let timestamp: string | undefined;
  let receivedSignature: string | undefined;

  if (header.includes('=')) {
    const values = Object.fromEntries(
      header.split(',').map((part) => part.trim().split('=').map((value) => value.trim())),
    );
    timestamp = values.t;
    receivedSignature = values.v1 ?? values.v0;
  } else {
    timestamp = timestampHeader ?? undefined;
    receivedSignature = header.trim();
  }

  if (!timestamp || !receivedSignature) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hmacSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return constantTimeEqual(expectedSignature, receivedSignature);
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function candidateUserIds(event: RevenueCatEvent): string[] {
  return [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ].filter(validUuid);
}

async function getSubscriber(appUserId: string): Promise<SubscriberEntitlement | null> {
  const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!secretKey) {
    console.warn('REVENUECAT_SECRET_API_KEY is not configured');
    return null;
  }
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error(`RevenueCat subscriber refresh failed: ${response.status}`);
  const payload = await response.json() as SubscriberResponse;
  return payload.subscriber?.entitlements?.premium ?? null;
}

async function syncUser(event: RevenueCatEvent, ownerId: string): Promise<void> {
  const environment = String(event.environment ?? 'PRODUCTION').toUpperCase();
  if (environment !== 'PRODUCTION' && environment !== 'SANDBOX') return;

  const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!secretKey) {
    console.warn('REVENUECAT_SECRET_API_KEY is not configured; skipping profile sync for user', ownerId);
    return;
  }

  const entitlement = await getSubscriber(ownerId);
  const expiresAt = entitlement?.expires_date ? new Date(entitlement.expires_date) : null;
  const active = Boolean(entitlement && (!expiresAt || expiresAt.getTime() > Date.now()));
  const status = active ? 'active' : event.type === 'CANCELLATION' ? 'canceled' : 'expired';
  const providerCustomerId = event.app_user_id ?? ownerId;

  const { error: subscriptionError } = await supabase.from('subscriptions').upsert({
    owner_id: ownerId,
    provider: 'revenuecat',
    provider_customer_id: providerCustomerId,
    provider_product_id: entitlement?.product_identifier ?? null,
    status,
    environment,
    store: entitlement?.store ?? null,
    will_renew: active && !entitlement?.unsubscribe_detected_at,
    purchased_at: entitlement?.purchase_date ?? null,
    current_period_end: entitlement?.expires_date ?? null,
    canceled_at: entitlement?.unsubscribe_detected_at ?? null,
    provider_event_id: event.id ?? null,
    metadata: {
      billing_issue_detected_at: entitlement?.billing_issues_detected_at ?? null,
      event_type: event.type ?? null,
    },
  }, { onConflict: 'provider,provider_customer_id' });
  if (subscriptionError) throw subscriptionError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ plan_key: active ? 'premium' : 'free' })
    .eq('id', ownerId);
  if (profileError) throw profileError;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const rawBody = await request.text();
  let payload: RevenueCatPayload | null = null;
  try {
    payload = JSON.parse(rawBody) as RevenueCatPayload;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const webhookAuthToken = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN');
  const hmacSecret = Deno.env.get('REVENUECAT_WEBHOOK_HMAC_SECRET');
  const appIdsList = (Deno.env.get('REVENUECAT_APP_IDS') ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  const appIds = new Set(appIdsList);

  if (!webhookAuthToken && !hmacSecret) {
    return json({ error: 'RevenueCat webhook authentication is not configured' }, 503);
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('x-authorization');
  const cleanToken = (webhookAuthToken ?? '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');
  const cleanHeader = (authHeader ?? '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');

  if (webhookAuthToken && cleanHeader !== cleanToken) {
    return json({
      error: 'Unauthorized',
      hint: authHeader
        ? 'Authorization header was received but did not match REVENUECAT_WEBHOOK_AUTH_TOKEN'
        : 'No Authorization header was received. Please ensure the Authorization header value is set and saved in RevenueCat.',
    }, 401);
  }

  if (hmacSecret) {
    const sigHeader = request.headers.get('x-revenuecat-signature') ?? request.headers.get('x-revenuecat-webhook-signature');
    const tsHeader = request.headers.get('x-revenuecat-request-timestamp');
    if (!(await verifyHmac(rawBody, sigHeader, tsHeader, hmacSecret))) {
      return json({ error: 'Invalid webhook signature' }, 401);
    }
  }

  const event = payload.event;
  if (!event?.id || !event.type) {
    return json({ error: 'Incomplete RevenueCat event' }, 400);
  }

  if (event.type === 'TEST') {
    return json({ received: true, test: true });
  }

  if (appIds.size > 0 && event.app_id && !appIds.has(event.app_id)) {
    return json({ error: 'Unknown RevenueCat app' }, 403);
  }

  const { data: existing } = await supabase
    .from('revenuecat_webhook_events')
    .select('processed_at')
    .eq('event_id', event.id)
    .maybeSingle();
  if (existing?.processed_at) return json({ received: true, duplicate: true });

  const { error: eventError } = await supabase.from('revenuecat_webhook_events').upsert({
    event_id: event.id,
    event_type: event.type,
    environment: event.environment ?? 'PRODUCTION',
    app_user_id: event.app_user_id ?? null,
    payload,
  }, { onConflict: 'event_id' });
  if (eventError) return json({ error: 'Could not record webhook' }, 503);

  try {
    const ids = [...new Set(candidateUserIds(event))];
    for (const ownerId of ids) await syncUser(event, ownerId);

    await supabase.from('revenuecat_webhook_events').update({ processed_at: new Date().toISOString(), processing_error: null }).eq('event_id', event.id);
    return json({ received: true });
  } catch (error) {
    const safeError = error instanceof Error ? error.message.slice(0, 300) : 'Webhook processing failed';
    await supabase.from('revenuecat_webhook_events').update({ processing_error: safeError }).eq('event_id', event.id);
    return json({ error: 'Webhook processing failed' }, 503);
  }
});
