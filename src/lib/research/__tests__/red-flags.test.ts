/**
 * Tests for the Red Flag Engine (Phase 1).
 * One test per ENABLED rule, plus disabled-rule, bank-nbfc, positives,
 * severity-ordering, and no-data cases.
 */
import { describe, expect, it } from "vitest";
import { detectRedFlags, RULES } from "../red-flags";
import type { NormalizedPeriod } from "../analytics-types";

function mkPeriod(over: Partial<NormalizedPeriod>): NormalizedPeriod {
  return {
    key: "p",
    label: "p",
    endDate: "2024-03-31",
    filingDate: null,
    revenue: null,
    grossProfit: null,
    ebitda: null,
    ebit: null,
    pbt: null,
    pat: null,
    eps: null,
    cfo: null,
    capex: null,
    freeCashFlow: null,
    totalAssets: null,
    totalEquity: null,
    totalDebt: null,
    cash: null,
    currentAssets: null,
    currentLiabilities: null,
    inventory: null,
    receivables: null,
    payables: null,
    interestExpense: null,
    sharesOutstanding: null,
    otherIncome: null,
    cogs: null,
    source: { provider: "test", sourceType: "company_filing" },
    ...over,
  };
}

const ids = (flags: { id: string }[]) => flags.map((f) => f.id);

