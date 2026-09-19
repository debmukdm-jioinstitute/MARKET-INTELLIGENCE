import { findOptionUnderlying } from "@/lib/feeds/india/instruments";
import { fetchUpstoxOptionChain } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const underlyingKey = params.get("underlying");
  const expiry = params.get("expiry");
  const underlying = underlyingKey ? findOptionUnderlying(underlyingKey) : null;
  if (!underlyingKey || !underlying) {
    return NextResponse.json({ error: "Unknown underlying" }, { status: 404 });
  }
  if (!expiry) {
    return NextResponse.json({ error: "expiry query param required" }, { status: 400 });
  }
  try {
    const snapshot = await fetchUpstoxOptionChain(underlyingKey, underlying.label, expiry);
    if (!snapshot) {
      return NextResponse.json({ error: "No option chain data" }, { status: 502 });
    }
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox option chain failed" },
      { status: 502 },
    );
  }
}
