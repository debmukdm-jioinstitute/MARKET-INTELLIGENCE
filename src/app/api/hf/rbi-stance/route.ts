/**
 * GET /api/hf/rbi-stance
 *
 * Zero-shot hawkish/dovish/neutral read on recent real RBI news headlines (same feed as
 * /macro/rbi's news stream), via BART-large-mnli. Cached 30 min through the HF client.
 */

import { NextResponse } from "next/server";
import { buildFeedHub } from "@/lib/feeds/hub";
import { classifyWithLabels } from "@/lib/hf/news-classifier";

export const runtime = "nodejs";
export const revalidate = 1800;

const LABELS = ["hawkish", "dovish", "neutral"];

export async function GET() {
  try {
    const hub = await buildFeedHub();
    const rbiHeadlines = (hub.news ?? [])
      .filter((n) => n.source === "rbi")
      .slice(0, 8)
      .map((n) => n.title);

    if (rbiHeadlines.length === 0) {
      return NextResponse.json({ available: false, stance: null, score: 0, quotes: [], asOf: new Date().toISOString() });
    }

    const results = await Promise.all(rbiHeadlines.map((h) => classifyWithLabels(h, LABELS).catch(() => null)));
    const ok = results.filter((r): r is NonNullable<typeof r> => r !== null);

    if (ok.length === 0) {
      return NextResponse.json({ available: false, stance: null, score: 0, quotes: [], asOf: new Date().toISOString() });
    }

    let hawkScore = 0;
    let dovScore = 0;
    for (const r of ok) {
      hawkScore += r.allLabels.find((l) => l.label === "hawkish")?.score ?? 0;
      dovScore += r.allLabels.find((l) => l.label === "dovish")?.score ?? 0;
    }
    const n = ok.length;
    const score = (hawkScore - dovScore) / n; // -1 (dovish) .. +1 (hawkish)
    const stance = score > 0.1 ? "hawkish" : score < -0.1 ? "dovish" : "neutral";

    const mostHawkish = [...ok].sort(
      (a, b) => (b.allLabels.find((l) => l.label === "hawkish")?.score ?? 0) - (a.allLabels.find((l) => l.label === "hawkish")?.score ?? 0),
    )[0];
    const mostDovish = [...ok].sort(
      (a, b) => (b.allLabels.find((l) => l.label === "dovish")?.score ?? 0) - (a.allLabels.find((l) => l.label === "dovish")?.score ?? 0),
    )[0];

    return NextResponse.json({
      available: true,
      stance,
      score,
      analyzedCount: n,
      hawkishQuote: mostHawkish?.text ?? null,
      dovishQuote: mostDovish?.text ?? null,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { available: false, stance: null, score: 0, quotes: [], asOf: new Date().toISOString(), error: err instanceof Error ? err.message : "unavailable" },
      { status: 200 },
    );
  }
}