describe("detectRedFlags", () => {
  it("rule 1: receivables-vs-revenue flags a 15pp+ growth gap as watch", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", revenue: 1000, receivables: 100 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", revenue: 1050, receivables: 110 }), // +5% / +10% -> 5pp gap
        mkPeriod({ label: "FY26", endDate: "2026-03-31", revenue: 1080, receivables: 135 }), // +2.9% / +22.7% -> 19.8pp gap
      ],
      "industrial",
    );
    const flag = res.flags.find((f) => f.id === "receivables-vs-revenue");
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe("watch");
    expect(flag?.evidence.some((e) => e.label === "CFO / PAT")).toBe(false);
    expect(flag?.methodology).toContain("15pp");
    expect(flag?.sourcePeriods).toEqual(["FY25", "FY26"]);
  });

  it("rule 1: escalates to warning when the gap persists in the prior year", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", revenue: 1000, receivables: 100 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", revenue: 1050, receivables: 135 }), // +5% / +35% -> 30pp gap
        mkPeriod({ label: "FY26", endDate: "2026-03-31", revenue: 1080, receivables: 165 }), // +2.9% / +22.2% -> 19.4pp gap
      ],
      "industrial",
    );
    const flag = res.flags.find((f) => f.id === "receivables-vs-revenue");
    expect(flag?.severity).toBe("warning");
    expect(flag?.summary).toContain("prior year");
  });

  it("rule 2: cfo-below-pat is watch for one year, warning for 2 of last 3", () => {
    const once = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: 100, cfo: 95 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: 100, cfo: 92 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 100, cfo: 60 }),
      ],
      "industrial",
    );
    const f1 = once.flags.find((f) => f.id === "cfo-below-pat");
    expect(f1?.severity).toBe("watch");
    expect(f1?.evidence.find((e) => e.label === "CFO / PAT")?.value).toBe("0.60x");

    const persistent = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: 100, cfo: 60 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: 100, cfo: 65 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 100, cfo: 90 }),
      ],
      "industrial",
    );
    const f2 = persistent.flags.find((f) => f.id === "cfo-below-pat");
    expect(f2?.severity).toBe("warning");
  });

  it("rule 3: negative-fcf-profitable is watch for one year, warning for 2 of last 3", () => {
    const once = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: 100, freeCashFlow: 40 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: 110, freeCashFlow: 30 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 120, freeCashFlow: -25 }),
      ],
      "industrial",
    );
    const f1 = once.flags.find((f) => f.id === "negative-fcf-profitable");
    expect(f1?.severity).toBe("watch");

    const persistent = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: 100, freeCashFlow: -10 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: 110, freeCashFlow: 30 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 120, freeCashFlow: -25 }),
      ],
      "industrial",
    );
    const f2 = persistent.flags.find((f) => f.id === "negative-fcf-profitable");
    expect(f2?.severity).toBe("warning");
  });

  it("rule 4: rapid-debt-growth flags >30% YoY debt with revenue/EBITDA context", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", totalDebt: 100, revenue: 1000, ebitda: 200 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", totalDebt: 145, revenue: 1050, ebitda: 210 }),
      ],
      "industrial",
    );
    const flag = res.flags.find((f) => f.id === "rapid-debt-growth");
    expect(flag?.severity).toBe("watch");
    expect(flag?.evidence.find((e) => e.label === "Revenue YoY growth")?.value).toBe("5.0%");
    expect(flag?.summary).toContain("not automatically negative");
  });

  it("rule 5: interest-coverage is warning below 2x, watch on a >40% fall from >=3x", () => {
    const belowTwo = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", ebit: 120, interestExpense: 30 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", ebit: 50, interestExpense: 30 }),
      ],
      "industrial",
    );
    const f1 = belowTwo.flags.find((f) => f.id === "interest-coverage");
    expect(f1?.severity).toBe("warning");

    const sharpFall = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", ebit: 500, interestExpense: 100 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", ebit: 290, interestExpense: 100 }),
      ],
      "industrial",
    );
    const f2 = sharpFall.flags.find((f) => f.id === "interest-coverage");
    expect(f2?.severity).toBe("watch");
  });

  it("rule 6: margin-compression flags a 300bps+ EBITDA margin decline", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", ebitda: 200, revenue: 1000 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", ebitda: 160, revenue: 1000 }),
      ],
      "industrial",
    );
    const flag = res.flags.find((f) => f.id === "margin-compression");
    expect(flag?.severity).toBe("watch");
    expect(flag?.methodology).toContain("300bps");
  });

  it("rule 7: working-capital flags a >=20% rise in receivable days or CCC", () => {
    const dsoCase = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", receivables: 150, revenue: 1000 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", receivables: 200, revenue: 1000 }),
      ],
      "industrial",
    );
    const f1 = dsoCase.flags.find((f) => f.id === "working-capital");
    expect(f1?.severity).toBe("watch");
    expect(f1?.summary).toContain("receivable days");

    const cccCase = detectRedFlags(
      [
        mkPeriod({
          label: "FY25", endDate: "2025-03-31",
          receivables: 100, revenue: 1000, inventory: 100, payables: 100, cogs: 700,
        }),
        mkPeriod({
          label: "FY26", endDate: "2026-03-31",
          receivables: 100, revenue: 1000, inventory: 150, payables: 50, cogs: 700,
        }),
      ],
      "industrial",
    );
    const f2 = cccCase.flags.find((f) => f.id === "working-capital");
    expect(f2?.severity).toBe("watch");
    expect(f2?.summary).toContain("cash conversion cycle");
  });

  it("rule 8: other-income flags >=25% of PBT as info, skips when unavailable", () => {
    const flagged = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pbt: 100, otherIncome: 10 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pbt: 100, otherIncome: 30 }),
      ],
      "industrial",
    );
    const f1 = flagged.flags.find((f) => f.id === "other-income");
    expect(f1?.severity).toBe("info");

    const missing = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pbt: 100, otherIncome: null }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pbt: 100, otherIncome: null }),
      ],
      "industrial",
    );
    expect(ids(missing.flags)).not.toContain("other-income");
  });

  it("rule 10: repeated-losses flags losses in 2 of last 3 annual periods as warning", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: -50 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: -30 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 80 }),
      ],
      "industrial",
    );
    const flag = res.flags.find((f) => f.id === "repeated-losses");
    expect(flag?.severity).toBe("warning");
    expect(flag?.summary).toBe("Reported losses in 2 of the last 3 annual periods.");
  });

  it("dilution rule is disabled and emits nothing even on a 50% share-count jump", () => {
    const dilutionEntry = RULES.find((r) => r.id === "dilution");
    expect(dilutionEntry?.enabled).toBe(false);
    expect(dilutionEntry?.description).toBe(
      "Enable when corporate-action-adjusted share counts are available",
    );
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY25", endDate: "2025-03-31", sharesOutstanding: 10 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", sharesOutstanding: 15 }),
      ],
      "industrial",
    );
    expect(ids(res.flags)).not.toContain("dilution");
  });

  it("bank-nbfc skips rules 4, 5 and 7 while industrial flags them", () => {
    const periods = [
      mkPeriod({
        label: "FY25", endDate: "2025-03-31",
        totalDebt: 100, revenue: 1000, ebitda: 200, receivables: 150,
      }),
      mkPeriod({
        label: "FY26", endDate: "2026-03-31",
        totalDebt: 145, revenue: 1000, ebitda: 200, receivables: 200,
        ebit: 50, interestExpense: 30,
      }),
    ];
    const industrial = detectRedFlags(periods, "industrial");
    expect(ids(industrial.flags)).toEqual(
      expect.arrayContaining(["rapid-debt-growth", "interest-coverage", "working-capital"]),
    );
    const bank = detectRedFlags(periods, "bank-nbfc");
    expect(ids(bank.flags)).not.toContain("rapid-debt-growth");
    expect(ids(bank.flags)).not.toContain("interest-coverage");
    expect(ids(bank.flags)).not.toContain("working-capital");
  });

  it("positives: net-debt streak and CFO>PAT streak, plus the no-flags note", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY23", endDate: "2023-03-31", totalDebt: 600, cash: 100, pat: 100, cfo: 130, receivables: 150, revenue: 1000 }),
        mkPeriod({ label: "FY24", endDate: "2024-03-31", totalDebt: 550, cash: 100, pat: 100, cfo: 135, receivables: 150, revenue: 1000 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", totalDebt: 500, cash: 100, pat: 100, cfo: 140, receivables: 150, revenue: 1000 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", totalDebt: 450, cash: 100, pat: 100, cfo: 145, receivables: 150, revenue: 1000 }),
      ],
      "industrial",
    );
    expect(res.flags).toEqual([]);
    expect(res.positives).toContain("Net debt declined for 3 consecutive reported years");
    expect(res.positives).toContain("CFO exceeded PAT across the latest 3 annual periods");
    expect(res.positives).toContain(
      "No major balance-sheet flags detected from available reported data.",
    );
    expect(res.asOf).toBe("FY26");
  });

  it("flags are emitted in severity order: warning before watch before info", () => {
    const res = detectRedFlags(
      [
        mkPeriod({ label: "FY24", endDate: "2024-03-31", pat: -50, ebitda: 200, revenue: 1000, pbt: 100, otherIncome: 5 }),
        mkPeriod({ label: "FY25", endDate: "2025-03-31", pat: -30, ebitda: 200, revenue: 1000, pbt: 100, otherIncome: 5 }),
        mkPeriod({ label: "FY26", endDate: "2026-03-31", pat: 80, ebitda: 160, revenue: 1000, pbt: 100, otherIncome: 30 }),
      ],
      "industrial",
    );
    expect(ids(res.flags)).toEqual(["repeated-losses", "margin-compression", "other-income"]);
  });

  it("single period: no flags, no crash", () => {
    const res = detectRedFlags(
      [mkPeriod({ label: "FY26", endDate: "2026-03-31", revenue: 1000, receivables: 100, pat: 100, cfo: 50, totalDebt: 500 })],
      "industrial",
    );
    expect(res.flags).toEqual([]);
    expect(res.asOf).toBe("FY26");
    expect(res.positives).toContain(
      "No major balance-sheet flags detected from available reported data.",
    );
  });

  it("empty input: no flags, no crash", () => {
    const res = detectRedFlags([], "unknown");
    expect(res.flags).toEqual([]);
    expect(res.positives).toContain(
      "No major balance-sheet flags detected from available reported data.",
    );
  });
});
