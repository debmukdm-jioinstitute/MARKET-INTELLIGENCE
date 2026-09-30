/**
 * GET /api/hf/concall-tone?symbol=<symbol>
 *
 * Real FinBERT sentiment scoring of each historical quarter's key-theme text plus the latest
 * concall's headline verdict, batched and cached 30 min. Distinct from the page's existing
 * curated historicalToneTrajectory.score — this is model output on that same text, not a
 * re-presentation of the curated number.
 */

import { NextResponse } from "next/server";
import { getCompanyIntelligenceProfile } from "@/lib/company-intelligence/database";
import { classifyFinancialSentiment } from "@/lib/hf/finbert";

export const runtime = "nodejs";
export const revalidate = 1800;

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: { quarter: string; aiScore: number }[] }>();

function scoreToConfidence(label: string, score: number): number {
  // Map FinBERT's top label+confidence onto a 0-100 "management confidence" axis, matching the
  // existing curated score's scale so the two can be plotted side by side.
  if (label === "positive") return Math.round(50 + score * 50);
  if (label === "negative") return Math.round(50 - score * 50);
  return 50;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json({ points: [] }, { status: 400 });

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ points: hit.data });

  try {
    const profile = getCompanyIntelligenceProfile(symbol);
    const quarters = [
      ...profile.historicalToneTrajectory.map((h) => ({ quarter: h.quarter, text: h.keyTheme })),
      { quarter: profile.latestConcall.quarter, text: profile.latestConcall.headlineVerdict },
    ];
    const results = await classifyFinancialSentiment(quarters.slice(0, 5).map((q) => q.text));
    const points = quarters.slice(0, 5).map((q, i) => ({
      quarter: q.quarter,
      aiScore: results[i] ? scoreToConfidence(results[i]!.label, results[i]!.score) : 50,
    }));
    cache.set(symbol, { at: Date.now(), data: points });
    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] });
  }
}
