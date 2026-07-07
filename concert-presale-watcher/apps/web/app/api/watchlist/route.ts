import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { normalizeState } from "../../../lib/state";
import { createWatchArtist, listWatchArtists } from "../../../lib/supabase";

interface CreateWatchArtistRequest {
  name?: string;
  spotifyId?: string;
  city?: string;
  state?: string;
  country?: string;
}

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const artists = await listWatchArtists(userId);
    return NextResponse.json({ artists });
  } catch (error) {
    return internalErrorResponse(error, "watchlist.GET");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateWatchArtistRequest;

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        {
          error: "Artist name must be at least 2 characters.",
        },
        { status: 400 },
      );
    }

    const normalizedState = normalizeState(body.state?.trim());
    const normalizedCountry = body.country?.trim().toUpperCase() || "US";

    const artist = await createWatchArtist({
      userId,
      name: body.name.trim(),
      spotifyId: body.spotifyId?.trim() || undefined,
      city: body.city?.trim() || undefined,
      state: normalizedState ?? undefined,
      country: normalizedCountry,
    });

    return NextResponse.json({ artist }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "watchlist.POST");
  }
}
