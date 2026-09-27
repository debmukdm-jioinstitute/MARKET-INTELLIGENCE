import { guardExpensive } from "@/lib/api-guard";
import { AiKeyMissingError } from "@/lib/ai/llm";
import { enrichIpoDetailWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import { buildDrhpSummary } from "@/lib/feeds/ipo/drhp-summary";
import { fetchUpstoxIpoDetail } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "ai-ipo-drhp", flag: "ai", max: 8, windowSec: 3600 });
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { ipoId?: string };
  const ipoId = typeof body.ipoId === "string" ? body.ipoId.trim() : "";
  if (!ipoId || ipoId.length > 80) {
    return NextResponse.json({ error: "ipoId is required" }, { status: 400 });
  }

  try {
    const detail = await fetchUpstoxIpoDetail(ipoId);
    if (!detail) return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    const enriched = await enrichIpoDetailWithGmp(detail);
    const summary = await buildDrhpSummary(enriched);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DRHP summary failed" },
      { status: 502 },
    );
  }
}
