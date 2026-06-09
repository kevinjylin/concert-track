create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.sources enable row level security;
alter table if exists public.watch_artists enable row level security;
alter table if exists public.events enable row level security;
alter table if exists public.snapshots enable row level security;
alter table if exists public.alerts enable row level security;
alter table if exists public.notification_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

alter table if exists public.alerts
  add column if not exists idempotency_key text,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'processing', 'sent', 'partial', 'failed'));

alter table if exists public.events
  add column if not exists sale_windows jsonb not null default '[]'::jsonb;

update public.alerts
set idempotency_key = payload ->> 'idempotency_key'
where idempotency_key is null and payload ? 'idempotency_key';

create unique index if not exists alerts_idempotency_key_idx
  on public.alerts (idempotency_key)
  where idempotency_key is not null;

alter table if exists public.notification_settings
  add column if not exists email_confirmation_attempts integer not null default 0,
  add column if not exists sms_confirmation_attempts integer not null default 0,
  add column if not exists confirmation_sent_at timestamptz;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  spotify_id text unique,
  ticketmaster_id text,
  songkick_id text,
  bandsintown_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_normalized_name_idx
  on public.artists (normalized_name);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  city text,
  state text,
  country text not null default 'US',
  latitude double precision,
  longitude double precision,
  source_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watch_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('artist', 'venue', 'location')),
  artist_id uuid references public.artists(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  label text not null,
  city text,
  state text,
  country text not null default 'US',
  latitude double precision,
  longitude double precision,
  radius_miles integer check (radius_miles between 1 and 500),
  legacy_watch_artist_id uuid unique references public.watch_artists(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'artist' and artist_id is not null) or
    (kind = 'venue' and venue_id is not null) or
    (kind = 'location' and latitude is not null and longitude is not null and radius_miles is not null)
  )
);

create index if not exists watch_rules_user_idx
  on public.watch_rules (user_id, created_at desc);

create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  title text not null,
  normalized_title text not null,
  start_time timestamptz,
  status text not null default 'unknown',
  primary_ticket_url text,
  dedupe_key text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unavailable_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists canonical_events_dedupe_idx
  on public.canonical_events (dedupe_key);

create table if not exists public.source_events (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  source_slug text not null,
  source_event_id text not null,
  source_url text,
  raw_json jsonb not null default '{}'::jsonb,
  raw_json_hash text not null,
  last_seen_at timestamptz not null default now(),
  missing_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_slug, source_event_id)
);

create table if not exists public.sale_windows (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  source_event_id uuid references public.source_events(id) on delete cascade,
  kind text not null check (kind in ('presale', 'public')),
  name text not null,
  url text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_event_id, kind, name, starts_at)
);

create table if not exists public.event_changes (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete cascade,
  change_type text not null,
  fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (canonical_event_id, change_type, fingerprint)
);

create table if not exists public.poll_jobs (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null,
  target_type text not null check (target_type in ('artist', 'venue', 'location', 'legacy_user')),
  target_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  priority integer not null default 0,
  next_poll_at timestamptz not null default now(),
  cadence_seconds integer not null default 1800 check (cadence_seconds between 60 and 86400),
  lease_owner text,
  lease_expires_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_slug, target_type, target_id)
);

create index if not exists poll_jobs_due_idx
  on public.poll_jobs (next_poll_at, priority desc)
  where lease_expires_at is null;

create table if not exists public.poll_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.poll_jobs(id) on delete set null,
  source_slug text not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  fetched_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.source_health (
  source_slug text primary key,
  enabled boolean not null default false,
  access_mode text not null default 'unconfigured'
    check (access_mode in ('official', 'partner', 'public_page', 'unconfigured')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  quota_remaining integer,
  stale_after_seconds integer not null default 3600,
  updated_at timestamptz not null default now()
);

insert into public.source_health (source_slug, access_mode)
values
  ('ticketmaster', 'official'),
  ('eventbrite', 'unconfigured'),
  ('songkick', 'partner'),
  ('bandsintown', 'partner'),
  ('axs', 'unconfigured'),
  ('dice', 'unconfigured')
on conflict (source_slug) do nothing;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  channel text not null check (channel in ('discord', 'email', 'sms')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, channel)
);

create index if not exists notification_deliveries_due_idx
  on public.notification_deliveries (next_attempt_at)
  where status in ('pending', 'failed');

create table if not exists public.api_rate_limits (
  bucket text not null,
  subject text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (bucket, subject, window_started_at)
);

insert into public.artists (name, normalized_name, spotify_id)
select distinct on (lower(trim(name)))
  name,
  lower(trim(name)),
  spotify_id
