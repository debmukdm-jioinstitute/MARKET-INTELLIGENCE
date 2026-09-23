import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isValidEmail } from "@/lib/newsletter";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Newsletter signup isn't configured on this deployment yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();

  // Re-subscribing after a prior unsubscribe flips status back rather than erroring.
  await db`
    INSERT INTO newsletter_subscribers (email, status, source)
    VALUES (${email}, 'subscribed', 'public_form')
    ON CONFLICT (email) DO UPDATE SET status = 'subscribed', unsubscribed_at = NULL
  `;

  return NextResponse.json({ ok: true });
}
