import { deliverAlert, getEligibleAlertChannels } from "./alerts";
import { env } from "./env";
import {
  createAlertWithDeliveries,
  createSnapshot,
  getEventBySourceId,
  getLatestSnapshot,
  listWatchArtists,
  recordSourceHealth,
  upsertEvent,
  updateAlertDeliveryResult,
} from "./supabase";
import { bandsintownAdapter } from "./sources/bandsintown";
import { eventbriteAdapter } from "./sources/eventbrite";
import { songkickAdapter } from "./sources/songkick";
import { ticketmasterAdapter } from "./sources/ticketmaster";
import { logger } from "./logger";
import type { AlertType, EventRecord, NormalizedEvent, PollResult, WatchArtist } from "./types";
import { dedupeEvents, hashJson, movedEarlier } from "./utils";

/**
 * Stable idempotency key per (event, alert_type, change signature).
 * Two polls that observe the same underlying change produce the same key,
 * so the alerts table — checked via `alertExistsByIdempotencyKey` — dedupes
 * the second write. Without this, overlapping cron runs double-notify users.
 */
const buildIdempotencyKey = (alertType: AlertType, eventId: string, next: EventRecord): string => {
  switch (alertType) {
    case "new_event":
      return `new_event::${eventId}`;
    case "status_changed":
      return `status_changed::${eventId}::${next.status}`;
    case "ticket_url_changed":
      return `ticket_url_changed::${eventId}::${next.ticket_url ?? ""}`;
    case "on_sale_moved_earlier":
      return `on_sale_moved_earlier::${eventId}::${next.on_sale_start ?? ""}`;
    case "presale_announced":
    case "presale_opened":
    case "public_sale_announced":
    case "public_sale_opened":
      return `${alertType}::${eventId}::${hashJson(next.sale_windows ?? [])}`;
  }
};

const buildAlertMessage = (alertType: AlertType, previous: EventRecord | null, next: EventRecord): string => {
  if (alertType === "new_event") {
    return `New event found: ${next.artist_name} at ${next.venue ?? "Unknown venue"}`;
  }

  if (alertType === "status_changed") {
    return `Status changed from ${previous?.status ?? "unknown"} to ${next.status}`;
  }

  if (alertType === "ticket_url_changed") {
    return "Ticket URL changed";
  }

  if (alertType === "presale_announced") return "A new presale window was announced";
  if (alertType === "presale_opened") return "A presale window is now open";
  if (alertType === "public_sale_announced") return "The public sale was announced";
  if (alertType === "public_sale_opened") return "The public sale is now open";

  return `On-sale moved earlier (${previous?.on_sale_start ?? "unknown"} -> ${next.on_sale_start ?? "unknown"})`;
};

const getAlertTypes = (previous: EventRecord | null, next: NormalizedEvent): AlertType[] => {
  if (!previous) {
    return ["new_event"];
  }

  const alerts: AlertType[] = [];

  if (next.status !== previous.status) {
    alerts.push("status_changed");
  }

  if (next.ticket_url && next.ticket_url !== previous.ticket_url) {
    alerts.push("ticket_url_changed");
  }

  if (movedEarlier(previous.on_sale_start, next.on_sale_start)) {
    alerts.push("on_sale_moved_earlier");
  }

  const previousWindows = new Set(
    (previous.sale_windows ?? []).map((window) =>
      [window.kind, window.name, window.starts_at].join("::"),
    ),
  );
  for (const window of next.sale_windows ?? []) {
    const key = [window.kind, window.name, window.starts_at].join("::");
    if (previousWindows.has(key)) continue;
    const opened = window.starts_at
      ? new Date(window.starts_at).getTime() <= Date.now()
      : false;
    if (window.kind === "presale") {
      alerts.push(opened ? "presale_opened" : "presale_announced");
    } else {
      alerts.push(opened ? "public_sale_opened" : "public_sale_announced");
    }
  }

  return alerts;
};

/** Maximum number of artists to fetch from sources concurrently. */
const POLL_CONCURRENCY = 5;

/**
 * Run a pool of async tasks with bounded concurrency.
 * Returns results in the same order as the input tasks.
 */
const runPool = async <T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await tasks[index]!();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  );

  return results;
};


/**
 * Fetch events for a single artist from all sources concurrently.
 * Failures in individual sources are logged but don't stop the poll.
 */
const sourceAdapters = [
  ticketmasterAdapter,
  eventbriteAdapter,
  songkickAdapter,
  bandsintownAdapter,
];

const fetchSelectedSourcesForArtist = async (
  artist: WatchArtist,
  sourceSlugs?: string[],
): Promise<NormalizedEvent[]> => {
  const selected = sourceAdapters.filter(
    (adapter) =>
      adapter.configured() &&
      (!sourceSlugs || sourceSlugs.length === 0 || sourceSlugs.includes(adapter.slug)),
  );
  const settled = await Promise.allSettled(
    selected.map((adapter) => adapter.fetchForArtist(artist)),
  );
  const normalized: NormalizedEvent[] = [];
  for (const [index, result] of settled.entries()) {
    const slug = selected[index]?.slug ?? "source";
    if (result.status === "fulfilled") {
      normalized.push(...result.value);
      await recordSourceHealth(slug, { success: true });
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.error(`[poll] ${slug} failed for ${artist.name}`, result.reason);
      await recordSourceHealth(slug, { success: false, error: message });
    }
  }
  return normalized;
};

const fetchSourcesForArtist = async (artist: WatchArtist): Promise<NormalizedEvent[]> =>
  fetchSelectedSourcesForArtist(artist);

