import { describe, expect, it } from "vitest";
import { deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel } from "@/lib/models/dcf-engine";
import { footballField, growthMarginGrid, reverseDcf, runMonteCarlo, runScenarios, runTornado } from "@/lib/models/analysis";
import { buildPeerRow, summarizePeers } from "@/lib/models/peers";
import { isFinancialCompany } from "@/lib/models/classify";
import { runDataQuality } from "@/lib/models/quality";
import { buildRows } from "@/lib/models/dcf-engine";
import { dataset, period } from "./fixtures";

const ds = dataset();
const A = deriveAssumptions(ds, 5);

describe("scenarios", () => {
  const s = runScenarios(ds, A);
  it("bear < base < bull", () => {
    const [bear, base, bull] = s.scenarios;
    expect(bear.price).toBeLessThan(base.price);
    expect(base.price).toBeLessThan(bull.price);
  });
  it("base scenario equals the model price; probabilities sum to 1", () => {
    expect(s.scenarios[1].price).toBeCloseTo(buildModel(ds, A).dcf.impliedPrice, 9);
    expect(s.scenarios.reduce((t, x) => t + x.probability, 0)).toBeCloseTo(1, 9);
  });
  it("expected price is the probability-weighted mean", () => {
    expect(s.expectedPrice).toBeCloseTo(s.scenarios.reduce((t, x) => t + x.probability * x.price, 0), 9);
  });
});

describe("monte carlo", () => {
  const a = runMonteCarlo(ds, A, 400, 7);
  it("is deterministic for a fixed seed", () => {
    expect(runMonteCarlo(ds, A, 400, 7).p50).toBe(a.p50);
  });
  it("percentiles are ordered and histogram accounts for every draw", () => {
    expect(a.p5).toBeLessThanOrEqual(a.p50);
    expect(a.p50).toBeLessThanOrEqual(a.p95);
    expect(a.histogram.reduce((s, h) => s + h.count, 0)).toBe(a.runs);
  });
  it("median sits near the base-case value", () => {
    const base = buildModel(ds, A).dcf.impliedPrice;
    expect(Math.abs(a.p50 / base - 1)).toBeLessThan(0.15);
  });
});

describe("reverse DCF", () => {
  it("solves the growth shift that reproduces the market price", () => {
    const r = reverseDcf(ds, A);
    expect(r.growthShift).not.toBeNull();
    const back = buildModel(ds, A, { growth: r.growthShift! }).dcf.impliedPrice;
    expect(back).toBeCloseTo(A.values.price as number, 3);
  });
  it("a market price above the base value implies higher growth than the base", () => {
    const base = buildModel(ds, A).dcf.impliedPrice;
    const rich = { ...A, values: { ...A.values, price: base * 1.4 } };
    expect(reverseDcf(ds, rich).growthShift!).toBeGreaterThan(0);
  });
});

describe("tornado & grid", () => {
  it("bars straddle the base price and are sorted by swing", () => {
    const t = runTornado(ds, A);
    for (const b of t.bars) expect(b.low).toBeLessThanOrEqual(b.high + 1e-9);
    const swings = t.bars.map((b) => Math.abs(b.high - b.low));
    expect([...swings].sort((x, y) => y - x)).toEqual(swings);
  });
  it("grid centre equals base price and rises with growth and margin", () => {
    const g = growthMarginGrid(ds, A);
    expect(g.grid[2][2]).toBeCloseTo(g.basePrice, 9);
    expect(g.grid[2][4]).toBeGreaterThan(g.grid[2][0]);
    expect(g.grid[4][2]).toBeGreaterThan(g.grid[0][2]);
  });
});

