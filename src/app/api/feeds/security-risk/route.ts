import { NextResponse } from "next/server";
import { buildSecurityRisk } from "@/lib/feeds/security-risk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim();
  if (!symbol || !/^[A-Za-z0-9.&^-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "valid symbol required" }, { status: 400 });
  try {
    const r = await buildSecurityRisk(symbol);
    if (!r) return NextResponse.json({ error: "Not enough price history for this symbol" }, { status: 404 });
    return NextResponse.json(r, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "risk failed" }, { status: 502 });
  }
}
