import { cronUnauthorized } from "@/lib/api-guard";
import { runDisclosureCrawler } from "@/lib/disclosures/crawler";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated Cron & Crawler for Company IR Disclosures & Concalls:
 * - Scrapes live corporate announcements from NSE India
 * - Enriches with Hugging Face FinBERT sentiment analysis & key takeaways
 * - Upserts idempotently into PostgreSQL
 * - Prunes rows older than 90 days
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const result = await runDisclosureCrawler();
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 500 });
}

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const result = await runDisclosureCrawler();
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 500 });
}
