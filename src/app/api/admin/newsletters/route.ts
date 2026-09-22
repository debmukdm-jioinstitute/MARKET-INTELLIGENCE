import { requireAdmin } from "@/lib/admin/guard";
import { hasEmailConfigured, sendNewsletter } from "@/lib/admin/email";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ newsletters: [], recipientCount: 0, emailConfigured: hasEmailConfigured() });

  await ensureSchema();
  const db = sql();
  const [newsletters, users] = await Promise.all([
    db`SELECT * FROM newsletters ORDER BY created_at DESC LIMIT 50`,
    db`SELECT count(*)::int AS n FROM users`,
  ]);
  return NextResponse.json({ newsletters, recipientCount: users[0].n, emailConfigured: hasEmailConfigured() });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  if (!hasEmailConfigured()) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured — add it as an environment variable to send newsletters." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject ?? "").trim();
  const html = String(body.html ?? "").trim();
  const mode = body.mode === "draft" ? "draft" : "send";
  if (!subject || !html) return NextResponse.json({ error: "Subject and HTML body are required" }, { status: 400 });

  await ensureSchema();
  const db = sql();

  if (mode === "draft") {
    const [row] = await db`INSERT INTO newsletters (subject, html, status) VALUES (${subject}, ${html}, 'draft') RETURNING *`;
    return NextResponse.json({ newsletter: row });
  }

  const users = (await db`SELECT email FROM users`) as { email: string }[];
  const recipients = users.map((u) => u.email);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No registered customers to send to yet." }, { status: 400 });
  }

  const result = await sendNewsletter(subject, html, recipients);
  const [row] = await db`
    INSERT INTO newsletters (subject, html, status, sent_at, recipient_count)
    VALUES (${subject}, ${html}, 'sent', now(), ${result.sent})
    RETURNING *
  `;
  return NextResponse.json({ newsletter: row, ...result });
}
