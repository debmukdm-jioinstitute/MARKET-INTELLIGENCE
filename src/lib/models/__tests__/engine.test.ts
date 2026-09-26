import { describe, expect, it } from "vitest";
import { applyOverrides, deriveAssumptions } from "@/lib/models/assumptions";
import { buildModel, buildRows, computeBeta, dilutedSharesAtPrice, priceFromEquity, terminalYear } from "@/lib/models/dcf-engine";
import { marketValueOfDebt } from "@/lib/models/capital";
import { syntheticRating } from "@/lib/models/country";
import { dataset } from "./fixtures";

const ds = dataset();
const A = () => deriveAssumptions(ds, 5);

describe("balance sheet integrity", () => {
  it("balances every projected year in the base case", () => {
    const { rows, n } = buildRows(ds, A());
    for (let p = n; p < rows.length; p++) expect(Math.abs(rows[p].total_assets - rows[p].total_liabilities_equity)).toBeLessThan(1e-6);
  });

  it("still balances when buybacks force revolver draws", () => {
    const a = applyOverrides(A(), { buybacks: 900, payout_ratio: 1 });
    const { rows, n } = buildRows(ds, a);
    expect(Math.max(...rows.slice(n).map((r) => r.revolver))).toBeGreaterThan(0);
    for (let p = n; p < rows.length; p++) {
      expect(Math.abs(rows[p].total_assets - rows[p].total_liabilities_equity)).toBeLessThan(1e-6);
      expect(rows[p].cash_sti).toBeGreaterThanOrEqual(a.values.min_cash_pct as number * rows[p].revenue - 1e-6);
    }
  });

  it("repays the revolver from later surplus", () => {
    const a = applyOverrides(A(), { buybacks: [900, 0, 0, 0, 0] });
    const { rows, n } = buildRows(ds, a);
    expect(rows[n].revolver).toBeGreaterThan(0);
    expect(rows[n + 4].revolver).toBeLessThan(rows[n].revolver);
  });

  it("interest on average balances converges (circularity resolved)", () => {
    const { rows, n } = buildRows(ds, A());
    const r = rows[n + 1], p = rows[n];
    expect(r.interest_expense).toBeCloseTo((A().values.cost_of_debt as number) * (p.total_debt + r.total_debt) / 2, 6);
  });
});

describe("terminal value normalisation", () => {
  it("FCFF = NOPAT x (1 - g/ROIC), hand-calculated", () => {
    const t = terminalYear(100, 0.03, 0.25, 0.09, 0.02);
    const nopat = 100 * 1.03 * 0.75; // 77.25
    expect(t.nopat).toBeCloseTo(nopat, 9);
    expect(t.reinvestmentRate).toBeCloseTo(0.03 / 0.11, 9);
    expect(t.fcff).toBeCloseTo(nopat * (1 - 0.03 / 0.11), 9);
  });
  it("releases no capital at negative growth", () => {
    expect(terminalYear(100, -0.01, 0.25, 0.09, 0.02).reinvestmentRate).toBe(0);
  });
  it("zero-spread (no-moat) ROIC = WACC gives value independent of growth", () => {
    const w = 0.09;
    const v = (g: number) => terminalYear(100, g, 0.25, w, 0).fcff / (w - g) / (1 + g); // per unit of current NOPAT
    expect(v(0.01)).toBeCloseTo(v(0.03), 9);
  });
});

describe("DCF arithmetic", () => {
  const m = buildModel(ds, A());
  it("EV equals PV of FCFF plus PV of terminal value, recomputed independently", () => {
    const w = m.wacc.wacc;
    const pv = m.dcf.years.reduce((s, y, i) => s + y.fcff / (1 + w) ** m.dcf.discountPeriods[i], 0);
    const g = m.assumptions.values.terminal_growth as number;
    const tv = m.dcf.terminal.fcff / (w - g) / (1 + w) ** m.dcf.discountPeriods[m.dcf.discountPeriods.length - 1];
    expect(m.dcf.enterpriseValue).toBeCloseTo(pv + tv, 6);
  });
  it("equity bridge identity holds and price x diluted shares = equity", () => {
    const b = m.dcf.bridge;
    expect(b.equityValue).toBeCloseTo(b.enterpriseValue + b.lessDebt + b.lessMinority + b.lessPreferred + b.lessPension + b.lessOtherDebtLike + b.plusCash + b.plusInvestments, 9);
    expect(m.dcf.impliedPrice * m.dcf.dilution.dilutedShares).toBeCloseTo(b.equityValue, 6);
  });
  it("sensitivity centre cell equals the headline price (Gordon method)", () => {
    expect(m.sensitivityGordon.grid[2][2]).toBeCloseTo(m.dcf.impliedPrice, 6);
  });
  it("fiscal-year labels advance from the last historical year", () => {
    expect(m.dcf.years.map((y) => y.fiscalYear)).toEqual([2025, 2026, 2027, 2028, 2029]);
  });
});

