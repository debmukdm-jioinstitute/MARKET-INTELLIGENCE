import { scrapeAllResearchSources } from "@/lib/research/scrape";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Invoked daily by the vercel.json cron — Vercel signs cron requests with this bearer token. Guaranteed baseline refresh; intra-day freshness comes from the stale-while-revalidate check in /api/research-reports. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await scrapeAllResearchSources();
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
