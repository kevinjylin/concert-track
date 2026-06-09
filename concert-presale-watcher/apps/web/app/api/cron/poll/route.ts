import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { isPollRequestAuthorized } from "../../../../lib/pollAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!isPollRequestAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dispatchUrl = new URL("/api/internal/dispatch", request.url);
    const response = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
        "x-poll-secret": request.headers.get("x-poll-secret") ?? "",
      },
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return internalErrorResponse(error, "cron.poll");
  }
}