describe("equity bridge items", () => {
  it("minority interest, preferred, pension and investments move equity value one-for-one", () => {
    const base = buildModel(ds, A()).dcf.equityValue;
    const a = applyOverrides(A(), { minority_interest: 50, preferred_equity: 20, pension_deficit: 10, lt_investments: 5, extra_debt_like: 15 });
    expect(buildModel(ds, a).dcf.equityValue).toBeCloseTo(base - 50 - 20 - 10 + 5 - 15, 6);
  });
});

describe("dilution (treasury-stock method)", () => {
  it("10m options struck at 50 with price 100 adds 5m shares", () => {
    const a = applyOverrides(A(), { options_outstanding: 10, option_strike: 50, rsus: 0 });
    expect(dilutedSharesAtPrice(a, 100).optionShares).toBeCloseTo(5, 9);
  });
  it("out-of-the-money options add nothing", () => {
    const a = applyOverrides(A(), { options_outstanding: 10, option_strike: 150, rsus: 0 });
    expect(dilutedSharesAtPrice(a, 100).optionShares).toBe(0);
  });
  it("converts only above conversion price", () => {
    const a = applyOverrides(A(), { convertible_shares: 4, convert_price: 60, rsus: 0 });
    expect(dilutedSharesAtPrice(a, 50).convertShares).toBe(0);
    expect(dilutedSharesAtPrice(a, 80).convertShares).toBe(4);
  });
  it("price solves consistently with dilution", () => {
    const a = applyOverrides(A(), { options_outstanding: 10, option_strike: 20, rsus: 2 });
    const { price, dilution } = priceFromEquity(a, 6000);
    expect(price * dilution.dilutedShares).toBeCloseTo(6000, 6);
  });
  it("dilution lowers implied price", () => {
    const off = buildModel(ds, applyOverrides(A(), { use_dilution: 0 })).dcf.impliedPrice;
    const on = buildModel(ds, applyOverrides(A(), { rsus: 10, use_dilution: 1 })).dcf.impliedPrice;
    expect(on).toBeLessThan(off);
  });
});

describe("cost of capital", () => {
  const taxRate = 0.25;
  it("Blume toggle changes the levered beta used", () => {
    const on = computeBeta(ds, taxRate, 0.1, 0.1, true);
    const off = computeBeta(ds, taxRate, 0.1, 0.1, false);
    expect(on.leveredBetaUsed).toBeCloseTo(0.67 * on.rawBeta + 0.33, 9);
    expect(off.leveredBetaUsed).toBeCloseTo(off.rawBeta, 9);
  });
  it("peer beta is relevered at the target structure", () => {
    const b = computeBeta(ds, taxRate, 0.1, 0.25, true, 0.8, 5);
    expect(b.method).toBe("peer");
    expect(b.selectedBeta).toBeCloseTo(0.8 * (1 + 0.75 * 0.25), 9);
  });
  it("market value of debt equals book when coupon = market rate", () => {
    expect(marketValueOfDebt(100, 5, 0.05, 6)).toBeCloseTo(100, 6);
  });
  it("market value of debt falls when market rate exceeds coupon", () => {
    expect(marketValueOfDebt(100, 4, 0.08, 6)).toBeLessThan(100);
  });
  it("synthetic rating maps coverage to the expected spread", () => {
    expect(syntheticRating(10).rating).toBe("AAA");
    expect(syntheticRating(3.2).rating).toBe("A-");
    expect(syntheticRating(0.1).rating).toBe("D");
  });
  it("country risk premium raises cost of equity", () => {
    const local = dataset({ market: { ...ds.market, countryRiskPremium: 0.03 } });
    const a = deriveAssumptions(local, 5);
    expect(buildModel(local, a).wacc.costOfEquity).toBeGreaterThan(buildModel(ds, A()).wacc.costOfEquity);
  });
});

