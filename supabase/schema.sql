-- Lamplight — Supabase schema (source of truth)
-- Run this whole file once in the Supabase SQL Editor for a fresh project.
-- Re-running is safe (every statement is idempotent: CREATE ... IF NOT EXISTS
-- / DROP ... IF EXISTS then CREATE, ON CONFLICT DO NOTHING for seed rows).
--
-- Design goals (why this looks bigger than "just the books table"):
--  1. User identity from day one, via Supabase Auth's anonymous sign-in — a
--     friend opens the app and silently gets a stable auth.users.id, no
--     signup screen required for the 10-15-friend beta. That same row can
--     later be "upgraded" to a real email/OAuth account (Supabase supports
--     linking an anonymous session to a permanent identity) without a data
--     migration — every table below already keys off auth.uid().
--  2. Free-vs-Premium limits (20 words/book, 10 quotes/book, 10
--     translations/day, ...) live in DATA (`plans`), not application code —
--     changing a limit is an UPDATE, not an app release.
--  3. A single `library_items` table unifies "a catalog book someone is
--     reading" and "a book a user imported themselves" behind one id, so
--     every per-user table (reading_positions, saved_words, highlights,
--     shelf_items) has exactly one thing to foreign-key against — and a
--     future source_type (audiobook, PDF, ...) slots in without touching
--     those tables at all.
--  4. Two analytics primitives — `reading_sessions` (structured: what/when/
--     how long, the #1 thing you asked to measure with the beta group) and
--     `analytics_events` (a flexible catch-all: quote shared, ambient sound
--     played, quiz completed, future AI-companion usage, ...) — so a new
--     feature almost never needs a new table just to be measurable.
--  5. `app_config` is a remote kill switch / feature-flag table — ship a
--     feature disabled, flip it on for your 15 friends without an app update.
--
-- What's schema-only-for-now (tables exist, nothing writes to them yet, so
-- adding the real feature later is additive, not a migration):
--  - `plans` premium columns, `subscriptions` — no billing integration yet.
--  - saved_words' spaced-repetition columns, `weekly_quizzes`.
--  - `user_preferences` (cross-device sync — today's app is local-only).

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- Helper: auto-maintained updated_at column, reused by every table that has one.
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. Plans & profiles — who the user is, what tier they're on.
-- ============================================================================

-- Free-tier limits as data. NULL in a *_limit column means "unlimited".
-- Rows are looked up by key, not id, so the app can hardcode 'free'/'premium'
-- without caring about surrogate keys.
create table if not exists public.plans (
  key                          text primary key,             -- 'free' | 'premium'
  display_name                 text not null,
  vocabulary_words_per_book    integer,                       -- null = unlimited
  quotes_per_book               integer,
  translations_per_day          integer,
  weekly_quiz_enabled            boolean not null default true,
  spaced_repetition_enabled      boolean not null default false,
  reading_insights_enabled       boolean not null default false,
  cloud_sync_enabled             boolean not null default false,
  ambient_sound_tier             text not null default 'basic', -- 'basic' | 'full'
  quote_card_theme_count         integer,                       -- null = unlimited (Premium)
  created_at                    timestamptz not null default now()
);

-- Free caps are deliberately generous, not stingy: the free tier's job is to
-- build a real reading/collecting habit (and the "look how much I've saved"
-- attachment that comes with it) before anyone hits a wall — a cap that bites
-- too early kills the habit before it forms. translations_per_day is the odd
-- one out: it's a daily rate limit, not a collection size, and it's the one
-- most likely to interrupt an immersive session (a hard chapter, lots of
-- unfamiliar words) — so it's set more generously than the per-book caps.
-- See ROADMAP.md's "Free tier philosophy" section before changing these.
insert into public.plans (key, display_name, vocabulary_words_per_book, quotes_per_book, translations_per_day, weekly_quiz_enabled, spaced_repetition_enabled, reading_insights_enabled, cloud_sync_enabled, ambient_sound_tier, quote_card_theme_count)
values
  ('free', 'Lamplight Free', 30, 15, 300, true, false, false, false, 'basic', 3),
  ('premium', 'Lamplight Premium', null, null, null, true, true, true, true, 'full', null)
on conflict (key) do nothing;

-- One row per auth.users row. Created by a trigger the moment someone
-- signs in (anonymously or otherwise) — see handle_new_user() below.
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  plan_key          text not null default 'free' references public.plans(key),
  -- Lets analytics forever distinguish "one of the original 15 friends" from
  -- everyone who joins after a public launch, without deleting/renaming rows.
  is_beta_tester    boolean not null default false,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row for every new auth user (anonymous or not) —
-- the app never needs its own "create profile" API call.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. Catalog — the shared, curated Gutenberg-sourced books (unchanged shape
--    from the sync-books.mjs pipeline, extended for search/filter).
-- ============================================================================
create table if not exists public.books (
  id                 text primary key,        -- slug, matches local SQLite books.id
  title              text not null,
  author             text not null,
  source_language    text not null default 'en',
  synopsis           text not null,
  total_chapters     integer not null,
  gutenberg_id       integer not null,
  source_format      text not null default 'gutenberg-text',
  text_url           text not null,
  cover_url          text,
  chapter1_anchor    text,
  -- "Filter by author, language and category" — categories is an array so a
  -- book can sit in more than one (e.g. {"classics","romance"}).
  categories         text[] not null default '{}',
  is_active          boolean not null default true, -- soft-hide without deleting
  is_featured        boolean not null default false,
  updated_at         timestamptz not null default now()
);

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create index if not exists books_categories_idx on public.books using gin (categories);

-- ============================================================================
-- 3. Library items — the supertype every per-user table below points at.
--    A row is EITHER a shared catalog book being read, OR a user's own
--    imported EPUB. One id either way, so reading_positions/saved_words/
--    highlights/shelf_items never need to know which.
-- ============================================================================
create table if not exists public.library_items (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users(id) on delete cascade, -- null = shared catalog item
  source_type      text not null check (source_type in ('catalog', 'user_upload')),
  catalog_book_id  text references public.books(id) on delete cascade,
  -- Denormalized so listing a shelf never needs to join out to books vs.
  -- a future user_uploads table to show a title.
  title            text not null,
  author            text,
  total_chapters    integer not null default 0,
  -- Only set for source_type = 'user_upload'.
  file_path         text,   -- Supabase Storage path to the uploaded EPUB
  cover_path        text,
  created_at        timestamptz not null default now(),
  constraint library_items_catalog_shape check (
    (source_type = 'catalog' and owner_id is null and catalog_book_id is not null and file_path is null)
    or
    (source_type = 'user_upload' and owner_id is not null and catalog_book_id is null and file_path is not null)
  )
);

create index if not exists library_items_owner_idx on public.library_items (owner_id);
create index if not exists library_items_catalog_book_idx on public.library_items (catalog_book_id);

-- Exactly one shared row per catalog book (owner_id null) — every reader of
-- that book points at the same library_items row; their own per-user state
-- (reading_positions, saved_words, highlights) is what's actually scoped to
-- them. This index is what the trigger below upserts against.
create unique index if not exists library_items_catalog_book_uidx
  on public.library_items (catalog_book_id)
  where source_type = 'catalog';

-- Keeps library_items in lockstep with books automatically — sync-books.mjs
-- (or any future admin tool) never has to know library_items exists at all;
-- it only ever upserts into `books`, and this trigger does the rest.
create or replace function public.sync_library_item_from_book()
returns trigger
language plpgsql
as $$
begin
  insert into public.library_items (owner_id, source_type, catalog_book_id, title, author, total_chapters)
  values (null, 'catalog', new.id, new.title, new.author, new.total_chapters)
  on conflict (catalog_book_id) where source_type = 'catalog'
  do update set title = excluded.title, author = excluded.author, total_chapters = excluded.total_chapters;
  return new;
end;
$$;

drop trigger if exists sync_library_item_on_book_upsert on public.books;
create trigger sync_library_item_on_book_upsert
  after insert or update on public.books
  for each row execute function public.sync_library_item_from_book();

-- ============================================================================
-- 4. Shelves — custom shelves ("Favorites", "Classics", "Philosophy", ...).
-- ============================================================================
create table if not exists public.shelves (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.shelf_items (
  shelf_id         uuid not null references public.shelves(id) on delete cascade,
  library_item_id  uuid not null references public.library_items(id) on delete cascade,
  added_at         timestamptz not null default now(),
  primary key (shelf_id, library_item_id)
);

-- ============================================================================
-- 5. Reading state — position, vocabulary, quotes. All per-user now (the
--    local SQLite equivalents are per-device only; this is what "cloud sync"
--    /"cloud backup" eventually restores from).
-- ============================================================================
create table if not exists public.reading_positions (
  owner_id          uuid not null references auth.users(id) on delete cascade,
  library_item_id   uuid not null references public.library_items(id) on delete cascade,
  chapter_index     integer not null,
  page_index        integer not null,
  percent_complete  real not null,
  completed_at      timestamptz, -- set once percent_complete reaches 1 — feeds "books completed"
  updated_at        timestamptz not null default now(),
  primary key (owner_id, library_item_id)
);

drop trigger if exists set_reading_positions_updated_at on public.reading_positions;
create trigger set_reading_positions_updated_at
  before update on public.reading_positions
  for each row execute function public.set_updated_at();

create table if not exists public.saved_words (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  library_item_id   uuid not null references public.library_items(id) on delete cascade,
  source_word       text not null,
  source_lang       text not null,
  target_lang       text not null,
  translation       text not null,
  context_sentence  text not null,
  chapter_index     integer not null,
  page_index        integer not null default 0,
  paragraph_index   integer not null default 0,
  -- Spaced repetition (Premium "Smart Learning") — nullable, unused until
  -- that feature ships; a review job can find due cards with one WHERE clause
  -- the day it exists, with no migration needed then.
  srs_box            integer,
  srs_ease_factor     real,
  srs_next_review_at  timestamptz,
  srs_last_reviewed_at timestamptz,
  srs_review_count     integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists saved_words_owner_book_idx on public.saved_words (owner_id, library_item_id);
create index if not exists saved_words_srs_due_idx on public.saved_words (owner_id, srs_next_review_at) where srs_next_review_at is not null;

create table if not exists public.highlights (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  library_item_id   uuid not null references public.library_items(id) on delete cascade,
  chapter_index     integer not null,
  page_index        integer not null,
  start_offset      integer not null,
  end_offset        integer not null,
  color_key         text not null,
  quote_text        text not null,
  -- Which of the (3 free / more Premium) quote-card themes was used the last
  -- time this quote was shared — remembered so re-sharing doesn't reset it.
  quote_card_theme  text,
  created_at        timestamptz not null default now()
);

create index if not exists highlights_owner_book_idx on public.highlights (owner_id, library_item_id);

-- ============================================================================
-- 6. Translation usage — per user per day, enforces plans.translations_per_day.
-- ============================================================================
create table if not exists public.translation_usage (
  owner_id    uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null,
  count_used  integer not null default 0,
  primary key (owner_id, usage_date)
);

-- PostgREST upsert (Prefer: resolution=merge-duplicates) overwrites columns,
-- it can't express `count_used = count_used + 1` — so a real function is
-- needed to avoid a lost-update race between two concurrent increments for
-- the same owner_id/usage_date. security invoker (default): runs as the
-- calling role, so the existing RLS policy below still applies.
create or replace function public.increment_translation_usage(p_owner_id uuid, p_date date)
returns integer
language sql
as $$
  insert into public.translation_usage (owner_id, usage_date, count_used)
  values (p_owner_id, p_date, 1)
  on conflict (owner_id, usage_date) do update set count_used = translation_usage.count_used + 1
  returning count_used;
$$;

-- ============================================================================
-- 7. Weekly learning — quiz results (Premium adds adaptive quizzes/mastery
--    levels on top of the same attempts table via `quiz_type`).
-- ============================================================================
create table if not exists public.weekly_quizzes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  week_start   date not null,
  quiz_type    text not null default 'basic', -- 'basic' | 'adaptive' (Premium)
  score        real not null,
  total_words  integer not null,
  -- Flexible per-question detail (word id, correct/incorrect, latency, ...)
  -- without a separate answers table for a v1 "basic score" feature.
  answers      jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  unique (owner_id, week_start, quiz_type)
);

-- ============================================================================
-- 8. Analytics — the two tables the 10-15-friend beta actually runs on.
-- ============================================================================

-- Structured: one row per reading session, so "reading streak" / "total
-- reading time" / "reading speed" (Premium insight) are all just aggregate
-- queries over this table, not separately maintained counters.
create table if not exists public.reading_sessions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  library_item_id   uuid references public.library_items(id) on delete set null,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_seconds  integer, -- filled in on session end; null while in-progress
  pages_read        integer not null default 0,
  chapter_index     integer,
  created_at        timestamptz not null default now()
);

create index if not exists reading_sessions_owner_idx on public.reading_sessions (owner_id, started_at desc);

-- Flexible: everything else worth knowing about — quote shared, ambient
-- sound played, shelf created, quiz started, a future AI-companion query,
-- an app-store review prompt shown, ... `event_type` is a free-text tag,
-- `payload` carries whatever that event type needs. Add a new measurable
-- moment in the app without ever touching this table's shape.
create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  owner_id     uuid references auth.users(id) on delete cascade,
  event_type   text not null,
  payload      jsonb not null default '{}',
  occurred_at  timestamptz not null default now()
);

