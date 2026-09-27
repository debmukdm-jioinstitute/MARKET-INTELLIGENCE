import { generateHeatmapGrid } from "@/lib/optionstrat/heatmap";
import { optionContextForFnoIndex } from "@/lib/optionstrat/fno-index-options";
import type { StrategyLeg } from "@/lib/optionstrat/strategy-recommender";
import { getFnoIndex, type FnoIndexId } from "@/lib/scanner/fno-indices";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  index?: FnoIndexId;
  spot?: number;
  legs?: StrategyLeg[];
  days_to_simulate?: number;
  volatility_shock?: number;
};

/** POST — BSM P&L heatmap for selected strategy legs (OptionStrat-style). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const indexId = body.index ?? "nifty50";
  getFnoIndex(indexId);
  const ctx = optionContextForFnoIndex(indexId);
  if (!ctx) return NextResponse.json({ error: "Unsupported index" }, { status: 404 });

  const legs = body.legs ?? [];
  const spot = body.spot ?? 0;
  if (!legs.length || spot <= 0) {
    return NextResponse.json({ error: "legs and spot required" }, { status: 400 });
  }

  const { grid, max_profit, max_loss } = generateHeatmapGrid({
    spot,
    legs,
    daysToSimulate: body.days_to_simulate ?? 30,
    volatilityShock: body.volatility_shock ?? 0,
    lotSize: ctx.lotSize,
  });

  return NextResponse.json({ ok: true, max_profit, max_loss, heatmap_grid: grid });
}
