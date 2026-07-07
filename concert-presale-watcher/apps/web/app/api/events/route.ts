import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { validationErrorResponse } from "../../../lib/apiValidation";
import { getCurrentUserId } from "../../../lib/auth";
import { listEvents } from "../../../lib/supabase";
import { listLimitSchema } from "../../../lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? listLimitSchema.parse(limitParam) : 100;
    const events = await listEvents(limit, userId);
    return NextResponse.json({ events });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "events.GET");
  }
}
