import { readInsightCards } from "@/lib/insights/store";
import { getUserContext, relevanceFor } from "@/lib/notify/smart/relevance";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONF_WEIGHT = { High: 1, Medium: 0.7, Low: 0.4 } as const;

/**
 * GET /api/insights?symbol=ETERNAL  -> cards for one symbol (public, read-only)
 * GET /api/insights                 -> personalised feed for the signed-in user
 *                                      (holdings + recently viewed), ranked by
 *                                      relevance x confidence x recency.
 * Never calls an LLM or upstream: cards are written by scripts/oracle/run-insights.ts.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  try {
    if (symbol) {
      if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
      const cards = await readInsightCards([symbol]);
      return NextResponse.json({ symbol, cards }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    const user = await getSessionUser();
    const email = user && !user.guest ? user.email : null;
    const ctx = await getUserContext(email);
    const symbols = [...new Set([...ctx.holdings.map((h) => h.symbol), ...ctx.viewedSymbols])].slice(0, 60);
    const cards = await readInsightCards(symbols);
    const now = Date.now();
    const ranked = cards
      .map((c) => {
        const rel = relevanceFor({ symbol: c.symbol, category: c.kind }, ctx);
        const ageH = (now - Date.parse(c.generatedAt)) / 3600_000;
        const decay = Math.exp(-ageH / 24);
        return { card: c, rank: rel * CONF_WEIGHT[c.confidence.level] * decay };
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 30)
      .map((x) => ({ ...x.card, rank: Math.round(x.rank * 1000) / 1000 }));
    return NextResponse.json({ personalised: Boolean(email), cards: ranked }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "insights failed" }, { status: 500 });
  }
}
