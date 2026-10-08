import { describe, expect, it } from "vitest";
import { attachYtdStatements, type Basis, type ParsedPeriod, type ParsedResults } from "../xbrl";
import { budgetCandidates, mergeParsedPeriods, parseNseDate, type ParsedFiling } from "../service";

const annual = (end: string, rev: number): ParsedPeriod => ({
  start: `${end.slice(0, 4)}-04-01`,
  end,
  kind: "annual",
  pl: { RevenueFromOperations: rev },
  bs: null,
  cf: null,
});

const parsed = (basis: Basis, periods: ParsedPeriod[], audited: boolean | null = true): ParsedResults => ({
  layout: "general",
  basis,
  audited,
  periods,
});

const filing = (over: Partial<ParsedFiling["filing"]> = {}): ParsedFiling["filing"] => ({
  xbrlUrl: `https://example.com/${Math.random().toString(36).slice(2)}.xml`,
  broadcastDate: "2026-05-01 10:00:00",
  consolidated: false,
  audited: true,
  ...over,
});

describe("H1: consolidated wins in the merge loop", () => {
  it("prefers the consolidated filing when a later standalone re-filing exists for the same FY", () => {
    const entries: ParsedFiling[] = [
      { filing: filing({ broadcastDate: "2026-05-01 10:00:00", consolidated: true }), parsed: parsed("consolidated", [annual("2026-03-31", 67941.74)]) },
      // Standalone re-filing broadcast LATER — the old code let it overwrite.
      { filing: filing({ broadcastDate: "2026-05-02 10:00:00", consolidated: false }), parsed: parsed("standalone", [annual("2026-03-31", 36024.07)]) },
    ];
    const { annuals, annualsMap } = mergeParsedPeriods(entries);
    expect(annuals).toHaveLength(1);
    expect(annuals[0].basis).toBe("consolidated");
    expect(annualsMap.get("FY2026")!.period.pl.RevenueFromOperations).toBe(67941.74);
  });

  it("prefers consolidated even when the standalone filing was broadcast first", () => {
    const entries: ParsedFiling[] = [
      { filing: filing({ broadcastDate: "2026-05-01 10:00:00", consolidated: false }), parsed: parsed("standalone", [annual("2026-03-31", 36024.07)]) },
      { filing: filing({ broadcastDate: "2026-04-01 10:00:00", consolidated: true }), parsed: parsed("consolidated", [annual("2026-03-31", 67941.74)]) },
    ];
    const { annualsMap } = mergeParsedPeriods(entries);
    expect(annualsMap.get("FY2026")!.basis).toBe("consolidated");
  });

  it("lets a newer same-basis filing win (restatements still apply)", () => {
    const entries: ParsedFiling[] = [
      { filing: filing({ broadcastDate: "2026-05-01 10:00:00", consolidated: true }), parsed: parsed("consolidated", [annual("2026-03-31", 67000)]) },
      { filing: filing({ broadcastDate: "2026-06-01 10:00:00", consolidated: true }), parsed: parsed("consolidated", [annual("2026-03-31", 67941.74)]) },
    ];
    const { annualsMap } = mergeParsedPeriods(entries);
    expect(annualsMap.get("FY2026")!.period.pl.RevenueFromOperations).toBe(67941.74);
  });

  it("keeps standalone when no consolidated filing exists, and labels it", () => {
    const entries: ParsedFiling[] = [
      { filing: filing({ consolidated: false }), parsed: parsed("standalone", [annual("2026-03-31", 36024.07)]) },
    ];
    const { annuals } = mergeParsedPeriods(entries);
    expect(annuals[0].basis).toBe("standalone");
  });
});

