import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { validationErrorResponse } from "../../../lib/apiValidation";
import { getCurrentUserId } from "../../../lib/auth";
import { enforceRateLimit, getRequestIp } from "../../../lib/rateLimit";
import { queueUserRefresh } from "../../../lib/supabase";
import { parseJson, pollRequestSchema } from "../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await enforceRateLimit("poll-refresh", `${userId}:${getRequestIp(request)}`, 6, 3600);
    await parseJson(request, pollRequestSchema).catch(() => ({}));
    const queuedJobs = await queueUserRefresh(userId);
    return NextResponse.json(
      {
        queued: true,
        queuedJobs,
        message: "Refresh queued. Source checks run according to adaptive quotas.",
      },
      { status: 202 },
    );
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "poll.POST");
  }
}
