import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

  const email = await getSessionEmail();
  await ensureSchema();
  await sql()`
    INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth)
    VALUES (${email}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_email = EXCLUDED.user_email, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  await ensureSchema();
  await sql()`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
  return NextResponse.json({ ok: true });
}
