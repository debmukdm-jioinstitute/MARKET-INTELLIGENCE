import { growthMarginGrid, reverseDcf, runMonteCarlo, runScenarios, runTornado } from "@/lib/models/analysis";
import { applyOverrides, deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
import { buildModelWorkbook } from "@/lib/models/export-xlsx";
import { fetchFinancialDataset } from "@/lib/models/yahoo-fundamentals";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { years?, lookback?, overrides? } -> .xlsx with live valuation formulas, scenarios, change log and sources. */
export async function POST(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await ctx.params;
  const symbol = decodeURIComponent(rawSymbol);
  let body: { years?: number; lookback?: number; overrides?: Record<string, number | number[]> } = {};
  try {
    body = await req.json();
  } catch {
    // defaults
  }
  try {
    const dataset = await fetchFinancialDataset(symbol);
    const defaults = deriveAssumptions(dataset, body.years ?? 5, body.lookback ?? 3);
    const assumptions = body.overrides && Object.keys(body.overrides).length ? applyOverrides(defaults, body.overrides) : defaults;
    const model = buildModel(dataset, assumptions);
    const isFcff = model.method === "fcff";
    const buf = await buildModelWorkbook({
      model,
      defaults,
      scenarios: runScenarios(dataset, assumptions),
      monteCarlo: runMonteCarlo(dataset, assumptions, 1000),
      reverse: isFcff ? reverseDcf(dataset, assumptions) : undefined,
      tornado: isFcff ? runTornado(dataset, assumptions) : undefined,
      grid: isFcff ? growthMarginGrid(dataset, assumptions) : undefined,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${dataset.profile.symbol.replace(/[^A-Za-z0-9._-]/g, "_")}-valuation-model.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to export model" }, { status: 502 });
  }
}
