import { logger } from "./logger";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number): boolean => {
  return status === 429 || (status >= 500 && status <= 599);
};

const parseRetryAfter = (header: string | null): number | null => {
  if (!header) {
    return null;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
};

const computeBackoff = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(maxDelayMs, exponential + jitter);
};

export interface FetchWithRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

/**
 * fetch() wrapper that retries on network errors, 429, and 5xx with exponential
 * backoff + jitter. Honors `Retry-After` when the server sends one.
 */
export const fetchWithRetry = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> => {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const label = options.label ?? "fetch";

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (response.ok || !shouldRetryStatus(response.status)) {
        return response;
      }

      if (attempt === maxAttempts) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const delay = retryAfterMs ?? computeBackoff(attempt, baseDelayMs, maxDelayMs);
      logger.warn(`[${label}] retryable status ${response.status} on attempt ${attempt}, retrying in ${delay}ms`);
      await sleep(delay);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }

      const delay = computeBackoff(attempt, baseDelayMs, maxDelayMs);
      logger.warn(`[${label}] network error on attempt ${attempt}, retrying in ${delay}ms`, error);
      await sleep(delay);
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(`[${label}] exhausted retries`));
};
