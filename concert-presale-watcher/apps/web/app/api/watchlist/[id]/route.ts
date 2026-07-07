import { NextResponse } from "next/server";
import { internalErrorResponse } from "../../../../lib/apiError";
import { getCurrentUserId } from "../../../../lib/auth";
import { deleteWatchArtist } from "../../../../lib/supabase";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteWatchArtist(id, userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalErrorResponse(error, "watchlist.DELETE");
  }
}
