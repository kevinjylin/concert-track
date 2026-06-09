import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "./rateLimit";

export const validationErrorResponse = (error: unknown): NextResponse | null => {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  return null;
};

