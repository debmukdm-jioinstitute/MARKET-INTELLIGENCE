import { chainRowsFromSnapshot } from "@/lib/optionstrat/chain-from-snapshot";
import { optionContextForFnoIndex, pickExpiryForTheta } from "@/lib/optionstrat/fno-index-options";
import { recommendStrategies, type MarketBias, type RiskProfile } from "@/lib/optionstrat/strategy-recommender";
import { fetchUpstoxOptionChain, fetchUpstoxOptionExpiries } from "@/lib/feeds/sources/upstox/option-chain";
import { getFnoIndex, type FnoIndexId } from "@/lib/scanner/fno-indices";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?index=banknifty&bias=bullish&risk=balanced — OptionStrat-style theta strategies on NSE index options (Upstox chain). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const indexId = (sp.get("index") ?? "nifty50") as FnoIndexId;
  const bias = (sp.get("bias") ?? "neutral") as MarketBias;
  const risk = (sp.get("risk") ?? "balanced") as RiskProfile;
  getFnoIndex(indexId);

  const ctx = optionContextForFnoIndex(indexId);
  if (!ctx) {
    return NextResponse.json(
      {
        ok: false,
        error: "Option strategy lab supports NIFTY, BANK NIFTY, and FINNIFTY only (Upstox chain).",
      },
      { status: 404 },
    );
  }

  try {
    const expiries = await fetchUpstoxOptionExpiries(ctx.underlyingKey);
    const expiry = pickExpiryForTheta(expiries);
    if (!expiry) {
      return NextResponse.json({ ok: false, error: "No suitable expiry on option chain." }, { status: 502 });
    }

    const snapshot = await fetchUpstoxOptionChain(ctx.underlyingKey, ctx.label, expiry);
    if (!snapshot?.rows.length) {
      return NextResponse.json({ ok: false, error: "Option chain empty — check Upstox credentials." }, { status: 502 });
    }

    const chain = chainRowsFromSnapshot(snapshot, expiry);
    if (chain.length < 20) {
      return NextResponse.json(
        { ok: false, error: "Too few liquid strikes after volume/OI filter (need Upstox live session)." },
        { status: 502 },
      );
    }

    const recommendations = recommendStrategies(
      chain,
      snapshot.underlyingSpot,
      bias,
      risk,
      ctx.wingWidth,
      ctx.lotSize,
    );

    return NextResponse.json({
      ok: true,
      attribution: "Strategy logic adapted from EconomiaUNMSM/OptionStrat-AI",
      underlying: ctx.label,
      spot: snapshot.underlyingSpot,
      expiry,
      bias,
      risk_profile: risk,
      lot_size: ctx.lotSize,
      recommendations,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
