import { guardExpensive } from "@/lib/api-guard";
import { AiKeyMissingError } from "@/lib/ai/llm";
import { runTradingDesk } from "@/lib/ai/trading-desk";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { PROOF_TABS } from "@/lib/marketing/landing-v2/copy";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set<string>(PROOF_TABS.map((t) => t.symbol));

function cachedDesk(symbol: string) {
  return unstable_cache(() => runTradingDesk(symbol), ["landing-ai-desk", symbol], { revalidate: 21_600 });
}

/** Public read-only cached AI desk preview for landing (whitelisted symbols). */
export async function GET(req: Request) {
  const blocked = await guardExpensive(req, { name: "landing-ai-desk", flag: "ai", max: 40, windowSec: 3600 });
  if (blocked) return blocked;

  const symbol = (new URL(req.url).searchParams.get("symbol") ?? "RELIANCE").trim().toUpperCase();
  if (!ALLOWED.has(symbol)) {
    return NextResponse.json({ error: "Symbol not available on landing preview" }, { status: 400 });
  }

  try {
    const result = await cachedDesk(symbol)();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const detail = await buildResearchDetail(symbol).catch(() => null);
    if (detail) {
      return NextResponse.json(
        { fallback: "research", symbol, fetchedAt: detail.fetchedAt, intelligence: detail.intelligence, fundamentals: detail.fundamentals },
        { status: 200, headers: { "Cache-Control": "public, max-age=120" } },
      );
    }
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Landing desk preview failed" },
      { status: 502 },
    );
  }
}
