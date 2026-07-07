export type SourceSlug = "ticketmaster" | "eventbrite" | "manual";

export type EventStatus =
  | "onsale"
  | "offsale"
  | "cancelled"
  | "postponed"
  | "rescheduled"
  | "scheduled"
  | "unknown";

export type AlertType =
  | "new_event"
  | "status_changed"
  | "ticket_url_changed"
  | "on_sale_moved_earlier";

export interface WatchArtist {
  id: string;
  user_id: string;
  name: string;
  spotify_id: string | null;
  city: string | null;
  state: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface ArtistSuggestion {
  id: string;
  name: string;
  imageUrl: string | null;
  profileUrl: string | null;
}

export interface LocationSuggestion {
  id: string;
  kind: "city" | "state";
  city: string;
  state: string;
  country: string;
  label: string;
  description: string;
}

export interface EventRecord {
  id: string;
  user_id: string;
  source_slug: SourceSlug;
  source_event_id: string;
  watch_artist_id: string | null;
  artist_name: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  start_time: string | null;
  ticket_url: string | null;
  status: EventStatus;
  on_sale_start: string | null;
  dedupe_key: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface SnapshotRecord {
  id: string;
  event_id: string;
  checked_at: string;
  raw_json_hash: string;
  raw_json: unknown;
}

export interface AlertRecord {
  id: string;
  user_id: string;
  event_id: string;
  alert_type: AlertType;
  message: string;
  payload: Record<string, unknown>;
  sent_channels: string[];
  sent_at: string | null;
  created_at: string;
}

export interface NotificationSettingsRecord {
  user_id: string;
  discord_webhook_encrypted: string | null;
  email_encrypted: string | null;
  phone_encrypted: string | null;
  discord_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_confirmed_at: string | null;
  sms_confirmed_at: string | null;
  email_confirmation_hash: string | null;
  email_confirmation_expires_at: string | null;
  sms_confirmation_hash: string | null;
  sms_confirmation_expires_at: string | null;
  email_confirmation_attempts: number;
  sms_confirmation_attempts: number;
  confirmation_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettingsResponse {
  discordWebhook: {
    configured: boolean;
    enabled: boolean;
    masked: string | null;
  };
  email: {
    configured: boolean;
    enabled: boolean;
    confirmed: boolean;
    masked: string | null;
  };
  phone: {
    configured: boolean;
    enabled: boolean;
    confirmed: boolean;
    masked: string | null;
  };
}

export interface NormalizedEvent {
  user_id: string;
  source_slug: SourceSlug;
  source_event_id: string;
  watch_artist_id: string;
  artist_name: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  start_time: string | null;
  ticket_url: string | null;
  status: EventStatus;
  on_sale_start: string | null;
  dedupe_key: string;
  raw_json: unknown;
}

export interface PollResult {
  checkedArtists: number;
  fetchedEvents: number;
  dedupedEvents: number;
  newEvents: number;
  changedEvents: number;
  alertsCreated: number;
  startedAt: string;
  endedAt: string;
}

export interface PollRequestBody {
  city?: string;
}

export interface HealthResponse {
  databaseConfigured: boolean;
  sourceKeysConfigured: {
    ticketmaster: boolean;
    eventbrite: boolean;
    spotify: boolean;
  };
  authConfigured: {
    supabase: boolean;
  };
  alertChannelsConfigured: {
    discord: boolean;
    email: boolean;
    sms: boolean;
  };
}
