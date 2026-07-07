import { timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { logger } from "./logger";

const getPollSecrets = (): string[] => {
  return [env.pollSecret, env.cronSecret].filter((value): value is string => Boolean(value));
};

const safeEquals = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
};

export const isPollRequestAuthorized = (request: { headers: Headers }): boolean => {
  const secrets = getPollSecrets();
  if (secrets.length === 0) {
    logger.error("[pollAuth] refusing request: neither POLL_SECRET nor CRON_SECRET is set");
    return false;
  }

  const headerSecret = request.headers.get("x-poll-secret");
  const authHeader = request.headers.get("authorization");
  const candidates: string[] = [];
  if (headerSecret) {
    candidates.push(headerSecret);
  }
  if (authHeader) {
    candidates.push(authHeader);
    if (authHeader.startsWith("Bearer ")) {
      candidates.push(authHeader.slice("Bearer ".length));
    }
  }

  if (candidates.length === 0) {
    return false;
  }

  return secrets.some((secret) =>
    candidates.some((candidate) => safeEquals(candidate, secret)),
  );
};