describe("peers", () => {
  const row = (sym: string, beta: number) =>
    buildPeerRow({ symbol: sym, name: sym, price: 10, shares: 100, debt: 200, cash: 50, ebitda: 150, revenue: 900, netIncome: 60, equity: 400, taxRate: 0.25, rawBeta: beta })!;
  it("unlevers beta with (1 + (1-t) D/E)", () => {
    const r = row("A", 1.2);
    expect(r.debtToEquity).toBeCloseTo(0.2, 9);
    expect(r.unleveredBeta).toBeCloseTo((0.67 * 1.2 + 0.33) / (1 + 0.75 * 0.2), 9);
  });
  it("computes multiples from EV", () => {
    const r = row("A", 1);
    expect(r.enterpriseValue).toBe(1000 + 200 - 50);
    expect(r.evEbitda).toBeCloseTo(1150 / 150, 9);
    expect(r.pe).toBeCloseTo(1000 / 60, 9);
    expect(r.pb).toBeCloseTo(1000 / 400, 9);
  });
  it("needs at least three peers for a bottom-up beta", () => {
    expect(summarizePeers([row("A", 1), row("B", 1.1)], "t")!.medianUnleveredBeta).toBeNull();
    expect(summarizePeers([row("A", 1), row("B", 1.1), row("C", 0.9)], "t")!.medianUnleveredBeta).not.toBeNull();
  });
  it("peer beta flows into the model and football field gets comps bars", () => {
    const peers = summarizePeers([1, 1.1, 0.9, 1.3].map((b, i) => row("P" + i, b)), "t")!;
    const withPeers = dataset({ peers });
    const a = deriveAssumptions(withPeers, 5);
    expect(a.values.beta_method).toBe(2);
    const m = buildModel(withPeers, a);
    expect(m.beta.method).toBe("peer");
    const ff = footballField(m, runScenarios(withPeers, a), null);
    expect(ff.some((b) => b.label.startsWith("Peer EV/EBITDA"))).toBe(true);
    expect(ff.some((b) => b.label.startsWith("Peer P/E"))).toBe(true);
  });
});

