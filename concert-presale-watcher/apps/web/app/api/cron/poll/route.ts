import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { env } from "../../../../lib/env";
import { isPollRequestAuthorized } from "../../../../lib/pollAuth";
import { PollCooldownError, runPollWithLock } from "../../../../lib/pollLock";
import { runPollCycle } from "../../../../lib/poller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!isPollRequestAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runPollWithLock(() => runPollCycle(env.defaultCity));
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof PollCooldownError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) },
        },
      );
    }

    return internalErrorResponse(error, "cron.poll");
  }
}
