import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  searchConcertMarkets,
  US_CONCERT_MARKETS,
  US_STATE_SUGGESTIONS,
} from "../../lib/locations";
import type {
  ArtistSuggestion,
  LocationSuggestion,
  PollResult,
} from "../../lib/types";
import AutocompleteCombobox, {
  type ComboboxOption,
} from "./AutocompleteCombobox";
import styles from "../dashboard/dashboard.module.css";

const shortDate = (value: string | null): string => {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
};

const formatLocation = (
  city: string,
  stateRegion: string,
  country: string,
): string => {
  const parts = [city, stateRegion].map((part) => part.trim()).filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  return country.trim() && country.trim() !== "US" ? country.trim() : "";
};

const artistToOption = (artist: ArtistSuggestion): ComboboxOption => ({
  id: artist.id,
  label: artist.name,
  description: "Spotify artist",
  imageUrl: artist.imageUrl,
});

const locationToOption = (location: LocationSuggestion): ComboboxOption => ({
  id: location.id,
  label: location.label,
  description: location.description,
  meta: location.kind === "state" ? "STATE" : location.state,
});

const LOCATION_BY_ID = new Map<string, LocationSuggestion>(
  [...US_CONCERT_MARKETS, ...US_STATE_SUGGESTIONS].map((location) => [
    location.id,
    location,
  ]),
);

interface WatchlistPanelProps {
  busy: boolean;
  city: string;
  stateRegion: string;
  country: string;
  onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onAdd: (name: string, spotifyId?: string) => Promise<void>;
  onAddWatchRule: (input: Record<string, unknown>) => Promise<void>;
  onImportSpotify: (ids: string) => Promise<void>;
  onPreviewSpotifyPlaylist: (url: string) => Promise<ArtistSuggestion[]>;
  onImportSpotifyPlaylist: (url: string, artistIds: string[]) => Promise<void>;
  onPoll: () => Promise<void>;
  polling: boolean;
  lastPoll: PollResult | null;
}

