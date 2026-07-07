import "dotenv/config";

const pollUrl = process.env.WORKER_POLL_URL ?? "http://localhost:3000/api/internal/dispatch";
const pollIntervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES ?? "20");
const pollCity = process.env.POLL_CITY ?? "";
const runOnce = process.env.RUN_ONCE === "true";
const pollSecret = process.env.POLL_SECRET;

const runPoll = async (): Promise<void> => {
  const startedAt = new Date().toISOString();

  const response = await fetch(pollUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(pollSecret ? { "x-poll-secret": pollSecret } : {}),
    },
    body: JSON.stringify({
      city: pollCity || undefined,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Poll request failed (${response.status}): ${text}`);
  }

  console.log(`[worker] ${startedAt} poll completed: ${text}`);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const INITIAL_RETRY_MS = 15_000;

const run = async (): Promise<void> => {
  if (!Number.isFinite(pollIntervalMinutes) || pollIntervalMinutes <= 0) {
    throw new Error("POLL_INTERVAL_MINUTES must be a positive number");
  }

  if (runOnce) {
    await runPoll();
    return;
  }

  // The web server may still be starting when turbo launches this task, so
  // keep retrying the first poll instead of exiting.
  for (;;) {
    try {
      await runPoll();
      break;
    } catch (error) {
      console.error(
        `[worker] initial poll failed, retrying in ${INITIAL_RETRY_MS / 1000}s`,
        error,
      );
      await sleep(INITIAL_RETRY_MS);
    }
  }

  const intervalMs = Math.floor(pollIntervalMinutes * 60 * 1000);
  console.log(`[worker] polling every ${pollIntervalMinutes} minute(s) against ${pollUrl}`);

  const scheduleNext = () => {
    setTimeout(async () => {
      try {
        await runPoll();
      } catch (error) {
        console.error("[worker] poll failure", error);
      } finally {
        scheduleNext();
      }
    }, intervalMs);
  };
  scheduleNext();
};

run().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
