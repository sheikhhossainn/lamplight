-- RevenueCat lifecycle storage. The webhook is the only writer; app-facing
-- roles may read their own normalized subscription row but cannot mutate it.

create table if not exists public.revenuecat_webhook_events (
  event_id       text primary key,
  event_type     text not null,
  environment    text not null,
  app_user_id    text,
  payload        jsonb not null,
  received_at    timestamptz not null default now(),
  processed_at   timestamptz,
  processing_error text
);

alter table public.subscriptions
  add column if not exists environment text not null default 'PRODUCTION',
  add column if not exists store text,
  add column if not exists will_renew boolean,
  add column if not exists purchased_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists provider_event_id text,
  add column if not exists metadata jsonb not null default '{}';

create unique index if not exists subscriptions_revenuecat_customer_uidx
  on public.subscriptions (provider, provider_customer_id)
  where provider = 'revenuecat' and provider_customer_id is not null;

alter table public.revenuecat_webhook_events enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "read own subscriptions" on public.subscriptions;
create policy "read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = owner_id);

revoke all on public.revenuecat_webhook_events from anon, authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;

comment on table public.revenuecat_webhook_events is
  'Idempotency and audit records for RevenueCat webhooks; service-role writes only.';
