-- Migration: 20260921_backend_security_and_caps.sql
-- Backend security lockdown, entitlement cryptographic RPC, beta cohort inclusion, and translation cap (50).

-- 1. Update free tier daily translation cap to 50
insert into public.plans (key, display_name, vocabulary_words_per_book, quotes_per_book, translations_per_day, weekly_quiz_enabled, spaced_repetition_enabled, reading_insights_enabled, cloud_sync_enabled, ambient_sound_tier, quote_card_theme_count)
values
  ('free', 'Lamplight Free', 30, 15, 50, true, false, false, false, 'basic', 3),
  ('premium', 'Lamplight Premium', null, null, null, true, true, true, true, 'full', null)
on conflict (key) do update set translations_per_day = excluded.translations_per_day;

-- 2. Update increment_translation_usage to support batch sentence counts
create or replace function public.increment_translation_usage(p_owner_id uuid, p_date date, p_count integer default 1)
returns integer
language sql
as $$
  insert into public.translation_usage (owner_id, usage_date, count_used)
  values (p_owner_id, p_date, coalesce(p_count, 1))
  on conflict (owner_id, usage_date) do update set count_used = translation_usage.count_used + excluded.count_used
  returning count_used;
$$;

-- 3. Promo code redemption duration safeguard (grant-based, no permanent profile mutation)
create or replace function public.redeem_promo(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner_id uuid := auth.uid();
  v_normalized_code text := upper(trim(p_code));
  v_code_hash text;
  v_campaign record;
  v_ends_at timestamptz;
  v_grant_id uuid;
begin
  if v_owner_id is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  if v_normalized_code = '' then
    return jsonb_build_object('success', false, 'error', 'Please enter a promo code.');
  end if;

  v_code_hash := encode(extensions.digest(v_normalized_code::bytea, 'sha256'), 'hex');

  select * into v_campaign
  from public.promo_campaigns
  where code_hash = v_code_hash
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired promo code.');
  end if;

  if v_campaign.max_redemptions is not null and v_campaign.times_redeemed >= v_campaign.max_redemptions then
    return jsonb_build_object('success', false, 'error', 'This promo code has reached its maximum redemptions.');
  end if;

  if exists (
    select 1 from public.promo_redemptions
    where campaign_id = v_campaign.id and owner_id = v_owner_id
  ) then
    return jsonb_build_object('success', false, 'error', 'You have already redeemed this promo code.');
  end if;

  update public.promo_campaigns
  set times_redeemed = times_redeemed + 1
  where id = v_campaign.id;

  if v_campaign.duration_days is not null then
    v_ends_at := now() + (v_campaign.duration_days || ' days')::interval;
  else
    v_ends_at := null;
  end if;

  insert into public.entitlement_grants (
    owner_id, feature_bundle, source_type, source_id, starts_at, ends_at, metadata
  ) values (
    v_owner_id, v_campaign.feature_bundle, 'promo', v_campaign.id, now(), v_ends_at,
    jsonb_build_object('campaign_label', v_campaign.label)
  ) returning id into v_grant_id;

  insert into public.promo_redemptions (
    campaign_id, owner_id, grant_id
  ) values (
    v_campaign.id, v_owner_id, v_grant_id
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Promo code redeemed successfully! Enjoy your Premium access.',
    'grant_id', v_grant_id,
    'ends_at', v_ends_at
  );
end;
$$;

revoke all on function public.redeem_promo(text) from public;
grant execute on function public.redeem_promo(text) to authenticated;

-- 4. Authoritative check whether a user has active premium entitlement (including beta testers)
create or replace function public.is_premium_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and (plan_key = 'premium' or is_beta_tester = true)
  ) or exists (
    select 1 from public.entitlement_grants
    where owner_id = p_user_id and revoked_at is null and (ends_at is null or ends_at > now())
  );
$$;

revoke all on function public.is_premium_user(uuid) from public;
grant execute on function public.is_premium_user(uuid) to authenticated, anon;

-- 5. Cryptographically signed entitlement RPC
create or replace function public.get_verified_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_key text := 'free';
  v_is_beta boolean := false;
  v_grant record;
  v_status text := 'free';
  v_source text := 'none';
  v_expires_at timestamptz := null;
  v_expires_epoch bigint := null;
  v_secret text;
  v_payload text;
  v_signature text;
  v_now_epoch bigint;
