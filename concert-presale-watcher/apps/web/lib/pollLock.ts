import type { PollResult } from "./types";

/**
 * In-memory single-flight + cooldown for the poll endpoint.
 *
 * - If a poll is already running in this process, concurrent callers attach to
 *   the same promise instead of starting another expensive cycle.
 * - After a poll completes, a short cooldown rejects rapid follow-up requests.
 *
 * This is a per-instance defense. Cross-instance dedupe is handled by the
 * GitHub Actions `concurrency` group + idempotent alert writes.
 */
const COOLDOWN_MS = 30_000;

interface LockState {
  inFlight: Promise<PollResult> | null;
  lastCompletedAt: number;
}

const globalKey = "__ugroundPollLock";
const globalScope = globalThis as unknown as Record<string, LockState>;
const state: LockState = globalScope[globalKey] ?? { inFlight: null, lastCompletedAt: 0 };
globalScope[globalKey] = state;

export class PollCooldownError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Poll on cooldown; retry in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "PollCooldownError";
  }
}

export const runPollWithLock = (run: () => Promise<PollResult>): Promise<PollResult> => {
  if (state.inFlight) {
    return state.inFlight;
  }

  const elapsed = Date.now() - state.lastCompletedAt;
  if (state.lastCompletedAt > 0 && elapsed < COOLDOWN_MS) {
    return Promise.reject(new PollCooldownError(COOLDOWN_MS - elapsed));
  }

  const promise = run().finally(() => {
    state.lastCompletedAt = Date.now();
    state.inFlight = null;
  });

  state.inFlight = promise;
  return promise;
};
