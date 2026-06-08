import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { isPollRequestAuthorized } from "../../../lib/pollAuth";
import { runPollCycle } from "../../../lib/poller";
import type { PollRequestBody } from "../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isPollRequestAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: PollRequestBody = {};
    try {
      body = (await request.json()) as PollRequestBody;
    } catch {
      body = {};
    }

    const userId = await getCurrentUserId();
    const result = await runPollCycle(body.city, userId ?? undefined);
    return NextResponse.json({ result });
  } catch (error) {
    return internalErrorResponse(error, "poll.POST");
  }
}
