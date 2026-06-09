import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../../lib/apiError";
import { validationErrorResponse } from "../../../../../lib/apiValidation";
import { getCurrentUserId } from "../../../../../lib/auth";
import { enforceRateLimit, getRequestIp } from "../../../../../lib/rateLimit";
import {
  getPublicPlaylistArtists,
  getSpotifyArtistsByIds,
} from "../../../../../lib/sources/spotify";
import { normalizeState } from "../../../../../lib/state";
import { createWatchArtist } from "../../../../../lib/supabase";
import { parseJson, spotifyImportSchema } from "../../../../../lib/validation";

export const runtime = "nodejs";

const parseIds = (input: string[] | string | undefined): string[] => {
  if (!input) return [];
  const values = Array.isArray(input) ? input : input.split(/[\s,]+/);
  return [...new Set(values.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
};

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await enforceRateLimit("spotify-import", `${userId}:${getRequestIp(request)}`, 5, 3600);
    const body = await parseJson(request, spotifyImportSchema);
    let artists = body.playlistUrl
      ? await getPublicPlaylistArtists(body.playlistUrl)
      : await getSpotifyArtistsByIds(parseIds(body.artistIds));
    if (body.selectedArtistIds?.length) {
      const selected = new Set(body.selectedArtistIds);
      artists = artists.filter((artist) => selected.has(artist.id));
    }
    artists = artists.slice(0, 50);
    const created = await Promise.all(
      artists.map((artist) =>
        createWatchArtist({
          userId,
          name: artist.name,
          spotifyId: artist.id,
          city: body.city,
          state: normalizeState(body.state) ?? undefined,
          country: body.country.toUpperCase(),
        }),
      ),
    );
    return NextResponse.json({ imported: created, count: created.length }, { status: 201 });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "spotify.import");
  }
}

