import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { sendSmsMessage } from "../../../../lib/notificationDelivery";
import { createSmsConfirmation } from "../../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, code } = await createSmsConfirmation(userId);
    const sent = await sendSmsMessage(phone, `Your UGround SMS confirmation code is ${code}. It expires in 10 minutes.`);

    if (!sent) {
      return NextResponse.json({ error: "SMS provider is not configured or rejected the message." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Add a phone")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return internalErrorResponse(error, "send-sms-confirmation");
  }
}
