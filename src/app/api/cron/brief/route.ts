import { NextResponse } from "next/server";
import { hasEmailConfigured, sendNewsletter } from "@/lib/admin/email";
import { hasDatabase } from "@/lib/db";
import { buildBrief } from "@/lib/brief/build";
import { briefHtml, briefSubject } from "@/lib/brief/email";
import { briefRecipients, markEmailed, saveBrief } from "@/lib/brief/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ?kind=pre|post. Generates, stores, and emails opt-in subscribers only. ?dry=1 generates without storing/sending. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") === "post" ? "post" : "pre";
  try {
    const brief = await buildBrief(kind);
    if (sp.get("dry") === "1" || !hasDatabase()) return NextResponse.json({ ok: true, persisted: false, brief });
    const id = await saveBrief(brief);
    let email: { sent: number; failed: number } | { skipped: string } = { skipped: "no subscribers" };
    const to = await briefRecipients(kind);
    if (to.length && !hasEmailConfigured()) email = { skipped: "RESEND_API_KEY not configured" };
    else if (to.length) {
      const r = await sendNewsletter(briefSubject(brief), to, (addr) => briefHtml(brief, addr));
      await markEmailed(id);
      email = { sent: r.sent, failed: r.failed };
    }
    return NextResponse.json({ ok: true, persisted: true, id, engine: brief.engine, email });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
