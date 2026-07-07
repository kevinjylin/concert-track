import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { listAlerts } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;

    const alerts = await listAlerts(Number.isFinite(limit) ? limit : 50, userId);
    return NextResponse.json({ alerts });
  } catch (error) {
    return internalErrorResponse(error, "alerts.GET");
  }
}
