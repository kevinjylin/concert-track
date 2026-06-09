import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { confirmEmailToken } from "../../../../lib/notificationSettings";
import { getBaseAppUrl } from "../../../../lib/notificationSettings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") ?? "";
    if (!token) {
      return NextResponse.json({ error: "Missing email confirmation token." }, { status: 400 });
    }

    await confirmEmailToken(token);
    return NextResponse.redirect(new URL("/dashboard?emailConfirmed=1", getBaseAppUrl()));
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Invalid") || message.includes("expired") || message.includes("pending")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return internalErrorResponse(error, "confirm-email");
  }
}
