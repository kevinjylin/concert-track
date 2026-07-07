import { assertSupabaseConfig, env } from "./env";
import type {
  AlertRecord,
  AlertType,
  EventRecord,
  NormalizedEvent,
  NotificationSettingsRecord,
  SnapshotRecord,
  WatchArtist,
} from "./types";

interface CreateWatchArtistInput {
  userId: string;
  name: string;
  spotifyId?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface CreateAlertInput {
  userId: string;
  eventId: string;
  alertType: AlertType;
  message: string;
  payload?: Record<string, unknown>;
  sentChannels: string[];
  sentAt: string | null;
  idempotencyKey?: string;
}

interface UpsertNotificationSettingsInput {
  userId: string;
  discordWebhookEncrypted?: string | null;
  emailEncrypted?: string | null;
  phoneEncrypted?: string | null;
  discordEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  emailConfirmedAt?: string | null;
  smsConfirmedAt?: string | null;
  emailConfirmationHash?: string | null;
  emailConfirmationExpiresAt?: string | null;
  smsConfirmationHash?: string | null;
  smsConfirmationExpiresAt?: string | null;
}

const getBaseUrl = (): string => {
  assertSupabaseConfig();
  return `${env.supabaseUrl}/rest/v1`;
};

const getAuthHeaders = (): HeadersInit => {
  assertSupabaseConfig();

  return {
    apikey: env.supabaseServiceKey as string,
    Authorization: `Bearer ${env.supabaseServiceKey as string}`,
  };
};

export const supabaseRequest = async <T>(
  path: string,
  init: RequestInit = {},
  acceptSingle = false,
): Promise<T> => {
  const headers = new Headers(init.headers);
  const authHeaders = getAuthHeaders();

  Object.entries(authHeaders).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  });

  headers.set("Content-Type", "application/json");
  if (acceptSingle) {
    headers.set("Accept", "application/vnd.pgrst.object+json");
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

export const rpcRequest = async <T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> =>
  supabaseRequest<T>(`/rpc/${encodeURIComponent(functionName)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const listWatchArtists = async (
  userId?: string,
): Promise<WatchArtist[]> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return [];
  }

  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";

  return supabaseRequest<WatchArtist[]>(
    `/watch_artists?select=*&order=created_at.desc${userFilter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};

export const createWatchArtist = async (
  input: CreateWatchArtistInput,
): Promise<WatchArtist> => {
  const payload = {
    user_id: input.userId,
    name: input.name,
    spotify_id: input.spotifyId ?? null,
    city: input.city ?? "",
    state: input.state ?? "",
    country: input.country ?? "US",
  };

  return supabaseRequest<WatchArtist>(
    "/watch_artists?select=*&on_conflict=user_id,name,city,country",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    },
    true,
  );
};

export const deleteWatchArtist = async (
  id: string,
  userId: string,
): Promise<void> => {
  await supabaseRequest<void>(
    `/watch_artists?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    },
  );
};

export const listEvents = async (
  limit = 100,
  userId?: string,
): Promise<EventRecord[]> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return [];
  }

  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";

  return supabaseRequest<EventRecord[]>(
    `/events?select=*&order=updated_at.desc&limit=${encodeURIComponent(String(limit))}${userFilter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};

export const getEventBySourceId = async (
  sourceSlug: string,
  sourceEventId: string,
  userId: string,
): Promise<EventRecord | null> => {
  const encodedSource = encodeURIComponent(sourceSlug);
  const encodedId = encodeURIComponent(sourceEventId);
  const encodedUserId = encodeURIComponent(userId);

  const records = await supabaseRequest<EventRecord[]>(
    `/events?select=*&user_id=eq.${encodedUserId}&source_slug=eq.${encodedSource}&source_event_id=eq.${encodedId}&limit=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return records[0] ?? null;
};

export const upsertEvent = async (
  normalized: NormalizedEvent,
): Promise<EventRecord> => {
  const payload = {
    user_id: normalized.user_id,
    source_slug: normalized.source_slug,
    source_event_id: normalized.source_event_id,
    watch_artist_id: normalized.watch_artist_id,
    artist_name: normalized.artist_name,
    title: normalized.title,
    venue: normalized.venue,
    city: normalized.city,
    state: normalized.state,
    country: normalized.country,
    start_time: normalized.start_time,
    ticket_url: normalized.ticket_url,
    status: normalized.status,
    on_sale_start: normalized.on_sale_start,
    dedupe_key: normalized.dedupe_key,
    last_seen_at: new Date().toISOString(),
  };

  return supabaseRequest<EventRecord>(
    "/events?select=*&on_conflict=user_id,source_slug,source_event_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    },
    true,
  );
};

export const getLatestSnapshot = async (
  eventId: string,
): Promise<SnapshotRecord | null> => {
  const encodedEventId = encodeURIComponent(eventId);

  const snapshots = await supabaseRequest<SnapshotRecord[]>(
    `/snapshots?select=*&event_id=eq.${encodedEventId}&order=checked_at.desc&limit=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return snapshots[0] ?? null;
};

export const createSnapshot = async (
  eventId: string,
  rawJsonHash: string,
  rawJson: unknown,
): Promise<SnapshotRecord> => {
  return supabaseRequest<SnapshotRecord>(
    "/snapshots?select=*",
    {
      method: "POST",
      body: JSON.stringify({
        event_id: eventId,
        raw_json_hash: rawJsonHash,
        raw_json: rawJson,
      }),
    },
    true,
  );
};

export const listAlerts = async (
  limit = 50,
  userId?: string,
): Promise<AlertRecord[]> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return [];
  }

  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";

  return supabaseRequest<AlertRecord[]>(
    `/alerts?select=*&order=created_at.desc&limit=${encodeURIComponent(String(limit))}${userFilter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};

export const alertExistsByIdempotencyKey = async (
  idempotencyKey: string,
): Promise<boolean> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return false;
  }

  const encodedKey = encodeURIComponent(idempotencyKey);
  const records = await supabaseRequest<Array<{ id: string }>>(
    `/alerts?select=id&payload->>idempotency_key=eq.${encodedKey}&limit=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return records.length > 0;
};

export const createAlert = async (
  input: CreateAlertInput,
): Promise<AlertRecord> => {
  const payload: Record<string, unknown> = { ...(input.payload ?? {}) };
  if (input.idempotencyKey) {
    payload.idempotency_key = input.idempotencyKey;
  }

  return supabaseRequest<AlertRecord>(
    "/alerts?select=*",
    {
      method: "POST",
      body: JSON.stringify({
        event_id: input.eventId,
        user_id: input.userId,
        alert_type: input.alertType,
        message: input.message,
        payload,
        sent_channels: input.sentChannels,
        sent_at: input.sentAt,
      }),
    },
    true,
  );
};

export const getNotificationSettings = async (
  userId: string,
): Promise<NotificationSettingsRecord | null> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return null;
  }

  const encodedUserId = encodeURIComponent(userId);
  const settings = await supabaseRequest<NotificationSettingsRecord[]>(
    `/notification_settings?select=*&user_id=eq.${encodedUserId}&limit=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return settings[0] ?? null;
};

export const upsertNotificationSettings = async (
  input: UpsertNotificationSettingsInput,
): Promise<NotificationSettingsRecord> => {
  const existing = await getNotificationSettings(input.userId);
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    discord_webhook_encrypted: existing?.discord_webhook_encrypted ?? null,
    email_encrypted: existing?.email_encrypted ?? null,
    phone_encrypted: existing?.phone_encrypted ?? null,
    discord_enabled: existing?.discord_enabled ?? false,
    email_enabled: existing?.email_enabled ?? false,
    sms_enabled: existing?.sms_enabled ?? false,
    email_confirmed_at: existing?.email_confirmed_at ?? null,
    sms_confirmed_at: existing?.sms_confirmed_at ?? null,
    email_confirmation_hash: existing?.email_confirmation_hash ?? null,
    email_confirmation_expires_at:
      existing?.email_confirmation_expires_at ?? null,
    sms_confirmation_hash: existing?.sms_confirmation_hash ?? null,
    sms_confirmation_expires_at: existing?.sms_confirmation_expires_at ?? null,
  };

  if ("discordWebhookEncrypted" in input) {
    payload.discord_webhook_encrypted = input.discordWebhookEncrypted;
  }

  if ("emailEncrypted" in input) {
    payload.email_encrypted = input.emailEncrypted;
  }

  if ("phoneEncrypted" in input) {
    payload.phone_encrypted = input.phoneEncrypted;
  }

  if ("discordEnabled" in input) {
    payload.discord_enabled = input.discordEnabled;
  }

  if ("emailEnabled" in input) {
    payload.email_enabled = input.emailEnabled;
  }

  if ("smsEnabled" in input) {
    payload.sms_enabled = input.smsEnabled;
  }

  if ("emailConfirmedAt" in input) {
    payload.email_confirmed_at = input.emailConfirmedAt;
  }

  if ("smsConfirmedAt" in input) {
    payload.sms_confirmed_at = input.smsConfirmedAt;
  }

  if ("emailConfirmationHash" in input) {
    payload.email_confirmation_hash = input.emailConfirmationHash;
  }

  if ("emailConfirmationExpiresAt" in input) {
    payload.email_confirmation_expires_at = input.emailConfirmationExpiresAt;
  }

  if ("smsConfirmationHash" in input) {
    payload.sms_confirmation_hash = input.smsConfirmationHash;
  }

  if ("smsConfirmationExpiresAt" in input) {
    payload.sms_confirmation_expires_at = input.smsConfirmationExpiresAt;
  }

  return supabaseRequest<NotificationSettingsRecord>(
    "/notification_settings?select=*&on_conflict=user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    },
    true,
  );
};