describe("H2: budgeted fetch passes", () => {
  const cand = (
    source: "integrated" | "quarterly" | "annual",
    i: number,
    opts: { fy?: number; consolidated?: boolean; annualFiling?: boolean; broadcastDate?: string } = {},
  ) => ({
    xbrlUrl: `https://example.com/${source}-${i}.xml`,
    broadcastDate: opts.broadcastDate ?? `2026-0${(i % 9) + 1}-01 10:00:00`,
    consolidated: opts.consolidated ?? false,
    source,
    isAnnualFiling: opts.annualFiling ?? false,
    fyKey: opts.fy ? `FY${opts.fy}` : undefined,
  });

  it("parses NSE broadcast dates chronologically (not lexicographically)", () => {
    expect(parseNseDate("28-Jul-2026 18:18:07")).toBeGreaterThan(parseNseDate("31-Jan-2025 01:57:53"));
    expect(parseNseDate("")).toBe(0);
    expect(parseNseDate(undefined)).toBe(0);
  });

  it("fetches the latest 5 annual FYs first (integrated 31-Mar filings), consolidated preferred", () => {
    const candidates = [
      ...Array.from({ length: 12 }, (_, i) => cand("integrated", i, { broadcastDate: `2026-07-${String((i % 28) + 1).padStart(2, "0")} 10:00:00` })),
      ...[2026, 2025, 2024, 2023, 2022, 2021].flatMap((fy) => [
        cand("integrated", fy * 10, { fy, annualFiling: true, broadcastDate: `2026-05-0${fy % 9} 10:00:00` }),
        cand("integrated", fy * 10 + 1, { fy, consolidated: true, annualFiling: true, broadcastDate: `2026-05-0${fy % 9} 12:00:00` }),
      ]),
      // Legacy annual rows are never fetched (ambiguous Q4/full-year contexts).
      ...[2024, 2023].map((fy) => cand("annual", fy, { fy })),
    ];
    const picked = budgetCandidates(candidates);
    expect(picked.length).toBeLessThanOrEqual(10);
    const annualPicked = picked.filter((c) => c.isAnnualFiling);
    // 5 FYs, each the consolidated one
    expect(annualPicked).toHaveLength(5);
    expect(annualPicked.every((c) => c.consolidated)).toBe(true);
    expect(new Set(annualPicked.map((c) => c.fyKey))).toEqual(new Set(["FY2026", "FY2025", "FY2024", "FY2023", "FY2022"]));
    // No legacy-annual file is ever fetched.
    expect(picked.some((c) => c.source === "annual")).toBe(false);
    // The remaining 5 slots go to quarterlies — the old blind slice(0,10)
    // would have taken 10 integrated rows and zero annuals.
    expect(picked.filter((c) => !c.isAnnualFiling)).toHaveLength(5);
  });

  it("prefers an actually-broadcast consolidated filing over an undated (often unfetchable) re-filing", () => {
    const candidates = [
      cand("integrated", 1, { fy: 2025, consolidated: true, annualFiling: true, broadcastDate: "" }),
      cand("integrated", 2, { fy: 2025, consolidated: true, annualFiling: true, broadcastDate: "09-May-2025 13:45:00" }),
    ];
    const picked = budgetCandidates(candidates);
    // The annual pass runs first, so picked[0] is the annual FY pick.
    expect(picked[0].xbrlUrl).toContain("integrated-2");
  });

  it("orders the quarterly pass newest-first chronologically", () => {
    const candidates = [
      cand("quarterly", 1, { broadcastDate: "31-Jan-2025 01:57:53" }),
      cand("quarterly", 2, { broadcastDate: "28-Jul-2026 18:18:07" }),
    ];
    const picked = budgetCandidates(candidates);
    // Lexicographic sort would put Jan-2025 first; chronological puts Jul-2026 first.
    expect(picked[0].xbrlUrl).toContain("quarterly-2");
  });

  it("dedupes by URL and caps at 10", () => {
    const dup = cand("quarterly", 1);
    const picked = budgetCandidates([dup, { ...dup }, ...Array.from({ length: 15 }, (_, i) => cand("integrated", i + 100))]);
    const urls = picked.map((c) => c.xbrlUrl);
    expect(new Set(urls).size).toBe(urls.length);
    expect(picked.length).toBeLessThanOrEqual(10);
  });
});

describe("M7: YTD balance-sheet / cash flow attaches to the matching quarter", () => {
  it("moves YTD bs/cf onto the quarter ending on the same date", () => {
    const q: ParsedPeriod = { start: "2025-04-01", end: "2025-06-30", kind: "quarter", pl: { RevenueFromOperations: 100 }, bs: null, cf: null };
    const ytd: ParsedPeriod = {
      start: "2025-04-01", end: "2025-06-30", kind: "ytd",
      pl: { RevenueFromOperations: 100 }, bs: { Assets: 500 }, cf: { CashFlowsFromUsedInOperatingActivities: 40 },
    };
    const out = attachYtdStatements([q, ytd]);
    const quarter = out.find((p) => p.kind === "quarter")!;
    expect(quarter.bs).toEqual({ Assets: 500 });
    expect(quarter.cf).toEqual({ CashFlowsFromUsedInOperatingActivities: 40 });
    // P&L untouched — no double counting.
    expect(quarter.pl).toEqual({ RevenueFromOperations: 100 });
  });

  it("leaves quarters without a matching YTD period alone", () => {
    const q: ParsedPeriod = { start: "2025-07-01", end: "2025-09-30", kind: "quarter", pl: { RevenueFromOperations: 100 }, bs: null, cf: null };
    const out = attachYtdStatements([q]);
    expect(out[0].bs).toBeNull();
    expect(out[0].cf).toBeNull();
  });
});
