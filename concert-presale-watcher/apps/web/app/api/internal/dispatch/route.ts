import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { deliverAlertChannel } from "../../../../lib/alerts";
import { isPollRequestAuthorized } from "../../../../lib/pollAuth";
import { runPollForArtist } from "../../../../lib/poller";
import {
  claimPollJobs,
  completePollJob,
  getAlertById,
  getEventById,
  listPendingDeliveries,
  updateDelivery,
} from "../../../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 55;

export async function POST(request: Request) {
  try {
    if (!isPollRequestAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await claimPollJobs(randomUUID(), 10);
    const results = [];
    for (const job of jobs) {
      try {
        if (job.target_type !== "legacy_user" || !job.user_id) {
          await completePollJob(job, "Adapter target is awaiting source credentials or identity resolution.");
          results.push({ id: job.id, status: "deferred" });
          continue;
        }
        const artistId = job.target_id.split(":").at(-1);
        if (!artistId) throw new Error("Invalid legacy poll target.");
        await runPollForArtist(artistId, job.user_id, [job.source_slug]);
        await completePollJob(job);
        results.push({ id: job.id, status: "succeeded" });
      } catch (error) {
        const message = (error as Error).message;
        await completePollJob(job, message);
        results.push({ id: job.id, status: "failed", error: message });
      }
    }
    const pendingDeliveries = await listPendingDeliveries(25);
    const deliveryResults = [];
    for (const delivery of pendingDeliveries) {
      try {
        const alert = await getAlertById(delivery.alert_id);
        const event = alert ? await getEventById(alert.event_id) : null;
        if (!alert || !event) throw new Error("Alert or event no longer exists.");
        const sent = await deliverAlertChannel(delivery.channel, alert.alert_type, event);
        await updateDelivery(delivery.id, {
          sent,
          error: sent ? undefined : "Provider rejected the retry.",
          attempts: delivery.attempts + 1,
        });
        deliveryResults.push({ id: delivery.id, status: sent ? "sent" : "failed" });
      } catch (error) {
        const message = (error as Error).message;
        await updateDelivery(delivery.id, {
          sent: false,
          error: message,
          attempts: delivery.attempts + 1,
        });
        deliveryResults.push({ id: delivery.id, status: "failed", error: message });
      }
    }
    return NextResponse.json({
      claimed: jobs.length,
      results,
      deliveriesProcessed: deliveryResults.length,
      deliveryResults,
    });
  } catch (error) {
    return internalErrorResponse(error, "internal.dispatch");
  }
}
