import type { NormalizedEvent, SourceSlug, WatchArtist } from "../types";

export interface SourceCapabilities {
  artist: boolean;
  venue: boolean;
  location: boolean;
  presales: boolean;
}

export interface SourceAdapter {
  slug: Exclude<SourceSlug, "manual">;
  capabilities: SourceCapabilities;
  configured(): boolean;
  fetchForArtist(artist: WatchArtist): Promise<NormalizedEvent[]>;
}

