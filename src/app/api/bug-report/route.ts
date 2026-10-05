import { hasEmailConfigured, sendTransactionalEmail } from "@/lib/admin/email";
import { rateLimited } from "@/lib/api-guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { FOUNDER_EMAIL } from "@/lib/onboarding/welcome-email";
import { getSessionUser } from "@/lib/session";
import { renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SEVERITIES = ["low", "medium", "high"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST {title, details, severity?, pageUrl?, email?} -> stores the report and emails the founder, with the member as
 * reply-to so the founder can answer straight from the inbox. Signed-in members are identified from the session;
 * anyone else must give a contact email. 5 reports per hour.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const details = typeof body?.details === "string" ? body.details.trim() : "";
  const severity = (SEVERITIES as readonly string[]).includes(body?.severity) ? (body.severity as string) : "medium";
  const pageUrl = typeof body?.pageUrl === "string" ? body.pageUrl.trim().slice(0, 300) : "";
  if (title.length < 3 || title.length > 120) return NextResponse.json({ error: "Give the bug a short title (3 to 120 characters)." }, { status: 400 });
  if (details.length < 10 || details.length > 4000) return NextResponse.json({ error: "Please describe what happened (10 to 4000 characters)." }, { status: 400 });

  const user = await getSessionUser();
  const signedIn = user && !user.guest ? user : null;
  const provided = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const email = signedIn?.email ?? (EMAIL_RE.test(provided) ? provided : "");
  if (!email) return NextResponse.json({ error: "Add an email address so the founder can reply." }, { status: 400 });
  const name = signedIn?.name ?? "";
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);

  if (await rateLimited(`bug:${email}`, 5, 3600)) {
    return NextResponse.json({ error: "You've sent several reports in the last hour. Please wait a bit, or email the founder directly." }, { status: 429 });
  }

  let emailed = false;
  if (hasEmailConfigured()) {
    const html = renderMarketIntelligenceEmail({
      badge: "BUG REPORT",
      title,
      contentHtml: `<p style="margin:0 0 16px;color:#5f6368;font-size:14px;">Severity: <b>${esc(severity)}</b> · From: <b>${esc(name || "member")}</b> &lt;${esc(email)}&gt; · ${signedIn ? "signed-in member" : "not signed in"}</p>
<div style="white-space:pre-wrap;border:1px solid #e8eaed;border-radius:8px;padding:12px 14px;background:#f8f9fa;font-size:14px;line-height:1.6;color:#202124;">${esc(details)}</div>
<p style="margin:16px 0 0;font-size:12px;color:#5f6368;">Page: ${esc(pageUrl || "not given")}<br/>Browser: ${esc(ua || "unknown")}<br/>Reply to this email to answer ${esc(email)} directly.</p>`,
    });
    const sent = await sendTransactionalEmail({ to: FOUNDER_EMAIL, subject: `[Bug · ${severity}] ${title}`, html, replyTo: email });
    emailed = sent.ok;
    if (!sent.ok) console.error("[bug-report] email failed:", sent.error);
  }

  let stored = false;
  if (hasDatabase()) {
    try {
      await ensureSchema();
      await sql()`
        INSERT INTO bug_reports (email, name, title, details, severity, page_url, user_agent, emailed)
        VALUES (${email}, ${name}, ${title}, ${details}, ${severity}, ${pageUrl}, ${ua}, ${emailed})
      `;
      stored = true;
    } catch (e) {
      console.error("[bug-report] store failed:", e);
    }
  }

  if (!emailed && !stored) {
    return NextResponse.json({ error: "We couldn't deliver this right now. Please email the founder directly." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, emailed, stored });
}
