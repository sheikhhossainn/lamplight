-- Server-enforced rolling limit for paid scripture-inquiry model requests.
-- The caller is an anonymous or signed-in Supabase user; never accept an owner
-- identifier from the client, as auth.uid() is the authority.
create table if not exists public.scripture_inquiry_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index if not exists scripture_inquiry_requests_owner_time_idx
  on public.scripture_inquiry_requests (owner_id, requested_at desc);

alter table public.scripture_inquiry_requests enable row level security;

create or replace function public.claim_scripture_inquiry_slot()
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  oldest_request timestamptz;
begin
  if owner is null then
    raise exception 'Authentication is required';
  end if;

  delete from public.scripture_inquiry_requests
    where owner_id = owner and requested_at <= now() - interval '3 minutes';

  select min(requested_at) into oldest_request
    from public.scripture_inquiry_requests
    where owner_id = owner;

  if (select count(*) from public.scripture_inquiry_requests where owner_id = owner) >= 3 then
    return query select false,
      greatest(1, ceil(extract(epoch from (oldest_request + interval '3 minutes' - now())))::integer);
    return;
  end if;

  insert into public.scripture_inquiry_requests (owner_id) values (owner);
  return query select true, 0;
end;
$$;

revoke all on function public.claim_scripture_inquiry_slot() from public;
grant execute on function public.claim_scripture_inquiry_slot() to authenticated;
