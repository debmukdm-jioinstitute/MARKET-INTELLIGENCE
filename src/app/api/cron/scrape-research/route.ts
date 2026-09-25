import { cronUnauthorized } from "@/lib/api-guard";
import { scrapeAllResearchSources } from "@/lib/research/scrape";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Invoked daily by the vercel.json cron — Vercel signs cron requests with this bearer token. Guaranteed baseline refresh; intra-day freshness comes from the stale-while-revalidate check in /api/research-reports. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const results = await scrapeAllResearchSources();
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
