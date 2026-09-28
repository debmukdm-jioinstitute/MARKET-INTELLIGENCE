import { addToWatchlist, listWatchlist, WatchlistAddInput } from "@/lib/watchlist/store";
import { getSessionUser } from "@/lib/session";
import { hasDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ items: [], canEdit: false });
  if (!hasDatabase()) return NextResponse.json({ items: [], canEdit: false, dbConfigured: false });
  return NextResponse.json({ items: await listWatchlist(user.email), canEdit: true, dbConfigured: true });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to use your watchlist" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const parsed = WatchlistAddInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", "), issues: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json({ item: await addToWatchlist(user.email, parsed.data) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not add to watchlist" }, { status: 400 });
  }
}
