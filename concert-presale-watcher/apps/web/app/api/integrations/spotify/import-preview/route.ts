import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../../lib/apiError";
import { validationErrorResponse } from "../../../../../lib/apiValidation";
import { getCurrentUserId } from "../../../../../lib/auth";
import { enforceRateLimit, getRequestIp } from "../../../../../lib/rateLimit";
import {
  getPublicPlaylistArtists,
  spotifyArtistToSuggestion,
} from "../../../../../lib/sources/spotify";
import { parseJson, spotifyImportSchema } from "../../../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await enforceRateLimit("spotify-preview", `${userId}:${getRequestIp(request)}`, 10, 3600);
    const body = await parseJson(request, spotifyImportSchema);
    if (!body.playlistUrl) {
      return NextResponse.json({ error: "Provide a public Spotify playlist URL." }, { status: 400 });
    }
    const artists = (await getPublicPlaylistArtists(body.playlistUrl))
      .slice(0, 100)
      .map(spotifyArtistToSuggestion);
    return NextResponse.json({ artists, count: artists.length });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "spotify.import-preview");
  }
}

