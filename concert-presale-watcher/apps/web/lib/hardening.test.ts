import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseSpotifyPlaylistId } from "./sources/spotify";
import { dedupeEvents, movedEarlier } from "./utils";
import { legacyWatchArtistSchema, listLimitSchema, watchRuleSchema } from "./validation";
import type { NormalizedEvent } from "./types";

test("request validation clamps public inputs", () => {
  assert.equal(listLimitSchema.parse("200"), 200);
  assert.throws(() => listLimitSchema.parse("201"));
  assert.throws(() => legacyWatchArtistSchema.parse({ name: "x", country: "US" }));
  assert.throws(() =>
    watchRuleSchema.parse({
      kind: "location",
      label: "Impossible",
      country: "US",
      latitude: 100,
      longitude: 0,
      radiusMiles: 25,
    }),
  );
});

test("Spotify playlist parser only accepts Spotify playlist URLs or ids", () => {
  assert.equal(
    parseSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"),
    "37i9dQZF1DXcBWIGoYBM5M",
  );
  assert.throws(() => parseSpotifyPlaylistId("https://example.com/playlist/abc"));
  assert.throws(() => parseSpotifyPlaylistId("https://open.spotify.com/artist/abc"));
});

test("newly discovered sale dates are not reported as moved earlier", () => {
  assert.equal(movedEarlier(null, "2026-07-01T12:00:00.000Z"), false);
  assert.equal(
    movedEarlier("2026-07-02T12:00:00.000Z", "2026-07-01T12:00:00.000Z"),
    true,
  );
});

test("dedupe remains scoped by user and prefers Ticketmaster", () => {
  const base: NormalizedEvent = {
    user_id: "user-1",
    source_slug: "songkick",
    source_event_id: "one",
    watch_artist_id: "watch-1",
    artist_name: "Artist",
    title: "Artist Live",
    venue: "Venue",
    city: "Los Angeles",
    state: "CA",
    country: "US",
    start_time: "2026-07-01T20:00:00.000Z",
    ticket_url: null,
    status: "scheduled",
    on_sale_start: null,
    sale_windows: [],
    dedupe_key: "artist::venue::2026-07-01",
    raw_json: {},
  };
  const result = dedupeEvents([
    base,
    { ...base, source_slug: "ticketmaster", source_event_id: "two" },
    { ...base, user_id: "user-2", source_event_id: "three" },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result.find((event) => event.user_id === "user-1")?.source_slug, "ticketmaster");
});

test("production migration enables RLS and atomic job/alert claims", async () => {
  const migration = await readFile(
    new URL("../../../supabase/migrations/20260609000100_production_hardening.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on all tables in schema public from anon, authenticated/i);
  assert.match(migration, /for update skip locked/i);
  assert.match(migration, /unique index if not exists alerts_idempotency_key_idx/i);
  assert.match(migration, /sms_confirmation_attempts >= 5/i);
});
