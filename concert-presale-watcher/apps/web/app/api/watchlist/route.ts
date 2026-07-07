import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { validationErrorResponse } from "../../../lib/apiValidation";
import { getCurrentUserId } from "../../../lib/auth";
import { normalizeState } from "../../../lib/state";
import { createWatchArtist, listWatchArtists } from "../../../lib/supabase";
import { enforceRateLimit, getRequestIp } from "../../../lib/rateLimit";
import { legacyWatchArtistSchema, parseJson } from "../../../lib/validation";

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

    await enforceRateLimit("watchlist-write", `${userId}:${getRequestIp(request)}`, 20, 3600);
    const body = await parseJson(request, legacyWatchArtistSchema);

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
    return validationErrorResponse(error) ?? internalErrorResponse(error, "watchlist.POST");
  }
}
