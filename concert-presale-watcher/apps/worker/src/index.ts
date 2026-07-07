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

const run = async (): Promise<void> => {
  if (!Number.isFinite(pollIntervalMinutes) || pollIntervalMinutes <= 0) {
    throw new Error("POLL_INTERVAL_MINUTES must be a positive number");
  }

  await runPoll();

  if (runOnce) {
    return;
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
