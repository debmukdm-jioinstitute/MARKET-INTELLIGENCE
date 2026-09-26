/**
 * Excel export of a model run. The valuation layer (DCF or residual income,
 * equity bridge, per-share value and the WACC x growth sensitivity grid) is
 * written with LIVE formulas driven by input cells, so a reviewer can flex
 * WACC / growth / ROIC and see the price move. Operating projections
 * (the FCFF vector, statements) are model outputs written as values — the
 * 3-statement roll-forward itself is not re-expressed as cell formulas.
 * Also includes the assumption audit trail (change log vs derived defaults)
 * and source citations per input.
 */
import ExcelJS from "exceljs";
import { BRAND, DISCLAIMER_LINES } from "@/lib/export/branding";
import { ASSUMPTION_SPECS } from "@/lib/models/assumptions";
import { buildRows } from "@/lib/models/dcf-engine";
import type { GrowthMarginGrid, MonteCarloResult, ReverseDcfResult, ScenarioResult, TornadoBar } from "@/lib/models/analysis";
import type { Assumptions, ModelResult } from "@/lib/models/types";

const F = BRAND.font;
const BLUE = "FF0000FF"; // input convention: blue = hard-coded input
const font = (o: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: F, size: 10, color: { argb: `FF${BRAND.ink}` }, ...o });
const head = (ws: ExcelJS.Worksheet, row: number, values: (string | number)[]) => {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.font = font({ bold: true, color: { argb: "FFFFFFFF" } });
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.primary}` } };
  });
};
const col = (n: number): string => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};
const fmtValue = (v: number | number[], fmt: string): string => {
  const one = (x: number) => (fmt === "pct" || fmt === "pct2" ? `${(x * 100).toFixed(2)}%` : fmt === "mult" ? `${x.toFixed(2)}x` : Number.isInteger(x) ? String(x) : x.toFixed(4));
  return Array.isArray(v) ? v.map(one).join(" | ") : one(v);
};

export type ExportBundle = {
  model: ModelResult;
  defaults: Assumptions;
  scenarios?: ScenarioResult;
  monteCarlo?: MonteCarloResult;
  reverse?: ReverseDcfResult;
  tornado?: { basePrice: number; bars: TornadoBar[] };
  grid?: GrowthMarginGrid;
};

export async function buildModelWorkbook(b: ExportBundle): Promise<Buffer> {
  const { model, defaults } = b;
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND.name;
  wb.created = new Date();
  const ds = model.dataset;
  const A = model.assumptions;
  const ccy = ds.profile.currency;

  // ---- Summary -------------------------------------------------------------
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 38 }, { width: 60 }];
  sum.getCell("A1").value = `${ds.profile.name} (${ds.profile.symbol}) — ${model.method === "fcff" ? "DCF valuation" : "Residual-income valuation"}`;
  sum.getCell("A1").font = font({ bold: true, size: 14 });
  const facts: [string, string | number][] = [
    ["Method", model.method === "fcff" ? "Unlevered FCF DCF, normalised terminal year" : "Residual income (financial company)"],
    ["Currency (millions unless stated)", ccy],
    ["Current price", model.dcf.currentPrice],
    ["Implied value per share", model.dcf.impliedPrice],
    ["Upside / (downside)", model.dcf.upside],
    ["WACC", model.wacc.wacc],
    ["Cost of equity", model.wacc.costOfEquity],
    ["Beta used", model.beta.selectedBeta],
    ["Beta source", model.beta.method === "peer" ? `Peer median unlevered ${model.beta.peerUnlevered?.toFixed(2)} (${model.beta.nPeers} peers), relevered` : "Own regression (Blume-adjusted)"],
    ["Data source / retrieved", `${ds.source}, ${ds.retrievedAt}`],
    ["Generated", new Date().toISOString()],
  ];
  facts.forEach(([k, v], i) => {
    sum.getCell(`A${i + 3}`).value = k;
    sum.getCell(`A${i + 3}`).font = font({ bold: true });
    const c = sum.getCell(`B${i + 3}`);
    c.value = v;
    c.font = font();
    if (["Upside / (downside)", "WACC", "Cost of equity"].includes(k)) c.numFmt = "0.00%";
    if (["Current price", "Implied value per share"].includes(k)) c.numFmt = "#,##0.00";
  });
  DISCLAIMER_LINES.forEach((l, i) => {
    const c = sum.getCell(`A${facts.length + 5 + i}`);
    c.value = l;
    c.font = font({ size: 9, color: { argb: `FF${BRAND.muted}` } });
  });

  // ---- Valuation (live formulas) ------------------------------------------
  if (model.method === "fcff") addDcfSheet(wb, model);
  else addRiSheet(wb, model);

  // ---- Financials ----------------------------------------------------------
  const { rows, n, labels } = buildRows(ds, A);
  const fin = wb.addWorksheet("Financials");
  fin.getColumn(1).width = 34;
  head(fin, 1, ["Line item (millions)", ...labels]);
  const lines: [string, string][] = [
    ["Revenue", "revenue"], ["Gross profit", "gross_profit"], ["EBITDA", "ebitda"], ["EBIT", "ebit"], ["Interest expense", "interest_expense"],
    ["Interest income", "interest_income"], ["Pre-tax income", "ebt"], ["Tax", "tax"], ["Net income", "net_income"], ["Diluted EPS", "eps"],
    ["NOPAT", "nopat"], ["Effective tax rate used", "tax_rate_used"],
    ["Cash & ST investments", "cash_sti"], ["Receivables", "receivables"], ["Inventory", "inventory"], ["Net PP&E", "ppe"], ["Total assets", "total_assets"],
    ["Payables", "payables"], ["Revolver", "revolver"], ["Total debt", "total_debt"], ["Total liabilities", "total_liabilities"], ["Total equity", "total_equity"],
    ["Operating cash flow", "cfo"], ["Capex", "capex"], ["Free cash flow", "fcf"], ["Dividends", "dividends"], ["Buybacks", "buybacks"], ["NOL closing balance", "nol_close"],
  ];
  lines.forEach(([label, key], i) => {
    const r = fin.getRow(i + 2);
    r.getCell(1).value = label;
    r.getCell(1).font = font({ bold: true });
    rows.forEach((row, p) => {
      const c = r.getCell(p + 2);
      c.value = Number.isFinite(row[key]) ? row[key] : null;
      c.numFmt = key === "tax_rate_used" ? "0.0%" : key === "eps" ? "#,##0.00" : "#,##0.0";
      c.font = font({ color: { argb: p < n ? BLUE : `FF${BRAND.ink}` } }); // blue = reported history, black = model output
    });
  });
  fin.getCell(`A${lines.length + 3}`).value = "Blue = reported history (Yahoo Finance); black = model output. Projections are computed by the model engine (integrated 3-statement roll-forward with revolver, NOL and average-balance interest) and pasted as values.";
  fin.getCell(`A${lines.length + 3}`).font = font({ size: 9, color: { argb: `FF${BRAND.muted}` } });

  // ---- Ratios --------------------------------------------------------------
  const rat = wb.addWorksheet("Ratios");
  rat.getColumn(1).width = 52;
  head(rat, 1, ["Ratio", ...labels]);
  model.ratios.forEach((rr, i) => {
    const r = rat.getRow(i + 2);
    r.getCell(1).value = rr.label;
    r.getCell(1).font = font({ bold: true });
    rr.values.forEach((v, p) => {
      const c = r.getCell(p + 2);
      c.value = v;
      c.numFmt = rr.fmt === "pct" ? "0.0%" : rr.fmt === "days" ? "0" : "#,##0.00";
      c.font = font();
    });
  });

  // ---- Analysis ------------------------------------------------------------
  const an = wb.addWorksheet("Scenarios & risk");
  an.columns = [{ width: 34 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  let r0 = 1;
  if (b.scenarios) {
    head(an, r0, ["Scenario", "Probability", "Growth shift", "Margin shift", "WACC shift", "Price", "Upside"]);
    b.scenarios.scenarios.forEach((s, i) => {
      an.addRow([s.name, s.probability, s.shift.growth ?? 0, s.shift.margin ?? 0, s.shift.wacc ?? 0, s.price, s.upside]);
      an.getRow(r0 + 1 + i).eachCell((c) => (c.font = font()));
    });
    an.addRow(["Probability-weighted", 1, null, null, null, b.scenarios.expectedPrice, b.scenarios.expectedUpside]);
    r0 += b.scenarios.scenarios.length + 3;
  }
  if (b.monteCarlo) {
    head(an, r0, ["Monte Carlo", "Value"]);
    const mc = b.monteCarlo;
    [["Draws", mc.runs], ["P5", mc.p5], ["P10", mc.p10], ["P25", mc.p25], ["Median", mc.p50], ["P75", mc.p75], ["P90", mc.p90], ["P95", mc.p95], ["Mean", mc.mean], ["Probability price > current", mc.probUpside]].forEach((x) => an.addRow(x));
    r0 += 12;
  }
  if (b.reverse) {
    head(an, r0, ["Reverse DCF (what the market price implies)", "Value"]);
    const rv = b.reverse;
    [["Market price", rv.targetPrice], ["Base avg revenue growth", rv.baseAvgGrowth], ["Implied avg revenue growth", rv.impliedAvgGrowth], ["Base terminal-year EBIT margin", rv.baseEbitMargin], ["Implied terminal-year EBIT margin", rv.impliedEbitMargin]].forEach((x) => an.addRow(x));
    r0 += 7;
  }
  if (b.tornado) {
    head(an, r0, ["Tornado driver", "Low case", "High case", "Low price", "High price"]);
    b.tornado.bars.forEach((t) => an.addRow([t.label, t.lowLabel, t.highLabel, t.low, t.high]));
    r0 += b.tornado.bars.length + 2;
  }
  if (b.grid) {
    head(an, r0, ["EBIT margin shift \\ growth shift", ...b.grid.growthShifts.map((g) => `${(g * 100).toFixed(0)}pp`)]);
    b.grid.grid.forEach((row, i) => an.addRow([`${(b.grid!.marginShifts[i] * 100).toFixed(0)}pp`, ...row]));
  }

  // ---- Comps ---------------------------------------------------------------
  if (ds.peers) {
    const cs = wb.addWorksheet("Peers");
    cs.columns = [{ width: 14 }, { width: 34 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 14 }];
    head(cs, 1, ["Symbol", "Name", "Market cap", "EV/EBITDA", "EV/Sales", "P/E", "P/B", "Levered beta", "Unlevered beta"]);
    ds.peers.peers.forEach((p) => cs.addRow([p.symbol, p.name, p.marketCap, p.evEbitda, p.evSales, p.pe, p.pb, p.leveredBeta, p.unleveredBeta]));
    const m = ds.peers.medians;
    cs.addRow(["Median", "", null, m.evEbitda, m.evSales, m.pe, m.pb, null, ds.peers.medianUnleveredBeta]);
    cs.addRow([]);
    cs.addRow([`Source: ${ds.peers.source}`]);
  }

  // ---- Checks & data quality ----------------------------------------------
  const ck = wb.addWorksheet("Checks & data QA");
  ck.columns = [{ width: 46 }, { width: 10 }, { width: 34 }, { width: 100 }];
  head(ck, 1, ["Integrity check", "Result", "Value", "Why it matters"]);
  model.checks.forEach((c) => ck.addRow([c.label, c.pass ? "PASS" : "FLAG", c.value, c.why]));
  ck.addRow([]);
  head(ck, ck.rowCount + 1, ["Data-quality flag", "Severity", "", "Detail"]);
  model.quality.forEach((q) => ck.addRow([q.label, q.severity.toUpperCase(), "", q.detail]));

  // ---- Assumptions, change log, sources -----------------------------------
  const as = wb.addWorksheet("Assumptions");
  as.columns = [{ width: 30 }, { width: 58 }, { width: 22 }, { width: 44 }, { width: 44 }, { width: 10 }, { width: 110 }];
  head(as, 1, ["Section", "Assumption", "Current value", "Derived default", "Key", "Edited", "How it was derived (source & method)"]);
  for (const spec of ASSUMPTION_SPECS) {
    const cur = A.values[spec.key];
    const def = defaults.values[spec.key];
    if (cur == null) continue;
    const edited = JSON.stringify(cur) !== JSON.stringify(def);
    const row = as.addRow([spec.section, spec.label, fmtValue(cur, spec.fmt), fmtValue(def, spec.fmt), spec.key, edited ? "EDITED" : "", A.basis[spec.key] ?? ""]);
    row.eachCell((c) => (c.font = font()));
    row.getCell(3).font = font({ color: { argb: BLUE } });
    if (edited) row.getCell(6).font = font({ bold: true, color: { argb: `FF${BRAND.bad}` } });
  }

  const log = wb.addWorksheet("Change log");
  log.columns = [{ width: 30 }, { width: 58 }, { width: 26 }, { width: 26 }];
  head(log, 1, ["Section", "Assumption", "Derived default", "Your value"]);
  let changes = 0;
  for (const spec of ASSUMPTION_SPECS) {
    const cur = A.values[spec.key];
    const def = defaults.values[spec.key];
    if (cur == null || JSON.stringify(cur) === JSON.stringify(def)) continue;
    log.addRow([spec.section, spec.label, fmtValue(def, spec.fmt), fmtValue(cur, spec.fmt)]);
    changes++;
  }
  if (!changes) log.addRow(["", "No assumptions were changed from the derived defaults."]);

  const src = wb.addWorksheet("Sources");
  src.columns = [{ width: 36 }, { width: 120 }];
  head(src, 1, ["Input", "Source / method"]);
  const sources: [string, string][] = [
    ["Financial statements", `${ds.source} annual fundamentals-timeseries (up to 6 fiscal years), retrieved ${ds.retrievedAt}`],
    ["TTM figures", ds.ttm ? `${ds.source} trailing-twelve-month timeseries` : "Not available"],
    ["Share price & FX", `${ds.source} chart API; price date ${ds.market.priceDate}${ds.market.fxRate ? `; FX ${ds.market.fxRate}` : ""}`],
    ["Risk-free rate", `${ds.market.riskFreeSource} (${ds.market.riskFreeCurrency ?? "USD"})`],
    ["Country risk premium", ds.market.countrySource ?? "n/a"],
    ["Equity risk premium", "Mature-market implied ERP, Damodaran-style (pages.stern.nyu.edu/~adamodar)"],
    ["Cost of debt", "Synthetic rating from interest coverage (Damodaran-style spread table) + risk-free rate"],
    ["Beta", model.beta.method === "peer" ? (ds.peers?.source ?? "Peer median") : "Monthly regression vs local index, Blume-adjusted"],
    ["Peers & multiples", ds.peers?.source ?? "Not available"],
    ["Model", "FCFF DCF with normalised terminal year (reinvestment = g / ROIC; McKinsey / Damodaran value-driver formula); residual income for financials"],
  ];
  sources.forEach((s) => src.addRow(s));
  src.addRow([]);
  src.addRow(["Per-assumption derivations", "See the Assumptions sheet, column G."]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------------------------------------------------------------------------

function addDcfSheet(wb: ExcelJS.Workbook, m: ModelResult) {
  const ws = wb.addWorksheet("DCF (live)");
  const d = m.dcf;
  const A = m.assumptions;
  const N = d.years.length;
  ws.columns = [{ width: 44 }, ...Array.from({ length: N + 2 }, () => ({ width: 15 }))];
  const input = (addr: string, v: number, fmt: string) => {
    const c = ws.getCell(addr);
    c.value = v;
    c.numFmt = fmt;
    c.font = font({ color: { argb: BLUE } });
  };
  const formula = (addr: string, f: string, result: number, fmt: string, bold = false) => {
    const c = ws.getCell(addr);
    c.value = { formula: f, result };
    c.numFmt = fmt;
    c.font = font({ bold });
  };
  const label = (addr: string, t: string, bold = false) => {
    const c = ws.getCell(addr);
    c.value = t;
    c.font = font({ bold });
  };

  label("A1", `DCF — live formulas (blue cells are inputs; ${m.dataset.profile.currency} millions)`, true);
  ws.getCell("A1").font = font({ bold: true, size: 13 });

  // inputs
  label("A3", "WACC"); input("B3", m.wacc.wacc, "0.00%");
  label("A4", "Terminal growth (g)"); input("B4", A.values.terminal_growth as number, "0.00%");
  label("A5", "Terminal / marginal tax rate"); input("B5", A.values.terminal_tax_rate as number, "0.0%");
  label("A6", "Terminal ROIC minus WACC"); input("B6", A.values.terminal_roic_spread as number, "0.00%");
  label("A7", "Mid-year convention (1 = yes)"); input("B7", A.values.mid_year as number, "0");
  label("A8", "Final-year EBIT"); input("B8", d.years[N - 1].ebit, "#,##0.0");
  label("A9", "Diluted shares (millions, TSM at implied price)"); input("B9", d.dilution.dilutedShares, "#,##0.00");

  // FCFF vector
  head(ws, 11, ["Year", ...d.years.map((y) => y.label)]);
  label("A12", "Unlevered free cash flow (model output)");
  d.years.forEach((y, i) => input(`${col(i + 2)}12`, y.fcff, "#,##0.0"));
  label("A13", "Discount period (years)");
  d.years.forEach((_, i) => formula(`${col(i + 2)}13`, `${i + 1}-0.5*$B$7`, d.discountPeriods[i], "0.0"));
  label("A14", "Discount factor");
  d.years.forEach((_, i) => formula(`${col(i + 2)}14`, `1/(1+$B$3)^${col(i + 2)}13`, 1 / (1 + m.wacc.wacc) ** d.discountPeriods[i], "0.0000"));
  label("A15", "PV of FCFF");
  d.years.forEach((_, i) => formula(`${col(i + 2)}15`, `${col(i + 2)}12*${col(i + 2)}14`, d.pvFcff[i], "#,##0.0"));
  const last = col(N + 1);

  // terminal + bridge
  const t = d.terminal;
  label("A17", "Sum of PV of FCFF"); formula("B17", `SUM(B15:${last}15)`, d.sumPv, "#,##0.0");
  label("A18", "Terminal NOPAT (year N+1) = EBIT x (1+g) x (1 - tax)"); formula("B18", "B8*(1+B4)*(1-B5)", t.nopat, "#,##0.0");
  label("A19", "Terminal ROIC = WACC + spread"); formula("B19", "B3+B6", t.roic, "0.00%");
  label("A20", "Reinvestment rate = g / ROIC"); formula("B20", "MAX(0,B4)/B19", t.reinvestmentRate, "0.0%");
  label("A21", "Terminal FCFF = NOPAT x (1 - reinvestment)"); formula("B21", "B18*(1-B20)", t.fcff, "#,##0.0");
  label("A22", "Terminal value (Gordon) = FCFF / (WACC - g)"); formula("B22", "B21/(B3-B4)", d.tvGordon, "#,##0.0");
  label("A23", "PV of terminal value"); formula("B23", `B22*${last}14`, d.pvTvGordon, "#,##0.0");
  const useGordon = (A.values.tv_method as number) === 1;
  label("A24", useGordon ? "Enterprise value" : "Enterprise value (exit-multiple method in the model — see the model page)", true);
  formula("B24", "B17+B23", d.sumPv + d.pvTvGordon, "#,##0.0", true);
  const br = d.bridge;
  const items: [string, number][] = [
    ["Less: total debt", br.lessDebt], ["Less: minority interest", br.lessMinority], ["Less: preferred equity", br.lessPreferred],
    ["Less: pension deficit", br.lessPension], ["Less: other debt-like items", br.lessOtherDebtLike], ["Plus: cash & ST investments", br.plusCash],
    ["Plus: long-term / equity-method investments", br.plusInvestments],
  ];
  items.forEach(([l, v], i) => { label(`A${25 + i}`, l); input(`B${25 + i}`, v, "#,##0.0"); });
  const eqRow = 25 + items.length;
  label(`A${eqRow}`, "Equity value", true);
  const eqGordon = d.sumPv + d.pvTvGordon + items.reduce((s, x) => s + x[1], 0);
  formula(`B${eqRow}`, `B24+SUM(B25:B${eqRow - 1})`, eqGordon, "#,##0.0", true);
  label(`A${eqRow + 1}`, "Implied value per share", true);
  formula(`B${eqRow + 1}`, `B${eqRow}/B9`, eqGordon / d.dilution.dilutedShares, "#,##0.00", true);
  label(`A${eqRow + 2}`, "Current price"); input(`B${eqRow + 2}`, d.currentPrice, "#,##0.00");
  label(`A${eqRow + 3}`, "Upside / (downside)"); formula(`B${eqRow + 3}`, `B${eqRow + 1}/B${eqRow + 2}-1`, eqGordon / d.dilution.dilutedShares / d.currentPrice - 1, "0.0%");
  if (!useGordon) {
    label(`A${eqRow + 4}`, "Note: the model's headline uses the exit-multiple method; this sheet shows the Gordon-growth valuation with live formulas.");
    ws.getCell(`A${eqRow + 4}`).font = font({ size: 9, color: { argb: `FF${BRAND.muted}` } });
  }

  // live sensitivity (WACC across, g down) — same formula chain per cell (share count held at the model's diluted count)
  const s0 = eqRow + 7;
  label(`A${s0 - 1}`, "Sensitivity — implied price, live (WACC across, terminal growth down)", true);
  const bridgeSum = items.reduce((s, x) => s + x[1], 0);
  const waccs = [-0.01, -0.005, 0, 0.005, 0.01];
  const gs = [-0.01, -0.005, 0, 0.005, 0.01];
  ws.getCell(`A${s0}`).value = "g \\ WACC";
  waccs.forEach((w, j) => {
    const c = ws.getCell(`${col(j + 2)}${s0}`);
    c.value = { formula: `$B$3+(${w})`, result: m.wacc.wacc + w };
    c.numFmt = "0.00%";
    c.font = font({ bold: true });
  });
  gs.forEach((gd, i) => {
    const rr = s0 + 1 + i;
    const gc = ws.getCell(`A${rr}`);
    gc.value = { formula: `$B$4+(${gd})`, result: (A.values.terminal_growth as number) + gd };
    gc.numFmt = "0.00%";
    gc.font = font({ bold: true });
    waccs.forEach((w, j) => {
      const wc = `${col(j + 2)}$${s0}`;
      const gcell = `$A${rr}`;
      const f =
        `IF(${wc}<=${gcell},"n/a",(SUMPRODUCT($B$12:$${last}$12/(1+${wc})^$B$13:$${last}$13)` +
        `+$B$8*(1+${gcell})*(1-$B$5)*(1-MAX(0,${gcell})/(${wc}+$B$6))/(${wc}-${gcell})/(1+${wc})^$${last}$13` +
        `+${bridgeSum})/$B$9)`;
      const w1 = m.wacc.wacc + w, g1 = (A.values.terminal_growth as number) + gd;
      let res: number | string = "n/a";
      if (w1 > g1) {
        const pv = d.years.reduce((s, y, k) => s + y.fcff / (1 + w1) ** d.discountPeriods[k], 0);
        const ebit1 = d.years[N - 1].ebit * (1 + g1);
        const nopat = ebit1 - Math.max(0, ebit1) * (A.values.terminal_tax_rate as number);
        const rr2 = Math.min(1, Math.max(0, g1) / (w1 + (A.values.terminal_roic_spread as number)));
        const tv = (nopat * (1 - rr2)) / (w1 - g1) / (1 + w1) ** d.discountPeriods[N - 1];
        res = (pv + tv + bridgeSum) / d.dilution.dilutedShares;
      }
      const c = ws.getCell(`${col(j + 2)}${rr}`);
      c.value = { formula: f, result: res };
      c.numFmt = "#,##0.00";
      c.font = font({ bold: i === 2 && j === 2 });
    });
  });
}

function addRiSheet(wb: ExcelJS.Workbook, m: ModelResult) {
  const ri = m.ri!;
  const A = m.assumptions;
  const ws = wb.addWorksheet("Residual income (live)");
  const N = ri.years.length;
  ws.columns = [{ width: 44 }, ...Array.from({ length: N + 1 }, () => ({ width: 15 }))];
  const put = (addr: string, v: number | { formula: string; result: number }, fmt: string, isInput = false, bold = false) => {
    const c = ws.getCell(addr);
    c.value = v;
    c.numFmt = fmt;
    c.font = font({ bold, color: isInput ? { argb: BLUE } : { argb: `FF${BRAND.ink}` } });
  };
  const lab = (addr: string, t: string, bold = false) => { const c = ws.getCell(addr); c.value = t; c.font = font({ bold }); };
  lab("A1", "Residual-income valuation — live formulas (blue = inputs)", true);
  lab("A3", "Cost of equity"); put("B3", ri.costOfEquity, "0.00%", true);
  lab("A4", "Terminal growth"); put("B4", A.values.terminal_growth as number, "0.00%", true);
  lab("A5", "Starting ROE"); put("B5", A.values.ri_roe as number, "0.00%", true);
  lab("A6", "Long-run ROE (= ke + spread)"); put("B6", { formula: `B3+${A.values.ri_terminal_spread as number}`, result: ri.terminalRoe }, "0.00%");
  lab("A7", "Dividend payout"); put("B7", A.values.ri_payout as number, "0.0%", true);
  lab("A8", "Opening book equity"); put("B8", ri.bookValue, "#,##0.0", true);
  lab("A9", "Diluted shares (millions)"); put("B9", m.dcf.dilution.dilutedShares, "#,##0.00", true);
  head(ws, 11, ["Line", ...ri.years.map((y) => y.label)]);
  const rowsDef = ["Opening book", "ROE (fading)", "Net income", "Equity charge (ke x book)", "Residual income", "Dividends", "Closing book", "PV of residual income"];
  rowsDef.forEach((l, i) => lab(`A${12 + i}`, l));
  ri.years.forEach((y, i) => {
    const c = col(i + 2), pc = col(i + 1);
    put(`${c}12`, i === 0 ? { formula: "$B$8", result: y.bookOpen } : { formula: `${pc}18`, result: y.bookOpen }, "#,##0.0");
    put(`${c}13`, { formula: `$B$5+($B$6-$B$5)*${i + 1}/${N}`, result: y.roe }, "0.00%");
    put(`${c}14`, { formula: `${c}13*${c}12`, result: y.netIncome }, "#,##0.0");
    put(`${c}15`, { formula: `$B$3*${c}12`, result: y.equityCharge }, "#,##0.0");
    put(`${c}16`, { formula: `${c}14-${c}15`, result: y.residualIncome }, "#,##0.0");
    put(`${c}17`, { formula: `MAX(0,${c}14)*$B$7`, result: y.dividends }, "#,##0.0");
    put(`${c}18`, { formula: `${c}12+${c}14-${c}17`, result: y.bookClose }, "#,##0.0");
    put(`${c}19`, { formula: `${c}16/(1+$B$3)^${i + 1}`, result: y.residualIncome / (1 + ri.costOfEquity) ** (i + 1) }, "#,##0.0");
  });
  const lastC = col(N + 1);
  lab("A21", "Sum of PV of residual income"); put("B21", { formula: `SUM(B19:${lastC}19)`, result: ri.sumPvRi }, "#,##0.0");
  lab("A22", "Terminal residual income = (ROE_T - ke) x closing book"); put("B22", { formula: `($B$6-$B$3)*${lastC}18`, result: ri.terminalResidualIncome }, "#,##0.0");
  lab("A23", "Terminal value = RI / (ke - g)"); put("B23", { formula: "B22/(B3-B4)", result: ri.tvRi }, "#,##0.0");
  lab("A24", "PV of terminal value"); put("B24", { formula: `B23/(1+B3)^${N}`, result: ri.pvTvRi }, "#,##0.0");
  lab("A25", "Equity value = book + PV(RI) + PV(TV)", true); put("B25", { formula: "B8+B21+B24", result: ri.equityValue }, "#,##0.0", false, true);
  lab("A26", "Value per share", true); put("B26", { formula: "B25/B9", result: ri.equityValue / m.dcf.dilution.dilutedShares }, "#,##0.00", false, true);
  lab("A27", "Implied P/B"); put("B27", { formula: "B25/B8", result: ri.impliedPb }, "0.00x");
}
