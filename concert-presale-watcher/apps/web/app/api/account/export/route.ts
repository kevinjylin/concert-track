import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { exportUserData } from "../../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      userId,
      data: await exportUserData(userId),
    });
  } catch (error) {
    return internalErrorResponse(error, "account.export");
  }
}

