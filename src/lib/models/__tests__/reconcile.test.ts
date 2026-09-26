import { describe, expect, it } from "vitest";
import { reconcileOperatingIncome } from "@/lib/models/reconcile";
import { period } from "./fixtures";

describe("operating income reconciliation", () => {
  it("falls back to EBIT when operating income is wildly off (Woolworths pattern)", () => {
    const p = period(2026, 1, { revenue: 71539e6, operating_income: -128e6, ebit: 1853e6 });
    const notes = reconcileOperatingIncome([p]);
    expect(p.fields.operating_income).toBe(1853e6);
    expect(notes[0]).toContain("FY2026");
  });
  it("leaves normal differences alone (EBIT includes other income, Reliance pattern)", () => {
    const p = period(2026, 1, { revenue: 10572e9, operating_income: 1213e9, ebit: 1472e9 });
    expect(reconcileOperatingIncome([p])).toEqual([]);
    expect(p.fields.operating_income).toBe(1213e9);
  });
  it("ignores small absolute gaps and missing EBIT", () => {
    const a = period(2026, 1, { revenue: 1000e6, operating_income: 1e6, ebit: 5e6 });
    const b = period(2026, 1, { revenue: 1000e6, operating_income: 200e6, ebit: null as unknown as number });
    expect(reconcileOperatingIncome([a, b])).toEqual([]);
  });
});
