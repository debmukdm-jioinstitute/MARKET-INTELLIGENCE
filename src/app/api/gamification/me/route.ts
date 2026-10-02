import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getXpSummary } from "@/lib/gamification/store";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/** GET /api/gamification/me → the caller's XP profile. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your points" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  await ensureSchema();
  return NextResponse.json(await getXpSummary(user.email));
}
