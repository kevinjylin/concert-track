import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { enforceRateLimit, getRequestIp } from "../../../../lib/rateLimit";
import { searchSpotifyArtists } from "../../../../lib/sources/spotify";
import { searchQuerySchema } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchQuerySchema.parse(searchParams.get("q") ?? "");
    await enforceRateLimit("spotify-search", `${userId}:${getRequestIp(request)}`, 60, 3600);

    const artists = await searchSpotifyArtists(query);
    return NextResponse.json({ artists });
  } catch (error) {
    const message = (error as Error).message.includes("SPOTIFY")
      ? "Spotify search is not configured. Typed artists can still be added."
      : "Spotify artist search is unavailable. Typed artists can still be added.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 503 },
    );
  }
}
