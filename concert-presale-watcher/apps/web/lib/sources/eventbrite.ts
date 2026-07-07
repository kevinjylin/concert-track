import { env } from "../env";
import { fetchWithRetry } from "../fetchWithRetry";
import { stateMatches } from "../state";
import type { NormalizedEvent, WatchArtist } from "../types";
import { asIsoOrNull, buildDedupeKey, normalizeStatus } from "../utils";

interface EventbriteVenue {
  name?: string;
  address?: {
    city?: string;
    region?: string;
    country?: string;
  };
}

interface EventbriteEvent {
  id?: string;
  status?: string;
  url?: string;
  name?: {
    text?: string;
  };
  start?: {
    utc?: string;
    local?: string;
  };
  sales_start?: string;
  venue?: EventbriteVenue;
}

interface EventbriteResponse {
  events?: EventbriteEvent[];
}

export const fetchEventbriteEvents = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  if (!env.eventbriteToken) {
    return [];
  }

  const params = new URLSearchParams({
    q: artist.name,
    "expand": "venue",
    sort_by: "date",
    page_size: "50",
  });

  if (artist.city && artist.state) {
    params.set("location.address", `${artist.city}, ${artist.state}`);
  } else if (artist.city) {
    params.set("location.address", artist.city);
  } else if (artist.state) {
    params.set("location.address", artist.state);
  }

  const response = await fetchWithRetry(
    `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${env.eventbriteToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
    { label: `eventbrite:${artist.name}` },
  );

  if (!response.ok) {
    throw new Error(`Eventbrite request failed (${response.status}) for artist ${artist.name}`);
  }

  const body = (await response.json()) as EventbriteResponse;
  const events = body.events ?? [];

  return events
    .filter((event) => Boolean(event.id))
    .map((event) => {
      const startTime = asIsoOrNull(event.start?.utc ?? event.start?.local ?? null);

      return {
        user_id: artist.user_id,
        source_slug: "eventbrite",
        source_event_id: event.id as string,
        watch_artist_id: artist.id,
        artist_name: artist.name,
        title: event.name?.text ?? `${artist.name} event`,
        venue: event.venue?.name ?? null,
        city: event.venue?.address?.city ?? artist.city,
        state: event.venue?.address?.region ?? null,
        country: event.venue?.address?.country ?? artist.country,
        start_time: startTime,
        ticket_url: event.url ?? null,
        status: normalizeStatus(event.status),
        on_sale_start: asIsoOrNull(event.sales_start ?? null),
        dedupe_key: buildDedupeKey(artist.name, event.venue?.name ?? null, startTime),
        raw_json: event,
      } satisfies NormalizedEvent;
    })
    .filter((event) => stateMatches(artist.state, event.state));
};