begin
  v_now_epoch := round(extract(epoch from now()) * 1000)::bigint;

  if v_user_id is null then
    return jsonb_build_object(
      'status', 'free',
      'source', 'none',
      'expires_at', null,
      'signature', null,
      'server_time', v_now_epoch
    );
  end if;

  select coalesce(plan_key, 'free'), coalesce(is_beta_tester, false)
  into v_plan_key, v_is_beta
  from public.profiles
  where id = v_user_id;

  if v_plan_key = 'premium' then
    v_status := 'premium';
    v_source := 'subscription';
    v_expires_at := null;
  elsif v_is_beta = true then
    v_status := 'premium';
    v_source := 'beta';
    v_expires_at := null;
  else
    select * into v_grant
    from public.entitlement_grants
    where owner_id = v_user_id
      and revoked_at is null
      and (ends_at is null or ends_at > now())
    order by ends_at desc nulls first
    limit 1;

    if found then
      v_status := case when v_grant.source_type = 'store_trial' then 'trial' else 'premium' end;
      v_source := coalesce(v_grant.source_type, 'promo');
      v_expires_at := v_grant.ends_at;
    else
      v_status := 'free';
      v_source := 'none';
      v_expires_at := null;
    end if;
  end if;

  if v_expires_at is not null then
    v_expires_epoch := round(extract(epoch from v_expires_at) * 1000)::bigint;
  end if;

  v_secret := coalesce(
    nullif(current_setting('app.settings.entitlement_secret', true), ''),
    'lamplight-entitlement-secret-2026-server-internal'
  );

  v_payload := v_user_id::text || ':' || v_status || ':' || coalesce(v_expires_epoch::text, 'never');
  v_signature := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

  return jsonb_build_object(
    'status', v_status,
    'source', v_source,
    'expires_at', v_expires_epoch,
    'signature', v_signature,
    'server_time', v_now_epoch
  );
end;
$$;

revoke all on function public.get_verified_entitlement() from public;
grant execute on function public.get_verified_entitlement() to authenticated, anon;

-- 6. Dynamic RLS policies on saved_words and highlights
alter table public.saved_words add column if not exists deleted_at timestamptz;
alter table public.highlights add column if not exists deleted_at timestamptz;

drop policy if exists "manage own saved words" on public.saved_words;
drop policy if exists "select own saved words" on public.saved_words;
create policy "select own saved words" on public.saved_words for select
  using (auth.uid() = owner_id);

drop policy if exists "insert own saved words" on public.saved_words;
create policy "insert own saved words" on public.saved_words for insert
  with check (
    auth.uid() = owner_id
    and (
      public.is_premium_user(auth.uid())
      or (
        select count(*)
        from public.saved_words sw
        where sw.owner_id = auth.uid()
          and sw.library_item_id = saved_words.library_item_id
          and sw.deleted_at is null
      ) < coalesce((select p.vocabulary_words_per_book from public.plans p where p.key = 'free'), 30)
    )
  );

drop policy if exists "update own saved words" on public.saved_words;
create policy "update own saved words" on public.saved_words for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "delete own saved words" on public.saved_words;
create policy "delete own saved words" on public.saved_words for delete
  using (auth.uid() = owner_id);

drop policy if exists "manage own highlights" on public.highlights;
drop policy if exists "select own highlights" on public.highlights;
create policy "select own highlights" on public.highlights for select
  using (auth.uid() = owner_id);

drop policy if exists "insert own highlights" on public.highlights;
create policy "insert own highlights" on public.highlights for insert
  with check (
    auth.uid() = owner_id
    and (
      public.is_premium_user(auth.uid())
      or (
        select count(*)
        from public.highlights hl
        where hl.owner_id = auth.uid()
          and hl.library_item_id = highlights.library_item_id
          and hl.deleted_at is null
      ) < coalesce((select p.quotes_per_book from public.plans p where p.key = 'free'), 15)
    )
  );

drop policy if exists "update own highlights" on public.highlights;
create policy "update own highlights" on public.highlights for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "delete own highlights" on public.highlights;
create policy "delete own highlights" on public.highlights for delete
  using (auth.uid() = owner_id);