/**
 * Look up a single artist by ID and fetch its events.
 * Used by the per-artist poll endpoint.
 */
const fetchAllSourcesForArtist = async (
  artistId: string,
  userId?: string,
  sourceSlugs?: string[],
): Promise<NormalizedEvent[]> => {
  const artists = await listWatchArtists(userId);
  const artist = artists.find((item) => item.id === artistId);

  if (!artist) {
    return [];
  }

  return fetchSelectedSourcesForArtist(artist, sourceSlugs);
};

const persistAndDeliverAlert = async (
  alertType: AlertType,
  previous: EventRecord | null,
  savedEvent: EventRecord,
): Promise<boolean> => {
  const idempotencyKey = buildIdempotencyKey(alertType, savedEvent.id, savedEvent);
  const channels = await getEligibleAlertChannels(savedEvent.user_id);
  const result = await createAlertWithDeliveries({
    userId: savedEvent.user_id,
    eventId: savedEvent.id,
    alertType,
    message: buildAlertMessage(alertType, previous, savedEvent),
    payload: {
      source: savedEvent.source_slug,
      source_event_id: savedEvent.source_event_id,
    },
    idempotencyKey,
    channels,
  });
  if (!result.created) {
    logger.info(`[poll] skipping duplicate alert ${idempotencyKey}`);
    return false;
  }
  const delivery = await deliverAlert(alertType, savedEvent);
  await updateAlertDeliveryResult(result.alertId, delivery.channels, delivery.errors);
  return true;
};

/**
 * Fetch events for all watched artists concurrently (bounded by POLL_CONCURRENCY).
 * Previously this ran sequentially — with 20 artists × 2 sources that meant
 * ~40 serial API calls. Now artists are fetched in parallel batches of 5.
 */
const fetchAllEvents = async (city?: string, userId?: string): Promise<NormalizedEvent[]> => {
  const artists = await listWatchArtists(userId);

  const eligibleArtists = artists.filter((artist) => {
    if (city && artist.city && artist.city.toLowerCase() !== city.toLowerCase()) {
      return false;
    }
    return true;
  });

  if (eligibleArtists.length === 0) {
    return [];
  }

  const tasks = eligibleArtists.map(
    (artist) => () => fetchSourcesForArtist(artist),
  );

  const resultsPerArtist = await runPool(tasks, POLL_CONCURRENCY);

  return resultsPerArtist.flat();
};

export const runPollCycle = async (city?: string, userId?: string): Promise<PollResult> => {
  const startedAt = new Date().toISOString();
  const artists = await listWatchArtists(userId);

  if (artists.length === 0) {
    return {
      checkedArtists: 0,
      fetchedEvents: 0,
      dedupedEvents: 0,
      newEvents: 0,
      changedEvents: 0,
      alertsCreated: 0,
      startedAt,
      endedAt: new Date().toISOString(),
    };
  }

  const fetchedEvents = await fetchAllEvents(city ?? env.defaultCity, userId);
  const deduped = dedupeEvents(fetchedEvents);

  let newEvents = 0;
  let changedEvents = 0;
  let alertsCreated = 0;

  for (const normalized of deduped) {
    const existing = await getEventBySourceId(normalized.source_slug, normalized.source_event_id, normalized.user_id);
    const alertTypes = getAlertTypes(existing, normalized);

    const savedEvent = await upsertEvent(normalized);
    const rawHash = hashJson(normalized.raw_json);
    const latestSnapshot = await getLatestSnapshot(savedEvent.id);

    if (!latestSnapshot || latestSnapshot.raw_json_hash !== rawHash) {
      await createSnapshot(savedEvent.id, rawHash, normalized.raw_json);
    }

    if (!existing) {
      newEvents += 1;
    } else if (alertTypes.length > 0) {
      changedEvents += 1;
    }

    for (const alertType of alertTypes) {
      if (await persistAndDeliverAlert(alertType, existing, savedEvent)) alertsCreated += 1;
    }
  }

  return {
    checkedArtists: artists.length,
    fetchedEvents: fetchedEvents.length,
    dedupedEvents: deduped.length,
    newEvents,
    changedEvents,
    alertsCreated,
    startedAt,
    endedAt: new Date().toISOString(),
  };
};

export const runPollForArtist = async (
  artistId: string,
  userId?: string,
  sourceSlugs?: string[],
): Promise<PollResult> => {
  const startedAt = new Date().toISOString();
  const events = dedupeEvents(await fetchAllSourcesForArtist(artistId, userId, sourceSlugs));

  let alertsCreated = 0;

  for (const normalized of events) {
    const existing = await getEventBySourceId(normalized.source_slug, normalized.source_event_id, normalized.user_id);
    const alertTypes = getAlertTypes(existing, normalized);

    const savedEvent = await upsertEvent(normalized);
    const latestSnapshot = await getLatestSnapshot(savedEvent.id);
    const rawHash = hashJson(normalized.raw_json);

    if (!latestSnapshot || latestSnapshot.raw_json_hash !== rawHash) {
      await createSnapshot(savedEvent.id, rawHash, normalized.raw_json);
    }

    for (const alertType of alertTypes) {
      if (await persistAndDeliverAlert(alertType, existing, savedEvent)) alertsCreated += 1;
    }
  }

  return {
    checkedArtists: 1,
    fetchedEvents: events.length,
    dedupedEvents: events.length,
    newEvents: 0,
    changedEvents: 0,
    alertsCreated,
    startedAt,
    endedAt: new Date().toISOString(),
  };
};
