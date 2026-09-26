import { applyOverrides, deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
import { fetchFinancialDataset } from "@/lib/models/yahoo-fundamentals";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function build(symbol: string, years: number, overrides?: Record<string, number | number[]>, lookback = 3) {
  const dataset = await fetchFinancialDataset(symbol);
  let assumptions = deriveAssumptions(dataset, years, lookback);
  if (overrides && Object.keys(overrides).length) assumptions = applyOverrides(assumptions, overrides);
  return buildModel(dataset, assumptions);
}

export async function GET(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await ctx.params;
  const symbol = decodeURIComponent(rawSymbol);
  try {
    const lookback = Number(new URL(req.url).searchParams.get("lookback")) || 3;
    const result = await build(symbol, 10, undefined, lookback);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to build financial model" }, { status: 502 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await ctx.params;
  const symbol = decodeURIComponent(rawSymbol);
  let body: { years?: number; lookback?: number; overrides?: Record<string, number | number[]> } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — use defaults
  }
  try {
    const result = await build(symbol, body.years ?? 10, body.overrides, body.lookback ?? 3);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to build financial model" }, { status: 502 });
  }
}
