import { guardExpensive } from "@/lib/api-guard";
import { AiKeyMissingError } from "@/lib/ai/llm";
import { enrichIpoDetailWithGmp, enrichIpoListWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import { buildDrhpSummary } from "@/lib/feeds/ipo/drhp-summary";
import type { IpoDetail, IpoStatus } from "@/lib/feeds/ipo/types";
import { fetchUpstoxIpoDetail } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function resolveIpoDetail(ipoId: string): Promise<IpoDetail | null> {
  const detail = await fetchUpstoxIpoDetail(ipoId);
  if (detail) return enrichIpoDetailWithGmp(detail);
  if (!ipoId.startsWith("gmp-")) return null;
  for (const status of ["open", "upcoming"] as IpoStatus[]) {
    const rows = await enrichIpoListWithGmp([], status);
    const hit = rows.find((r) => r.id === ipoId);
    if (!hit) continue;
    return {
      ...hit,
      faceValue: null,
      lotSize: null,
      minimumQuantity: null,
      cutOffPrice: null,
      listingPrice: null,
      listingExchange: null,
      rhpUrl: null,
      drhpUrl: null,
      timeline: {},
      registrar: null,
    };
  }
  return null;
}

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "ai-ipo-drhp", flag: "ai", max: 8, windowSec: 3600 });
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { ipoId?: string };
  const ipoId = typeof body.ipoId === "string" ? body.ipoId.trim() : "";
  if (!ipoId || ipoId.length > 80) {
    return NextResponse.json({ error: "ipoId is required" }, { status: 400 });
  }

  try {
    const enriched = await resolveIpoDetail(ipoId);
    if (!enriched) return NextResponse.json({ error: "IPO not found" }, { status: 404 });
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
