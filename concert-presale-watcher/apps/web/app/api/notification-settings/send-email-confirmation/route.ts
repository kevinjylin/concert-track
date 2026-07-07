import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { sendEmailMessage } from "../../../../lib/notificationDelivery";
import {
  createEmailConfirmation,
  getBaseAppUrl,
} from "../../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, token } = await createEmailConfirmation(userId);
    const url = new URL(
      "/api/notification-settings/confirm-email",
      getBaseAppUrl(request),
    );
    url.searchParams.set("token", token);

    const sent = await sendEmailMessage(
      email,
      "Confirm your UGround email alerts",
      `Confirm this email address for UGround alerts:\n\n${url.toString()}\n\nThis link expires in 60 minutes.`,
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Email provider is not configured or rejected the message." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Add an email")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return internalErrorResponse(error, "send-email-confirmation");
  }
}
