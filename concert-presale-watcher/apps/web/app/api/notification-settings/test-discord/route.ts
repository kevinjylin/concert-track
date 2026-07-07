import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { sendDiscordMessage } from "../../../../lib/notificationDelivery";
import { getResolvedNotificationSettings } from "../../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    return internalErrorResponse(error, "test-discord");
  }
}
