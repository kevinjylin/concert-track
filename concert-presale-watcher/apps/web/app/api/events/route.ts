import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { listEvents } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;

    const events = await listEvents(Number.isFinite(limit) ? limit : 100, userId);
    return NextResponse.json({ events });
  } catch (error) {
    return internalErrorResponse(error, "events.GET");
  }
}
