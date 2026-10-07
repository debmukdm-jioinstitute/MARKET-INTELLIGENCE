import { describe, expect, it } from "vitest";
import { panelSource, urlForSource } from "@/lib/panel-sources";

describe("panel source registry", () => {
  it("covers the research-page panels that declare no trust of their own", () => {
    for (const t of ["Quote & depth", "Session", "Fundamentals (Upstox key ratios)", "SEC filings", "Options Positioning (F&O)", "Who owns it", "What moves this stock"]) {
      const s = panelSource(t);
      expect(s, t).not.toBeNull();
      expect(s!.method.length).toBeGreaterThan(20);
    }
  });
  it("resolves a verifiable URL for common providers", () => {
    expect(urlForSource("NSE shareholding pattern filings (XBRL)")).toContain("nseindia.com");
    expect(urlForSource("SEC EDGAR")).toContain("sec.gov");
    expect(urlForSource("Unknown vendor")).toBeUndefined();
  });
});

import { byQuarter, type OwnershipRow } from "@/lib/research/ownership";
const row = (broadcastDate: string, quarterEnd: string | null, promoterPct = 71.77): OwnershipRow => ({ broadcastDate, quarterEnd, promoterPct, fiiPct: null, diiPct: null, publicPct: null, pledgePct: null, shareholderCount: null, xbrlUrl: null });

describe("byQuarter", () => {
  it("puts a late re-filing of an old quarter in its own quarter, so the newest quarter is last", () => {
    const out = byQuarter([row("2026-09-17", "2026-03-31"), row("2026-07-21", "2026-06-30"), row("2026-04-20", "2026-03-31")]);
    expect(out.map((r) => r.quarterEnd)).toEqual(["2026-03-31", "2026-06-30"]);
    expect(out[0].broadcastDate).toBe("2026-09-17"); // the most recently filed version of March wins
    expect(out[out.length - 1].quarterEnd).toBe("2026-06-30");
  });
  it("falls back to the filing date when the quarter is unknown", () => {
    expect(byQuarter([row("2026-02-01", null), row("2026-01-01", null)]).map((r) => r.broadcastDate)).toEqual(["2026-01-01", "2026-02-01"]);
  });
});
