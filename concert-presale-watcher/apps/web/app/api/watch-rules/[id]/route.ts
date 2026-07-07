import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { validationErrorResponse } from "../../../../lib/apiValidation";
import { getCurrentUserId } from "../../../../lib/auth";
import { deleteWatchRule } from "../../../../lib/supabase";
import { uuidSchema } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    await deleteWatchRule(uuidSchema.parse(id), userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return validationErrorResponse(error) ?? internalErrorResponse(error, "watch-rules.DELETE");
  }
}

