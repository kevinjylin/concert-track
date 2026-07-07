import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import {
  getNotificationSettingsResponse,
  updateNotificationSettings,
} from "../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getNotificationSettingsResponse(userId);
    return NextResponse.json({ settings });
  } catch (error) {
    return internalErrorResponse(error, "notification-settings.GET");
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateNotificationSettings(userId, body);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("must") || message.includes("valid")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return internalErrorResponse(error, "notification-settings.PUT");
  }
}
