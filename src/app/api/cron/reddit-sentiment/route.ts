import { cronUnauthorized } from "@/lib/api-guard";
import { runRedditSentimentCron } from "@/lib/reddit-sentiment/cron";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated Cron & Refresher for Reddit Alternative Social Sentiment:
 * - Refreshes retail community sentiment for bellwether Indian equities
 * - Scores headlines with Hugging Face FinBERT
 * - Upserts into PostgreSQL cache
 * - Prunes rows older than 60 days
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const result = await runRedditSentimentCron();
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 500 });
}

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const result = await runRedditSentimentCron();
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 500 });
}
