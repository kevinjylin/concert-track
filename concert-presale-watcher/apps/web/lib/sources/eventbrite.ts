import { env } from "../env";
import type { NormalizedEvent, WatchArtist } from "../types";
import type { SourceAdapter } from "./types";

export const fetchEventbriteEvents = async (artist: WatchArtist): Promise<NormalizedEvent[]> => {
  void artist;
  return [];
};

export const eventbriteAdapter: SourceAdapter = {
  slug: "eventbrite",
  capabilities: { artist: false, venue: false, location: false, presales: false },
  configured: () => Boolean(env.eventbriteToken && env.eventbritePublicIngestionEnabled),
  fetchForArtist: fetchEventbriteEvents,
};
