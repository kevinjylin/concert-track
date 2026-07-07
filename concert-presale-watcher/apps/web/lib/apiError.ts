import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Build a sanitized 500 response. Logs the real error with a request id so
 * on-call can correlate, but returns only the generic message + id to the
 * client — never the raw `error.message`, which has historically leaked
 * Supabase error bodies and internal paths.
 */
export const internalErrorResponse = (error: unknown, context?: string): NextResponse => {
  const requestId = randomUUID();
  const prefix = context ? `[api:${context}]` : "[api]";
  logger.error(`${prefix} requestId=${requestId}`, error);

  return NextResponse.json(
    { error: "Internal error", requestId },
    { status: 500 },
  );
};
