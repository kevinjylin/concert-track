import { env } from "../env";
import { fetchWithRetry } from "../fetchWithRetry";
import { normalizeState, stateMatches } from "../state";
import type { NormalizedEvent, WatchArtist } from "../types";
import { asIsoOrNull, buildDedupeKey, normalizeStatus } from "../utils";
import type { SourceAdapter } from "./types";

interface TicketmasterVenue {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string };
  country?: { countryCode?: string };
}

interface TicketmasterEvent {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
    };
    status?: {
      code?: string;
    };
  };
  sales?: {
    public?: {
      startDateTime?: string;
    };
    presales?: Array<{
      name?: string;
      url?: string;
      startDateTime?: string;
      endDateTime?: string;
    }>;
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: Array<{ name?: string }>;
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
}

const isLikelyArtistMatch = (artistName: string, event: TicketmasterEvent): boolean => {
  const artistLower = artistName.toLowerCase();
  const titleMatch = (event.name ?? "").toLowerCase().includes(artistLower);
  const attractionMatch =
    event._embedded?.attractions?.some((attraction) =>
      (attraction.name ?? "").toLowerCase().includes(artistLower),
    ) ?? false;

  return titleMatch || attractionMatch;
};

const normalizeEvents = (artist: WatchArtist, events: TicketmasterEvent[]): NormalizedEvent[] => {
  return events
    .filter((event) => Boolean(event.id) && isLikelyArtistMatch(artist.name, event))
    .map((event) => {
      const venue = event._embedded?.venues?.[0];
      const startTime = asIsoOrNull(event.dates?.start?.dateTime ?? event.dates?.start?.localDate ?? null);
      const publicStart = asIsoOrNull(event.sales?.public?.startDateTime ?? null);
      const saleWindows = [
        ...(event.sales?.presales ?? []).map((presale) => ({
          kind: "presale" as const,
          name: presale.name?.trim() || "Presale",
          url: presale.url ?? event.url ?? null,
          starts_at: asIsoOrNull(presale.startDateTime),
          ends_at: asIsoOrNull(presale.endDateTime),
        })),
        ...(publicStart
          ? [{
              kind: "public" as const,
              name: "Public sale",
              url: event.url ?? null,
              starts_at: publicStart,
              ends_at: null,
            }]
          : []),
      ];

      return {
        user_id: artist.user_id,
        source_slug: "ticketmaster",
        source_event_id: event.id as string,
        watch_artist_id: artist.id,
        artist_name: artist.name,
        title: event.name ?? `${artist.name} event`,
        venue: venue?.name ?? null,
        city: venue?.city?.name ?? artist.city,
        state: venue?.state?.stateCode ?? null,
        country: venue?.country?.countryCode ?? artist.country,
        start_time: startTime,
        ticket_url: event.url ?? null,
        status: normalizeStatus(event.dates?.status?.code),
        on_sale_start: publicStart,
        sale_windows: saleWindows,
        dedupe_key: buildDedupeKey(artist.name, venue?.name ?? null, startTime),
        raw_json: event,
      } satisfies NormalizedEvent;
    })
    .filter((event) => stateMatches(artist.state, event.state));
};

const runTicketmasterQuery = async (artist: WatchArtist, withLocation: boolean): Promise<TicketmasterEvent[]> => {
  const params = new URLSearchParams({
    apikey: env.ticketmasterApiKey as string,
    keyword: artist.name,
    classificationName: "music",
    includeTest: "no",
    size: "100",
    sort: "date,asc",
  });

  if (withLocation && artist.city) {
    params.set("city", artist.city);
  }

  const normalizedArtistState = normalizeState(artist.state);
  if (withLocation && normalizedArtistState && /^[A-Z]{2}$/.test(normalizedArtistState)) {
    params.set("stateCode", normalizedArtistState);
  }

  if (withLocation && artist.country && artist.country.length === 2) {
    params.set("countryCode", artist.country);
  }

  const response = await fetchWithRetry(
    `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
    { label: `ticketmaster:${artist.name}` },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ticketmaster request failed (${response.status}) for artist ${artist.name}: ${body.slice(0, 220)}`);
  }

  const body = (await response.json()) as TicketmasterResponse;
  return body._embedded?.events ?? [];
};

export const fetchTicketmasterEvents = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  if (!env.ticketmasterApiKey) {
    return [];
  }

  const withLocation = Boolean(artist.city || artist.state || artist.country);
  let events = await runTicketmasterQuery(artist, withLocation);

  if (events.length === 0 && withLocation) {
    events = await runTicketmasterQuery(artist, false);
  }

  return normalizeEvents(artist, events);
};

export const ticketmasterAdapter: SourceAdapter = {
  slug: "ticketmaster",
  capabilities: { artist: true, venue: true, location: true, presales: true },
  configured: () => Boolean(env.ticketmasterApiKey),
  fetchForArtist: fetchTicketmasterEvents,
};
