-- Migration: 20260925_ai_reading_companion.sql
-- AI Reading Companion (FULLAPP.md §16)
-- Server-side usage accounting, shared caching, feedback reporting, and request telemetry.

-- 1. Daily usage accounting table for AI Reading Companion
create table if not exists public.companion_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count_used integer not null default 1,
  constraint companion_usage_owner_date_uniq unique (owner_id, usage_date)
);

create index if not exists companion_usage_owner_date_idx
  on public.companion_usage (owner_id, usage_date desc);

alter table public.companion_usage enable row level security;

-- Users can inspect their own daily usage count
create policy "users can select own companion usage"
  on public.companion_usage for select
  using (auth.uid() = owner_id);

-- Atomic RPC to increment companion daily usage
create or replace function public.increment_companion_usage(
  p_owner_id uuid,
  p_date date default current_date,
  p_count integer default 1
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.companion_usage (owner_id, usage_date, count_used)
  values (p_owner_id, p_date, coalesce(p_count, 1))
  on conflict (owner_id, usage_date) do update
    set count_used = companion_usage.count_used + excluded.count_used
  returning count_used;
$$;

revoke all on function public.increment_companion_usage(uuid, date, integer) from public;
grant execute on function public.increment_companion_usage(uuid, date, integer) to authenticated, service_role;

-- 2. Shared caching table for stable AI Companion explanations
-- Avoids redundant model invocations across users reading identical public domain literature.
create table if not exists public.companion_cache (
  cache_key text primary key,
  action text not null,
  model_version text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists companion_cache_action_idx
  on public.companion_cache (action, created_at desc);

alter table public.companion_cache enable row level security;

-- Cache is server-managed via service role
create policy "allow service role full access on companion cache"
  on public.companion_cache
  using (true)
  with check (true);

-- 3. Feedback and spoiler reporting table (FULLAPP.md §16.4)
-- Enables readers to report incorrect answers, hallucinated details, or spoiler leaks.
create table if not exists public.companion_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  action text not null,
  book_id text,
  chapter_index integer,
  reason text not null check (reason in ('spoiler', 'inaccurate', 'inappropriate', 'other')),
  notes text,
  excerpt_hash text,
  created_at timestamptz not null default now()
);

create index if not exists companion_feedback_book_idx
  on public.companion_feedback (book_id, chapter_index);

alter table public.companion_feedback enable row level security;

create policy "authenticated users can insert own feedback"
  on public.companion_feedback for insert
  with check (auth.uid() = owner_id or owner_id is null);

create policy "users can view own feedback"
  on public.companion_feedback for select
  using (auth.uid() = owner_id);

-- 4. Anonymized request telemetry & cost tracking (FULLAPP.md §16.2.7)
-- Logs request type, token estimate, and success status without full copyrighted excerpts.
create table if not exists public.companion_request_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  action text not null,
  book_id text,
  chapter_index integer,
  token_estimate integer,
  cost_estimate_cents numeric(8, 4),
  success boolean not null default true,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists companion_request_logs_owner_time_idx
  on public.companion_request_logs (owner_id, created_at desc);

alter table public.companion_request_logs enable row level security;

create policy "users can view own companion logs"
  on public.companion_request_logs for select
  using (auth.uid() = owner_id);