export default function WatchlistPanel({
  busy,
  city,
  stateRegion,
  country,
  onCityChange,
  onStateChange,
  onCountryChange,
  onAdd,
  onAddWatchRule,
  onImportSpotify,
  onPreviewSpotifyPlaylist,
  onImportSpotifyPlaylist,
  onPoll,
  polling,
  lastPoll,
}: WatchlistPanelProps) {
  const [artistName, setArtistName] = useState("");
  const [selectedArtist, setSelectedArtist] =
    useState<ArtistSuggestion | null>(null);
  const [artistSuggestions, setArtistSuggestions] = useState<
    ArtistSuggestion[]
  >([]);
  const [artistSearchLoading, setArtistSearchLoading] = useState(false);
  const [artistSearchError, setArtistSearchError] = useState<string | null>(
    null,
  );
  const [locationInput, setLocationInput] = useState(() =>
    formatLocation(city, stateRegion, country),
  );
  const [spotifyIds, setSpotifyIds] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistArtists, setPlaylistArtists] = useState<ArtistSuggestion[]>([]);
  const [selectedPlaylistArtists, setSelectedPlaylistArtists] = useState<string[]>([]);
  const [ruleKind, setRuleKind] = useState<"venue" | "location">("venue");
  const [ruleLabel, setRuleLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("50");
  const uid = useId();

  const artistOptions = useMemo(
    () => artistSuggestions.map(artistToOption),
    [artistSuggestions],
  );
  const locationOptions = useMemo(
    () => searchConcertMarkets(locationInput).map(locationToOption),
    [locationInput],
  );

  useEffect(() => {
    const query = artistName.trim();

    if (query.length < 2 || selectedArtist?.name === artistName) {
      setArtistSuggestions([]);
      setArtistSearchLoading(false);
      setArtistSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setArtistSearchLoading(true);
      setArtistSearchError(null);

      void fetch(`/api/search/artists?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as {
            artists?: ArtistSuggestion[];
            error?: string;
          };

          if (!response.ok || body.error) {
            throw new Error(body.error ?? "Spotify search unavailable");
          }

          setArtistSuggestions(body.artists ?? []);
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") {
            return;
          }

          setArtistSuggestions([]);
          setArtistSearchError((error as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setArtistSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [artistName, selectedArtist]);

  const handleAddArtist = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = artistName.trim();
    if (!trimmedName) {
      return;
    }

    await onAdd(trimmedName, selectedArtist?.id);
    setArtistName("");
    setSelectedArtist(null);
    setArtistSuggestions([]);
  };

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onImportSpotify(spotifyIds);
    setSpotifyIds("");
  };

  const handlePlaylistPreview = async () => {
    const artists = await onPreviewSpotifyPlaylist(playlistUrl);
    setPlaylistArtists(artists);
    setSelectedPlaylistArtists(artists.map((artist) => artist.id));
  };

  const handlePlaylistImport = async () => {
    await onImportSpotifyPlaylist(playlistUrl, selectedPlaylistArtists);
    setPlaylistUrl("");
    setPlaylistArtists([]);
    setSelectedPlaylistArtists([]);
  };

  const handleArtistValueChange = (value: string) => {
    setArtistName(value);
    if (selectedArtist && selectedArtist.name !== value) {
      setSelectedArtist(null);
    }
  };

  const handleAdditionalRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAddWatchRule(
      ruleKind === "venue"
        ? {
            kind: "venue",
            label: ruleLabel,
            city: city || undefined,
            state: stateRegion || undefined,
            country,
          }
        : {
            kind: "location",
            label: ruleLabel,
            city: city || undefined,
            state: stateRegion || undefined,
            country,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusMiles: Number(radiusMiles),
          },
    );
    setRuleLabel("");
  };

  const handleArtistSelect = (option: ComboboxOption) => {
    const artist = artistSuggestions.find((item) => item.id === option.id);
    if (!artist) {
      return;
    }

    setSelectedArtist(artist);
    setArtistName(artist.name);
    setArtistSuggestions([]);
    setArtistSearchError(null);
  };

  const handleLocationValueChange = (value: string) => {
    setLocationInput(value);
    onCityChange(value.trim());
    onStateChange("");
    onCountryChange("US");
  };

  const handleLocationSelect = (option: ComboboxOption) => {
    const location = LOCATION_BY_ID.get(option.id);
    if (!location) {
      return;
    }

    setLocationInput(location.label);
    onCityChange(location.city);
    onStateChange(location.state);
    onCountryChange(location.country);
  };

  return (
    <article className={`${styles.panel} ${styles.watchlistComposer}`}>
      <form
        className={`${styles.stack} ${styles.watchlistForm}`}
        onSubmit={handleAddArtist}
      >
        <AutocompleteCombobox
          id={`${uid}-artist`}
          label="Artist name"
          value={artistName}
          placeholder="Artist name"
          required
          disabled={busy}
          options={artistOptions}
          loading={artistSearchLoading}
          error={artistSearchError}
          emptyMessage="No Spotify artist match. Typed artist will be used."
          showEmptyMessage={
            artistName.trim().length >= 2 &&
            !selectedArtist &&
            !artistSearchLoading
          }
          statusMessage={
            selectedArtist
              ? `Selected Spotify artist: ${selectedArtist.name}`
              : null
          }
          onValueChange={handleArtistValueChange}
          onSelect={handleArtistSelect}
        />
        <AutocompleteCombobox
          id={`${uid}-location`}
          label="Location"
          value={locationInput}
          placeholder="City, state, or market (optional)"
          disabled={busy}
          options={locationOptions}
          emptyMessage="No market or state match. Typed city will be used."
          showEmptyMessage={Boolean(locationInput.trim())}
          statusMessage={
            locationInput.trim()
              ? "Pick a city or a whole state, or keep typing a city manually."
              : null
          }
          onValueChange={handleLocationValueChange}
          onSelect={handleLocationSelect}
          renderMeta={(option) => (
            <span className={styles.locationBadge}>{option.meta}</span>
          )}
        />
        <button className={styles.primaryButton} type="submit" disabled={busy}>
          {busy ? "Adding..." : "Add to Watchlist"}
        </button>
      </form>

      <details className={styles.moreOptions}>
        <summary>More options</summary>
        <div className={styles.moreOptionsBody}>
          <fieldset className={styles.fieldsetSection}>
            <legend>Venue or radius watch</legend>
            <form className={styles.stack} onSubmit={handleAdditionalRule}>
              <label htmlFor={`${uid}-rule-kind`}>Watch type</label>
              <select
                id={`${uid}-rule-kind`}
                value={ruleKind}
                onChange={(event) => setRuleKind(event.target.value as "venue" | "location")}
              >
                <option value="venue">Venue</option>
                <option value="location">Location radius</option>
              </select>
              <label htmlFor={`${uid}-rule-label`}>
                {ruleKind === "venue" ? "Venue name" : "Location label"}
              </label>
              <input
                id={`${uid}-rule-label`}
                value={ruleLabel}
                onChange={(event) => setRuleLabel(event.target.value)}
                required
                maxLength={160}
              />
              {ruleKind === "location" ? (
                <>
                  <label htmlFor={`${uid}-latitude`}>Latitude</label>
                  <input
                    id={`${uid}-latitude`}
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    required
                  />
                  <label htmlFor={`${uid}-longitude`}>Longitude</label>
                  <input
                    id={`${uid}-longitude`}
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    required
                  />
                  <label htmlFor={`${uid}-radius`}>Radius in miles</label>
                  <input
                    id={`${uid}-radius`}
                    type="number"
                    min="1"
                    max="500"
                    value={radiusMiles}
                    onChange={(event) => setRadiusMiles(event.target.value)}
                    required
                  />
                </>
              ) : null}
              <button className={styles.secondaryButton} type="submit" disabled={busy}>
                Add {ruleKind} watch
              </button>
            </form>
          </fieldset>
          <fieldset className={styles.fieldsetSection}>
            <legend>Spotify playlist import</legend>
            <div className={styles.stack}>
              <label htmlFor={`${uid}-playlist`} className="srOnly">
                Public Spotify playlist URL
              </label>
              <input
                id={`${uid}-playlist`}
                type="url"
                value={playlistUrl}
                onChange={(event) => setPlaylistUrl(event.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
              />
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handlePlaylistPreview}
                disabled={busy || !playlistUrl.trim()}
              >
                Preview playlist artists
              </button>
              {playlistArtists.length > 0 ? (
                <>
                  <div className={styles.stack} role="group" aria-label="Artists to import">
                    {playlistArtists.map((artist) => (
                      <label key={artist.id} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={selectedPlaylistArtists.includes(artist.id)}
                          onChange={(event) =>
                            setSelectedPlaylistArtists((current) =>
                              event.target.checked
                                ? [...current, artist.id]
                                : current.filter((id) => id !== artist.id),
                            )
                          }
                        />
                        {artist.name}
                      </label>
                    ))}
                  </div>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={handlePlaylistImport}
                    disabled={busy || selectedPlaylistArtists.length === 0}
                  >
                    Import {selectedPlaylistArtists.length} artists
                  </button>
                </>
              ) : null}
            </div>
          </fieldset>

          <fieldset className={styles.fieldsetSection}>
            <legend>Spotify artist IDs</legend>
            <form className={styles.stack} onSubmit={handleImport}>
              <label htmlFor={`${uid}-spotify`} className="srOnly">
                Spotify artist IDs
              </label>
              <textarea
                id={`${uid}-spotify`}
                value={spotifyIds}
                onChange={(e) => setSpotifyIds(e.target.value)}
                placeholder="Paste Spotify artist IDs (comma or newline separated)"
                rows={3}
              />
              <button
                className={styles.secondaryButton}
                type="submit"
                disabled={busy}
              >
                {busy ? "Importing..." : "Import from Spotify"}
              </button>
            </form>
          </fieldset>

          <fieldset className={styles.fieldsetSection}>
            <legend>Refresh</legend>
            <div className={styles.pollBox}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={onPoll}
                disabled={polling}
              >
                {polling ? "Queueing..." : "Queue source refresh"}
              </button>
            </div>
            {lastPoll ? (
              <p className={styles.helpText}>
                Last request queued {lastPoll.queuedJobs ?? 0} source checks at{" "}
                {shortDate(lastPoll.endedAt)}. Checks run at adaptive intervals.
              </p>
            ) : null}
          </fieldset>
        </div>
      </details>
    </article>
  );
}
