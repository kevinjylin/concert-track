import { deliverAlert } from "./alerts";
import { env } from "./env";
import {
  alertExistsByIdempotencyKey,
  createAlert,
  createSnapshot,
  getEventBySourceId,
  getLatestSnapshot,
  listWatchArtists,
  upsertEvent,
} from "./supabase";
import { fetchEventbriteEvents } from "./sources/eventbrite";
import { fetchTicketmasterEvents } from "./sources/ticketmaster";
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
const fetchSourcesForArtist = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  const sourceResults = await Promise.allSettled([
    fetchTicketmasterEvents(artist),
    fetchEventbriteEvents(artist),
  ]);

  const ticketmasterEvents = sourceResults[0].status === "fulfilled" ? sourceResults[0].value : [];
  const eventbriteEvents = sourceResults[1].status === "fulfilled" ? sourceResults[1].value : [];

  if (sourceResults[0].status === "rejected") {
    logger.error(`[poll] ticketmaster failed for ${artist.name}`, sourceResults[0].reason);
  }

  if (sourceResults[1].status === "rejected") {
    logger.error(`[poll] eventbrite failed for ${artist.name}`, sourceResults[1].reason);
  }

  return [...ticketmasterEvents, ...eventbriteEvents];
};

/**
 * Look up a single artist by ID and fetch its events.
 * Used by the per-artist poll endpoint.
 */
const fetchAllSourcesForArtist = async (artistId: string, userId?: string): Promise<NormalizedEvent[]> => {
  const artists = await listWatchArtists(userId);
  const artist = artists.find((item) => item.id === artistId);

  if (!artist) {
    return [];
  }

  return fetchSourcesForArtist(artist);
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
      const idempotencyKey = buildIdempotencyKey(alertType, savedEvent.id, savedEvent);

      if (await alertExistsByIdempotencyKey(idempotencyKey)) {
        logger.info(`[poll] skipping duplicate alert ${idempotencyKey}`);
        continue;
      }

      const message = buildAlertMessage(alertType, existing, savedEvent);
      const delivery = await deliverAlert(alertType, savedEvent);

      await createAlert({
        userId: savedEvent.user_id,
        eventId: savedEvent.id,
        alertType,
        message,
        payload: {
          source: savedEvent.source_slug,
          source_event_id: savedEvent.source_event_id,
          delivery_errors: delivery.errors,
        },
        sentChannels: delivery.channels,
        sentAt: new Date().toISOString(),
        idempotencyKey,
      });

      alertsCreated += 1;
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

export const runPollForArtist = async (artistId: string, userId?: string): Promise<PollResult> => {
  const startedAt = new Date().toISOString();
  const events = dedupeEvents(await fetchAllSourcesForArtist(artistId, userId));

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
      const idempotencyKey = buildIdempotencyKey(alertType, savedEvent.id, savedEvent);

      if (await alertExistsByIdempotencyKey(idempotencyKey)) {
        logger.info(`[poll] skipping duplicate alert ${idempotencyKey}`);
        continue;
      }

      const message = buildAlertMessage(alertType, existing, savedEvent);
      const delivery = await deliverAlert(alertType, savedEvent);

      await createAlert({
        userId: savedEvent.user_id,
        eventId: savedEvent.id,
        alertType,
        message,
        payload: {
          source: savedEvent.source_slug,
          source_event_id: savedEvent.source_event_id,
          delivery_errors: delivery.errors,
        },
        sentChannels: delivery.channels,
        sentAt: new Date().toISOString(),
        idempotencyKey,
      });

      alertsCreated += 1;
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
