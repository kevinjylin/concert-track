import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { validationErrorResponse } from "../../../../lib/apiValidation";
import { getCurrentUserId } from "../../../../lib/auth";
import { sendDiscordMessage } from "../../../../lib/notificationDelivery";
import { getResolvedNotificationSettings } from "../../../../lib/notificationSettings";
import { enforceRateLimit, getRequestIp } from "../../../../lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await enforceRateLimit("discord-test", `${userId}:${getRequestIp(request)}`, 5, 3600);

    const settings = await getResolvedNotificationSettings(userId);
    if (!settings.discordWebhook) {
      return NextResponse.json({ error: "Add a Discord webhook before testing." }, { status: 400 });
    }

    const sent = await sendDiscordMessage(settings.discordWebhook, "UGround test alert: Discord is connected.");
    if (!sent) {
      return NextResponse.json({ error: "Discord rejected the test message." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "test-discord");
  }
}
