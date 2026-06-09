-- Bootstrap only. Production changes live in ../supabase/migrations.
-- Apply migrations in timestamp order with the Supabase CLI.
create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('ticketmaster', 'eventbrite', 'manual')),
  name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sources_set_updated_at on sources;
create trigger sources_set_updated_at
before update on sources
for each row
execute function set_updated_at();

insert into sources (slug, name)
values
  ('ticketmaster', 'Ticketmaster Discovery'),
  ('eventbrite', 'Eventbrite'),
  ('manual', 'Manual/Curated')
on conflict (slug) do nothing;

create table if not exists watch_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  spotify_id text,
  city text not null default '',
  state text not null default '',
  country text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table watch_artists
drop constraint if exists watch_artists_name_city_country_key;

create unique index if not exists watch_artists_user_name_city_country_idx
on watch_artists (user_id, name, city, country);

drop trigger if exists watch_artists_set_updated_at on watch_artists;
create trigger watch_artists_set_updated_at
before update on watch_artists
for each row
execute function set_updated_at();

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_slug text not null references sources(slug),
  source_event_id text not null,
  watch_artist_id uuid references watch_artists(id) on delete set null,
  artist_name text not null,
  title text not null,
  venue text,
  city text,
  state text,
  country text,
  start_time timestamptz,
  ticket_url text,
  status text not null default 'unknown',
  on_sale_start timestamptz,
  dedupe_key text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table events
drop constraint if exists events_source_slug_source_event_id_key;

create unique index if not exists events_user_source_event_idx
on events (user_id, source_slug, source_event_id);

create index if not exists events_artist_start_idx
on events (artist_name, start_time desc);

create index if not exists events_dedupe_key_idx
on events (dedupe_key);

create index if not exists events_user_updated_idx
on events (user_id, updated_at desc);

drop trigger if exists events_set_updated_at on events;
create trigger events_set_updated_at
before update on events
for each row
execute function set_updated_at();

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  checked_at timestamptz not null default now(),
  raw_json_hash text not null,
  raw_json jsonb not null
);

create index if not exists snapshots_event_checked_idx
on snapshots (event_id, checked_at desc);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  alert_type text not null check (
    alert_type in ('new_event', 'status_changed', 'ticket_url_changed', 'on_sale_moved_earlier')
  ),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_channels text[] not null default '{}',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alerts_created_at_idx
on alerts (created_at desc);

create index if not exists alerts_user_created_at_idx
on alerts (user_id, created_at desc);

create table if not exists notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_webhook_encrypted text,
  email_encrypted text,
  phone_encrypted text,
  discord_enabled boolean not null default false,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  email_confirmed_at timestamptz,
  sms_confirmed_at timestamptz,
  email_confirmation_hash text,
  email_confirmation_expires_at timestamptz,
  sms_confirmation_hash text,
  sms_confirmation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep this bootstrap schema private even before versioned migrations run.
alter table sources enable row level security;
alter table watch_artists enable row level security;
alter table events enable row level security;
alter table snapshots enable row level security;
alter table alerts enable row level security;
alter table notification_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

drop trigger if exists notification_settings_set_updated_at on notification_settings;
create trigger notification_settings_set_updated_at
before update on notification_settings
for each row
execute function set_updated_at();
