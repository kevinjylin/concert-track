import { env } from "./env";
import { rpcRequest } from "./supabase";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Try again shortly.");
  }
}

export const getRequestIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
};

export const enforceRateLimit = async (
  bucket: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<void> => {
  if (env.supabaseUrl && env.supabaseServiceKey) {
    const rows = await rpcRequest<RateLimitResult[]>("consume_rate_limit", {
      p_bucket: bucket,
      p_subject: subject,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    const result = rows[0];
    if (result && !result.allowed) {
      throw new RateLimitError(result.retry_after_seconds);
    }
    return;
  }

  const key = `${bucket}:${subject}`;
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return;
  }
  existing.count += 1;
  if (existing.count > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((existing.resetAt - now) / 1000)));
  }
};

