import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { listSourceStatuses } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ sources: await listSourceStatuses() });
  } catch (error) {
    return internalErrorResponse(error, "source-status.GET");
  }
}

