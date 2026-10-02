import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { XP_CATALOG } from "@/lib/gamification/catalog";
import { awardXp } from "@/lib/gamification/store";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/**
 * POST /api/gamification/award
 * Body: { action: string, page?: string }
 * Points come from the server catalog — client-sent values are never trusted.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to earn points" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (typeof action !== "string" || !XP_CATALOG[action]) {
    return NextResponse.json({ error: "Unknown action", known: Object.keys(XP_CATALOG) }, { status: 400 });
  }
  const page = typeof body?.page === "string" ? body.page.slice(0, 120) : null;

  await ensureSchema();
  const result = await awardXp(user.email, action, page);
  return NextResponse.json({ ok: true, ...result });
}
