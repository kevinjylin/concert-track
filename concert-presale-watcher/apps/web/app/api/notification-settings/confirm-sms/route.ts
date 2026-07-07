import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { validationErrorResponse } from "../../../../lib/apiValidation";
import { getCurrentUserId } from "../../../../lib/auth";
import { confirmSmsCode } from "../../../../lib/notificationSettings";
import { enforceRateLimit, getRequestIp } from "../../../../lib/rateLimit";
import { parseJson, smsCodeSchema } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await enforceRateLimit("sms-code", `${userId}:${getRequestIp(request)}`, 8, 600);
    const { code } = await parseJson(request, smsCodeSchema);

    const settings = await confirmSmsCode(userId, code);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Invalid") || message.includes("expired") || message.includes("pending")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return validationErrorResponse(error) ?? internalErrorResponse(error, "confirm-sms");
  }
}
