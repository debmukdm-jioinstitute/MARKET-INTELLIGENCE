import { removeFromWatchlist } from "@/lib/watchlist/store";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  await removeFromWatchlist(user.email, id);
  return NextResponse.json({ ok: true });
}
