import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { normalizeState } from "../../../../lib/state";
import { getSpotifyArtistsByIds } from "../../../../lib/sources/spotify";
import { createWatchArtist } from "../../../../lib/supabase";

interface ImportSpotifyRequest {
  artistIds?: string[] | string;
  city?: string;
  state?: string;
  country?: string;
}

export const runtime = "nodejs";

const parseIds = (input: string[] | string | undefined): string[] => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.map((id) => id.trim()).filter(Boolean);
  }

  return input
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
};

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ImportSpotifyRequest;
    const artistIds = parseIds(body.artistIds);

    if (artistIds.length === 0) {
      return NextResponse.json(
        {
          error: "Provide at least one Spotify artist ID.",
        },
        { status: 400 },
      );
    }

    const spotifyArtists = await getSpotifyArtistsByIds(artistIds);
    const normalizedState = normalizeState(body.state?.trim());
    const normalizedCountry = body.country?.trim().toUpperCase() || "US";

    const created = [];

    for (const artist of spotifyArtists) {
      const saved = await createWatchArtist({
        userId,
        name: artist.name,
        spotifyId: artist.id,
        city: body.city?.trim() || undefined,
        state: normalizedState ?? undefined,
        country: normalizedCountry,
      });

      created.push(saved);
    }

    return NextResponse.json({
      imported: created,
      count: created.length,
    });
  } catch (error) {
    return internalErrorResponse(error, "import-spotify");
  }
}
