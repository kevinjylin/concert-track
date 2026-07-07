import { env } from "../env";
import type { NormalizedEvent, WatchArtist } from "../types";
import { asIsoOrNull, buildDedupeKey } from "../utils";
import type { SourceAdapter } from "./types";

interface SongkickEvent {
  id: number;
  displayName: string;
  uri?: string;
  start?: { datetime?: string; date?: string };
  venue?: { displayName?: string };
  location?: { city?: string };
  status?: string;
}

interface SongkickResponse {
  resultsPage?: { results?: { event?: SongkickEvent[] } };
}

const fetchForArtist = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  if (!env.songkickApiKey) return [];
  const params = new URLSearchParams({
    apikey: env.songkickApiKey,
    artist_name: artist.name,
    per_page: "50",
  });
  const response = await fetch(`https://api.songkick.com/api/3.0/events.json?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Songkick request failed (${response.status})`);
  const body = (await response.json()) as SongkickResponse;
  return (body.resultsPage?.results?.event ?? []).map((event) => {
    const startTime = asIsoOrNull(event.start?.datetime ?? event.start?.date);
    return {
      user_id: artist.user_id,
      source_slug: "songkick",
      source_event_id: String(event.id),
      watch_artist_id: artist.id,
      artist_name: artist.name,
      title: event.displayName,
      venue: event.venue?.displayName ?? null,
      city: event.location?.city?.split(",")[0]?.trim() || artist.city,
      state: artist.state,
      country: artist.country,
      start_time: startTime,
      ticket_url: event.uri ?? null,
      status: event.status === "cancelled" ? "cancelled" : "scheduled",
      on_sale_start: null,
      sale_windows: [],
      dedupe_key: buildDedupeKey(artist.name, event.venue?.displayName ?? null, startTime),
      raw_json: event,
    };
  });
};

export const songkickAdapter: SourceAdapter = {
  slug: "songkick",
  capabilities: { artist: true, venue: true, location: true, presales: false },
  configured: () => Boolean(env.songkickApiKey),
  fetchForArtist,
};