describe("tax and NOL", () => {
  it("NOL shields early-year taxes and is consumed", () => {
    const a = applyOverrides(A(), { nol_opening: 1000 });
    const { rows, n } = buildRows(ds, a);
    const noNol = buildRows(ds, applyOverrides(A(), { nol_opening: 0 })).rows;
    expect(rows[n].tax).toBeLessThan(noNol[n].tax);
    expect(rows[n + 4].nol_close).toBeLessThan(rows[n].nol_close);
    expect(buildModel(ds, a).dcf.impliedPrice).toBeGreaterThan(buildModel(ds, applyOverrides(A(), { nol_opening: 0 })).dcf.impliedPrice);
  });
  it("effective tax rate converges to the terminal rate", () => {
    const a = applyOverrides(A(), { tax_rate: 0.15, terminal_tax_rate: 0.25 });
    const { rows } = buildRows(ds, a);
    expect(rows[rows.length - 1].tax_rate_used).toBeCloseTo(0.25, 9);
  });
  it("no tax credit on losses", () => {
    const a = applyOverrides(A(), { gross_margin: 0.1, nol_opening: 0 });
    const { rows, n } = buildRows(ds, a);
    expect(rows[n].tax).toBe(0);
  });
});

describe("margin fade & revenue drivers", () => {
  it("margin fade converges to the target by the last year", () => {
    const a = applyOverrides(A(), { margin_fade: 1, target_ebit_margin: 0.1 });
    const { rows } = buildRows(ds, a);
    const last = rows[rows.length - 1];
    expect(last.ebit / last.revenue).toBeCloseTo(0.1, 6);
  });
  it("volume x price mode reproduces the growth path by default", () => {
    const base = buildRows(ds, A()).rows;
    const vp = buildRows(ds, applyOverrides(A(), { driver_mode: 1 })).rows;
    expect(vp[vp.length - 1].revenue).toBeCloseTo(base[base.length - 1].revenue, 4);
  });
  it("growth fades to terminal growth by the final year", () => {
    const g = A().values.rev_growth as number[];
    expect(g[g.length - 1]).toBeCloseTo(A().values.terminal_growth as number, 4);
  });
});

describe("integrity checks", () => {
  it("a healthy synthetic company passes the structural checks", () => {
    const m = buildModel(ds, A());
    for (const label of ["Balance sheet balances (historical)", "Balance sheet balances (final projection year)", "WACC exceeds terminal growth", "Terminal ROIC at least WACC"]) {
      expect(m.checks.find((c) => c.label === label)?.pass, label).toBe(true);
    }
  });
  it("flags a negative terminal ROIC spread", () => {
    const m = buildModel(ds, applyOverrides(A(), { terminal_roic_spread: -0.02 }));
    expect(m.checks.find((c) => c.label === "Terminal ROIC at least WACC")?.pass).toBe(false);
  });
  it("flags currency mismatch", () => {
    const inr = dataset({ profile: { ...ds.profile, currency: "INR" } });
    const m = buildModel(inr, deriveAssumptions(inr, 5));
    expect(m.checks.find((c) => c.label.startsWith("Discount rate currency"))?.pass).toBe(false);
  });
  it("Gordon TV returns 0 rather than negative when WACC <= g", () => {
    const m = buildModel(ds, applyOverrides(A(), { terminal_growth: 0.06, risk_free: 0.01, erp: 0, size_premium: 0 }));
    expect(m.dcf.tvGordon).toBeGreaterThanOrEqual(0);
  });
});

describe("overrides", () => {
  it("rejects out-of-range values", () => {
    expect(() => applyOverrides(A(), { tax_rate: 0.9 })).toThrow();
  });
  it("does not duplicate the overridden list", () => {
    let a = applyOverrides(A(), { tax_rate: 0.2 });
    a = applyOverrides(a, { tax_rate: 0.22 });
    expect(a.overridden.filter((k) => k === "tax_rate")).toHaveLength(1);
  });
});