from public.watch_artists
where trim(name) <> ''
order by lower(trim(name)), created_at
on conflict (normalized_name) do update
set spotify_id = coalesce(public.artists.spotify_id, excluded.spotify_id);

insert into public.watch_rules (
  user_id, kind, artist_id, label, city, state, country, legacy_watch_artist_id
)
select
  u.id,
  'artist',
  a.id,
  wa.name,
  nullif(wa.city, ''),
  nullif(wa.state, ''),
  wa.country,
  wa.id
from public.watch_artists wa
join public.artists a on a.normalized_name = lower(trim(wa.name))
join auth.users u on u.id::text = wa.user_id::text
on conflict (legacy_watch_artist_id) do nothing;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (bucket, subject, window_started_at, request_count)
  values (p_bucket, p_subject, v_window, 1)
  on conflict (bucket, subject, window_started_at)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    greatest(ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::integer, 1);
end;
$$;

create or replace function public.claim_poll_jobs(
  p_worker text,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns setof public.poll_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select id
    from public.poll_jobs
    where next_poll_at <= now()
      and (lease_expires_at is null or lease_expires_at < now())
    order by priority desc, next_poll_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.poll_jobs j
  set lease_owner = p_worker,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempts = attempts + 1,
      updated_at = now()
  from due
  where j.id = due.id
  returning j.*;
end;
$$;

create or replace function public.create_alert_with_deliveries(
  p_user_id uuid,
  p_event_id uuid,
  p_alert_type text,
  p_message text,
  p_payload jsonb,
  p_idempotency_key text,
  p_channels text[]
)
returns table (alert_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alert_id uuid;
  v_channel text;
begin
  insert into public.alerts (
    user_id, event_id, alert_type, message, payload, idempotency_key, delivery_status
  )
  values (
    p_user_id, p_event_id, p_alert_type, p_message, p_payload,
    p_idempotency_key, 'pending'
  )
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning id into v_alert_id;

  if v_alert_id is null then
    select id into v_alert_id from public.alerts where idempotency_key = p_idempotency_key;
    return query select v_alert_id, false;
    return;
  end if;

  foreach v_channel in array p_channels loop
    insert into public.notification_deliveries (alert_id, channel)
    values (v_alert_id, v_channel)
    on conflict (alert_id, channel) do nothing;
  end loop;

  return query select v_alert_id, true;
end;
$$;

create or replace function public.confirm_email_token(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  update public.notification_settings
  set email_confirmed_at = now(),
      email_confirmation_hash = null,
      email_confirmation_expires_at = null,
      email_confirmation_attempts = 0,
      updated_at = now()
  where email_confirmation_hash = p_token_hash
    and email_confirmation_expires_at >= now()
  returning user_id into v_user_id;
  return v_user_id;
end;
$$;

create or replace function public.confirm_sms_code(p_user_id uuid, p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.notification_settings;
begin
  select * into v_record
  from public.notification_settings
  where user_id = p_user_id
    and sms_confirmation_hash is not null
  for update;

  if v_record.user_id is null
     or v_record.sms_confirmation_expires_at < now()
     or v_record.sms_confirmation_attempts >= 5 then
    return false;
  end if;

  if v_record.sms_confirmation_hash = p_code_hash then
    update public.notification_settings
    set sms_confirmed_at = now(),
        sms_confirmation_hash = null,
        sms_confirmation_expires_at = null,
        sms_confirmation_attempts = 0,
        updated_at = now()
    where user_id = p_user_id;
    return true;
  end if;

  update public.notification_settings
  set sms_confirmation_attempts = sms_confirmation_attempts + 1,
      updated_at = now()
  where user_id = p_user_id;
  return false;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_poll_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_alert_with_deliveries(uuid, uuid, text, text, jsonb, text, text[]) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.claim_poll_jobs(text, integer, integer) to service_role;
grant execute on function public.create_alert_with_deliveries(uuid, uuid, text, text, jsonb, text, text[]) to service_role;
revoke all on function public.confirm_email_token(text) from public, anon, authenticated;
revoke all on function public.confirm_sms_code(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_email_token(text) to service_role;
grant execute on function public.confirm_sms_code(uuid, text) to service_role;

alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.watch_rules enable row level security;
alter table public.canonical_events enable row level security;
alter table public.source_events enable row level security;
alter table public.sale_windows enable row level security;
alter table public.event_changes enable row level security;
alter table public.poll_jobs enable row level security;
alter table public.poll_runs enable row level security;
alter table public.source_health enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.api_rate_limits enable row level security;