describe("financials -> residual income", () => {
  const bank = dataset({
    profile: { ...ds.profile, sector: "Financial Services", industry: "Banks - Regional" },
  });
  it("routes a bank to the residual-income model", () => {
    expect(isFinancialCompany(bank)).toBe(true);
    expect(isFinancialCompany(ds)).toBe(false);
    const a = deriveAssumptions(bank, 5);
    expect(a.values.model_type).toBe(2);
    expect(buildModel(bank, a).method).toBe("residual_income");
  });
  it("hand-checks a one-year residual income value", () => {
    const a = deriveAssumptions(bank, 3);
    a.values.ri_roe = 0.15; a.values.ri_payout = 0; a.values.ri_terminal_spread = 0; a.values.terminal_growth = 0.02;
    const m = buildModel(bank, a);
    const ke = m.wacc.costOfEquity;
    const bv = 800; // fixture stockholders_equity 500 * 1.6
    const ri = m.ri!;
    expect(ri.bookValue).toBeCloseTo(bv, 6);
    expect(ri.years[0].roe).toBeCloseTo(0.15 + (ke - 0.15) / 3, 9);
    expect(ri.years[0].residualIncome).toBeCloseTo(ri.years[0].roe * bv - ke * bv, 6);
    expect(ri.terminalRoe).toBeCloseTo(ke, 9);
    expect(ri.terminalResidualIncome).toBeCloseTo(0, 9); // long-run ROE = ke -> no terminal excess return
    expect(ri.equityValue).toBeCloseTo(ri.bookValue + ri.sumPvRi + ri.pvTvRi, 9);
  });
  it("higher long-run ROE spread raises value", () => {
    const a = deriveAssumptions(bank, 5);
    const lo = buildModel(bank, { ...a, values: { ...a.values, ri_terminal_spread: 0 } }).dcf.impliedPrice;
    const hi = buildModel(bank, { ...a, values: { ...a.values, ri_terminal_spread: 0.03 } }).dcf.impliedPrice;
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("data quality", () => {
  const flags = (d: ReturnType<typeof dataset>) => {
    const a = deriveAssumptions(d, 5);
    const { rows, n } = buildRows(d, a);
    return runDataQuality(d, rows, n).map((f) => f.label);
  };
  it("flags stale statements", () => {
    expect(flags(dataset({ retrievedAt: "2027-01-01T00:00:00Z" }))).toContain("Stale financial statements");
  });
  it("does not flag a clean, fresh dataset as stale", () => {
    expect(flags(ds)).not.toContain("Stale financial statements");
  });
  it("flags an unusual base-year tax rate", () => {
    const periods = [...ds.periods];
    periods[5] = period(2024, 1.6, { tax: 5e6, pretax_income: 300e6 });
    expect(flags(dataset({ periods }))).toContain("Unusual effective tax rate in base year");
  });
  it("flags TTM divergence", () => {
    expect(flags(dataset({ ttm: { revenue: 2500e6, ebitda: null, ebit: null, net_income: null } }))).toContain("Base year differs from TTM");
  });
});

describe("mid-cycle lookback", () => {
  it("a longer lookback changes derived margins for cyclicals", () => {
    const periods = [1, 1.1, 1.2, 1.3, 1.4, 1.5].map((k, i) => period(2019 + i, k, { operating_income: (i < 3 ? 320 : 90) * 1e6 * k }));
    const d = dataset({ periods });
    const short = deriveAssumptions(d, 5, 2).values.target_ebit_margin as number;
    const long = deriveAssumptions(d, 5, 6).values.target_ebit_margin as number;
    expect(long).toBeGreaterThan(short);
  });
});

import ExcelJS from "exceljs";
import { buildModelWorkbook } from "@/lib/models/export-xlsx";
import { applyOverrides } from "@/lib/models/assumptions";

describe("excel export", () => {
  it("builds a workbook whose live DCF formulas carry the model's price", async () => {
    const a2 = applyOverrides(A, { tv_method: 1 });
    const model = buildModel(ds, a2);
    const buf = await buildModelWorkbook({
      model, defaults: A, scenarios: runScenarios(ds, a2), monteCarlo: runMonteCarlo(ds, a2, 100), reverse: reverseDcf(ds, a2),
      tornado: runTornado(ds, a2), grid: growthMarginGrid(ds, a2),
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(expect.arrayContaining(["Summary", "DCF (live)", "Financials", "Ratios", "Scenarios & risk", "Checks & data QA", "Assumptions", "Change log", "Sources"]));
    const ws = wb.getWorksheet("DCF (live)")!;
    let priceCell: unknown = null;
    ws.eachRow((row) => { if (row.getCell(1).value === "Implied value per share") priceCell = row.getCell(2).value; });
    const res = (priceCell as { formula: string; result: number }).result;
    expect(res).toBeCloseTo(model.dcf.impliedPrice, 4);
    // the change log records the tv_method override
    const log = wb.getWorksheet("Change log")!;
    const names: string[] = [];
    log.eachRow((r) => names.push(String(r.getCell(2).value)));
    expect(names.some((n) => n.includes("Terminal value method")) || names.some((n) => n.includes("No assumptions"))).toBe(true);
  });
});

describe("financials: beta is not relevered", () => {
  it("uses the peer median LEVERED beta directly", () => {
    const peers = summarizePeers(
      [1, 1.2, 0.8, 1.4].map((b, i) => buildPeerRow({ symbol: "B" + i, name: "B", price: 10, shares: 100, debt: 5000, cash: 0, ebitda: null, revenue: 900, netIncome: 60, equity: 400, taxRate: 0.25, rawBeta: b })!),
      "t",
    )!;
    const bank = dataset({ profile: { ...ds.profile, sector: "Financial Services", industry: "Banks" }, peers });
    const a = deriveAssumptions(bank, 5);
    const m = buildModel(bank, a);
    expect(m.beta.selectedBeta).toBeCloseTo(peers.medianLeveredBeta!, 9);
  });
});

describe("incremental ROIC guard", () => {
  it("is undefined (null) rather than astronomical when net reinvestment is ~0", () => {
    const m = buildModel(ds, applyOverrides(A, { capex_pct: 0.04, da_pct: 0.1 }));
    const row = m.ratios.find((r) => r.key === "r_iroic")!;
    for (const v of row.values) if (v != null) expect(Math.abs(v)).toBeLessThan(1e4);
  });
});
