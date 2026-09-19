import { findOptionUnderlying } from "@/lib/feeds/india/instruments";
import { fetchUpstoxOptionExpiries } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const underlying = new URL(req.url).searchParams.get("underlying");
  if (!underlying || !findOptionUnderlying(underlying)) {
    return NextResponse.json({ error: "Unknown underlying" }, { status: 404 });
  }
  try {
    const expiries = await fetchUpstoxOptionExpiries(underlying);
    return NextResponse.json(
      { underlying, expiries },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox option expiries failed" },
      { status: 502 },
    );
  }
}
