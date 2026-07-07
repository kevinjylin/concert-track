import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { validationErrorResponse } from "../../../lib/apiValidation";
import { getCurrentUserId } from "../../../lib/auth";
import { enforceRateLimit, getRequestIp } from "../../../lib/rateLimit";
import { createWatchArtist, createWatchRule, listWatchRules } from "../../../lib/supabase";
import { parseJson, watchRuleSchema } from "../../../lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ rules: await listWatchRules(userId) });
  } catch (error) {
    return internalErrorResponse(error, "watch-rules.GET");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await enforceRateLimit("watch-rules-write", `${userId}:${getRequestIp(request)}`, 20, 3600);
    const body = await parseJson(request, watchRuleSchema);
    if (body.kind === "artist") {
      const artist = await createWatchArtist({
        userId,
        name: body.label,
        spotifyId: body.spotifyId,
        city: body.city,
        state: body.state,
        country: body.country.toUpperCase(),
      });
      const rules = await listWatchRules(userId);
      const rule = rules.find((item) => item.legacy_watch_artist_id === artist.id);
      return NextResponse.json({ rule }, { status: 201 });
    }
    const rule = await createWatchRule({
      userId,
      kind: body.kind,
      label: body.label,
      city: body.city,
      state: body.state,
      country: body.country.toUpperCase(),
      ...("latitude" in body
        ? {
            latitude: body.latitude,
            longitude: body.longitude,
            radiusMiles: body.radiusMiles,
          }
        : {}),
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "watch-rules.POST");
  }
}
