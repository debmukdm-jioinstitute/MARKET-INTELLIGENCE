import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { GUEST_EMAIL } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Fire-and-forget pageview beacon — never blocks or errors the page for the visitor. */
export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ ok: true });
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
    if (!path) return NextResponse.json({ ok: true });
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null;
    const email = await getSessionEmail();

    await ensureSchema();
    await sql()`
      INSERT INTO analytics_events (user_email, path, referrer)
      VALUES (${email === GUEST_EMAIL ? null : email}, ${path}, ${referrer})
    `;
  } catch {
    // analytics must never break the app
  }
  return NextResponse.json({ ok: true });
}
