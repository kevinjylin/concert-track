import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { confirmSmsCode } from "../../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code : "";
    if (!code.trim()) {
      return NextResponse.json({ error: "Enter the SMS confirmation code." }, { status: 400 });
    }

    const settings = await confirmSmsCode(userId, code);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Invalid") || message.includes("expired") || message.includes("pending")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return internalErrorResponse(error, "confirm-sms");
  }
}