create index if not exists analytics_events_owner_idx on public.analytics_events (owner_id, occurred_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type, occurred_at desc);

-- ============================================================================
-- 9. Subscriptions — provider-agnostic (App Store / Play Store / Stripe /
--    RevenueCat all end up shaped like this). Nothing writes here until
--    billing is actually integrated; `profiles.plan_key` is what the app
--    reads day-to-day.
-- ============================================================================
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  provider              text not null, -- 'app_store' | 'play_store' | 'stripe' | 'revenuecat'
  provider_customer_id  text,
  provider_product_id   text,
  status                text not null, -- 'active' | 'canceled' | 'expired' | 'in_grace_period'
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index if not exists subscriptions_owner_idx on public.subscriptions (owner_id);

-- ============================================================================
-- 10. Cross-device preferences — schema exists for the future "sync between
--     devices" Premium feature; today's app keeps these local-only (see
--     src/features/settings/*), so nothing writes here yet.
-- ============================================================================
create table if not exists public.user_preferences (
  owner_id           uuid primary key references auth.users(id) on delete cascade,
  font_size_pref     text,
  line_spacing_pref  text,
  reading_theme      text, -- 'day' | 'lamp'
  ambient_sound_key  text,
  -- Escape hatch for whatever the next preference turns out to be, without a
  -- migration for every single new toggle.
  extra              jsonb not null default '{}',
  updated_at         timestamptz not null default now()
);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 11. Beta feedback — structured capture instead of only an external form,
--     so feedback can be joined against a friend's actual reading_sessions/
--     analytics_events when deciding what to build next.
-- ============================================================================
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references auth.users(id) on delete set null,
  category     text not null default 'general', -- 'bug' | 'feature_request' | 'general'
  message      text not null,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- 12. App config — remote feature flags / kill switches. Read by key, so
--     shipping a feature dark and flipping it on for the beta group (or
--     everyone) is an UPDATE, not a release.
-- ============================================================================
create table if not exists public.app_config (
  key          text primary key,
  value        jsonb not null,
  description  text,
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_app_config_updated_at on public.app_config;
create trigger set_app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

insert into public.app_config (key, value, description) values
  ('ambient_sounds_enabled', 'true', 'Kill switch for the ambient sound player'),
  ('weekly_quiz_enabled', 'true', 'Kill switch for the weekly vocabulary quiz')
on conflict (key) do nothing;

-- ============================================================================
-- 13. Sync state — internal bookkeeping for scripts/sync-bulk-catalog.mjs.
--     No public read policy at all (unlike app_config) — nothing in the app
--     needs this, only the service-role-authenticated sync script, which
--     bypasses RLS entirely regardless.
-- ============================================================================
create table if not exists public.sync_state (
  key          text primary key,
  value        jsonb not null,
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_sync_state_updated_at on public.sync_state;
create trigger set_sync_state_updated_at
  before update on public.sync_state
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security — public/catalog tables are readable by anyone (the
-- app's anon key); every per-user table is owner-only, checked against
-- auth.uid(). All writes to `books`/`plans`/`app_config` go through the
-- service-role key (scripts/sync-books.mjs, or a future admin tool), which
-- bypasses RLS entirely — no insert/update/delete policy is defined for
-- anon/authenticated on those tables.
-- ============================================================================
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.library_items enable row level security;
alter table public.shelves enable row level security;
alter table public.shelf_items enable row level security;
alter table public.reading_positions enable row level security;
alter table public.saved_words enable row level security;
alter table public.highlights enable row level security;
alter table public.translation_usage enable row level security;
alter table public.weekly_quizzes enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.feedback enable row level security;
alter table public.app_config enable row level security;
alter table public.sync_state enable row level security;

-- CREATE POLICY has no IF NOT EXISTS / OR REPLACE in Postgres — DROP IF
-- EXISTS first is the idempotent pattern, same as the triggers above.
drop policy if exists "public read" on public.plans;
create policy "public read" on public.plans for select using (true);
drop policy if exists "public read" on public.books;
create policy "public read" on public.books for select using (true);
drop policy if exists "public read" on public.app_config;
create policy "public read" on public.app_config for select using (true);

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- Split by operation (not a single `for all`) because DELETE has no WITH
-- CHECK clause in Postgres — a combined policy using the read-side's
-- permissive "owner_id is null or ..." for USING would let any authenticated
-- user delete the one shared catalog row everyone else reads too.
drop policy if exists "read library items" on public.library_items;
create policy "read library items" on public.library_items for select
  using (owner_id is null or auth.uid() = owner_id);
drop policy if exists "insert own library items" on public.library_items;
create policy "insert own library items" on public.library_items for insert
  with check (auth.uid() = owner_id);
drop policy if exists "update own library items" on public.library_items;
create policy "update own library items" on public.library_items for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "delete own library items" on public.library_items;
create policy "delete own library items" on public.library_items for delete
  using (auth.uid() = owner_id);

drop policy if exists "manage own shelves" on public.shelves;
create policy "manage own shelves" on public.shelves for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own shelf items" on public.shelf_items;
create policy "manage own shelf items" on public.shelf_items for all
  using (exists (select 1 from public.shelves s where s.id = shelf_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shelves s where s.id = shelf_id and s.owner_id = auth.uid()));

drop policy if exists "manage own reading positions" on public.reading_positions;
create policy "manage own reading positions" on public.reading_positions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own saved words" on public.saved_words;
create policy "manage own saved words" on public.saved_words for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own highlights" on public.highlights;
create policy "manage own highlights" on public.highlights for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own translation usage" on public.translation_usage;
create policy "manage own translation usage" on public.translation_usage for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own quizzes" on public.weekly_quizzes;
create policy "manage own quizzes" on public.weekly_quizzes for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own reading sessions" on public.reading_sessions;
create policy "manage own reading sessions" on public.reading_sessions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own analytics events" on public.analytics_events;
create policy "manage own analytics events" on public.analytics_events for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "read own subscriptions" on public.subscriptions;
create policy "read own subscriptions" on public.subscriptions for select using (auth.uid() = owner_id);
drop policy if exists "manage own preferences" on public.user_preferences;
create policy "manage own preferences" on public.user_preferences for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "manage own feedback" on public.feedback;
create policy "manage own feedback" on public.feedback for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ============================================================================
-- 14. Scripture verses — pgvector-backed verse store for mood flashcards and
--     comparative Q&A. Deliberately outside the prose-book pipeline (no
--     library_items FK, no reader screens) — its own parallel vertical per
--     the pattern documented in scriptures.md.
--
-- Embedding model: Supabase/gte-small, output dim 384. Seed script embeds
-- offline via @huggingface/transformers (self-hosted, no external API, no
-- OpenAI); the context-verses Edge Function embeds the live user query via
-- the Edge Runtime's native Supabase.ai.Session('gte-small') — same model,
-- different runtime, since running transformers.js itself inside a Deno Edge
-- Function failed to bundle/execute. Both the stored embeddings and the live
-- query embedding MUST use the same model; mixing models breaks cosine
-- similarity search.
--
-- Tradition is a lookup table (public.scripture_traditions), not a CHECK
-- constraint — same "limits live in DATA" pattern as `plans`/`app_config`
-- above. Adding Torah, Vedas, or any future tradition is an INSERT, not an
-- ALTER TABLE migration. mood_tags stays a closed CHECK — the mood
-- vocabulary is fixed UI (10 mood buttons), unlike traditions which grow.
--
-- IVFFlat lists=100: appropriate for the ~37k rows across Quran + full Bible.
--   Rule of thumb is sqrt(row_count); recalibrate if the corpus grows
--   significantly beyond that baseline.
-- ============================================================================

-- pgvector extension — enable in Supabase dashboard first if on free tier
-- (Project Settings → Database → Extensions → vector), then this is a no-op.
create extension if not exists vector;

-- Tradition lookup — new tradition (Torah, Vedas, ...) is a row insert here,
-- never an ALTER TABLE on scripture_verses. See header note above.
create table if not exists public.scripture_traditions (
  key           text primary key,   -- 'quran' | 'bible-ot' | 'bible-nt' | 'torah'
  display_name  text not null,
  created_at    timestamptz not null default now()
);

insert into public.scripture_traditions (key, display_name) values
  ('quran', 'Quran'),
  ('bible-ot', 'Bible — Old Testament'),
  ('bible-nt', 'Bible — New Testament'),
  ('torah', 'Torah')
on conflict (key) do nothing;

create table if not exists public.scripture_verses (
  id              uuid primary key default gen_random_uuid(),

  -- Bibliographic identity — stable cite key, matching the addressing used
  -- by the existing reader screens (surah_number/verse_number for Quran,
  -- book_id/chapter/verse for Bible).
  tradition       text not null references public.scripture_traditions(key),
  book            text not null,   -- surah English name | Bible book name
  chapter         integer not null,
  verse_number    integer not null,

  -- Texts. original_text = Arabic (Quran) or WEB English (Bible — English IS
  -- the source). translation = Sahih International English (Quran only); null
  -- for Bible since it is already in English.
  original_text   text not null,
  translation     text,

  -- Closed mood vocabulary — only these 10 values are valid.
  -- CHECK constraint is a deliberate tradeoff — see header note above.
  mood_tags       text[] not null default '{}'
                    check (
                      mood_tags <@ array[
                        'grief','hope','patience','gratitude','fear',
                        'peace','guidance','forgiveness','strength','doubt'
                      ]
                    ),

  -- Embedding of coalesce(translation, original_text) — always English text,
  -- always Supabase/gte-small (384 dims). Null until the seed script runs.
  embedding       vector(384),

  created_at      timestamptz not null default now()
);

-- Unique cite key — one row per (tradition, book, chapter, verse_number).
-- Lets the seed script upsert safely on re-runs without duplicating rows.
-- Also covers tradition-only lookups via leftmost-prefix matching — no
-- separate single-column tradition index needed (that would be redundant).
create unique index if not exists scripture_verses_cite_uidx
  on public.scripture_verses (tradition, book, chapter, verse_number);

-- Mood lookup — @> (array contains) requires GIN, same as books.categories.
create index if not exists scripture_verses_mood_idx
  on public.scripture_verses using gin (mood_tags);

-- Vector similarity index (IVFFlat) is intentionally absent here.
-- IVFFlat requires at least (lists * 3) rows for k-means clustering and
-- will error against an empty table — which is this file's documented
-- fresh-project state. The seed script creates it after bulk insert.

-- ============================================================================
-- Retrieval function 1 — Mood-based flashcard deck.
--
-- Returns p_per_tradition verses per tradition for the given mood, randomly
-- sampled. ROW_NUMBER() OVER (PARTITION BY tradition ORDER BY random()) caps
-- each tradition at exactly p_per_tradition cards regardless of how many
-- tagged verses it has — even sampling at the SQL level, not application level.
--
-- Returns an explicit column list; embedding is excluded — the client never
-- needs the 384-float payload and omitting it keeps response size proportional
-- to the number of cards, not their vectors.
-- ============================================================================
create or replace function public.get_mood_verses(
  p_mood           text,
  p_per_tradition  integer default 2
)
returns table (
  id            uuid,
  tradition     text,
  book          text,
  chapter       integer,
  verse_number  integer,
  original_text text,
  translation   text,
  mood_tags     text[],
  created_at    timestamptz
)
language sql
stable
security invoker
as $$
  select
    v.id, v.tradition, v.book, v.chapter, v.verse_number,
    v.original_text, v.translation, v.mood_tags, v.created_at
  from (
    select *,
           row_number() over (
             partition by tradition
             order by random()
           ) as rn
    from public.scripture_verses
    where mood_tags @> array[p_mood]
      and embedding is not null
  ) v
  where v.rn <= p_per_tradition
  order by random();
$$;

-- ============================================================================
-- Retrieval function 2 — Per-tradition vector similarity search.
--
-- Called ONCE PER TRADITION from the app layer — never as a single merged
-- query across all traditions. This is non-negotiable: a single ORDER BY
-- embedding <=> p_embedding across all traditions produces a globally ranked
-- list biased toward whichever tradition's phrasing scores highest. Separate
-- calls with WHERE tradition = p_tradition enforce that each tradition always
-- contributes exactly p_limit results regardless of score.
--
-- The caller must embed the user's question with the same gte-small model
-- (384 dims) before calling this — query and stored embeddings must come
-- from the same model or cosine similarity is meaningless.
-- ============================================================================
create or replace function public.search_verses_by_tradition(
  p_embedding  vector(384),
  p_tradition  text,
  p_limit      integer default 3
)
returns table (
  id            uuid,
  tradition     text,
  book          text,
  chapter       integer,
  verse_number  integer,
  original_text text,
  translation   text,
  similarity    float
)
language sql
stable
security invoker
as $$
  select
    id, tradition, book, chapter, verse_number,
    original_text, translation,
    1 - (embedding <=> p_embedding) as similarity
  from public.scripture_verses
  where tradition = p_tradition
    and embedding is not null
  order by embedding <=> p_embedding
  limit p_limit;
$$;

-- RLS — scripture_verses/scripture_traditions are shared/catalog data,
-- readable by anyone (anon key). Writes are service-role only (seed script),
-- same pattern as books/app_config.
alter table public.scripture_traditions enable row level security;
drop policy if exists "public read" on public.scripture_traditions;
create policy "public read" on public.scripture_traditions for select using (true);

alter table public.scripture_verses enable row level security;
drop policy if exists "public read" on public.scripture_verses;
create policy "public read" on public.scripture_verses for select using (true);
