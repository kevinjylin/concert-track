import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../lib/apiError";
import { getCurrentUserId } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { deleteUserData } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await deleteUserData(userId);
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalErrorResponse(error, "account.DELETE");
  }
}

