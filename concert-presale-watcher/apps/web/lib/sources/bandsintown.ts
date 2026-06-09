import { env } from "../env";
import type { NormalizedEvent, WatchArtist } from "../types";
import { asIsoOrNull, buildDedupeKey } from "../utils";
import type { SourceAdapter } from "./types";

interface BandsintownEvent {
  id: string;
  title?: string;
  url?: string;
  datetime?: string;
  venue?: { name?: string; city?: string; region?: string; country?: string };
}

const fetchForArtist = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  if (!env.bandsintownAppId) return [];
  const response = await fetch(
    `https://rest.bandsintown.com/artists/${encodeURIComponent(artist.name)}/events?app_id=${encodeURIComponent(env.bandsintownAppId)}&date=upcoming`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Bandsintown request failed (${response.status})`);
  const events = (await response.json()) as BandsintownEvent[];
  return events.map((event) => {
    const startTime = asIsoOrNull(event.datetime);
    return {
      user_id: artist.user_id,
      source_slug: "bandsintown",
      source_event_id: String(event.id),
      watch_artist_id: artist.id,
      artist_name: artist.name,
      title: event.title ?? `${artist.name} at ${event.venue?.name ?? "TBA"}`,
      venue: event.venue?.name ?? null,
      city: event.venue?.city ?? artist.city,
      state: event.venue?.region ?? artist.state,
      country: event.venue?.country ?? artist.country,
      start_time: startTime,
      ticket_url: event.url ?? null,
      status: "scheduled",
      on_sale_start: null,
      sale_windows: [],
      dedupe_key: buildDedupeKey(artist.name, event.venue?.name ?? null, startTime),
      raw_json: event,
    };
  });
};

export const bandsintownAdapter: SourceAdapter = {
  slug: "bandsintown",
  capabilities: { artist: true, venue: false, location: false, presales: false },
  configured: () => Boolean(env.bandsintownAppId),
  fetchForArtist,
};
