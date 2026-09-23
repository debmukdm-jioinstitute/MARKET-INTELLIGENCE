import { requireAdmin } from "@/lib/admin/guard";
import { hasEmailConfigured, isSandboxSender, sendNewsletter } from "@/lib/admin/email";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getActiveRecipients, getRecipientCount, isValidEmail, withUnsubscribeFooter } from "@/lib/newsletter";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase())
    return NextResponse.json({
      newsletters: [],
      recipientCount: 0,
      recipientBreakdown: { users: 0, publicSubscribers: 0, total: 0 },
      emailConfigured: hasEmailConfigured(),
      sandboxMode: isSandboxSender(),
    });

  await ensureSchema();
  const db = sql();
  const [newsletters, breakdown] = await Promise.all([
    db`SELECT * FROM newsletters ORDER BY created_at DESC LIMIT 50`,
    getRecipientCount(),
  ]);
  return NextResponse.json({
    newsletters,
    recipientCount: breakdown.total,
    recipientBreakdown: breakdown,
    emailConfigured: hasEmailConfigured(),
    sandboxMode: isSandboxSender(),
  });
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

  // Optional targeted send (e.g. a test or a single person) instead of the full list.
  const only: string[] = Array.isArray(body.recipients)
    ? [...new Set<string>(body.recipients.map((e: unknown) => String(e).trim().toLowerCase()).filter(isValidEmail))]
    : [];
  const recipients = only.length > 0 ? only : await getActiveRecipients();
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No subscribers to send to yet." }, { status: 400 });
  }

  const result = await sendNewsletter(subject, recipients, (email) => withUnsubscribeFooter(html, email));
  const [row] = await db`
    INSERT INTO newsletters (subject, html, status, sent_at, recipient_count)
    VALUES (${subject}, ${html}, 'sent', now(), ${result.sent})
    RETURNING *
  `;
  return NextResponse.json({ newsletter: row, ...result });
}
