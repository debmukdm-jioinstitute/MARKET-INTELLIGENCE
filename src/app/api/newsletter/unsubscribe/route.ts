import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/newsletter";
import { GOOGLE_SANS_FONT_STACK } from "@/lib/typography";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function page(title: string, message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>
    <style>body{font-family:${GOOGLE_SANS_FONT_STACK};background:#fff;color:#1f1f1f;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
    .card{max-width:420px;padding:32px;text-align:center}
    h1{font-size:20px;margin-bottom:8px}p{color:#5f6368;font-size:14px;line-height:1.5}
    a{color:#1a73e8;text-decoration:none;font-size:14px}</style></head>
    <body><div class="card"><h1>${title}</h1><p>${message}</p><p><a href="/">Back to Market Intelligence</a></p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const token = url.searchParams.get("token") || "";

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page("Invalid unsubscribe link", "This link is invalid or has expired.");
  }
  if (!hasDatabase()) {
    return page("Unavailable", "Unsubscribe isn't available on this deployment right now.");
  }

  await ensureSchema();
  const db = sql();
  await Promise.all([
    db`UPDATE users SET newsletter_opt_out = true WHERE email = ${email}`,
    db`UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = now() WHERE email = ${email}`,
  ]);

  return page("You're unsubscribed", `${email} won't receive Market Intelligence newsletter emails anymore.`);
}
